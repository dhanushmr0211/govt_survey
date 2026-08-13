import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import API_BASE_URL from '../../../config/api';
import { getCurrentLocation } from '../../../shared/utils/geolocation';
import { InAppCamera } from '../../../shared/components/InAppCamera';
import { Camera } from 'lucide-react';

const toNumberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

export const PoleForm = ({ ulb, onBack, projectId }) => {
  const [formData, setFormData] = useState({
    ward_id: ulb?.id || '',
    ward_number: ulb?.name || '',
    ccms_id: '',
    switch_point_id: '',
    switch_point_number: '',
    conductor_type: '',
    pole_number: '',
    pole_type: '',
    pole_height: '',
    pole_condition: '',
    distance_mtrs: '',
    arm_type: '',
    arm_status: '',
    present_arm_no: '',
    present_arm_length: '',
    how_many_lights: '',
    light_mounting_height: '',
    light_type: '',
    light_capacity: '',
    light_type_2: '',
    light_capacity_2: '',
    light_working_status: '',
    road_category: '',
    road_type: '',
    road_width: '',
    pole_earthing_exists: '',
    dtc_number: '',
    dtc_capacity: '',
    ccms_number: '',
    meter_type: '',
    meter_rr_number: '',
    meter_serial_number: '',
    meter_dimensional_status: '',
    req_arm_number: '',
    req_arm_length: '',
    req_led_lights_no: '',
    req_led_wattage: '',
    req_dedicated_wire: '',
    pole_defective: false,
    arm_deteriorated: false,
  });
  const [photos, setPhotos] = useState({ image1: null, image2: null });
  const [cameraTarget, setCameraTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusText, setStatusText] = useState('');

  useEffect(() => {
    if (ulb?.name) {
      setFormData((prev) => ({ ...prev, ward_number: ulb.name, ward_id: prev.ward_id || ulb.id }));
    }
  }, [ulb]);

  const { data: ccmsList = [] } = useQuery({
    queryKey: ['tgpl2-ccms', ulb.id, projectId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/tgpl2-survey/ccms?ward_id=${ulb.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.ccms || [];
    }
  });

  useEffect(() => {
    if (ccmsList.length > 0 && !formData.ccms_id) {
      setFormData((prev) => ({ ...prev, ccms_id: String(ccmsList[0].id), ccms_number: ccmsList[0].ccms_number || prev.ccms_number }));
    }
  }, [ccmsList, formData.ccms_id]);

  const { data: spList = [] } = useQuery({
    queryKey: ['tgpl2-sp', formData.ccms_id, projectId],
    queryFn: async () => {
      if (!formData.ccms_id) return [];
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/tgpl2-survey/switch-points?ccms_id=${formData.ccms_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.switch_points || [];
    },
    enabled: !!formData.ccms_id,
  });

  useEffect(() => {
    if (spList.length > 0) {
      setFormData((prev) => ({
        ...prev,
        switch_point_id: String(spList[0].id),
        switch_point_number: spList[0].switch_point_number || prev.switch_point_number,
      }));
    } else {
      setFormData((prev) => ({ ...prev, switch_point_id: '' }));
    }
  }, [spList]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const capturePhoto = (slot) => {
    setCameraTarget(slot);
  };

  const handleCameraPhoto = (file) => {
    if (cameraTarget) {
      setPhotos((prev) => ({ ...prev, [cameraTarget]: file }));
      setCameraTarget(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusText('Capturing GPS...');

    let coords;
    try {
      coords = await getCurrentLocation();
    } catch (err) {
      alert('Failed to get GPS. Make sure location services are enabled.');
      setSubmitting(false);
      setStatusText('');
      return;
    }

    setStatusText('Submitting...');
    try {
      const token = localStorage.getItem('token');
      const polePayload = {
        ...formData,
        latitude: coords.latitude,
        longitude: coords.longitude,
        ward_id: Number(formData.ward_id),
        ccms_id: formData.ccms_id ? Number(formData.ccms_id) : null,
        switch_point_id: formData.switch_point_id ? Number(formData.switch_point_id) : null,
        pole_to_pole_distance: toNumberOrNull(formData.distance_mtrs),
        road_width_mtrs: toNumberOrNull(formData.road_width),
        present_arm_length: toNumberOrNull(formData.present_arm_length),
      };

      const res = await axios.post(`${API_BASE_URL}/projects/${projectId}/tgpl2-survey/poles`, polePayload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const poleId = res.data.pole.id;

      const photoEntries = Object.entries(photos).filter(([, file]) => !!file);
      const imageUpdates = {};
      for (const [key, file] of photoEntries) {
        const fileForm = new FormData();
        fileForm.append('file', file);
        fileForm.append('entity_type', 'pole');
        fileForm.append('entity_id', poleId);

        const uploadRes = await axios.post(`${API_BASE_URL}/projects/${projectId}/tgpl2-survey/files`, fileForm, {
          headers: { Authorization: `Bearer ${token}` },
        });
        imageUpdates[key === 'image1' ? 'image_url_1' : 'image_url_2'] = uploadRes.data.file?.signed_url;
      }

      if (Object.values(imageUpdates).some(Boolean)) {
        await axios.patch(`${API_BASE_URL}/projects/${projectId}/tgpl2-survey/poles/${poleId}`, imageUpdates, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      alert('Pole successfully created!');
      onBack();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to submit Pole');
    } finally {
      setSubmitting(false);
      setStatusText('');
    }
  };

  if (cameraTarget) {
    return <InAppCamera onCapture={handleCameraPhoto} onClose={() => setCameraTarget(null)} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100 max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center border-b pb-2">
        <h3 className="font-bold text-gray-900">Pole Details</h3>
        <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">Selected Ward</label>
        <input type="text" value={ulb.name} disabled className="w-full p-2.5 border rounded bg-gray-50 text-gray-500 text-sm" />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">Select CCMS Point *</label>
        <select name="ccms_id" required value={formData.ccms_id} onChange={handleChange} className="w-full p-2.5 border rounded text-sm focus:ring-1 focus:ring-primary">
          <option value="">-- Select CCMS --</option>
          {ccmsList.map((c) => (
            <option key={c.id} value={c.id}>{c.ccms_number}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">Select Switch Point *</label>
        <select name="switch_point_id" required value={formData.switch_point_id} onChange={handleChange} className="w-full p-2.5 border rounded text-sm focus:ring-1 focus:ring-primary">
          <option value="">-- Select Switch Point --</option>
          {spList.map((sp) => (
            <option key={sp.id} value={sp.id}>{sp.switch_point_number}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">Pole Number *</label>
        <input type="text" name="pole_number" required value={formData.pole_number} onChange={handleChange} className="w-full p-2.5 border rounded text-sm focus:ring-1 focus:ring-primary" placeholder="Enter Pole Number" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-600 uppercase">DTC No#</label>
          <input type="text" name="dtc_number" value={formData.dtc_number} onChange={handleChange} className="w-full p-2.5 border rounded text-sm" />
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-600 uppercase">DTC Capacity</label>
          <select name="dtc_capacity" value={formData.dtc_capacity} onChange={handleChange} className="w-full p-2.5 border rounded text-sm">
            <option value="">Select DTC Capacity</option>
            {['25 KVA', '63 KVA', '100 KVA', '250 KVA', '500 KVA'].map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">CCMS No#</label>
        <input type="text" name="ccms_number" value={formData.ccms_number} onChange={handleChange} className="w-full p-2.5 border rounded text-sm" placeholder="Enter CCMS Number" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-600 uppercase">Meter Type</label>
          <select name="meter_type" value={formData.meter_type} onChange={handleChange} className="w-full p-2.5 border rounded text-sm">
            <option value="">Select Meter Type</option>
            <option value="1P">1P</option>
            <option value="3P">3P</option>
            <option value="NOT PRESENT">NOT PRESENT</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-600 uppercase">Meter Dimensional Status</label>
          <select name="meter_dimensional_status" value={formData.meter_dimensional_status} onChange={handleChange} className="w-full p-2.5 border rounded text-sm">
            <option value="">Select Status</option>
            <option value="YES">YES</option>
            <option value="NO">NO</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-600 uppercase">Meter RR Number</label>
          <input type="text" name="meter_rr_number" value={formData.meter_rr_number} onChange={handleChange} className="w-full p-2.5 border rounded text-sm" />
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-600 uppercase">Meter Serial Number</label>
          <input type="text" name="meter_serial_number" value={formData.meter_serial_number} onChange={handleChange} className="w-full p-2.5 border rounded text-sm" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">Conductor Type</label>
        <select name="conductor_type" value={formData.conductor_type} onChange={handleChange} className="w-full p-2.5 border rounded text-sm">
          <option value="">Select Conductor Type</option>
          <option value="ABC">ABC</option>
          <option value="ACSR">ACSR</option>
          <option value="UG">UG</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">Pole Type</label>
        <select name="pole_type" value={formData.pole_type} onChange={handleChange} className="w-full p-2.5 border rounded text-sm">
          <option value="">Select Pole Type</option>
          {['Conical', 'Decorative', 'High Mast', 'Mini Mast', 'Octoganal', 'Post Top', 'PSC', 'RCC', 'Spun', 'Tubular'].map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">Pole Height (mtrs)</label>
        <select name="pole_height" value={formData.pole_height} onChange={handleChange} className="w-full p-2.5 border rounded text-sm">
          <option value="">Select Height</option>
          {[0, 4, 5, 6, 7, 8, 9, 12, 16, 18, 24, 30].map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">Pole Condition</label>
        <select name="pole_condition" value={formData.pole_condition} onChange={handleChange} className="w-full p-2.5 border rounded text-sm">
          <option value="">Select Condition</option>
          <option value="Good">Good</option>
          <option value="defective">Defective</option>
          <option value="missing">Missing</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">Pole To Pole Distance (mtrs)</label>
        <select name="distance_mtrs" value={formData.distance_mtrs} onChange={handleChange} className="w-full p-2.5 border rounded text-sm">
          <option value="">Select Distance</option>
          {['10', '20', '25', '30', '40', '50'].map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">ARM Type</label>
        <select name="arm_type" value={formData.arm_type} onChange={handleChange} className="w-full p-2.5 border rounded text-sm">
          <option value="">Select ARM Type</option>
          {['single', 'double', 'multiple', 'empty/not present'].map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">ARM Status</label>
        <select name="arm_status" value={formData.arm_status} onChange={handleChange} className="w-full p-2.5 border rounded text-sm">
          <option value="">Select ARM Status</option>
          {['new', 'old', 'deteriorated', 'missing', 'empty/not present'].map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-600 uppercase">Present ARM No#</label>
          <select name="present_arm_no" value={formData.present_arm_no} onChange={handleChange} className="w-full p-2.5 border rounded text-sm">
            <option value="">Select ARM No#</option>
            {Array.from({ length: 13 }, (_, i) => i).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-600 uppercase">Present ARM Length (mtrs)</label>
          <select name="present_arm_length" value={formData.present_arm_length} onChange={handleChange} className="w-full p-2.5 border rounded text-sm">
            <option value="">Select Length</option>
            {[0, 1, 1.5, 2, 2.5].map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">How Many Lights in Pole</label>
        <select name="how_many_lights" value={formData.how_many_lights} onChange={handleChange} className="w-full p-2.5 border rounded text-sm">
          <option value="">Select Count</option>
          {Array.from({ length: 13 }, (_, i) => i).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">Light Mounting Height</label>
        <select name="light_mounting_height" value={formData.light_mounting_height} onChange={handleChange} className="w-full p-2.5 border rounded text-sm">
          <option value="">Select Height</option>
          {['5', '6-7', '9', 'mini mast', 'high mast'].map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-600 uppercase">Light 1 Type</label>
          <select name="light_type" value={formData.light_type} onChange={handleChange} className="w-full p-2.5 border rounded text-sm">
            <option value="">Select Type</option>
            {['bulb', 'cfl', 'lamp', 'led', 'tube light', 'mh400', 't5', 'svl', 'empty', 'mini mast', 'high mast'].map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-600 uppercase">Light 1 Capacity</label>
          <select name="light_capacity" value={formData.light_capacity} onChange={handleChange} className="w-full p-2.5 border rounded text-sm">
            <option value="">Select Capacity</option>
            {['0W', '5W-25W', '40W', '65W', '90W', '120W', '150W', '200W', '250W', '400W'].map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-600 uppercase">Light 2 Type</label>
          <select name="light_type_2" value={formData.light_type_2} onChange={handleChange} className="w-full p-2.5 border rounded text-sm">
            <option value="">Select Type</option>
            {['bulb', 'cfl', 'lamp', 'led', 'tube light', 'mh400', 't5', 'svl', 'empty', 'mini mast', 'high mast'].map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-600 uppercase">Light 2 Capacity</label>
          <select name="light_capacity_2" value={formData.light_capacity_2} onChange={handleChange} className="w-full p-2.5 border rounded text-sm">
            <option value="">Select Capacity</option>
            {['0W', '5W-25W', '40W', '65W', '90W', '120W', '150W', '200W', '250W', '400W'].map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">Light Working Status</label>
        <select name="light_working_status" value={formData.light_working_status} onChange={handleChange} className="w-full p-2.5 border rounded text-sm">
          <option value="">Select Status</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">Road Category</label>
        <select name="road_category" value={formData.road_category} onChange={handleChange} className="w-full p-2.5 border rounded text-sm">
          <option value="">Select Category</option>
          {['A1', 'A2', 'B1', 'B2', 'DTC', 'PARKS', 'SP'].map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">Road Type</label>
        <select name="road_type" value={formData.road_type} onChange={handleChange} className="w-full p-2.5 border rounded text-sm">
          <option value="">Select Type</option>
          {['MAIN ROAD', 'SUB MAIN ROAD', 'RESIDENTIAL ROAD', 'GALLI ROAD'].map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">Road Width (mtrs)</label>
        <select name="road_width" value={formData.road_width} onChange={handleChange} className="w-full p-2.5 border rounded text-sm">
          <option value="">Select Width</option>
          {[4, 5, 6, 7, 8, 9, 10, 12, 16, 18, 20, 24, 25, 30].map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">Pole Earthing Exists</label>
        <select name="pole_earthing_exists" value={formData.pole_earthing_exists} onChange={handleChange} className="w-full p-2.5 border rounded text-sm">
          <option value="">Select Earthing</option>
          <option value="YES">YES</option>
          <option value="NO">NO</option>
        </select>
      </div>

      <div className="p-3 bg-gray-50 rounded border space-y-3">
        <h4 className="text-xs font-bold text-gray-700 uppercase">Remarks</h4>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">Pole Defective</span>
          <select name="pole_defective" value={formData.pole_defective ? 'yes' : 'no'} onChange={(e) => setFormData((prev) => ({ ...prev, pole_defective: e.target.value === 'yes' }))} className="p-1.5 border rounded text-sm bg-white">
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">Arm Deteriorated</span>
          <select name="arm_deteriorated" value={formData.arm_deteriorated ? 'yes' : 'no'} onChange={(e) => setFormData((prev) => ({ ...prev, arm_deteriorated: e.target.value === 'yes' }))} className="p-1.5 border rounded text-sm bg-white">
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-gray-100">
        <h3 className="font-bold text-primary text-base">Proposal Form</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-600 uppercase">Req ARM No#</label>
            <select name="req_arm_number" value={formData.req_arm_number} onChange={handleChange} className="w-full p-2.5 border rounded text-sm">
              <option value="">Select...</option>
              {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-600 uppercase">Req ARM Length</label>
            <select name="req_arm_length" value={formData.req_arm_length} onChange={handleChange} className="w-full p-2.5 border rounded text-sm">
              <option value="">Select...</option>
              {['0', '1.0', '1.5', '2', '2.5'].map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-600 uppercase">Req LED Lights No#</label>
            <select name="req_led_lights_no" value={formData.req_led_lights_no} onChange={handleChange} className="w-full p-2.5 border rounded text-sm">
              <option value="">Select...</option>
              {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-600 uppercase">Req LED Wattage</label>
            <select name="req_led_wattage" value={formData.req_led_wattage} onChange={handleChange} className="w-full p-2.5 border rounded text-sm">
              <option value="">Select...</option>
              {['400W', '250W', '200W', '150W', '120W', '90W', '65W', '40W', '5-25W', '0W'].map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-600 uppercase">Req Dedicated Wire</label>
          <select name="req_dedicated_wire" value={formData.req_dedicated_wire} onChange={handleChange} className="w-full p-2.5 border rounded text-sm">
            <option value="">Select...</option>
            {['yes', 'no'].map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {['image1', 'image2'].map((slot, i) => (
          <div key={slot} className="flex flex-col items-center justify-center p-3 border border-dashed rounded-lg bg-gray-50 cursor-pointer" onClick={() => capturePhoto(slot)}>
            {photos[slot] ? (
              <img src={URL.createObjectURL(photos[slot])} alt={`Photo ${i + 1}`} className="w-full h-24 object-cover rounded" />
            ) : (
              <div className="text-center text-gray-500">
                <Camera className="mx-auto mb-1" size={24} />
                <span className="text-xs font-medium">Photo {i + 1}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <button type="submit" disabled={submitting} className="w-full p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium text-sm transition-colors">
        {submitting ? statusText : 'Submit Pole'}
      </button>
    </form>
  );
};

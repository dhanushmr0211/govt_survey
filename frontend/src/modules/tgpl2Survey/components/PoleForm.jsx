import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import API_BASE_URL from '../../../config/api';
import { getCurrentLocation } from '../../../shared/utils/geolocation';
import { InAppCamera } from '../../../shared/components/InAppCamera';
import { Camera } from 'lucide-react';

export const PoleForm = ({ ulb, onBack, projectId }) => {
  const [formData, setFormData] = useState({
    ward_id: ulb.id,
    ccms_id: '',
    switch_point_id: '',
    pole_number: '',
    road_type: '',
    road_width: '',
    pole_defective: false,
    arm_deteriorated: false,
  });
  const [photos, setPhotos] = useState({ image1: null, image2: null });
  const [cameraTarget, setCameraTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusText, setStatusText] = useState('');

  // Fetch CCMS list under the Ward
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

  // Auto-select last CCMS if available
  useEffect(() => {
    if (ccmsList.length > 0 && !formData.ccms_id) {
      setFormData((prev) => ({ ...prev, ccms_id: String(ccmsList[0].id) }));
    }
  }, [ccmsList, formData.ccms_id]);

  // Fetch Switch Points under selected CCMS
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

  // Auto-select last Switch Point if available
  useEffect(() => {
    if (spList.length > 0) {
      setFormData((prev) => ({ ...prev, switch_point_id: String(spList[0].id) }));
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

      // Create pole record
      const polePayload = {
        ...formData,
        latitude: coords.latitude,
        longitude: coords.longitude,
      };

      const res = await axios.post(`${API_BASE_URL}/projects/${projectId}/tgpl2-survey/poles`, polePayload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const poleId = res.data.pole.id;

      // Upload photos one by one, then persist their returned public URLs on the
      // TGPL-2 pole record.  The shared uploader is intentionally database-agnostic.
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
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
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

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">Road Type</label>
        <input type="text" name="road_type" value={formData.road_type} onChange={handleChange} className="w-full p-2.5 border rounded text-sm focus:ring-1 focus:ring-primary" placeholder="e.g. Asphault, Concrete" />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">Road Width (mtrs)</label>
        <input type="number" step="any" name="road_width" value={formData.road_width} onChange={handleChange} className="w-full p-2.5 border rounded text-sm focus:ring-1 focus:ring-primary" placeholder="Enter Road Width" />
      </div>

      {/* Remarks Section */}
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

      {/* Photos */}
      <div className="grid grid-cols-2 gap-4">
        {['image1', 'image2'].map((slot, i) => (
          <div key={slot} className="flex flex-col items-center justify-center p-3 border border-dashed rounded-lg bg-gray-50 cursor-pointer" onClick={() => capturePhoto(slot)}>
            {photos[slot] ? (
              <img src={URL.createObjectURL(photos[slot])} alt={`Photo ${i+1}`} className="w-full h-24 object-cover rounded" />
            ) : (
              <div className="text-center text-gray-500">
                <Camera className="mx-auto mb-1" size={24} />
                <span className="text-xs font-medium">Photo {i+1}</span>
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

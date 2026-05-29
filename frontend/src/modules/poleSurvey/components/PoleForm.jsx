import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import imageCompression from 'browser-image-compression';
import API_BASE_URL from '../../../config/api';
import { offlineDb } from '../../../db/offlineDb';
import { getCurrentLocation } from '../../../shared/utils/geolocation';
import { isMobileEditRestricted } from '../utils/mobileRestrictions';
import { useAuthStore } from '../../../store/authStore';

export const PoleForm = ({ ulb, onBack }) => {
  const user = useAuthStore((state) => state.user);
  const isAutofillUser = (user?.email || '').toLowerCase() === 'pratheekar1997@gmail.com' || (user?.email || '').toLowerCase() === 'pratheekar1997gmail.com';

  const activeProject = useAuthStore((state) => state.activeProject);
  const isTgpl = activeProject?.project_type === 'TGPL_SURVEY' || String(activeProject?.id) === '3';

  const [formData, setFormData] = useState({
    ward_number: '',
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
    // TGPL fields
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
  });
  const [photos, setPhotos] = useState({ image1: null, image2: null, image3: null });
  const [compressing, setCompressing] = useState({ image1: false, image2: false, image3: false });
  const [uploading, setUploading] = useState(false);
  const [statusText, setStatusText] = useState('');

  const isCompressing = compressing.image1 || compressing.image2 || compressing.image3;

  const projectId = activeProject?.id || 2;
  const isBallari = (ulb?.district_name || '').toLowerCase().includes('ballari');
  const isRestricted = !isTgpl && !isBallari && isMobileEditRestricted();
  const MOBILE_ALLOWED = new Set(['ward_number', 'switch_point_id', 'switch_point_number', 'pole_number', 'road_type', 'road_width']);

  const HIDE_RESTRICTED_FOR_MOBILE = true; // Set to false to roll back instantly!
  const shouldHide = (fieldId) => {
    return HIDE_RESTRICTED_FOR_MOBILE && isRestricted && !MOBILE_ALLOWED.has(fieldId);
  };

  useEffect(() => {
    if (isTgpl && ulb) {
      setFormData(prev => ({
        ...prev,
        ward_number: ulb.name
      }));
    }
  }, [isTgpl, ulb]);


  // Fetch switch points / CCMS list when ward_number changes
  const { data: switchPoints = [] } = useQuery({
    queryKey: [isTgpl ? 'ccmsList' : 'switchPoints', ulb.id, formData.ward_number],
    queryFn: async () => {
      if (!formData.ward_number) return [];
      const token = localStorage.getItem('token');
      const endpoint = isTgpl ? 'ccms' : 'switch-points';
      const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/pole-survey/${endpoint}?ward_number=${formData.ward_number}&ulb_id=${ulb.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return isTgpl ? (res.data.ccms || []) : (res.data.switchPoints || []);
    },
    enabled: !!formData.ward_number,
  });

  // Auto-select latest switch point / CCMS
  useEffect(() => {
    if (switchPoints.length > 0) {
      const timer = setTimeout(() => {
        setFormData((prev) => ({ 
          ...prev, 
          switch_point_id: switchPoints[0].id,
          switch_point_number: isTgpl ? switchPoints[0].ccms_number : switchPoints[0].switch_point_number,
          ccms_number: isTgpl ? switchPoints[0].ccms_number : prev.ccms_number
        }));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [switchPoints, isTgpl]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      
      // Auto-fill rules (only for pratheekar1997@gmail.com)
      if (isAutofillUser) {
        if (name === 'pole_type') {
          if (value === 'RCC' || value === 'PSC') {
            updated.pole_height = '9';
            updated.pole_condition = 'Good';
            updated.pole_earthing_exists = 'NO';
          } else if (value === 'High Mast') {
            updated.pole_height = '16';
            updated.pole_condition = 'Good';
            updated.pole_earthing_exists = 'YES';
          } else if (value === 'Mini Mast') {
            updated.pole_height = '12';
            updated.pole_condition = 'Good';
            updated.pole_earthing_exists = 'YES';
          }
        } else if (name === 'arm_type') {
          if (value === 'empty/not present') {
            updated.arm_status = 'empty/not present';
            updated.present_arm_length = '0';
            updated.present_arm_no = '0';
          }
        } else if (name === 'light_type') {
          const valLower = String(value || '').toLowerCase();
          if (valLower === 'led') {
            updated.light_capacity = '40W';
          } else if (valLower === 'cfl') {
            updated.light_capacity = '5W-25W';
          } else if (valLower === 'tube light') {
            updated.light_capacity = '40W';
          } else if (valLower === 'svl') {
            updated.light_capacity = '250';
          } else if (valLower === 'mini mast') {
            updated.light_capacity = '150';
          } else if (valLower === 'high mast') {
            updated.light_capacity = '200';
          }
        }
      }
      
      return updated;
    });
  };

  const handleSwitchPointChange = (e) => {
    const id = e.target.value;
    const selectedSp = switchPoints.find(sp => sp.id === Number(id));
    setFormData((prev) => ({ 
      ...prev, 
      switch_point_id: id,
      switch_point_number: selectedSp ? selectedSp.switch_point_number : ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    setUploading(true);
    setStatusText('Capturing GPS location...');

    let coords;
    try {
      coords = await getCurrentLocation();
    } catch (err) {
      console.error('GPS error:', err);
      alert(err.message || 'Failed to capture GPS location. Please check location permissions.');
      setUploading(false);
      setStatusText('');
      return;
    }

    setStatusText('Submitting...');

    // Validation: At least one light details must be present (for projects where light info is relevant)
    // Only enforced if not restricted or if it's the i-deck project where we just added these fields
    if (!isRestricted) {
      const hasLight1 = formData.light_type && formData.light_capacity;
      const hasLight2 = formData.light_type_2 && formData.light_capacity_2;
      if (!hasLight1 && !hasLight2) {
        alert('Please fill at least one light (Type and Capacity) details.');
        setUploading(false);
        setStatusText('');
        return;
      }
    }

    // Ballari District: Images are compulsory
    if (isBallari) {
      const hasImages = Object.values(photos).some(Boolean);
      if (!hasImages) {
        alert('Please capture at least one photo for this pole (compulsory for Ballari district).');
        setUploading(false);
        setStatusText('');
        return;
      }
    }

    // Build sanitized form data when mobile restrictions are enabled.
    const allowed = MOBILE_ALLOWED;
    const submitForm = { ...formData };
    if (isRestricted) {
      Object.keys(submitForm).forEach((k) => {
        if (!allowed.has(k)) submitForm[k] = '';
      });
    }

    const toNumberOrNull = (v) => (v === '' || v == null ? null : Number(v));

    const payload = isTgpl ? {
      ward_id: ulb.id,
      ward_number: ulb.name,
      latitude: coords.latitude,
      longitude: coords.longitude,
      dtc_number: submitForm.dtc_number,
      dtc_capacity: submitForm.dtc_capacity,
      ccms_number: submitForm.ccms_number,
      meter_type: submitForm.meter_type,
      meter_rr_number: submitForm.meter_rr_number,
      meter_serial_number: submitForm.meter_serial_number,
      meter_dimensional_status: submitForm.meter_dimensional_status,
      conductor_type: submitForm.conductor_type,
      pole_number: submitForm.pole_number,
      pole_type: submitForm.pole_type,
      pole_height: submitForm.pole_height,
      pole_to_pole_distance: toNumberOrNull(submitForm.distance_mtrs),
      arm_type: submitForm.arm_type,
      arm_status: submitForm.arm_status,
      present_arm_no: submitForm.present_arm_no,
      present_arm_length: submitForm.present_arm_length,
      how_many_lights_in_pole: submitForm.how_many_lights,
      light_mounting_height: submitForm.light_mounting_height,
      light_type: submitForm.light_type,
      light_capacity: submitForm.light_capacity,
      light_type_2: submitForm.light_type_2,
      light_capacity_2: submitForm.light_capacity_2,
      light_working_status: submitForm.light_working_status,
      road_category: submitForm.road_category,
      road_type: submitForm.road_type,
      road_width_mtrs: toNumberOrNull(submitForm.road_width),
      pole_earthing_exists: submitForm.pole_earthing_exists,
      req_arm_number: submitForm.req_arm_number,
      req_arm_length: submitForm.req_arm_length,
      req_led_lights_no: submitForm.req_led_lights_no,
      req_led_wattage: submitForm.req_led_wattage,
      req_dedicated_wire: submitForm.req_dedicated_wire,
    } : {
      ...submitForm,
      pole_height_mtrs: toNumberOrNull(submitForm.pole_height),
      pole_to_pole_distance_mtrs: toNumberOrNull(submitForm.distance_mtrs),
      present_arm_length_mtrs: toNumberOrNull(submitForm.present_arm_length),
      how_many_lights_in_pole: submitForm.how_many_lights,
      road_width_mtrs: toNumberOrNull(submitForm.road_width),
      latitude: coords.latitude,
      longitude: coords.longitude,
      ulb_id: ulb.id
    };

    const imageFiles = Object.values(photos)
      .filter(Boolean)
      .map(file => ({ file, type: 'pole' }));

    try {
      // Step 1: Create the pole record
      const startTotal = performance.now();
      const startRecord = performance.now();
      const res = await axios.post(`${API_BASE_URL}/projects/${projectId}/pole-survey/pole`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`⏱️ Pole record creation: ${(performance.now() - startRecord).toFixed(2)}ms`);

      // Step 2: Upload selected photos to Cloud Storage
      const poleId = res.data.id;
      if (poleId && imageFiles.length > 0) {
        const startAllImages = performance.now();
        for (let i = 0; i < imageFiles.length; i++) {
          const img = imageFiles[i];
          const startSingleImage = performance.now();
          const formDataUpload = new FormData();
          formDataUpload.append('file', img.file);
          formDataUpload.append('entity_type', 'pole');
          formDataUpload.append('entity_id', poleId);
          await axios.post(
            `${API_BASE_URL}/projects/${projectId}/pole-survey/files`,
            formDataUpload,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log(`⏱️ Image ${i + 1} upload: ${(performance.now() - startSingleImage).toFixed(2)}ms`);
        }
        console.log(`⏱️ Total images upload (${imageFiles.length}): ${(performance.now() - startAllImages).toFixed(2)}ms`);
      }

      console.log(`🚀 Total submission time: ${(performance.now() - startTotal).toFixed(2)}ms`);
      alert('Pole submitted successfully!');
      onBack();
    } catch (error) {
      console.error('Error creating pole:', error);
      
      // Handle Offline / Network Error
      if (!navigator.onLine || error.code === 'ERR_NETWORK' || !error.response) {
        try {
          await offlineDb.submissions.add({
            type: 'pole',
            data: payload,
            images: imageFiles,
            status: 'pending',
            createdAt: Date.now(),
            projectId,
            ulbId: ulb.id,
            wardNumber: formData.ward_number
          });
          alert('No internet connection. Submission saved locally and will upload automatically when you have signal.');
          onBack();
          return;
        } catch (dbErr) {
          console.error('Failed to save offline:', dbErr);
          alert('Failed to save submission locally. Please check your storage.');
        }
      } else {
        alert(error.response?.data?.message || 'Error creating pole');
      }
    } finally {
      setUploading(false);
      setStatusText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm space-y-4 max-h-[70vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold text-gray-900">Pole Form</h2>
        <button type="button" onClick={onBack} className="text-sm text-gray-500">Back</button>
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <label className="block text-gray-700 font-medium mb-1">Ward No#</label>
          <input 
            type="text" 
            name="ward_number" 
            value={formData.ward_number} 
            onChange={handleChange} 
            className="w-full p-2 border border-gray-200 rounded bg-gray-50 read-only:text-gray-500" 
            required 
            readOnly={isTgpl}
          />
        </div>

        {!isTgpl && (
          <div>
            <label className="block text-gray-700 font-medium mb-1">Switch Point No#</label>
            <select name="switch_point_id" value={formData.switch_point_id} onChange={handleSwitchPointChange} className="w-full p-2 border border-gray-200 rounded" required>
              <option value="">Select Switch Point</option>
              {switchPoints.map((sp) => (
                <option key={sp.id} value={sp.id}>SP No: {sp.switch_point_number} (ID: {sp.id})</option>
              ))}
            </select>
            {switchPoints.length > 0 && (
              <p className="text-xs text-green-600 mt-1">Latest switch point auto-selected.</p>
            )}
          </div>
        )}

        {isTgpl && (
          <>
            <div>
              <label className="block text-gray-700 font-medium mb-1">DTC No#</label>
              <input type="text" name="dtc_number" value={formData.dtc_number} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">DTC Capacity</label>
              <input type="text" name="dtc_capacity" value={formData.dtc_capacity} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">CCMS No#</label>
              <div className="flex gap-2">
                <select 
                  value={formData.ccms_number || ''} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      ccms_number: val,
                      switch_point_number: val
                    }));
                  }} 
                  className="w-1/2 p-2 border border-gray-200 rounded text-sm bg-white"
                >
                  <option value="">Select Existing CCMS</option>
                  {switchPoints.map((sp) => (
                    <option key={sp.id} value={isTgpl ? sp.ccms_number : sp.switch_point_number}>
                      {isTgpl ? sp.ccms_number : sp.switch_point_number}
                    </option>
                  ))}
                </select>
                <input 
                  type="text" 
                  name="ccms_number" 
                  placeholder="Or enter new CCMS No#" 
                  value={formData.ccms_number || ''} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      ccms_number: val,
                      switch_point_number: val
                    }));
                  }} 
                  className="w-1/2 p-2 border border-gray-200 rounded text-sm"
                  required
                />
              </div>
              {switchPoints.length > 0 && (
                <p className="text-xs text-green-600 mt-1">Latest CCMS No# auto-selected.</p>
              )}
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Meter Type</label>
              <select name="meter_type" value={formData.meter_type} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded">
                <option value="">Select Meter Type</option>
                <option value="1P">1P</option>
                <option value="3P">3P</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Meter RR Number</label>
              <input type="text" name="meter_rr_number" value={formData.meter_rr_number} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Meter Serial Number</label>
              <input type="text" name="meter_serial_number" value={formData.meter_serial_number} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Meter Dimensional Status</label>
              <select name="meter_dimensional_status" value={formData.meter_dimensional_status} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded">
                <option value="">Select Status</option>
                {['Working', 'not working', 'missing', 'door lock', 'no meter'].map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {!shouldHide('conductor_type') && (
          <div>
            <label className="block text-gray-700 font-medium mb-1">Conductor Type</label>
            <select name="conductor_type" value={formData.conductor_type} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" required={!shouldHide('conductor_type')} disabled={isRestricted}>
              <option value="">Select Conductor Type</option>
              <option value="ABC">ABC</option>
              <option value="ACSR">ACSR</option>
              <option value="UG">UG</option>
            </select>
          </div>
        )}



        <div>
          <label className="block text-gray-700 font-medium mb-1">Pole No#</label>
          <input type="text" name="pole_number" value={formData.pole_number} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" required />
        </div>

        {!shouldHide('pole_type') && (
          <div>
            <label className="block text-gray-700 font-medium mb-1">Pole Type</label>
            <select name="pole_type" value={formData.pole_type} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" required={!shouldHide('pole_type')} disabled={isRestricted}>
              <option value="">Select Pole Type</option>
              {['Conical', 'Decorative', 'High Mast', 'Mini Mast', 'Octoganal', 'Post Top', 'PSC', 'RCC', 'Spun', 'Tubular'].map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}

        {!shouldHide('pole_height') && (
          <div>
            <label className="block text-gray-700 font-medium mb-1">Pole Height (mtrs)</label>
            <select name="pole_height" value={formData.pole_height} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" required={!shouldHide('pole_height')} disabled={isRestricted}>
              <option value="">Select Height</option>
              {[0, 4, 5, 6, 7, 8, 9, 12, 16, 18, 24, 30].map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}

        {!shouldHide('pole_condition') && (
          <div>
            <label className="block text-gray-700 font-medium mb-1">Pole Condition</label>
            <select name="pole_condition" value={formData.pole_condition} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" required={!shouldHide('pole_condition')} disabled={isRestricted}>
              <option value="">Select Condition</option>
              <option value="Good">Good</option>
              <option value="defective">Defective</option>
              <option value="missing">Missing</option>
            </select>
          </div>
        )}

        {!shouldHide('distance_mtrs') && (
          <div>
            <label className="block text-gray-700 font-medium mb-1">Pole To Pole Distance (mtrs)</label>
            <input type="text" name="distance_mtrs" value={formData.distance_mtrs} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" disabled={isRestricted} required={isBallari} />
          </div>
        )}

        {!shouldHide('arm_type') && (
          <div>
            <label className="block text-gray-700 font-medium mb-1">ARM Type</label>
            <select name="arm_type" value={formData.arm_type} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" disabled={isRestricted} required={isBallari}>
              <option value="">Select ARM Type</option>
              {['single', 'double', 'multiple', 'multiply', 'empty/not present'].map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}

        {!shouldHide('arm_status') && (
          <div>
            <label className="block text-gray-700 font-medium mb-1">ARM Status</label>
            <select name="arm_status" value={formData.arm_status} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" disabled={isRestricted} required={isBallari}>
              <option value="">Select ARM Status</option>
              {['new', 'old', 'deteriorated', 'missing', 'empty/not present'].map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}

        {!shouldHide('present_arm_no') && (
          <div>
            <label className="block text-gray-700 font-medium mb-1">Present ARM No#</label>
            <select name="present_arm_no" value={formData.present_arm_no} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" disabled={isRestricted} required={isBallari}>
              <option value="">Select ARM No#</option>
              {Array.from({ length: 12 }, (_, i) => i).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}

        {!shouldHide('present_arm_length') && (
          <div>
            <label className="block text-gray-700 font-medium mb-1">Present ARM Length (mtrs)</label>
            <select name="present_arm_length" value={formData.present_arm_length} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" disabled={isRestricted} required={isBallari}>
              <option value="">Select Length</option>
              {[0, 1, 1.5, 2, 2.5].map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}

        {!shouldHide('how_many_lights') && (
          <div>
            <label className="block text-gray-700 font-medium mb-1">How Many Lights in Pole</label>
            <select name="how_many_lights" value={formData.how_many_lights} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" disabled={isRestricted} required={isBallari}>
              <option value="">Select Count</option>
              {Array.from({ length: 13 }, (_, i) => i).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}

        {!shouldHide('light_mounting_height') && (
          <div>
            <label className="block text-gray-700 font-medium mb-1">Light Mounting Height</label>
            <select name="light_mounting_height" value={formData.light_mounting_height} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" disabled={isRestricted} required={isBallari}>
              <option value="">Select Height</option>
              {['5', '6-7', '9', 'mini mast', 'high mast'].map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}

        {!shouldHide('light_type') && (
          <div>
            <label className="block text-gray-700 font-medium mb-1">Light 1 Type</label>
            <select name="light_type" value={formData.light_type} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" disabled={isRestricted}>
              <option value="">Select Type</option>
              {['bulb', 'cfl', 'lamp', 'led', 'tube light', 'mh400', 't5', 'svl', 'empty', 'mini mast', 'high mast'].map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}

        {!shouldHide('light_capacity') && (
          <div>
            <label className="block text-gray-700 font-medium mb-1">Light 1 Capacity</label>
            <select name="light_capacity" value={formData.light_capacity} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" disabled={isRestricted}>
              <option value="">Select Capacity</option>
              {['0W', '5W-25W', '40W', '65W', '90', '120', '150', '200', '250', '400'].map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}

        {!shouldHide('light_type_2') && (
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <div>
              <label className="block text-gray-700 font-medium mb-1">Light 2 Type</label>
              <select name="light_type_2" value={formData.light_type_2} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" disabled={isRestricted}>
                <option value="">Select Type</option>
                {['bulb', 'cfl', 'lamp', 'led', 'tube light', 'mh400', 't5', 'svl', 'empty', 'mini mast', 'high mast'].map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">Light 2 Capacity</label>
              <select name="light_capacity_2" value={formData.light_capacity_2} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" disabled={isRestricted}>
                <option value="">Select Capacity</option>
                {['0W', '5W-25W', '40W', '65W', '90', '120', '150', '200', '250', '400'].map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {!shouldHide('light_working_status') && (
          <div>
            <label className="block text-gray-700 font-medium mb-1">Light Working Status</label>
            <select name="light_working_status" value={formData.light_working_status} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" disabled={isRestricted} required={isBallari}>
              <option value="">Select Status</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        )}

        {!shouldHide('road_category') && (
          <div>
            <label className="block text-gray-700 font-medium mb-1">Road Category</label>
            <select name="road_category" value={formData.road_category} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" disabled={isRestricted} required={isBallari}>
              <option value="">Select Category</option>
              {['A1', 'A2', 'B1', 'B2', 'DTC', 'PARKS', 'SP'].map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-gray-700 font-medium mb-1">Road Type</label>
          <select name="road_type" value={formData.road_type} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" required={isBallari}>
            <option value="">Select Type</option>
            {['MAIN ROAD', 'SUB MAIN ROAD', 'RESIDENTIAL ROAD', 'GALLI ROAD'].map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Road Width (mtrs)</label>
          <select name="road_width" value={formData.road_width} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" required={isBallari}>
            <option value="">Select Width</option>
            {[4, 5, 6, 7, 8, 9, 12, 16, 18, 24, 30].map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {!shouldHide('pole_earthing_exists') && (
          <div>
            <label className="block text-gray-700 font-medium mb-1">Pole Earthing Exists</label>
            <select name="pole_earthing_exists" value={formData.pole_earthing_exists} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" disabled={isRestricted} required={isBallari}>
              <option value="">Select Earthing</option>
              <option value="YES">YES</option>
              <option value="NO">NO</option>
            </select>
          </div>
        )}

        {isTgpl && (
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <h3 className="font-bold text-primary text-base">Proposal Form</h3>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Req ARM No#</label>
              <input type="text" name="req_arm_number" value={formData.req_arm_number} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Req ARM Length</label>
              <input type="text" name="req_arm_length" value={formData.req_arm_length} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Req LED Lights No#</label>
              <input type="text" name="req_led_lights_no" value={formData.req_led_lights_no} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Req LED Wattage</label>
              <input type="text" name="req_led_wattage" value={formData.req_led_wattage} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Req Dedicated Wire</label>
              <input type="text" name="req_dedicated_wire" value={formData.req_dedicated_wire} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" />
            </div>
          </div>
        )}

         <div className="space-y-2">
          <label className="block text-gray-700 font-medium mb-1">Photos {isBallari && '(Compulsory)'}</label>
          
          {(isTgpl ? [1, 2] : [1, 2, 3]).map((num) => (
            <div key={num} className="border border-gray-200 p-2 rounded flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-600">Image Slot {num}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;

                  if (file.size > 15 * 1024 * 1024) {
                    alert("Image too large. Please choose a smaller image.");
                    return;
                  }

                  setCompressing(prev => ({ ...prev, [`image${num}`]: true }));
                  
                  const options = {
                    maxSizeMB: 0.4,
                    maxWidthOrHeight: 1600,
                    useWebWorker: true,
                    fileType: 'image/jpeg',
                    initialQuality: 0.75,
                  };

                  try {
                    console.log(`Original size for Slot ${num}: ${(file.size / 1024).toFixed(2)} KB`);
                    const compressedFile = await imageCompression(file, options);
                    console.log(`Compressed size for Slot ${num}: ${(compressedFile.size / 1024).toFixed(2)} KB`);
                    
                    // Preserve original filename if possible, or append .jpg
                    const fileName = file.name.split('.')[0] + '_compressed.jpg';
                    const renamedFile = new File([compressedFile], fileName, { type: 'image/jpeg' });
                    
                    setPhotos(prev => ({ ...prev, [`image${num}`]: renamedFile }));
                  } catch (error) {
                    console.error(`Compression error for Slot ${num}:`, error);
                    alert(`Failed to compress image in Slot ${num}. Using original.`);
                    setPhotos(prev => ({ ...prev, [`image${num}`]: file }));
                  } finally {
                    setCompressing(prev => ({ ...prev, [`image${num}`]: false }));
                  }
                }}
                className="text-xs"
                disabled={compressing[`image${num}`]}
              />
              {compressing[`image${num}`] && (
                <span className="text-xs text-amber-600 animate-pulse">Compressing image...</span>
              )}
              {photos[`image${num}`] && !compressing[`image${num}`] && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-green-600 truncate">Selected: {photos[`image${num}`].name}</span>
                  <button
                    type="button"
                    onClick={() => setPhotos(prev => ({ ...prev, [`image${num}`]: null }))}
                    className="text-red-500 hover:text-red-700 text-xs font-semibold ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={uploading || isCompressing}
          className="w-full bg-primary text-white p-3 rounded-lg font-medium hover:bg-primary-dark transition-colors mt-4 disabled:opacity-60"
        >
          {statusText ? statusText : uploading ? 'Submitting...' : isCompressing ? 'Compressing image...' : 'Submit Pole'}
        </button>
      </div>
    </form>
  );
};

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import imageCompression from 'browser-image-compression';
import API_BASE_URL from '../../../config/api';
import { offlineDb } from '../../../db/offlineDb';
import { offlineSyncService } from '../services/offlineSyncService';
import { getCurrentLocation } from '../../../shared/utils/geolocation';
import { isMobileEditRestricted } from '../utils/mobileRestrictions';
import { useAuthStore } from '../../../store/authStore';
import { InAppCamera } from '../../../shared/components/InAppCamera';
import { Camera } from 'lucide-react';

const getAutoRoadCategory = (roadType, roadWidthStr) => {
  if (!roadType) return null;
  const typeUpper = roadType.toUpperCase();
  const width = Number(roadWidthStr);

  if (typeUpper.includes('GALLI')) {
    return 'B2';
  }
  if (typeUpper.includes('RESIDENTIAL')) {
    if (!isNaN(width) && width > 0) {
      if (width <= 6) return 'B2';
      if (width === 8) return 'B1';
    }
  }
  if (typeUpper.includes('SUB MAIN')) {
    if (!isNaN(width) && width > 0) {
      if (width <= 8) return 'B1';
      if (width >= 10) return 'A2';
    }
  }
  if (typeUpper.includes('MAIN ROAD') || typeUpper === 'MAIN') {
    return 'A1';
  }
  return null;
};

export const PoleForm = ({ ulb, onBack }) => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isAutofillUser = new Set([
    'pratheekar1997@gmail.com',
    'sinchudev3@gmail.com',
    'sameershaik99495@gmail.com',
    'kanyagowdakavya24@gmail.com',
    'usharanik209@gmail.com',
    'divya.c127@gmail.com',
    'cmchaya37@gmail.com',
    'prajnatm29@gmail.com'
  ]).has((user?.email || '').toLowerCase());

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
  const [isCustomCcms, setIsCustomCcms] = useState(false);
  const [cameraTarget, setCameraTarget] = useState(null);

  const isCompressing = compressing.image1 || compressing.image2 || compressing.image3;

  const createOfflineSubmissionId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const buildImageFiles = () => Object.entries(photos)
    .filter(([, file]) => Boolean(file))
    .map(([fieldName, file]) => ({ fieldName, file, type: 'pole' }));

  const buildInitialImageStatus = (imageFiles) => imageFiles.reduce((acc, image) => {
    acc[image.fieldName] = false;
    return acc;
  }, {});

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
        setIsCustomCcms(false);
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
            updated.light_mounting_height = 'high mast';
            updated.light_type = 'high mast';
            updated.light_capacity = '200W';
            
          } else if (value === 'Mini Mast') {
            updated.pole_height = '12';
            updated.pole_condition = 'Good';
            updated.pole_earthing_exists = 'YES';
            updated.light_mounting_height = 'mini mast';
            updated.light_type = 'mini mast';
            updated.light_capacity = '150W';
          }
          else if (value === 'Tubular') {
            updated.pole_height = '12';
            updated.pole_condition = 'Good';
            updated.pole_earthing_exists = 'YES';
          }
          else if (value === 'Spun') {
            updated.pole_height = '12';
            updated.pole_condition = 'Good';
            updated.pole_earthing_exists = 'NO';
          }
          else if (value === 'Octoganal') {
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
        } else if (name === 'how_many_lights') {
          if (value === '0') {
            updated.light_type = 'empty';
            updated.light_capacity = '0W';
            updated.light_type_2 = 'empty';
            updated.light_capacity_2 = '0W';
          }
          else if(value === '1') {
            updated.light_type_2 = 'empty';
            updated.light_capacity_2 = '0W';
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
            updated.light_capacity = '250W';
          } else if (valLower === 'mini mast') {
            updated.light_capacity = '150W';
          } else if (valLower === 'high mast') {
            updated.light_capacity = '200W';
          } else if (valLower === 'bulb') {
            updated.light_capacity = '40W';
          }
        } else if (name === 'light_type_2') {
          const valLower = String(value || '').toLowerCase();
          if (valLower === 'led') {
            updated.light_capacity_2 = '40W';
          } else if (valLower === 'cfl') {
            updated.light_capacity_2 = '5W-25W';
          } else if (valLower === 'tube light') {
            updated.light_capacity_2 = '40W';
          } else if (valLower === 'svl') {
            updated.light_capacity_2 = '250W';
          } else if (valLower === 'mini mast') {
            updated.light_capacity_2 = '150W';
          } else if (valLower === 'high mast') {
            updated.light_capacity_2 = '200W';
          } else if (valLower === 'bulb') {
            updated.light_capacity_2 = '40W';
          }
        }
        if (name === 'road_type' || name === 'road_width') {
          const autoCategory = getAutoRoadCategory(updated.road_type, updated.road_width);
          if (autoCategory) {
            updated.road_category = autoCategory;
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

    // TGPL Survey: Prevent duplicate CCMS number inside the same ward
    if (isTgpl && isCustomCcms && formData.ccms_number) {
      const ccmsLower = String(formData.ccms_number).trim().toLowerCase();
      const duplicate = switchPoints.find(
        (sp) => String(sp.ccms_number || '').trim().toLowerCase() === ccmsLower
      );
      if (duplicate) {
        alert(`CCMS No# "${formData.ccms_number}" already exists in this ward. Please select it from the dropdown instead of creating a custom one.`);
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
        if (!allowed.has(k)) delete submitForm[k];
      });
    }

    const toNumberOrNull = (v) => (v === '' || v == null ? null : Number(v));
    const offlineSubmissionId = createOfflineSubmissionId();

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

    const imageFiles = buildImageFiles();
    const localRowPayload = {
      type: 'pole',
      offlineSubmissionId,
      data: { ...payload, offline_submission_id: offlineSubmissionId },
      images: imageFiles,
      imageUploadStatus: buildInitialImageStatus(imageFiles),
      status: 'pending',
      retryCount: 0,
      lastRetryAt: null,
      lastError: null,
      errorMessage: null,
      serverEntityId: null,
      uploadedImageCount: 0,
      createdAt: Date.now(),
      syncedAt: null,
      projectId,
      ulbId: ulb.id,
      wardNumber: formData.ward_number
    };
    const offlineRowId = await offlineDb.submissions.add(localRowPayload);

    try {
      // Step 1: Create the pole record
      const startTotal = performance.now();
      const startRecord = performance.now();
      const res = await axios.post(`${API_BASE_URL}/projects/${projectId}/pole-survey/pole`, {
        ...payload,
        offline_submission_id: offlineSubmissionId,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`⏱️ Pole record creation: ${(performance.now() - startRecord).toFixed(2)}ms`);

      const poleId = res.data.id;
      await offlineDb.submissions.update(offlineRowId, {
        status: 'syncing',
        serverEntityId: poleId,
        lastRetryAt: Date.now(),
        lastError: null,
        errorMessage: null,
      });

      // Step 2: Upload selected photos to Cloud Storage
      if (poleId && imageFiles.length > 0) {
        const imageStatus = { ...localRowPayload.imageUploadStatus };
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
          imageStatus[img.fieldName] = true;
          await offlineDb.submissions.update(offlineRowId, {
            imageUploadStatus: imageStatus,
            lastUploadedAt: Date.now(),
          });
          console.log(`⏱️ Image ${i + 1} upload: ${(performance.now() - startSingleImage).toFixed(2)}ms`);
        }
        console.log(`⏱️ Total images upload (${imageFiles.length}): ${(performance.now() - startAllImages).toFixed(2)}ms`);
      }

      await offlineDb.submissions.update(offlineRowId, {
        status: 'synced',
        syncedAt: Date.now(),
        lastError: null,
        errorMessage: null,
      });
      await offlineSyncService.cleanupSyncedRows();
      console.log(`🚀 Total submission time: ${(performance.now() - startTotal).toFixed(2)}ms`);
      queryClient.invalidateQueries(['submissions']);
      queryClient.invalidateQueries(['my-stats']);
      alert('Pole submitted successfully!');
      onBack();
    } catch (error) {
      console.error('Error creating pole:', error);

      await offlineDb.submissions.update(offlineRowId, {
        status: 'failed',
        retryCount: 1,
        lastRetryAt: Date.now(),
        lastError: error.response?.data?.message || error.message || 'Error creating pole',
        errorMessage: error.response?.data?.message || error.message || 'Error creating pole',
      });
      alert(!navigator.onLine || error.code === 'ERR_NETWORK' || !error.response
        ? 'No internet connection. Submission saved locally and will upload automatically when you have signal.'
        : (error.response?.data?.message || 'Error creating pole'));
      if (!navigator.onLine || error.code === 'ERR_NETWORK' || !error.response) {
        onBack();
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
              <select 
                name="dtc_capacity" 
                value={formData.dtc_capacity} 
                onChange={handleChange} 
                className="w-full p-2 border border-gray-200 rounded"
              >
                <option value="">Select DTC Capacity</option>
                {['25 KVA', '63 KVA', '100 KVA', '250 KVA', '500 KVA'].map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">CCMS No#</label>
              <select 
                value={isCustomCcms ? 'CUSTOM' : (formData.ccms_number || '')} 
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'CUSTOM') {
                    setIsCustomCcms(true);
                    setFormData(prev => ({
                      ...prev,
                      ccms_number: '',
                      switch_point_number: ''
                    }));
                  } else {
                    setIsCustomCcms(false);
                    setFormData(prev => ({
                      ...prev,
                      ccms_number: val,
                      switch_point_number: val
                    }));
                  }
                }} 
                className="w-full p-2 border border-gray-200 rounded text-sm bg-white"
                required
              >
                <option value="">Select CCMS No#</option>
                {switchPoints.map((sp) => (
                  <option key={sp.id} value={isTgpl ? sp.ccms_number : sp.switch_point_number}>
                    {isTgpl ? sp.ccms_number : sp.switch_point_number}
                  </option>
                ))}
                <option value="CUSTOM">+ Enter Custom CCMS No#</option>
              </select>

              {isCustomCcms && (
                <div className="mt-2">
                  <label className="block text-gray-600 text-xs font-medium mb-1">Custom CCMS No#</label>
                  <input 
                    type="text" 
                    placeholder="Type custom CCMS number"
                    value={formData.ccms_number || ''} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        ccms_number: val,
                        switch_point_number: val
                      }));
                    }} 
                    className="w-full p-2 border border-gray-200 rounded text-sm bg-white"
                    required
                  />
                </div>
              )}
              {switchPoints.length > 0 && !isCustomCcms && (
                <p className="text-xs text-green-600 mt-1">Latest CCMS No# auto-selected.</p>
              )}
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Meter Type</label>
              <select name="meter_type" value={formData.meter_type} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded">
                <option value="">Select Meter Type</option>
                <option value="1P">1P</option>
                <option value="3P">3P</option>
                <option value="NOT PRESENT">NOT PRESENT</option>
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
              <label className="block text-gray-700 font-medium mb-1">Meter Dismantal Status</label>
              <select name="meter_dimensional_status" value={formData.meter_dimensional_status} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded">
                <option value="">Select Status</option>
                <option value="YES">YES</option>
                <option value="NO">NO</option>
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
            <select name="distance_mtrs" value={formData.distance_mtrs} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" disabled={isRestricted} required={isBallari}>
              <option value="">Select Distance</option>
              {['10', '20', '25', '30', '40', '50'].map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}

        {!shouldHide('arm_type') && (
          <div>
            <label className="block text-gray-700 font-medium mb-1">ARM Type</label>
            <select name="arm_type" value={formData.arm_type} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" disabled={isRestricted} required={isBallari}>
              <option value="">Select ARM Type</option>
              {['single', 'double', 'multiple', 'empty/not present'].map((opt) => (
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
              {Array.from({ length: 13 }, (_, i) => i).map((opt) => (
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
              {['0W', '5W-25W', '40W', '65W', '90W', '120W', '150W', '200W', '250W', '400W'].map((opt) => (
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
                {['0W', '5W-25W', '40W', '65W', '90W', '120W', '150W', '200W', '250W', '400W'].map((opt) => (
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
            {[4, 5, 6, 7, 8, 9, 10, 12, 16, 18, 20, 24, 25, 30].map((opt) => (
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
              <select name="req_arm_number" value={formData.req_arm_number} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded">
                <option value="">Select...</option>
                {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Req ARM Length</label>
              <select name="req_arm_length" value={formData.req_arm_length} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded">
                <option value="">Select...</option>
                {['0', '1.0', '1.5', '2', '2.5'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Req LED Lights No#</label>
              <select name="req_led_lights_no" value={formData.req_led_lights_no} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded">
                <option value="">Select...</option>
                {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Req LED Wattage</label>
              <select name="req_led_wattage" value={formData.req_led_wattage} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded">
                <option value="">Select...</option>
                {['400W', '250W', '200W', '150W', '120W', '90W', '65W', '40W', '5-25W', '0W'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Req Dedicated Wire</label>
              <select name="req_dedicated_wire" value={formData.req_dedicated_wire} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded">
                <option value="">Select...</option>
                {['yes', 'no'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
        )}

         <div className="space-y-2">
           <label className="block text-gray-700 font-medium mb-1">Photos {isBallari && '(Compulsory)'}</label>
           
           {(isTgpl ? [1, 2] : [1, 2, 3]).map((num) => (
             <div key={num} className="border border-gray-200 p-2 rounded flex flex-col gap-1.5">
               <span className="text-sm font-medium text-gray-600">Image Slot {num}</span>
               
               <div className="flex flex-wrap items-center gap-2 mt-1">
                 <button
                   type="button"
                   onClick={() => setCameraTarget(num)}
                   className="bg-primary hover:bg-primary-dark text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                 >
                   <Camera size={14} /> Take Photo
                 </button>
               </div>

               {compressing[`image${num}`] && (
                 <span className="text-xs text-amber-600 animate-pulse font-medium">Compressing image...</span>
               )}
               {photos[`image${num}`] && !compressing[`image${num}`] && (
                 <div className="flex items-center justify-between bg-green-50 border border-green-100 p-1.5 rounded mt-1">
                   <span className="text-xs text-green-700 truncate font-medium">Selected: {photos[`image${num}`].name}</span>
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

       {cameraTarget && (
         <InAppCamera
           onClose={() => setCameraTarget(null)}
           onCapture={async (file) => {
             const num = cameraTarget;
             setCameraTarget(null);
             if (!file) return;

             setCompressing(prev => ({ ...prev, [`image${num}`]: true }));
             
             const options = {
               maxSizeMB: 0.4,
               maxWidthOrHeight: 1600,
               useWebWorker: true,
               fileType: 'image/jpeg',
               initialQuality: 0.75,
             };

             try {
               console.log(`Original size from camera for Slot ${num}: ${(file.size / 1024).toFixed(2)} KB`);
               const compressedFile = await imageCompression(file, options);
               console.log(`Compressed size from camera for Slot ${num}: ${(compressedFile.size / 1024).toFixed(2)} KB`);
               
               const fileName = `camera_slot_${num}_${Date.now()}_compressed.jpg`;
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
         />
       )}
     </form>
   );
};

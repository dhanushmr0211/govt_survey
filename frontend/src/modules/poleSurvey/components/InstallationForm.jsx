import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import imageCompression from 'browser-image-compression';
import API_BASE_URL from '../../../config/api';
import { offlineDb } from '../../../db/offlineDb';
import { offlineSyncService } from '../services/offlineSyncService';
import { getCurrentLocation } from '../../../shared/utils/geolocation';
import { useAuthStore } from '../../../store/authStore';
import { InAppCamera } from '../../../shared/components/InAppCamera';
import { Camera } from 'lucide-react';

export const InstallationForm = ({ ward, onBack }) => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const activeProject = useAuthStore((state) => state.activeProject);
  const projectId = activeProject?.id || 3;

  const [formData, setFormData] = useState({
    ccms_number: '',
    pole_number: '',
    pole_type: '',
    how_many_lights: '0',
    // Light 1
    light_type: '',
    light_wattage: '',
    light_status: '',
    arm_status: '',
    // Light 2
    light_type_2: '',
    light_wattage_2: '',
    light_status_2: '',
    arm_status_2: '',
    // Light 3
    light_type_3: '',
    light_wattage_3: '',
    light_status_3: '',
    arm_status_3: '',
    // Light 4
    light_type_4: '',
    light_wattage_4: '',
    light_status_4: '',
    arm_status_4: '',
    // Light 5
    light_type_5: '',
    light_wattage_5: '',
    light_status_5: '',
    arm_status_5: '',
    // Wire & Infra
    dedicated_wire: '',
    infra_gap: 'NA',
    remarks: '',
  });

  const [isCustomCcms, setIsCustomCcms] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [photos, setPhotos] = useState({ image1: null, image2: null, image3: null });
  const [compressing, setCompressing] = useState({ image1: false, image2: false, image3: false });
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
    .map(([fieldName, file]) => ({ fieldName, file, type: 'installation' }));

  const buildInitialImageStatus = (imageFiles) => imageFiles.reduce((acc, image) => {
    acc[image.fieldName] = false;
    return acc;
  }, {});

  // Fetch CCMS list in this ward
  const { data: ccmsList = [], isLoading: isLoadingCcms } = useQuery({
    queryKey: ['ccmsList', ward.id],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `${API_BASE_URL}/projects/${projectId}/pole-survey/ccms?ulb_id=${ward.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.data.ccms || [];
    },
    enabled: !!ward.id,
  });

  // Autofill latest CCMS
  useEffect(() => {
    if (ccmsList.length > 0) {
      setFormData((prev) => ({
        ...prev,
        ccms_number: ccmsList[0].ccms_number,
      }));
      setIsCustomCcms(false);
    } else {
      setIsCustomCcms(true);
    }
  }, [ccmsList]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'infra_gap' && value === 'NA') {
        setPhotos(p => ({ ...p, image3: null }));
      }
      return updated;
    });
  };

  const handleCcmsDropdownChange = (e) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsCustomCcms(true);
      setFormData((prev) => ({ ...prev, ccms_number: '' }));
    } else {
      setIsCustomCcms(false);
      setFormData((prev) => ({ ...prev, ccms_number: val }));
    }
  };

  const validateForm = () => {
    if (!formData.ccms_number || !formData.ccms_number.trim()) {
      alert('CCMS Number is required.');
      return false;
    }
    if (!formData.pole_number || !formData.pole_number.trim()) {
      alert('Pole Number is required.');
      return false;
    }
    if (!formData.pole_type) {
      alert('Pole Type is required.');
      return false;
    }
    const count = Number(formData.how_many_lights);
    if (formData.how_many_lights === '' || isNaN(count) || count < 0) {
      alert('Please select light count.');
      return false;
    }

    for (let i = 1; i <= count; i++) {
      const suffix = i === 1 ? '' : `_${i}`;
      const lType = formData[`light_type${suffix}`];
      const lWatt = formData[`light_wattage${suffix}`];
      const lStat = formData[`light_status${suffix}`];
      const aStat = formData[`arm_status${suffix}`];

      if (!lType) {
        alert(`Please select Light Type for Light ${i}.`);
        return false;
      }
      if (!lWatt) {
        alert(`Please select Wattage for Light ${i}.`);
        return false;
      }
      if (!lStat) {
        alert(`Please select Light Status for Light ${i}.`);
        return false;
      }
      if (!aStat) {
        alert(`Please select ARM Status for Light ${i}.`);
        return false;
      }
    }

    if (!formData.dedicated_wire) {
      alert('Please select Dedicated Wire (YES/NO).');
      return false;
    }
    if (!formData.infra_gap) {
      alert('Please select Infra Gap.');
      return false;
    }

    if (!photos.image1) {
      alert('IMAGE 1: Pole Number Image is required.');
      return false;
    }
    if (!photos.image2) {
      alert('IMAGE 2: Full Pole Image is required.');
      return false;
    }
    if (formData.infra_gap !== 'NA' && !photos.image3) {
      alert('IMAGE 3: Infra Gap Image is required when Infra Gap is not NA.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

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

    const lightCount = Number(formData.how_many_lights);
    const offlineSubmissionId = createOfflineSubmissionId();

    const payload = {
      ward_id: ward.id,
      ward_number: ward.name,
      survey_type: 'installation',
      ccms_number: formData.ccms_number.trim(),
      pole_number: formData.pole_number.trim(),
      pole_type: formData.pole_type,
      how_many_lights_in_pole: String(formData.how_many_lights),
      latitude: coords.latitude,
      longitude: coords.longitude,
      project_id: projectId,
      created_by: user?.id,
      
      // Light 1
      light_type: lightCount >= 1 ? formData.light_type : '',
      light_wattage: lightCount >= 1 ? formData.light_wattage : '',
      light_status: lightCount >= 1 ? formData.light_status : '',
      arm_status: lightCount >= 1 ? formData.arm_status : '',
      
      // Light 2
      light_type_2: lightCount >= 2 ? formData.light_type_2 : '',
      light_wattage_2: lightCount >= 2 ? formData.light_wattage_2 : '',
      light_status_2: lightCount >= 2 ? formData.light_status_2 : '',
      arm_status_2: lightCount >= 2 ? formData.arm_status_2 : '',

      // Light 3
      light_type_3: lightCount >= 3 ? formData.light_type_3 : '',
      light_wattage_3: lightCount >= 3 ? formData.light_wattage_3 : '',
      light_status_3: lightCount >= 3 ? formData.light_status_3 : '',
      arm_status_3: lightCount >= 3 ? formData.arm_status_3 : '',

      // Light 4
      light_type_4: lightCount >= 4 ? formData.light_type_4 : '',
      light_wattage_4: lightCount >= 4 ? formData.light_wattage_4 : '',
      light_status_4: lightCount >= 4 ? formData.light_status_4 : '',
      arm_status_4: lightCount >= 4 ? formData.arm_status_4 : '',

      // Light 5
      light_type_5: lightCount >= 5 ? formData.light_type_5 : '',
      light_wattage_5: lightCount >= 5 ? formData.light_wattage_5 : '',
      light_status_5: lightCount >= 5 ? formData.light_status_5 : '',
      arm_status_5: lightCount >= 5 ? formData.arm_status_5 : '',

      // Wire & Infra
      dedicated_wire: formData.dedicated_wire,
      infra_gap: formData.infra_gap,
      remarks: formData.remarks || null,
    };

    const imageFiles = buildImageFiles();
    const localRowPayload = {
      type: 'installation',
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
      ulbId: ward.id,
      wardNumber: ward.name,
    };
    const offlineRowId = await offlineDb.submissions.add(localRowPayload);

    try {
      const res = await axios.post(`${API_BASE_URL}/projects/${projectId}/pole-survey/pole`, {
        ...payload,
        offline_submission_id: offlineSubmissionId,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const instId = res.data.id;
      await offlineDb.submissions.update(offlineRowId, {
        status: 'syncing',
        serverEntityId: instId,
        lastRetryAt: Date.now(),
        lastError: null,
        errorMessage: null,
      });
      if (instId && imageFiles.length > 0) {
        const imageStatus = { ...localRowPayload.imageUploadStatus };
        setStatusText('Uploading photos...');
        for (let i = 0; i < imageFiles.length; i++) {
          const img = imageFiles[i];
          const formDataUpload = new FormData();
          formDataUpload.append('file', img.file);
          formDataUpload.append('entity_type', 'installation');
          formDataUpload.append('entity_id', instId);
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
        }
      }

      await offlineDb.submissions.update(offlineRowId, {
        status: 'synced',
        syncedAt: Date.now(),
        lastError: null,
        errorMessage: null,
      });
      await offlineSyncService.cleanupSyncedRows();

      queryClient.invalidateQueries(['submissions']);
      queryClient.invalidateQueries(['my-stats']);
      alert('Installation record submitted successfully!');
      
      // Reset form
      setPhotos({ image1: null, image2: null, image3: null });
      setFormData((prev) => ({
        ccms_number: prev.ccms_number,
        pole_number: '',
        pole_type: '',
        how_many_lights: '0',
        light_type: '',
        light_wattage: '',
        light_status: '',
        arm_status: '',
        light_type_2: '',
        light_wattage_2: '',
        light_status_2: '',
        arm_status_2: '',
        light_type_3: '',
        light_wattage_3: '',
        light_status_3: '',
        arm_status_3: '',
        light_type_4: '',
        light_wattage_4: '',
        light_status_4: '',
        arm_status_4: '',
        light_type_5: '',
        light_wattage_5: '',
        light_status_5: '',
        arm_status_5: '',
        dedicated_wire: '',
        infra_gap: 'NA',
        remarks: '',
      }));
    } catch (error) {
      console.error('Error submitting installation:', error);

      await offlineDb.submissions.update(offlineRowId, {
        status: 'failed',
        retryCount: 1,
        lastRetryAt: Date.now(),
        lastError: error.response?.data?.message || error.message || 'Error submitting installation',
        errorMessage: error.response?.data?.message || error.message || 'Error submitting installation',
      });
      alert(!navigator.onLine || error.code === 'ERR_NETWORK' || !error.response
        ? 'No internet connection. Submission saved locally and will upload automatically when you have signal.'
        : (error.response?.data?.message || 'Error submitting installation'));

      setPhotos({ image1: null, image2: null, image3: null });
      setFormData((prev) => ({
        ccms_number: prev.ccms_number,
        pole_number: '',
        pole_type: '',
        how_many_lights: '0',
        light_type: '',
        light_wattage: '',
        light_status: '',
        arm_status: '',
        light_type_2: '',
        light_wattage_2: '',
        light_status_2: '',
        arm_status_2: '',
        light_type_3: '',
        light_wattage_3: '',
        light_status_3: '',
        arm_status_3: '',
        light_type_4: '',
        light_wattage_4: '',
        light_status_4: '',
        arm_status_4: '',
        light_type_5: '',
        light_wattage_5: '',
        light_status_5: '',
        arm_status_5: '',
        dedicated_wire: '',
        infra_gap: 'NA',
        remarks: '',
      }));
    } finally {
      setUploading(false);
      setStatusText('');
    }
  };

  const poleTypeOptions = ['RCC', 'TUBULAR', 'HIGH MAST', 'MINI MAST'];
  const lightTypeOptions = ['CGL LED', 'OTHER LED', 'SVL', 'TL', 'FTL', 'CFL'];
  const wattageOptions = ['25 W', '35 W', '40 W', '65 W', '90 W', '100 W', '120 W', '150 W', '200 W'];
  const lightStatusOptions = ['WORKING', 'NOT WORKING'];
  const armStatusOptions = ['NEW', 'OLD', 'EMPTY'];
  const dedicatedWireOptions = ['YES', 'NO'];
  const infraGapOptions = ['UG CABLE DAMAGE', 'AB CABLE DAMAGE', 'PC MISSING', 'OPEN JUNCTION BOX', 'POWER CABLE ON GROUND', 'NA'];

  const renderLightFields = (num) => {
    const suffix = num === 1 ? '' : `_${num}`;
    return (
      <div key={num} className="p-3.5 border border-gray-200 rounded-xl bg-gray-50/70 space-y-3 shadow-sm">
        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary inline-block"></span> Light {num} Details
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-gray-700 font-semibold mb-1 text-xs">Light Type *</label>
            <select
              name={`light_type${suffix}`}
              value={formData[`light_type${suffix}`]}
              onChange={handleChange}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            >
              <option value="">Select Light Type</option>
              {lightTypeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1 text-xs">Wattage *</label>
            <select
              name={`light_wattage${suffix}`}
              value={formData[`light_wattage${suffix}`]}
              onChange={handleChange}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            >
              <option value="">Select Wattage</option>
              {wattageOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1 text-xs">Light Status *</label>
            <select
              name={`light_status${suffix}`}
              value={formData[`light_status${suffix}`]}
              onChange={handleChange}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            >
              <option value="">Select Status</option>
              {lightStatusOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1 text-xs">ARM Status *</label>
            <select
              name={`arm_status${suffix}`}
              value={formData[`arm_status${suffix}`]}
              onChange={handleChange}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            >
              <option value="">Select ARM Status</option>
              {armStatusOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  };

  const imageSlots = [
    { num: 1, key: 'image1', label: 'Image 1: Pole Number Image *', required: true },
    { num: 2, key: 'image2', label: 'Image 2: Full Pole Image *', required: true },
  ];

  if (formData.infra_gap && formData.infra_gap !== 'NA') {
    imageSlots.push({ num: 3, key: 'image3', label: 'Image 3: Infra Gap Image *', required: true });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5 max-h-[75vh] overflow-y-auto">
      <div className="flex justify-between items-center border-b pb-3 mb-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Installation Form</h2>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{ward.name}</p>
        </div>
        <button type="button" onClick={onBack} className="text-sm font-semibold text-primary hover:text-primary-dark">Back</button>
      </div>

      <div className="space-y-4 text-sm">
        {/* CCMS Number */}
        <div>
          <label className="block text-gray-700 font-semibold mb-1">CCMS Number *</label>
          {isLoadingCcms ? (
            <div className="h-9 w-full bg-gray-50 animate-pulse rounded border border-gray-200"></div>
          ) : isCustomCcms ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  name="ccms_number"
                  placeholder="Enter CCMS Number"
                  value={formData.ccms_number}
                  onChange={handleChange}
                  className="flex-1 p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                  required
                />
                {ccmsList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCcms(false);
                      if (ccmsList.length > 0) {
                        setFormData((prev) => ({ ...prev, ccms_number: ccmsList[0].ccms_number }));
                      }
                    }}
                    className="px-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-xs font-semibold text-gray-600"
                  >
                    Select Existing
                  </button>
                )}
              </div>
            </div>
          ) : (
            <select
              value={formData.ccms_number}
              onChange={handleCcmsDropdownChange}
              className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium"
              required
            >
              {ccmsList.map((sp) => (
                <option key={sp.id} value={sp.ccms_number}>
                  {sp.ccms_number}
                </option>
              ))}
              <option value="__custom__">+ Enter Custom CCMS Number</option>
            </select>
          )}
        </div>

        {/* Pole Number */}
        <div>
          <label className="block text-gray-700 font-semibold mb-1">Pole Number *</label>
          <input
            type="text"
            name="pole_number"
            placeholder="Enter Pole Number"
            value={formData.pole_number}
            onChange={handleChange}
            className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            required
          />
        </div>

        {/* Pole Type (1. under the pole number ask for pole type) */}
        <div>
          <label className="block text-gray-700 font-semibold mb-1">Pole Type *</label>
          <select
            name="pole_type"
            value={formData.pole_type}
            onChange={handleChange}
            className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium"
            required
          >
            <option value="">Select Pole Type</option>
            {poleTypeOptions.map((pt) => (
              <option key={pt} value={pt}>{pt}</option>
            ))}
          </select>
        </div>

        {/* How Many Lights */}
        <div>
          <label className="block text-gray-700 font-semibold mb-1">How Many Lights *</label>
          <select
            name="how_many_lights"
            value={formData.how_many_lights}
            onChange={handleChange}
            className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            required
          >
            {['0', '1', '2', '3', '4', '5'].map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        {/* Dynamic Light Fields */}
        {Number(formData.how_many_lights) > 0 && (
          <div className="space-y-4 pt-2 border-t border-gray-100">
            {Array.from({ length: Number(formData.how_many_lights) }, (_, i) => i + 1).map((num) =>
              renderLightFields(num)
            )}
          </div>
        )}

        {/* After Light Section: Dedicated Wire & Infra Gap */}
        <div className="pt-2 border-t border-gray-100 space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Dedicated Wire *</label>
            <select
              name="dedicated_wire"
              value={formData.dedicated_wire}
              onChange={handleChange}
              className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium"
              required
            >
              <option value="">Select Dedicated Wire</option>
              {dedicatedWireOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1">Infra Gap *</label>
            <select
              name="infra_gap"
              value={formData.infra_gap}
              onChange={handleChange}
              className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium"
              required
            >
              {infraGapOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Image Uploads */}
        <div className="space-y-3 pt-2 border-t border-gray-100">
          <label className="block text-gray-700 font-semibold mb-1">Photographs (All Required)</label>
          {imageSlots.map(({ num, key, label }) => (
            <div key={num} className="border border-gray-200 p-3 rounded-xl flex flex-col gap-1.5 bg-gray-50/50">
              <span className="text-xs font-bold text-gray-700">{label}</span>
              
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setCameraTarget(num)}
                  className="bg-primary hover:bg-primary-dark text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Camera size={14} /> Take Photo
                </button>
              </div>

              {compressing[key] && (
                <span className="text-xs text-amber-600 animate-pulse font-semibold mt-1">Compressing image...</span>
              )}
              {photos[key] && !compressing[key] && (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 p-2 rounded-lg mt-1">
                  <span className="text-xs text-green-700 truncate font-semibold">Selected: {photos[key].name}</span>
                  <button
                    type="button"
                    onClick={() => setPhotos(prev => ({ ...prev, [key]: null }))}
                    className="text-red-500 hover:text-red-700 text-xs font-bold ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Remarks */}
        <div className="pt-2">
          <label className="block text-gray-700 font-semibold mb-1">Remarks</label>
          <textarea
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
            rows={3}
            placeholder="Enter any remarks here..."
            className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={uploading || isCompressing}
          className="w-full bg-primary text-white p-3.5 rounded-xl font-bold hover:bg-primary-dark transition-all mt-6 shadow-md shadow-primary/20 disabled:opacity-60 text-sm"
        >
          {statusText ? statusText : uploading ? 'Submitting...' : isCompressing ? 'Compressing image...' : 'Submit Installation'}
        </button>
      </div>

      {cameraTarget && (
        <InAppCamera
          onClose={() => setCameraTarget(null)}
          poleNumber={formData.pole_number || ''}
          wardNumber={ward?.name || ''}
          ccmsNumber={formData.ccms_number || ''}
          onCapture={async (file) => {
            const num = cameraTarget;
            const key = `image${num}`;
            setCameraTarget(null);
            if (!file) return;

            setCompressing(prev => ({ ...prev, [key]: true }));
            
            const options = {
              maxSizeMB: 0.4,
              maxWidthOrHeight: 1600,
              useWebWorker: true,
              fileType: 'image/jpeg',
              initialQuality: 0.75,
            };

            try {
              const compressedFile = await imageCompression(file, options);
              const fileName = `installation_slot_${num}_${Date.now()}_compressed.jpg`;
              const renamedFile = new File([compressedFile], fileName, { type: 'image/jpeg' });
              
              setPhotos(prev => ({ ...prev, [key]: renamedFile }));
            } catch (error) {
              console.error(`Compression error for Slot ${num}:`, error);
              alert(`Failed to compress image in Slot ${num}. Using original.`);
              setPhotos(prev => ({ ...prev, [key]: file }));
            } finally {
              setCompressing(prev => ({ ...prev, [key]: false }));
            }
          }}
        />
      )}
    </form>
  );
};

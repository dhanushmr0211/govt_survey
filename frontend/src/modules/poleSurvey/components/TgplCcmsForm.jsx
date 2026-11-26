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
import { Camera, MapPin, Loader2, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';

export const TgplCcmsForm = ({ ward, onBack }) => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const activeProject = useAuthStore((state) => state.activeProject);
  const projectId = activeProject?.id || 3;

  const [formData, setFormData] = useState({
    ccms_number: '',
    installed_pole_number: '',
    supply_input: '',
    ccms_phase: '',
    dtc_number: '',
    rr_number: '',
    bescom_meter_sl_number: '',
    is_ct_meter: '',
    bescom_meter_status: '',
    ccms_uid_no: '',
    ccms_meter_no: '',
    ccms_imei_no: '',
    latitude: '',
    longitude: '',
    earthing_completed: '',
    ccms_landmark: '',
    ccms_meter_voltage: '',
    ccms_meter_current: '',
    ccms_meter_pf: '',
    ccms_meter_power_kw: '',
    bescom_meter_reading_no: '',
    bescom_meter_voltage: '',
    bescom_meter_current: '',
    bescom_meter_pf: '',
    bescom_meter_power_kw: '',
  });

  const [isCustomCcms, setIsCustomCcms] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState(null);

  // Photos state: 3 mandatory images
  // image1: BESCOM Meter Serial Number Image
  // image2: CCMS Meter Serial Number Image
  // image3: CCMS Box Image
  const [photos, setPhotos] = useState({ image1: null, image2: null, image3: null });
  const [compressing, setCompressing] = useState({ image1: false, image2: false, image3: false });
  const [cameraTarget, setCameraTarget] = useState(null);

  const isCompressing = compressing.image1 || compressing.image2 || compressing.image3;

  // 1. Fetch existing CCMS points created through tgpl_ccms in this ward only
  const { data: wardCcmsData, isLoading: isLoadingCcms } = useQuery({
    queryKey: ['tgplCcmsByWard', projectId, ward.id],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `${API_BASE_URL}/projects/${projectId}/tgpl-survey/ccms/by-ward/${ward.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.data;
    },
    enabled: !!ward.id,
  });

  const existingCcmsList = wardCcmsData?.ccms || [];
  const lastCreatedCcms = wardCcmsData?.lastCcms || null;

  // Auto-select latest CCMS from tgpl_ccms if available, otherwise switch to custom input
  useEffect(() => {
    if (existingCcmsList.length > 0) {
      const defaultCcms = lastCreatedCcms?.ccms_number || existingCcmsList[0]?.ccms_number;
      setFormData((prev) => ({
        ...prev,
        ccms_number: defaultCcms || '',
      }));
      setIsCustomCcms(false);
    } else {
      setIsCustomCcms(true);
    }
  }, [existingCcmsList, lastCreatedCcms]);

  // Handle GPS location capture
  const handleGetLocation = async () => {
    setLocationLoading(true);
    try {
      const loc = await getCurrentLocation();
      setFormData((prev) => ({
        ...prev,
        latitude: String(loc.latitude),
        longitude: String(loc.longitude),
      }));
      if (loc.accuracy) {
        setLocationAccuracy(Math.round(loc.accuracy));
      }
    } catch (err) {
      alert(err.message || 'Failed to get GPS location');
    } finally {
      setLocationLoading(false);
    }
  };

  // Change handler with automatic trimming and numeric validation on installed_pole_number
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'installed_pole_number') {
      // Numbers only: strip any non-digit character
      const numericVal = value.replace(/\D/g, '');
      setFormData((prev) => ({ ...prev, [name]: numericVal }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
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

  // Image handling with compression
  const handlePhotoSelect = async (target, file) => {
    if (!file) return;
    setCompressing((prev) => ({ ...prev, [target]: true }));
    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      };
      const compressed = await imageCompression(file, options);
      setPhotos((prev) => ({ ...prev, [target]: compressed }));
    } catch (err) {
      console.error('Compression failed:', err);
      setPhotos((prev) => ({ ...prev, [target]: file }));
    } finally {
      setCompressing((prev) => ({ ...prev, [target]: false }));
      setCameraTarget(null);
    }
  };

  const createOfflineSubmissionId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const validateForm = () => {
    const trimStr = (v) => (v !== undefined && v !== null ? String(v).trim() : '');

    if (!trimStr(formData.ccms_number)) {
      alert('CCMS Number is compulsory.');
      return false;
    }

    const poleNum = trimStr(formData.installed_pole_number);
    if (!poleNum || !/^\d+$/.test(poleNum)) {
      alert('Installed Pole Number is compulsory and must contain numbers only.');
      return false;
    }

    const requiredFields = [
      { key: 'supply_input', label: 'Supply Input (ABC/UG/ACSR)' },
      { key: 'ccms_phase', label: 'CCMS Phase (1Ph/3Ph)' },
      { key: 'dtc_number', label: 'DTC No' },
      { key: 'rr_number', label: 'RR Number' },
      { key: 'bescom_meter_sl_number', label: 'BESCOM Meter Sl. Number' },
      { key: 'is_ct_meter', label: 'Is it CT Meter (Yes/No)' },
      { key: 'bescom_meter_status', label: 'BESCOM Meter (Working Status)' },
      { key: 'ccms_uid_no', label: 'CCMS UID No' },
      { key: 'ccms_meter_no', label: 'CCMS Meter No' },
      { key: 'ccms_imei_no', label: 'CCMS IMEI No' },
      { key: 'latitude', label: 'Latitude' },
      { key: 'longitude', label: 'Longitude' },
      { key: 'earthing_completed', label: 'Earthing Completed (Yes/No)' },
      { key: 'ccms_landmark', label: 'CCMS Landmark (In front of)' },
      { key: 'ccms_meter_voltage', label: 'CCMS Meter - Voltage' },
      { key: 'ccms_meter_current', label: 'CCMS Meter - Current' },
      { key: 'ccms_meter_pf', label: 'CCMS Meter - PF' },
      { key: 'ccms_meter_power_kw', label: 'CCMS Meter - Power (kW)' },
      { key: 'bescom_meter_reading_no', label: 'BESCOM Meter Reading No' },
      { key: 'bescom_meter_voltage', label: 'BESCOM Meter - Voltage' },
      { key: 'bescom_meter_current', label: 'BESCOM Meter - Current' },
      { key: 'bescom_meter_pf', label: 'BESCOM Meter - PF' },
      { key: 'bescom_meter_power_kw', label: 'BESCOM Meter - Power (kW)' },
    ];

    for (const f of requiredFields) {
      if (!trimStr(formData[f.key])) {
        alert(`${f.label} is compulsory.`);
        return false;
      }
    }

    if (!photos.image1) {
      alert('BESCOM Meter Serial Number Image is compulsory.');
      return false;
    }
    if (!photos.image2) {
      alert('CCMS Meter Serial Number Image is compulsory.');
      return false;
    }
    if (!photos.image3) {
      alert('CCMS Box Image is compulsory.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setUploading(true);
    setStatusText('Preparing submission...');

    const token = localStorage.getItem('token');
    const offlineSubmissionId = createOfflineSubmissionId();

    const trimStr = (v) => (v !== undefined && v !== null ? String(v).trim() : '');

    // Trim all values to ensure no leading/trailing whitespace
    const payload = {
      ward_id: ward.id,
      ward_number: trimStr(ward.name),
      ccms_number: trimStr(formData.ccms_number),
      installed_pole_number: trimStr(formData.installed_pole_number),
      supply_input: trimStr(formData.supply_input),
      ccms_phase: trimStr(formData.ccms_phase),
      dtc_number: trimStr(formData.dtc_number),
      rr_number: trimStr(formData.rr_number),
      bescom_meter_sl_number: trimStr(formData.bescom_meter_sl_number),
      is_ct_meter: trimStr(formData.is_ct_meter),
      bescom_meter_status: trimStr(formData.bescom_meter_status),
      ccms_uid_no: trimStr(formData.ccms_uid_no),
      ccms_meter_no: trimStr(formData.ccms_meter_no),
      ccms_imei_no: trimStr(formData.ccms_imei_no),
      latitude: Number(formData.latitude) || 0,
      longitude: Number(formData.longitude) || 0,
      earthing_completed: trimStr(formData.earthing_completed),
      ccms_landmark: trimStr(formData.ccms_landmark),
      ccms_meter_voltage: trimStr(formData.ccms_meter_voltage),
      ccms_meter_current: trimStr(formData.ccms_meter_current),
      ccms_meter_pf: trimStr(formData.ccms_meter_pf),
      ccms_meter_power_kw: trimStr(formData.ccms_meter_power_kw),
      bescom_meter_reading_no: trimStr(formData.bescom_meter_reading_no),
      bescom_meter_voltage: trimStr(formData.bescom_meter_voltage),
      bescom_meter_current: trimStr(formData.bescom_meter_current),
      bescom_meter_pf: trimStr(formData.bescom_meter_pf),
      bescom_meter_power_kw: trimStr(formData.bescom_meter_power_kw),
      survey_type: 'ccms',
      type: 'ccms',
    };

    const imageFiles = [
      { fieldName: 'bescom_meter_image_url', file: photos.image1, slot: 1, type: 'ccms' },
      { fieldName: 'ccms_meter_image_url', file: photos.image2, slot: 2, type: 'ccms' },
      { fieldName: 'ccms_box_image_url', file: photos.image3, slot: 3, type: 'ccms' },
    ];

    const localRowPayload = {
      type: 'ccms',
      offlineSubmissionId,
      data: { ...payload, offline_submission_id: offlineSubmissionId },
      images: imageFiles,
      imageUploadStatus: {
        bescom_meter_image_url: false,
        ccms_meter_image_url: false,
        ccms_box_image_url: false,
      },
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

    let offlineRowId = null;
    try {
      offlineRowId = await offlineDb.submissions.add(localRowPayload);
    } catch (dbErr) {
      console.warn('Failed to add to local offlineDb:', dbErr);
    }

    // Track accumulated image status so retries know which images are already done
    const accumulatedImageStatus = {
      bescom_meter_image_url: false,
      ccms_meter_image_url: false,
      ccms_box_image_url: false,
    };

    try {
      setStatusText('Saving CCMS Survey record...');
      const res = await axios.post(
        `${API_BASE_URL}/projects/${projectId}/tgpl-survey/ccms`,
        {
          ...payload,
          offline_submission_id: offlineSubmissionId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const ccmsRecord = res.data.ccms || res.data;
      const ccmsId = ccmsRecord.id;

      if (offlineRowId) {
        await offlineDb.submissions.update(offlineRowId, {
          status: 'syncing',
          serverEntityId: ccmsId,
          lastRetryAt: Date.now(),
        });
      }

      // Upload the 3 mandatory photos one by one with proper status tracking
      if (ccmsId) {
        setStatusText('Uploading 3 mandatory images...');
        for (let i = 0; i < imageFiles.length; i++) {
          const img = imageFiles[i];
          if (!img.file) continue;
          setStatusText(`Uploading ${i + 1}/3: ${img.fieldName.replace(/_/g, ' ')}...`);
          const formDataUpload = new FormData();
          formDataUpload.append('file', img.file);
          formDataUpload.append('entity_type', 'ccms');
          formDataUpload.append('entity_id', ccmsId);
          formDataUpload.append('field_name', img.fieldName);
          formDataUpload.append('slot', img.slot || (i + 1));

          try {
            await axios.post(
              `${API_BASE_URL}/projects/${projectId}/tgpl-survey/files`,
              formDataUpload,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            accumulatedImageStatus[img.fieldName] = true;
          } catch (imgErr) {
            console.error(`[CCMS] Image ${img.fieldName} upload failed:`, imgErr.message);
            // Don't throw — continue uploading remaining images, let retry handle failures
          }

          if (offlineRowId) {
            await offlineDb.submissions.update(offlineRowId, {
              imageUploadStatus: { ...accumulatedImageStatus },
              uploadedImageCount: Object.values(accumulatedImageStatus).filter(Boolean).length,
            });
          }
        }
      }

      // Check if all images uploaded successfully
      const allImagesUploaded = Object.values(accumulatedImageStatus).every(Boolean);

      if (allImagesUploaded) {
        // All done — mark as synced
        if (offlineRowId) {
          await offlineDb.submissions.update(offlineRowId, {
            status: 'synced',
            syncedAt: Date.now(),
          });
          await offlineSyncService.cleanupSyncedRows();
        }

        queryClient.invalidateQueries(['tgplCcmsByWard', projectId, ward.id]);
        queryClient.invalidateQueries(['submissions']);
        queryClient.invalidateQueries(['my-stats']);

        alert('CCMS Survey submitted successfully!');

        // Reset form fields
        setPhotos({ image1: null, image2: null, image3: null });
        setFormData((prev) => ({
          ...prev,
          installed_pole_number: '',
          supply_input: '',
          ccms_phase: '',
          dtc_number: '',
          rr_number: '',
          bescom_meter_sl_number: '',
          is_ct_meter: '',
          bescom_meter_status: '',
          ccms_uid_no: '',
          ccms_meter_no: '',
          ccms_imei_no: '',
          earthing_completed: '',
          ccms_landmark: '',
          ccms_meter_voltage: '',
          ccms_meter_current: '',
          ccms_meter_pf: '',
          ccms_meter_power_kw: '',
          bescom_meter_reading_no: '',
          bescom_meter_voltage: '',
          bescom_meter_current: '',
          bescom_meter_pf: '',
          bescom_meter_power_kw: '',
        }));
      } else {
        // Some images failed — keep the offline row so the background sync can retry them
        if (offlineRowId) {
          const failedFields = Object.entries(accumulatedImageStatus)
            .filter(([, v]) => !v).map(([k]) => k);
          await offlineDb.submissions.update(offlineRowId, {
            status: 'failed',
            lastError: `Image upload failed for: ${failedFields.join(', ')}. Will retry automatically.`,
          });
        }

        queryClient.invalidateQueries(['tgplCcmsByWard', projectId, ward.id]);
        queryClient.invalidateQueries(['submissions']);
        queryClient.invalidateQueries(['my-stats']);

        alert('CCMS record saved but some images failed to upload. They will be retried automatically in the background.');

        // Still reset the form — the record exists, images will be retried by offlineSyncService
        setPhotos({ image1: null, image2: null, image3: null });
        setFormData((prev) => ({
          ...prev,
          installed_pole_number: '',
          supply_input: '',
          ccms_phase: '',
          dtc_number: '',
          rr_number: '',
          bescom_meter_sl_number: '',
          is_ct_meter: '',
          bescom_meter_status: '',
          ccms_uid_no: '',
          ccms_meter_no: '',
          ccms_imei_no: '',
          earthing_completed: '',
          ccms_landmark: '',
          ccms_meter_voltage: '',
          ccms_meter_current: '',
          ccms_meter_pf: '',
          ccms_meter_power_kw: '',
          bescom_meter_reading_no: '',
          bescom_meter_voltage: '',
          bescom_meter_current: '',
          bescom_meter_pf: '',
          bescom_meter_power_kw: '',
        }));
      }
    } catch (error) {
      console.error('CCMS submit error:', error);
      const isClientError = error.response && error.response.status >= 400 && error.response.status < 500;
      
      if (offlineRowId) {
        // Check if the record was already created on the server
        const currentRow = await offlineDb.submissions.get(offlineRowId).catch(() => null);
        const hasServerRecord = currentRow?.serverEntityId;
        
        if (isClientError && !hasServerRecord) {
          // 4xx on record creation itself (validation error) — safe to delete, no server record exists
          try {
            await offlineDb.submissions.delete(offlineRowId);
          } catch (delErr) {
            console.warn('Could not delete failed offline row:', delErr);
          }
        } else {
          // Record exists on server but image upload failed, OR network error — keep for retry
          await offlineDb.submissions.update(offlineRowId, {
            status: 'failed',
            lastError: error.response?.data?.message || error.message || 'Upload failed',
            lastRetryAt: Date.now(),
          }).catch(() => {});
        }
      }
      
      const errMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Error submitting CCMS record';
      if (!navigator.onLine) {
        alert('Offline: CCMS Survey saved to offline queue. It will automatically upload when network reconnects.');
      } else {
        alert(errMsg);
      }
    } finally {
      setUploading(false);
      setStatusText('');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="p-1 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-base font-bold text-gray-900">CCMS Survey Form</h2>
            <p className="text-xs text-primary font-semibold">Ward: {ward.name}</p>
          </div>
        </div>
        <span className="rounded bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
          TGPL Project 3
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* SECTION 1: CCMS Number & Installed Pole */}
        <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-150 space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary"></span> CCMS Point Identification
          </h3>

          {/* CCMS Number (Select from tgpl_ccms or Enter New) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">
              CCMS Number <span className="text-red-500">*</span>
            </label>
            {existingCcmsList.length > 0 && !isCustomCcms ? (
              <div className="space-y-1.5">
                <select
                  value={formData.ccms_number}
                  onChange={handleCcmsDropdownChange}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary"
                >
                  {existingCcmsList.map((item) => (
                    <option key={item.id} value={item.ccms_number}>
                      {item.ccms_number} {lastCreatedCcms?.ccms_number === item.ccms_number ? '(Latest)' : ''}
                    </option>
                  ))}
                  <option value="__custom__">+ Enter New CCMS Number</option>
                </select>
                <p className="text-[11px] text-gray-500">
                  Select an existing CCMS point created in this ward or choose "+ Enter New CCMS Number".
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <input
                  type="text"
                  name="ccms_number"
                  value={formData.ccms_number}
                  onChange={handleChange}
                  placeholder="e.g. CCMS-12"
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary"
                  required
                />
                {existingCcmsList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCcms(false);
                      setFormData((p) => ({
                        ...p,
                        ccms_number: lastCreatedCcms?.ccms_number || existingCcmsList[0]?.ccms_number || '',
                      }));
                    }}
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    ← Select from previously created CCMS in this ward
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Installed Pole Number (NUMBERS ONLY) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">
              Installed Pole Number (Number Only) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              name="installed_pole_number"
              value={formData.installed_pole_number}
              onChange={handleChange}
              placeholder="e.g. 104"
              className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary"
              required
            />
            <p className="text-[10px] text-gray-400">Strictly numeric characters only (no letters or spaces).</p>
          </div>
        </div>

        {/* SECTION 2: General & Electrical Specs */}
        <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-150 space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary"></span> Electrical Specifications
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {/* Supply Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                Supply Input <span className="text-red-500">*</span>
              </label>
              <select
                name="supply_input"
                value={formData.supply_input}
                onChange={handleChange}
                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">Select...</option>
                <option value="ABC">ABC</option>
                <option value="UG">UG</option>
                <option value="ACSR">ACSR</option>
              </select>
            </div>

            {/* CCMS - 1Ph/3Ph */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                CCMS Phase <span className="text-red-500">*</span>
              </label>
              <select
                name="ccms_phase"
                value={formData.ccms_phase}
                onChange={handleChange}
                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">Select...</option>
                <option value="1Ph">1Ph</option>
                <option value="3Ph">3Ph</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* DTC No */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                DTC No <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="dtc_number"
                value={formData.dtc_number}
                onChange={handleChange}
                placeholder="DTC Number"
                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            {/* RR Number */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                RR Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="rr_number"
                value={formData.rr_number}
                onChange={handleChange}
                placeholder="RR Number"
                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>

          {/* Earthing Completed */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">
              Earthing Completed <span className="text-red-500">*</span>
            </label>
            <select
              name="earthing_completed"
              value={formData.earthing_completed}
              onChange={handleChange}
              className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary"
              required
            >
              <option value="">Select...</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          {/* CCMS Landmark */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">
              CCMS Landmark (In front of) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="ccms_landmark"
              value={formData.ccms_landmark}
              onChange={handleChange}
              placeholder="e.g. Opposite to Post Office, Park Gate"
              className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary"
              required
            />
          </div>
        </div>

        {/* SECTION 3: BESCOM Meter Details */}
        <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-150 space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary"></span> BESCOM Meter Details
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                BESCOM Meter Sl. No <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="bescom_meter_sl_number"
                value={formData.bescom_meter_sl_number}
                onChange={handleChange}
                placeholder="Serial Number"
                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                BESCOM Reading No <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="bescom_meter_reading_no"
                value={formData.bescom_meter_reading_no}
                onChange={handleChange}
                placeholder="Reading Number"
                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                Is it CT Meter? <span className="text-red-500">*</span>
              </label>
              <select
                name="is_ct_meter"
                value={formData.is_ct_meter}
                onChange={handleChange}
                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">Select...</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                Working Status <span className="text-red-500">*</span>
              </label>
              <select
                name="bescom_meter_status"
                value={formData.bescom_meter_status}
                onChange={handleChange}
                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">Select...</option>
                <option value="Working">Working</option>
                <option value="Not Working">Not Working</option>
              </select>
            </div>
          </div>

          {/* BESCOM Measurements: Voltage, Current, PF, Power */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-600">BESCOM Voltage (V) *</label>
              <input
                type="text"
                name="bescom_meter_voltage"
                value={formData.bescom_meter_voltage}
                onChange={handleChange}
                placeholder="e.g. 230"
                className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-600">BESCOM Current (A) *</label>
              <input
                type="text"
                name="bescom_meter_current"
                value={formData.bescom_meter_current}
                onChange={handleChange}
                placeholder="e.g. 15.2"
                className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-600">BESCOM PF *</label>
              <input
                type="text"
                name="bescom_meter_pf"
                value={formData.bescom_meter_pf}
                onChange={handleChange}
                placeholder="e.g. 0.95"
                className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-600">BESCOM Power (kW) *</label>
              <input
                type="text"
                name="bescom_meter_power_kw"
                value={formData.bescom_meter_power_kw}
                onChange={handleChange}
                placeholder="e.g. 3.2"
                className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary"
                required
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: CCMS Unit & Measurements */}
        <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-150 space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary"></span> CCMS Hardware & Measurements
          </h3>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700">CCMS UID No *</label>
              <input
                type="text"
                name="ccms_uid_no"
                value={formData.ccms_uid_no}
                onChange={handleChange}
                placeholder="UID No"
                className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700">CCMS Meter No *</label>
              <input
                type="text"
                name="ccms_meter_no"
                value={formData.ccms_meter_no}
                onChange={handleChange}
                placeholder="Meter No"
                className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700">CCMS IMEI No *</label>
              <input
                type="text"
                name="ccms_imei_no"
                value={formData.ccms_imei_no}
                onChange={handleChange}
                placeholder="IMEI No"
                className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary"
                required
              />
            </div>
          </div>

          {/* CCMS Measurements: Voltage, Current, PF, Power */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-600">CCMS Voltage (V) *</label>
              <input
                type="text"
                name="ccms_meter_voltage"
                value={formData.ccms_meter_voltage}
                onChange={handleChange}
                placeholder="e.g. 230"
                className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-600">CCMS Current (A) *</label>
              <input
                type="text"
                name="ccms_meter_current"
                value={formData.ccms_meter_current}
                onChange={handleChange}
                placeholder="e.g. 14.8"
                className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-600">CCMS PF *</label>
              <input
                type="text"
                name="ccms_meter_pf"
                value={formData.ccms_meter_pf}
                onChange={handleChange}
                placeholder="e.g. 0.94"
                className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-600">CCMS Power (kW) *</label>
              <input
                type="text"
                name="ccms_meter_power_kw"
                value={formData.ccms_meter_power_kw}
                onChange={handleChange}
                placeholder="e.g. 3.1"
                className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary"
                required
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: GPS Location */}
        <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-150 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary"></span> GPS Coordinates
            </h3>
            {locationAccuracy && (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                <ShieldCheck size={12} /> Accuracy: ±{locationAccuracy}m
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Latitude *</label>
              <input
                type="text"
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
                placeholder="13.xxxxxxx"
                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Longitude *</label>
              <input
                type="text"
                name="longitude"
                value={formData.longitude}
                onChange={handleChange}
                placeholder="77.xxxxxxx"
                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleGetLocation}
            disabled={locationLoading}
            className="w-full py-2.5 px-3 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-bold hover:bg-primary/20 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {locationLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Fetching GPS Location...
              </>
            ) : (
              <>
                <MapPin size={14} /> Get Current GPS Location
              </>
            )}
          </button>
        </div>

        {/* SECTION 6: 3 Mandatory Photos */}
        <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-150 space-y-3">
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary"></span> 3 Compulsory Images
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              All 3 images must be captured.<span className="text-gray-600">Ensure that the face of the meter (the part with the display) and the barcode are clearly visible</span>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Image 1: BESCOM Meter Serial Number Image */}
            <div className="border border-gray-200 rounded-lg p-2.5 bg-white flex flex-col items-center justify-between text-center space-y-2">
              <p className="text-xs font-bold text-gray-800">1. BESCOM Meter Sl. No Image *</p>
              {photos.image1 ? (
                <div className="relative w-full h-32 rounded overflow-hidden border border-emerald-200">
                  <img
                    src={URL.createObjectURL(photos.image1)}
                    alt="BESCOM Meter Sl No"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotos((p) => ({ ...p, image1: null }))}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 py-4">
                  <Camera size={28} className="text-gray-300" />
                  <button
                    type="button"
                    onClick={() => setCameraTarget('image1')}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Capture Photo
                  </button>
                  <label className="text-[10px] text-gray-400 cursor-pointer hover:underline">
                    or select file
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotoSelect('image1', e.target.files[0])}
                    />
                  </label>
                </div>
              )}
              {compressing.image1 && <p className="text-[10px] text-amber-600 animate-pulse">Compressing...</p>}
            </div>

            {/* Image 2: CCMS Meter Serial Number Image */}
            <div className="border border-gray-200 rounded-lg p-2.5 bg-white flex flex-col items-center justify-between text-center space-y-2">
              <p className="text-xs font-bold text-gray-800">2. CCMS Meter Sl. No Image *</p>
              {photos.image2 ? (
                <div className="relative w-full h-32 rounded overflow-hidden border border-emerald-200">
                  <img
                    src={URL.createObjectURL(photos.image2)}
                    alt="CCMS Meter Sl No"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotos((p) => ({ ...p, image2: null }))}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 py-4">
                  <Camera size={28} className="text-gray-300" />
                  <button
                    type="button"
                    onClick={() => setCameraTarget('image2')}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Capture Photo
                  </button>
                  <label className="text-[10px] text-gray-400 cursor-pointer hover:underline">
                    or select file
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotoSelect('image2', e.target.files[0])}
                    />
                  </label>
                </div>
              )}
              {compressing.image2 && <p className="text-[10px] text-amber-600 animate-pulse">Compressing...</p>}
            </div>

            {/* Image 3: CCMS Box Image */}
            <div className="border border-gray-200 rounded-lg p-2.5 bg-white flex flex-col items-center justify-between text-center space-y-2">
              <p className="text-xs font-bold text-gray-800">3. CCMS Box Image *</p>
              {photos.image3 ? (
                <div className="relative w-full h-32 rounded overflow-hidden border border-emerald-200">
                  <img
                    src={URL.createObjectURL(photos.image3)}
                    alt="CCMS Box"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotos((p) => ({ ...p, image3: null }))}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 py-4">
                  <Camera size={28} className="text-gray-300" />
                  <button
                    type="button"
                    onClick={() => setCameraTarget('image3')}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Capture Photo
                  </button>
                  <label className="text-[10px] text-gray-400 cursor-pointer hover:underline">
                    or select file
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotoSelect('image3', e.target.files[0])}
                    />
                  </label>
                </div>
              )}
              {compressing.image3 && <p className="text-[10px] text-amber-600 animate-pulse">Compressing...</p>}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={uploading || isCompressing}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 size={18} className="animate-spin" /> {statusText || 'Submitting CCMS Survey...'}
            </>
          ) : isCompressing ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Compressing Photos...
            </>
          ) : (
            <>
              <CheckCircle2 size={18} /> Submit CCMS Survey
            </>
          )}
        </button>
      </form>

      {/* In-App Camera modal */}
      {cameraTarget && (
        <InAppCamera
          poleNumber={formData.installed_pole_number || ''}
          wardNumber={ward?.name || ''}
          ccmsNumber={formData.ccms_number || ''}
          onCapture={(file) => handlePhotoSelect(cameraTarget, file)}
          onClose={() => setCameraTarget(null)}
        />
      )}
    </div>
  );
};

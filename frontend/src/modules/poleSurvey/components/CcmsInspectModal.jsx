import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Trash2, MapPin, ExternalLink, AlertCircle, Loader2, Edit2, Save } from 'lucide-react';
import API_BASE_URL from '../../../config/api';
import { useAuthStore } from '../../../store/authStore';
import { useToastStore } from '../../../store/toastStore';

export const CcmsInspectModal = ({
  submission,
  onClose,
  onConfirm,
  onDelete,
  onSuccess,
  canConfirm = false,
  canDelete = false,
  canEdit: canEditProp,
  isConfirming = false,
  isDeleting = false,
  projectId = 3,
}) => {
  const [images, setImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [fullRecord, setFullRecord] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  const token = localStorage.getItem('token');
  const user = useAuthStore((state) => state.user);
  const activeProject = useAuthStore((state) => state.activeProject);
  const addToast = useToastStore((state) => state.addToast);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!submission?.id) return;
    let cancelled = false;
    setFullRecord(null);
    setIsEditing(false);

    const fetchData = async () => {
      setLoadingImages(true);
      try {
        const [filesRes, ccmsRes] = await Promise.allSettled([
          axios.get(
            `${API_BASE_URL}/projects/${projectId}/pole-survey/files?entity_type=ccms&entity_id=${submission.id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          axios.get(
            `${API_BASE_URL}/projects/${projectId}/tgpl-survey/ccms/${submission.id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
        ]);
        if (cancelled) return;
        if (filesRes.status === 'fulfilled') {
          setImages(filesRes.value.data.files || []);
        } else {
          setImages([]);
        }
        if (ccmsRes.status === 'fulfilled' && ccmsRes.value.data?.ccms) {
          setFullRecord(ccmsRes.value.data.ccms);
        }
      } catch (err) {
        console.error('Failed to fetch CCMS details/files:', err);
      } finally {
        if (!cancelled) setLoadingImages(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [submission?.id, projectId, token]);

  // Merge full DB record (when fetched) with passed submission row, supporting both DB column names and summary aliases
  const d = { ...(submission || {}), ...(fullRecord || {}) };
  const val = (...keys) => {
    for (const k of keys) {
      const v = d[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return null;
  };

  useEffect(() => {
    if (!submission) return;
    setFormData({
      ccms_number: val('ccms_number', 'switch_point_number') || '',
      installed_pole_number: val('installed_pole_number', 'pole_number', 'identifier') || '',
      supply_input: val('supply_input', 'conductor_type') || '',
      ccms_phase: val('ccms_phase', 'arm_type') || '',
      dtc_number: val('dtc_number') || '',
      rr_number: val('rr_number', 'meter_rr_number') || '',
      earthing_completed: val('earthing_completed', 'pole_earthing_exists') || '',
      ccms_landmark: val('ccms_landmark', 'road_category', 'remarks') || '',
      bescom_meter_sl_number: val('bescom_meter_sl_number', 'meter_serial_number') || '',
      is_ct_meter: val('is_ct_meter', 'meter_type') || '',
      bescom_meter_status: val('bescom_meter_status', 'meter_condition') || '',
      bescom_meter_reading_no: val('bescom_meter_reading_no', 'bescom_meter_reading_number', 'light_type_6') || '',
      ccms_uid_no: val('ccms_uid_no', 'ccms_uid_number', 'light_type') || '',
      ccms_meter_no: val('ccms_meter_no', 'ccms_meter_number', 'light_type_2') || '',
      ccms_imei_no: val('ccms_imei_no', 'ccms_imei_number') || '',
      ccms_meter_voltage: val('ccms_meter_voltage', 'light_type_3') ?? '',
      ccms_meter_current: val('ccms_meter_current', 'light_capacity_3') ?? '',
      ccms_meter_pf: val('ccms_meter_pf', 'light_type_4') ?? '',
      ccms_meter_power_kw: val('ccms_meter_power_kw', 'light_capacity') ?? '',
      bescom_meter_voltage: val('bescom_meter_voltage', 'light_capacity_4') ?? '',
      bescom_meter_current: val('bescom_meter_current', 'light_type_5') ?? '',
      bescom_meter_pf: val('bescom_meter_pf', 'light_capacity_5') ?? '',
      bescom_meter_power_kw: val('bescom_meter_power_kw', 'light_capacity_2') ?? '',
    });
  }, [submission, fullRecord]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.patch(
        `${API_BASE_URL}/projects/${projectId}/tgpl-survey/ccms/${submission.id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.ccms) {
        setFullRecord((prev) => ({ ...(prev || {}), ...data.ccms }));
      }
      setIsEditing(false);
      addToast('CCMS submission updated successfully!', 'success');
      queryClient.invalidateQueries(['ccmsPoints']);
      queryClient.invalidateQueries(['wardDetails']);
      queryClient.invalidateQueries(['submissions']);
      queryClient.invalidateQueries(['todaySubmissions']);
      queryClient.invalidateQueries(['user-submissions']);
      queryClient.invalidateQueries(['tgpl-survey-submissions']);
      if (onSuccess) onSuccess(data?.ccms);
    },
    onError: (err) => {
      addToast(err.response?.data?.message || 'Error updating CCMS submission', 'error');
    },
  });

  if (!submission) return null;

  const resolvedStatus = d.status || (d.confirmed_at ? 'CONFIRMED' : null);
  const statusLower = String(resolvedStatus || '').toLowerCase();
  const isMobileSurveyor = activeProject?.project_role === 'MOBILE_USER';
  const canEdit =
    !d.is_deleted &&
    statusLower !== 'deleted' &&
    (canEditProp !== undefined
      ? canEditProp
      : user?.role === 'MASTER_ADMIN' ||
        activeProject?.section_j ||
        (!!resolvedStatus &&
          statusLower === 'pending' &&
          (isMobileSurveyor || activeProject?.section_i)));

  const handleFieldChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const bescomImg = images.find(f => f.file_name?.toLowerCase().includes('bescom'))?.signed_url ||
                    val('bescom_meter_image_url', 'image_url_1') ||
                    images[0]?.signed_url || null;
  const ccmsMeterImg = images.find(f => f.file_name?.toLowerCase().includes('ccms_meter'))?.signed_url ||
                       val('ccms_meter_image_url', 'image_url_2') ||
                       images[1]?.signed_url || null;
  const ccmsBoxImg = images.find(f => f.file_name?.toLowerCase().includes('box'))?.signed_url ||
                     val('ccms_box_image_url', 'image_url_3') ||
                     images[2]?.signed_url || null;

  const photoList = [
    { label: 'BESCOM Meter Sl. No Image', url: bescomImg },
    { label: 'CCMS Meter Sl. No Image', url: ccmsMeterImg },
    { label: 'CCMS Box Image', url: ccmsBoxImg },
  ];

  const lat = val('latitude', 'pole_latitude');
  const lng = val('longitude', 'pole_longitude');
  const hasCoords = lat !== null && lng !== null;
  const mapsUrl = hasCoords ? `https://www.google.com/maps?q=${lat},${lng}` : null;

  const ccmsNumber = val('ccms_number', 'switch_point_number') || 'N/A';
  const wardLabel = val('ward_name', 'ward_number', 'ulb_name') || 'N/A';
  const createdBy = val('created_by_name', 'user_name') || 'N/A';
  const confirmedBy = val('confirmed_by_name') || 'N/A';
  const earthing = val('earthing_completed', 'pole_earthing_exists');
  const bescomStatus = val('bescom_meter_status', 'meter_condition');

  const inputClass =
    'mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-white';

  const renderInput = (name, placeholder = '') => (
    <input
      type="text"
      value={formData[name] ?? ''}
      onChange={(e) => handleFieldChange(name, e.target.value)}
      placeholder={placeholder}
      className={inputClass}
    />
  );

  const renderSelect = (name, options) => (
    <select
      value={formData[name] ?? ''}
      onChange={(e) => handleFieldChange(name, e.target.value)}
      className={inputClass}
    >
      <option value="">Select...</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-5xl rounded-lg bg-white p-6 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Inspect CCMS Point #{ccmsNumber}
            </h3>
            <p className="text-xs text-gray-500">
              Ward: <span className="font-medium text-slate-700">{wardLabel}</span> • Status:{' '}
              <span className={`font-semibold ${
                d.status === 'CONFIRMED'
                  ? 'text-emerald-600'
                  : d.status === 'DELETED' || d.is_deleted
                  ? 'text-red-600'
                  : 'text-amber-600'
              }`}>
                {d.status || 'PENDING'}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 text-primary hover:text-primary-dark font-medium text-sm"
              >
                <Edit2 size={16} />
                <span>Edit</span>
              </button>
            )}
            <button
              onClick={() => { setIsEditing(false); onClose(); }}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>

        {/* 2-Column Body matching standard Survey Inspect modal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm flex-1 overflow-y-auto pr-1">
          {/* Left Side: Details */}
          <div className="space-y-4">
            {/* Audit / Metadata Box */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Created By</p>
                <p className="font-semibold text-slate-900">{createdBy}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Created At</p>
                <p className="font-semibold text-slate-900 text-xs">
                  {d.created_at ? new Date(d.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Confirmed By</p>
                <p className="font-semibold text-slate-900">{confirmedBy}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Confirmed At</p>
                <p className="font-semibold text-slate-900 text-xs">
                  {d.confirmed_at ? new Date(d.confirmed_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}
                </p>
              </div>
              {d.deleted_by_name && (
                <>
                  <div>
                    <p className="text-red-500 text-[10px] uppercase font-bold tracking-wider">Deleted By</p>
                    <p className="font-semibold text-red-600">{d.deleted_by_name}</p>
                  </div>
                  <div>
                    <p className="text-red-500 text-[10px] uppercase font-bold tracking-wider">Deleted At</p>
                    <p className="font-semibold text-red-600 text-xs">
                      {d.deleted_at ? new Date(d.deleted_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* General & Location Details */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">General & Location Details</p>
              <div className="grid grid-cols-2 gap-3 bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                <div>
                  <p className="text-gray-500 text-xs">Ward Number</p>
                  <p className="font-medium text-slate-900">{wardLabel}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">CCMS Number</p>
                  {isEditing ? renderInput('ccms_number') : (
                    <p className="font-semibold text-primary">{ccmsNumber}</p>
                  )}
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Installed Pole Number</p>
                  {isEditing ? renderInput('installed_pole_number') : (
                    <p className="font-medium text-slate-900">{val('installed_pole_number', 'pole_number', 'identifier') || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Supply Input</p>
                  {isEditing ? renderSelect('supply_input', ['OH', 'UG']) : (
                    <p className="font-medium text-slate-900">{val('supply_input', 'conductor_type') || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <p className="text-gray-500 text-xs">CCMS Phase</p>
                  {isEditing ? renderSelect('ccms_phase', ['1Ph', '3Ph']) : (
                    <p className="font-medium text-slate-900">{val('ccms_phase', 'arm_type') || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <p className="text-gray-500 text-xs">DTC Number</p>
                  {isEditing ? renderInput('dtc_number') : (
                    <p className="font-medium text-slate-900">{val('dtc_number') || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <p className="text-gray-500 text-xs">RR Number</p>
                  {isEditing ? renderInput('rr_number') : (
                    <p className="font-medium text-slate-900">{val('rr_number', 'meter_rr_number') || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Earthing Completed</p>
                  {isEditing ? renderSelect('earthing_completed', ['Yes', 'No']) : (
                    <p className={`font-medium ${String(earthing || '').toUpperCase() === 'YES' ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {earthing || 'N/A'}
                    </p>
                  )}
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 text-xs">CCMS Landmark (In front of)</p>
                  {isEditing ? renderInput('ccms_landmark') : (
                    <p className="font-medium text-slate-900">{val('ccms_landmark', 'road_category', 'remarks') || 'N/A'}</p>
                  )}
                </div>
                <div className="col-span-2 flex items-center justify-between pt-1 border-t border-slate-200/70">
                  <div>
                    <p className="text-gray-500 text-xs">GPS Coordinates</p>
                    <p className="font-mono text-xs font-medium text-slate-700">
                      {hasCoords ? `${lat}, ${lng}` : 'Not Captured'}
                    </p>
                  </div>
                  {hasCoords && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <MapPin size={14} /> Open in Maps <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Hardware & Meter Identification */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Hardware & Meter Identification</p>
              <div className="grid grid-cols-2 gap-3 bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                <div>
                  <p className="text-gray-500 text-xs">BESCOM Meter Sl. No</p>
                  {isEditing ? renderInput('bescom_meter_sl_number') : (
                    <p className="font-medium text-slate-900">{val('bescom_meter_sl_number', 'meter_serial_number') || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Is it CT Meter?</p>
                  {isEditing ? renderSelect('is_ct_meter', ['Yes', 'No']) : (
                    <p className="font-medium text-slate-900">{val('is_ct_meter', 'meter_type') || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <p className="text-gray-500 text-xs">BESCOM Working Status</p>
                  {isEditing ? renderSelect('bescom_meter_status', ['Working', 'Not Working']) : (
                    <p className={`font-medium ${bescomStatus === 'Working' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {bescomStatus || 'N/A'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-gray-500 text-xs">BESCOM Reading No</p>
                  {isEditing ? renderInput('bescom_meter_reading_no') : (
                    <p className="font-medium text-slate-900">{val('bescom_meter_reading_no', 'bescom_meter_reading_number', 'light_type_6') || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <p className="text-gray-500 text-xs">CCMS UID No</p>
                  {isEditing ? renderInput('ccms_uid_no') : (
                    <p className="font-medium text-slate-900">{val('ccms_uid_no', 'ccms_uid_number', 'light_type') || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <p className="text-gray-500 text-xs">CCMS Meter No</p>
                  {isEditing ? renderInput('ccms_meter_no') : (
                    <p className="font-medium text-slate-900">{val('ccms_meter_no', 'ccms_meter_number', 'light_type_2') || 'N/A'}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 text-xs">CCMS IMEI No</p>
                  {isEditing ? renderInput('ccms_imei_no') : (
                    <p className="font-medium font-mono text-slate-900">{val('ccms_imei_no', 'ccms_imei_number') || 'N/A'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Electrical Parameters Comparison */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Electrical Parameters Comparison</p>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                      <th className="py-2 px-3">Parameter</th>
                      <th className="py-2 px-3">CCMS Meter Reading</th>
                      <th className="py-2 px-3">BESCOM Meter Reading</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2 px-3 text-slate-600 font-medium">Voltage (V)</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {isEditing ? renderInput('ccms_meter_voltage') : `${val('ccms_meter_voltage', 'light_type_3') ?? 'N/A'} V`}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {isEditing ? renderInput('bescom_meter_voltage') : `${val('bescom_meter_voltage', 'light_capacity_4') ?? 'N/A'} V`}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-600 font-medium">Current (A)</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {isEditing ? renderInput('ccms_meter_current') : `${val('ccms_meter_current', 'light_capacity_3') ?? 'N/A'} A`}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {isEditing ? renderInput('bescom_meter_current') : `${val('bescom_meter_current', 'light_type_5') ?? 'N/A'} A`}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-600 font-medium">Power Factor (PF)</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {isEditing ? renderInput('ccms_meter_pf') : (val('ccms_meter_pf', 'light_type_4') ?? 'N/A')}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {isEditing ? renderInput('bescom_meter_pf') : (val('bescom_meter_pf', 'light_capacity_5') ?? 'N/A')}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-600 font-medium">Power (kW)</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {isEditing ? renderInput('ccms_meter_power_kw') : `${val('ccms_meter_power_kw', 'light_capacity') ?? 'N/A'} kW`}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {isEditing ? renderInput('bescom_meter_power_kw') : `${val('bescom_meter_power_kw', 'light_capacity_2') ?? 'N/A'} kW`}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Side: Images (matching standard Survey Inspect modal, no click-to-enlarge) */}
          <div className="space-y-2">
            <p className="font-semibold text-gray-700">Images</p>
            {loadingImages ? (
              <div className="bg-gray-50 h-64 flex items-center justify-center text-gray-400 rounded-lg border-2 border-dashed border-gray-200">
                <p>Loading images...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 max-h-[65vh] overflow-y-auto pr-1">
                {photoList.map((photo, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <div className="px-3 py-1.5 bg-slate-50 border-b border-gray-100 text-xs font-semibold text-slate-700">
                      {photo.label}
                    </div>
                    {photo.url ? (
                      <img
                        src={photo.url}
                        alt={photo.label}
                        className="w-full h-auto object-cover"
                        onError={(e) => {
                          if (!e.target.dataset.errorHandled) {
                            e.target.dataset.errorHandled = 'true';
                            e.target.src = 'https://placehold.co/400x300?text=Failed+to+Load';
                          }
                        }}
                      />
                    ) : (
                      <div className="bg-gray-50 h-32 flex flex-col items-center justify-center text-gray-400">
                        <AlertCircle size={20} className="mb-1 text-gray-300" />
                        <span className="text-xs">No image uploaded</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions matching standard Survey Inspect modal */}
        <div className="flex justify-end gap-2 mt-6 border-t pt-4">
          {canDelete && onDelete && !isEditing && (
            <button
              onClick={() => onDelete(submission)}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 text-sm font-semibold mr-auto"
            >
              {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              <span>Delete Submission</span>
            </button>
          )}
          <button
            onClick={() => {
              if (isEditing) {
                setIsEditing(false);
              } else {
                onClose();
              }
            }}
            className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-semibold"
          >
            {isEditing ? 'Cancel' : 'Close'}
          </button>
          {isEditing ? (
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 font-medium"
            >
              {saveMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{saveMutation.isPending ? 'Saving...' : 'Save Changes'}</span>
            </button>
          ) : (
            canConfirm &&
            onConfirm &&
            d.status !== 'CONFIRMED' && (
              <button
                onClick={() => onConfirm(submission)}
                disabled={isConfirming}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 font-medium disabled:opacity-50"
              >
                {isConfirming ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                <span>Confirm Submission</span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

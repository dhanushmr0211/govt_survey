import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, CheckCircle2, Trash2, MapPin, ExternalLink, Eye, AlertCircle, Loader2 } from 'lucide-react';
import API_BASE_URL from '../../../config/api';

export const CcmsInspectModal = ({
  submission,
  onClose,
  onConfirm,
  onDelete,
  canConfirm = false,
  canDelete = false,
  isConfirming = false,
  isDeleting = false,
  projectId = 3,
}) => {
  const [activePhotoModal, setActivePhotoModal] = useState(null);
  const [images, setImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [fullRecord, setFullRecord] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!submission?.id) return;
    let cancelled = false;
    setFullRecord(null);

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

  if (!submission) return null;

  // Merge full DB record (when fetched) with passed submission row, supporting both DB column names and summary aliases
  const d = { ...submission, ...(fullRecord || {}) };
  const val = (...keys) => {
    for (const k of keys) {
      const v = d[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return null;
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
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium"
          >
            Close
          </button>
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
                  <p className="font-semibold text-primary">{ccmsNumber}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Installed Pole Number</p>
                  <p className="font-medium text-slate-900">{val('installed_pole_number', 'pole_number', 'identifier') || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Supply Input</p>
                  <p className="font-medium text-slate-900">{val('supply_input', 'conductor_type') || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">CCMS Phase</p>
                  <p className="font-medium text-slate-900">{val('ccms_phase', 'arm_type') || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">DTC Number</p>
                  <p className="font-medium text-slate-900">{val('dtc_number') || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">RR Number</p>
                  <p className="font-medium text-slate-900">{val('rr_number', 'meter_rr_number') || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Earthing Completed</p>
                  <p className={`font-medium ${String(earthing || '').toUpperCase() === 'YES' ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {earthing || 'N/A'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 text-xs">CCMS Landmark (In front of)</p>
                  <p className="font-medium text-slate-900">{val('ccms_landmark', 'road_category', 'remarks') || 'N/A'}</p>
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
                  <p className="font-medium text-slate-900">{val('bescom_meter_sl_number', 'meter_serial_number') || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Is it CT Meter?</p>
                  <p className="font-medium text-slate-900">{val('is_ct_meter', 'meter_type') || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">BESCOM Working Status</p>
                  <p className={`font-medium ${bescomStatus === 'Working' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {bescomStatus || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">BESCOM Reading No</p>
                  <p className="font-medium text-slate-900">{val('bescom_meter_reading_no', 'bescom_meter_reading_number', 'light_type_6') || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">CCMS UID No</p>
                  <p className="font-medium text-slate-900">{val('ccms_uid_no', 'ccms_uid_number', 'light_type') || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">CCMS Meter No</p>
                  <p className="font-medium text-slate-900">{val('ccms_meter_no', 'ccms_meter_number', 'light_type_2') || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 text-xs">CCMS IMEI No</p>
                  <p className="font-medium font-mono text-slate-900">{val('ccms_imei_no', 'ccms_imei_number') || 'N/A'}</p>
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
                      <td className="py-2 px-3 font-semibold text-slate-900">{val('ccms_meter_voltage', 'light_type_3') ?? 'N/A'} V</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{val('bescom_meter_voltage', 'light_capacity_4') ?? 'N/A'} V</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-600 font-medium">Current (A)</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{val('ccms_meter_current', 'light_capacity_3') ?? 'N/A'} A</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{val('bescom_meter_current', 'light_type_5') ?? 'N/A'} A</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-600 font-medium">Power Factor (PF)</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{val('ccms_meter_pf', 'light_type_4') ?? 'N/A'}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{val('bescom_meter_pf', 'light_capacity_5') ?? 'N/A'}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-600 font-medium">Power (kW)</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{val('ccms_meter_power_kw', 'light_capacity') ?? 'N/A'} kW</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{val('bescom_meter_power_kw', 'light_capacity_2') ?? 'N/A'} kW</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Side: Images (matching standard Survey Inspect modal) */}
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
                      <div className="relative group">
                        <img
                          src={photo.url}
                          alt={photo.label}
                          className="w-full h-auto max-h-60 object-cover"
                          onError={(e) => {
                            if (!e.target.dataset.errorHandled) {
                              e.target.dataset.errorHandled = 'true';
                              e.target.src = 'https://placehold.co/400x300?text=Failed+to+Load';
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setActivePhotoModal({ url: photo.url, title: photo.label })}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white gap-1 text-xs font-semibold"
                        >
                          <Eye size={16} /> Click to Enlarge
                        </button>
                      </div>
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
          {canDelete && onDelete && (
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
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-semibold"
          >
            Close
          </button>
          {canConfirm && onConfirm && d.status !== 'CONFIRMED' && (
            <button
              onClick={() => onConfirm(submission)}
              disabled={isConfirming}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 font-medium disabled:opacity-50"
            >
              {isConfirming ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              <span>Confirm Submission</span>
            </button>
          )}
        </div>
      </div>

      {/* Enlarged Photo Modal */}
      {activePhotoModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setActivePhotoModal(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-slate-300 transition"
            >
              <X size={26} />
            </button>
            <p className="text-white text-xs font-semibold mb-2">{activePhotoModal.title}</p>
            <img
              src={activePhotoModal.url}
              alt={activePhotoModal.title}
              className="max-w-full max-h-[80vh] rounded-xl shadow-2xl object-contain border border-white/20"
            />
          </div>
        </div>
      )}
    </div>
  );
};

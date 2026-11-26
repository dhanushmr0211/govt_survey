import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, CheckCircle, Trash2, MapPin, ExternalLink, Zap, Eye, AlertCircle, Loader2 } from 'lucide-react';
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
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!submission?.id) return;
    const fetchImages = async () => {
      setLoadingImages(true);
      try {
        const res = await axios.get(
          `${API_BASE_URL}/projects/${projectId}/pole-survey/files?entity_type=ccms&entity_id=${submission.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const files = res.data.files || [];
        setImages(files);
      } catch (err) {
        console.error('Failed to fetch CCMS files:', err);
      } finally {
        setLoadingImages(false);
      }
    };
    fetchImages();
  }, [submission?.id, projectId, token]);

  if (!submission) return null;

  // Resolve 3 images: either from entity_files or fallback to direct columns on submission
  const bescomImg = images.find(f => f.file_name?.toLowerCase().includes('bescom'))?.signed_url ||
                    submission.bescom_meter_image_url ||
                    images[0]?.signed_url || null;
  const ccmsMeterImg = images.find(f => f.file_name?.toLowerCase().includes('ccms_meter'))?.signed_url ||
                       submission.ccms_meter_image_url ||
                       images[1]?.signed_url || null;
  const ccmsBoxImg = images.find(f => f.file_name?.toLowerCase().includes('box'))?.signed_url ||
                     submission.ccms_box_image_url ||
                     images[2]?.signed_url || null;

  const photoList = [
    { label: 'BESCOM Meter Sl. No Image', url: bescomImg },
    { label: 'CCMS Meter Sl. No Image', url: ccmsMeterImg },
    { label: 'CCMS Box Image', url: ccmsBoxImg },
  ];

  const hasCoords = submission.latitude && submission.longitude;
  const mapsUrl = hasCoords ? `https://www.google.com/maps?q=${submission.latitude},${submission.longitude}` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
              <Zap size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">
                  CCMS Point #{submission.ccms_number || 'N/A'}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  submission.status === 'CONFIRMED'
                    ? 'bg-emerald-100 text-emerald-700'
                    : submission.status === 'DELETED'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {submission.status || 'PENDING'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Ward: <span className="font-semibold text-slate-700">{submission.ward_name || submission.ward_number || submission.ulb_name || 'N/A'}</span>
                {submission.created_by_name && ` • Surveyor: ${submission.created_by_name}`}
                {submission.created_at && ` • ${new Date(submission.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          
          {/* General & Identification */}
          <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-emerald-500 rounded-full"></span>
              General & Location Details
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Ward No</span>
                <span className="font-semibold text-slate-800 text-sm">{submission.ward_name || submission.ward_number || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">CCMS Number</span>
                <span className="font-bold text-emerald-700 text-sm">{submission.ccms_number || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Installed Pole Number</span>
                <span className="font-semibold text-slate-800 text-sm">{submission.installed_pole_number || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Supply Input</span>
                <span className="font-semibold text-slate-800">{submission.supply_input || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">CCMS Phase</span>
                <span className="font-semibold text-slate-800">{submission.ccms_phase || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">DTC Number</span>
                <span className="font-semibold text-slate-800">{submission.dtc_number || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">RR Number</span>
                <span className="font-semibold text-slate-800">{submission.rr_number || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Earthing Completed</span>
                <span className={`font-semibold ${submission.earthing_completed?.toUpperCase() === 'YES' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {submission.earthing_completed || 'N/A'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block">CCMS Landmark (In front of)</span>
                <span className="font-semibold text-slate-800">{submission.ccms_landmark || 'N/A'}</span>
              </div>
              <div className="col-span-2 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block">GPS Coordinates</span>
                  <span className="font-mono font-medium text-slate-700">
                    {hasCoords ? `${submission.latitude}, ${submission.longitude}` : 'Not Captured'}
                  </span>
                </div>
                {hasCoords && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition"
                  >
                    <MapPin size={14} /> Open in Maps <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Meter Hardware & Identification */}
          <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-blue-500 rounded-full"></span>
              Hardware & Meter Identification
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">BESCOM Meter Sl. No</span>
                <span className="font-semibold text-slate-800">{submission.bescom_meter_sl_number || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Is it CT Meter?</span>
                <span className="font-semibold text-slate-800">{submission.is_ct_meter || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">BESCOM Working Status</span>
                <span className={`font-semibold ${submission.bescom_meter_status === 'Working' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {submission.bescom_meter_status || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">BESCOM Reading No</span>
                <span className="font-semibold text-slate-800">{submission.bescom_meter_reading_number || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">CCMS UID No</span>
                <span className="font-semibold text-slate-800">{submission.ccms_uid_number || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">CCMS Meter No</span>
                <span className="font-semibold text-slate-800">{submission.ccms_meter_number || 'N/A'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block">CCMS IMEI No</span>
                <span className="font-semibold text-slate-800 font-mono">{submission.ccms_imei_number || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Electrical Readings Comparison */}
          <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-violet-500 rounded-full"></span>
              Electrical Parameters Comparison
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                    <th className="py-2 px-3">Parameter</th>
                    <th className="py-2 px-3 text-emerald-700 bg-emerald-50/50 rounded-t-lg">CCMS Meter Reading</th>
                    <th className="py-2 px-3 text-blue-700 bg-blue-50/50 rounded-t-lg">BESCOM Meter Reading</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr>
                    <td className="py-2.5 px-3 text-slate-600 font-semibold">Voltage (V)</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800 bg-emerald-50/20">{submission.ccms_meter_voltage ?? 'N/A'} V</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800 bg-blue-50/20">{submission.bescom_meter_voltage ?? 'N/A'} V</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-slate-600 font-semibold">Current (A)</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800 bg-emerald-50/20">{submission.ccms_meter_current ?? 'N/A'} A</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800 bg-blue-50/20">{submission.bescom_meter_current ?? 'N/A'} A</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-slate-600 font-semibold">Power Factor (PF)</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800 bg-emerald-50/20">{submission.ccms_meter_pf ?? 'N/A'}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800 bg-blue-50/20">{submission.bescom_meter_pf ?? 'N/A'}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-slate-600 font-semibold">Power (kW)</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800 bg-emerald-50/20">{submission.ccms_meter_power_kw ?? 'N/A'} kW</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800 bg-blue-50/20">{submission.bescom_meter_power_kw ?? 'N/A'} kW</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 3 Mandatory Photos */}
          <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-3 bg-amber-500 rounded-full"></span>
                Mandatory Survey Images (3)
              </span>
              {loadingImages && <span className="text-[11px] text-slate-400">Loading images...</span>}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {photoList.map((photo, index) => (
                <div key={index} className="flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  <div className="p-2 border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-700 truncate">
                    {photo.label}
                  </div>
                  <div className="relative aspect-video bg-slate-100 flex items-center justify-center overflow-hidden group">
                    {photo.url ? (
                      <>
                        <img
                          src={photo.url}
                          alt={photo.label}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <button
                          onClick={() => setActivePhotoModal({ url: photo.url, title: photo.label })}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white gap-1 text-xs font-semibold backdrop-blur-[1px]"
                        >
                          <Eye size={16} /> Click to Enlarge
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-3 text-slate-400">
                        <AlertCircle size={24} className="mx-auto mb-1 text-slate-300" />
                        <span className="text-[11px]">No image uploaded</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            {canDelete && onDelete && (
              <button
                onClick={() => onDelete(submission)}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition disabled:opacity-50"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete Submission
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition"
            >
              Close
            </button>
            {canConfirm && onConfirm && submission.status !== 'CONFIRMED' && (
              <button
                onClick={() => onConfirm(submission)}
                disabled={isConfirming}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm disabled:opacity-50"
              >
                {isConfirming ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Confirm CCMS
              </button>
            )}
          </div>
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
export default CcmsInspectModal;

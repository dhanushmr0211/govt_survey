import { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, Edit2, Save, Trash2 } from 'lucide-react';
import { confirmSwitchPoint } from '../services/poleSurveyService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import API_BASE_URL from '../../../config/api';
import { isMobileEditRestricted } from '../utils/mobileRestrictions';

export const SwitchPointInspectModal = ({ switchPoint: initialSwitchPoint, onClose, onSuccess }) => {
  const [switchPoint, setSwitchPoint] = useState(initialSwitchPoint);
  const queryClient = useQueryClient();

  const user = useAuthStore((state) => state.user);
  const [isEditing, setIsEditing] = useState(false);
  const isAutofillUser = new Set([
    'pratheekar1997@gmail.com',
    'sinchudev3@gmail.com',
    'sameershaik99495@gmail.com',
    'kanyagowdakavya24@gmail.com',
    'usharanik209@gmail.com'
  ]).has((user?.email || '').toLowerCase());
  const activeProject = useAuthStore((state) => state.activeProject);
  const projectId = activeProject?.id;
  const isTgpl = activeProject?.project_type === 'TGPL_SURVEY' || String(activeProject?.id) === '3';
  const isIdeck = String(projectId) === '2' || activeProject?.project_type === 'IDECK_SURVEY';
  const canEditGPS = isEditing && isAutofillUser && isIdeck;
  const statusLower = (switchPoint?.status || '').toLowerCase();
  const canEdit = user?.role === 'MASTER_ADMIN' || 
    (activeProject?.section_i && statusLower === 'pending') || 
    (activeProject?.section_j && statusLower === 'confirmed');
  const [formData, setFormData] = useState({
    ...initialSwitchPoint
  });
  const [images, setImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [ulbs, setUlbs] = useState([]);

  useEffect(() => {
    const fetchUlbs = async () => {
      if (!projectId) return;
      try {
        const token = useAuthStore.getState().token || localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/projects/${projectId}/structure`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setUlbs(data.ulbs || []);
        }
      } catch (err) {
        console.error("Failed to fetch project structure for ULBs:", err);
      }
    };
    fetchUlbs();
  }, [projectId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSwitchPoint(initialSwitchPoint);
      setFormData({
        ...initialSwitchPoint,
        ulb_id: initialSwitchPoint.ulb_id || ulbs.find(u => u.name === initialSwitchPoint.ulb_name)?.id || ''
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [initialSwitchPoint, ulbs]);

  useEffect(() => {
    if (!projectId || !switchPoint.id) return;
    const fetchImages = async () => {
      setLoadingImages(true);
      try {
        const response = await fetch(`${API_BASE_URL}/projects/${projectId}/pole-survey/files?entity_type=switch_point&entity_id=${switchPoint.id}`, {
          headers: {
            'Authorization': `Bearer ${useAuthStore.getState().token}`
          }
        });
        if (!response.ok) throw new Error('Failed to fetch images');
        const data = await response.json();
        setImages(data.files || []);
      } catch (err) {
        console.error('Error fetching images:', err);
      } finally {
        setLoadingImages(false);
      }
    };
    fetchImages();
  }, [switchPoint.id, projectId]);

  const showDeleteButton = (user?.email || '').toLowerCase() === 'pratheekar1997@gmail.com' || (user?.email || '').toLowerCase() === 'prelectricals01@gmail.com';

  const confirmMutation = useMutation({
    mutationFn: () => confirmSwitchPoint(projectId, switchPoint.id),
    onSuccess: () => {
      onSuccess();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const endpoint = isTgpl
        ? `${API_BASE_URL}/projects/${projectId}/tgpl-survey/poles/${switchPoint.id}`
        : `${API_BASE_URL}/projects/${projectId}/pole-survey/submissions/${switchPoint.id}?type=switch_point`;
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${useAuthStore.getState().token || localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to delete submission');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user-submissions']);
      queryClient.invalidateQueries(['submissions']);
      queryClient.invalidateQueries(['poles']);
      queryClient.invalidateQueries(['wardDetails']);
      onSuccess();
    },
    onError: (err) => {
      console.error('Delete error:', err);
      alert(err.message || 'Failed to delete submission');
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const isBallari = (switchPoint?.district_name || '').toLowerCase().includes('ballari');
      const isRestricted = !isTgpl && !isBallari && isMobileEditRestricted();
      const MOBILE_ALLOWED = new Set(['ward_number', 'switch_point_id', 'switch_point_number', 'road_type', 'road_width']);
      
      let sanitized = { ...formData };
      if (isRestricted) {
        Object.keys(sanitized).forEach((k) => {
          if (!MOBILE_ALLOWED.has(k)) delete sanitized[k];
        });
      }

      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/pole-survey/switch-points/${switchPoint.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify(sanitized)
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to save changes');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setIsEditing(false);
      const updatedEntity = data?.switchPoint;
      if (updatedEntity) {
        setSwitchPoint(prev => ({
          ...prev,
          ...updatedEntity
        }));
        setFormData(prev => ({
          ...prev,
          ...updatedEntity
        }));
      }
      queryClient.invalidateQueries(['user-submissions']);
      queryClient.invalidateQueries(['submissions']);
      queryClient.invalidateQueries(['poles']);
      queryClient.invalidateQueries(['wardDetails']);
    },
    onError: (err) => {
      console.error('Save error:', err);
      alert(err.message || 'Failed to save changes');
    }
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const renderField = (label, name, value, options = null) => {
    const isBallari = (switchPoint?.district_name || '').toLowerCase().includes('ballari');
    const isRestricted = !isTgpl && !isBallari && isMobileEditRestricted();
    const MOBILE_ALLOWED = new Set(['switch_point_number', 'latitude', 'longitude', 'remarks']);
    const isDisabled = isRestricted && !MOBILE_ALLOWED.has(name);

    if (!isEditing) {
      return (
        <div>
          <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">{label}</p>
          <p className="font-semibold text-slate-900">{value || 'N/A'}</p>
        </div>
      );
    }

    if (options) {
      return (
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <select
            name={name}
            value={formData[name] || ''}
            onChange={handleChange}
            disabled={isDisabled}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-xs p-1"
          >
            <option value="">Select...</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <input
          type="text"
          name={name}
          value={formData[name] || ''}
          onChange={handleChange}
          disabled={isDisabled}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-xs p-1"
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-5xl rounded-lg bg-white p-6 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
          <h3 className="text-lg font-semibold text-gray-900">
            Inspect {isTgpl ? 'CCMS' : 'Switch Point'}
          </h3>
          <div className="flex items-center gap-4">
            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 text-primary hover:text-primary-dark font-medium text-sm"
              >
                <Edit2 size={16} />
                <span>Edit</span>
              </button>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">Close</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm flex-1 overflow-y-auto pr-1">
          {/* Left Side: Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Created By</p>
                <p className="font-semibold text-slate-900">{switchPoint.user_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Created At</p>
                <p className="font-semibold text-slate-900 text-xs">
                  {switchPoint.created_at ? new Date(switchPoint.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Confirmed By</p>
                <p className="font-semibold text-slate-900">{switchPoint.confirmed_by_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Confirmed At</p>
                <p className="font-semibold text-slate-900 text-xs">
                  {switchPoint.confirmed_at ? new Date(switchPoint.confirmed_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Ward Number</p>
                <p className="font-semibold text-slate-900">{switchPoint.ward_number}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">ULB</p>
                {isEditing ? (
                  <select
                    name="ulb_id"
                    value={formData.ulb_id || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const selectedUlb = ulbs.find(u => String(u.id) === String(val));
                      setFormData(prev => ({
                        ...prev,
                        ulb_id: val ? Number(val) : '',
                        ulb_name: selectedUlb ? selectedUlb.name : '',
                        ward_id: isTgpl && val ? Number(val) : prev.ward_id,
                        ward_number: isTgpl && selectedUlb ? selectedUlb.name : prev.ward_number
                      }));
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-xs p-1"
                  >
                    <option value="">Select ULB...</option>
                    {ulbs.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                ) : (
                  <p className="font-semibold text-slate-900">{switchPoint.ulb_name || 'N/A'}</p>
                )}
              </div>
              <div className="col-span-2">
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Identifier</p>
                <p className="font-semibold text-slate-900">{switchPoint.switch_point_number || switchPoint.identifier || 'N/A'}</p>
              </div>
            </div>

            <div className="border-t pt-2 mt-2">
              <p className="font-semibold text-gray-700 mb-2">Technical Details</p>
              <div className="grid grid-cols-3 gap-3 text-xs">
                {isTgpl ? (
                  <>
                    {renderField('Ward No', 'ward_number', switchPoint.ward_number)}
                    {renderField('CCMS No', 'switch_point_number', switchPoint.switch_point_number)}
                    {renderField('Meter Type', 'meter_type', switchPoint.meter_type, ['1P', '3P'])}
                    {renderField('RR Number', 'meter_rr_number', switchPoint.meter_rr_number)}
                    {renderField('Serial Number', 'meter_serial_number', switchPoint.meter_serial_number)}
                    {renderField('Meter Dim. Status', 'meter_condition', switchPoint.meter_condition, ['Working', 'not working', 'missing', 'door lock', 'no meter'])}
                  </>
                ) : (
                  <>
                    {renderField('Ward No', 'ward_number', switchPoint.ward_number)}
                    {renderField('Switch Point No', 'switch_point_number', switchPoint.switch_point_number)}
                    {renderField('Type', 'switch_point_type', switchPoint.switch_point_type, ['DP', 'MCB', 'SWITCH', 'HOOK'])}
                    {renderField('Meter Exists', 'meter_exists', switchPoint.meter_exists ? 'Yes' : 'No', ['YES', 'NO'])}
                    {renderField('Meter Type', 'meter_type', switchPoint.meter_type, ['1P', '3P'])}
                    {renderField('RR Number', 'meter_rr_number', switchPoint.meter_rr_number)}
                    {renderField('Serial Number', 'meter_serial_number', switchPoint.meter_serial_number)}
                    {renderField('Meter Condition', 'meter_condition', switchPoint.meter_condition, ['working', 'not working', 'missing'])}
                  </>
                )}
              </div>
            </div>

            <div className="border-t pt-2 mt-2">
              <p className="font-semibold text-gray-700 mb-2">GPS Coordinates</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-500 text-xs">Latitude</p>
                  {canEditGPS ? (
                    <input
                      type="text"
                      name="latitude"
                      value={formData.latitude || ''}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-xs p-1"
                    />
                  ) : (
                    <p className="font-medium text-sm">{switchPoint.latitude || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Longitude</p>
                  {canEditGPS ? (
                    <input
                      type="text"
                      name="longitude"
                      value={formData.longitude || ''}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-xs p-1"
                    />
                  ) : (
                    <p className="font-medium text-sm">{switchPoint.longitude || 'N/A'}</p>
                  )}
                </div>
              </div>
              {switchPoint.latitude && switchPoint.longitude && (
                <div className="mt-3">
                  <a
                    href={`https://www.google.com/maps?q=${switchPoint.latitude},${switchPoint.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded transition-all justify-center shadow-sm w-full"
                  >
                    📍 Open in Google Maps
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Images */}
          <div className="space-y-2">
            <p className="font-semibold text-gray-700">Images</p>
            {loadingImages ? (
              <div className="bg-gray-50 h-64 flex items-center justify-center text-gray-400 rounded-lg border-2 border-dashed border-gray-200">
                <p>Loading images...</p>
              </div>
            ) : images.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                {images.map((img, index) => (
                  <div key={img.id || index} className="border border-gray-100 rounded-lg overflow-hidden relative">
                    <img
                      src={img.signed_url}
                      alt="Survey"
                      className="w-full h-auto object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://placehold.co/400x300?text=Failed+to+Load';
                      }}
                    />
                    <p className="text-xs text-gray-400 p-1 text-center">
                      {new Date(img.uploaded_at || Date.now()).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 h-64 flex items-center justify-center text-gray-400 rounded-lg border-2 border-dashed border-gray-200">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4-4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="mt-1">No images found for this submission.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center mt-6 border-t pt-4">
          <button
            onClick={() => console.log('Raise Issue')}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium text-sm"
          >
            <AlertTriangle size={16} />
            <span>Raise Issue</span>
          </button>
          <div className="flex gap-2">
            {showDeleteButton && (
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this submission?')) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={deleteMutation.isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 text-sm font-semibold"
              >
                <Trash2 size={16} />
                <span>{deleteMutation.isLoading ? 'Deleting...' : 'Delete Submission'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            {isEditing ? (
              <button
                onClick={() => {
                  if (!formData.ward_number?.toString().trim()) {
                    alert('Ward Number is required');
                    return;
                  }
                  if (!formData.switch_point_number?.toString().trim()) {
                    alert('Switch Point / CCMS Number is required');
                    return;
                  }
                  saveMutation.mutate();
                }}
                disabled={saveMutation.isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={16} />
                <span>{saveMutation.isLoading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            ) : (
              statusLower === 'pending' && (
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to confirm this submission?')) {
                      confirmMutation.mutate();
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Check size={16} />
                  <span>Confirm Submission</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

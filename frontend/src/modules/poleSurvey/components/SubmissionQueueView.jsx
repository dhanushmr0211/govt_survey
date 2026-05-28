import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState, useEffect } from 'react';
import { CheckCircle2, SearchCheck, Edit2, Save } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useToastStore } from '../../../store/toastStore';
import imageCompression from 'browser-image-compression';
import API_BASE_URL from '../../../config/api';

export const SubmissionQueueView = ({ projectId }) => {
  const token = localStorage.getItem('token');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [activeType, setActiveType] = useState('all');
  const activeProject = useAuthStore((state) => state.activeProject);
  const isTgpl = activeProject?.project_type === 'TGPL_SURVEY' || String(activeProject?.id) === '3';

  useEffect(() => {
    if (isTgpl) {
      setActiveType('pole');
    } else {
      setActiveType('all');
    }
  }, [isTgpl]);

  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  const [page, setPage] = useState(1);
  const limit = 50;

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const user = useAuthStore((state) => state.user);
  const isAutofillUser = (user?.email || '').toLowerCase() === 'pratheekar1997@gmail.com' || (user?.email || '').toLowerCase() === 'pratheekar1997gmail.com';
  const canShowEdit = user?.role === 'MASTER_ADMIN' || 
    (activeProject?.section_i && activeTab === 'pending') || 
    (activeProject?.section_j && activeTab === 'confirmed');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [images, setImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);

  const dateField = activeTab === 'pending' ? 'created_at' : 'confirmed_at';

  const { data = { queue: [], total: 0 }, isLoading } = useQuery({
    queryKey: ['submissions', activeTab, activeType, page, projectId, fromDate, toDate, dateField],
    queryFn: async () => {
      const endpoint = activeTab === 'pending' ? 'queue/pending' : 'queue/confirmed';
      let url = `${API_BASE_URL}/projects/${projectId}/pole-survey/${endpoint}?page=${page}&limit=${limit}`;
      if (fromDate) url += `&fromDate=${fromDate}`;
      if (toDate) url += `&toDate=${toDate}`;
      if (activeType !== 'all') url += `&type=${activeType}`;
      url += `&dateField=${dateField}`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { queue: res.data.queue || [], total: res.data.total || 0 };
    },
    enabled: !!projectId,
  });

  const { queue, total } = data;

  const confirmMutation = useMutation({
    mutationFn: async ({ id, type }) => {
      const endpoint = type === 'switch_point' 
        ? `${API_BASE_URL}/projects/${projectId}/pole-survey/switch-points/${id}/confirm`
        : `${API_BASE_URL}/projects/${projectId}/pole-survey/poles/${id}/confirm`;
      
      const res = await axios.post(endpoint, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['submissions']);
      addToast('Submission confirmed successfully!', 'success');
      setSelectedSubmission(null);
    },
    onError: (error) => {
      addToast(error.response?.data?.message || 'Error confirming submission', 'error');
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const endpoint = selectedSubmission.type === 'switch_point'
        ? `${API_BASE_URL}/projects/${projectId}/pole-survey/switch-points/${selectedSubmission.id}`
        : `${API_BASE_URL}/projects/${projectId}/pole-survey/poles/${selectedSubmission.id}`;
      
      const res = await axios.patch(endpoint, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['submissions']);
      addToast('Changes saved successfully!', 'success');
      setIsEditing(false);
      const updatedEntity = data?.switchPoint || data?.pole;
      if (updatedEntity) {
        setSelectedSubmission(prev => ({
          ...prev,
          ...updatedEntity
        }));
        setFormData(prev => ({
          ...prev,
          ...updatedEntity,
          pole_number: updatedEntity.pole_number || updatedEntity.identifier || prev.pole_number
        }));
      }
    },
    onError: (error) => {
      addToast(error.response?.data?.message || 'Error saving changes', 'error');
    }
  });

  useEffect(() => {
    const fetchImages = async () => {
      if (!selectedSubmission) return;
      setLoadingImages(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/pole-survey/files?entity_type=${selectedSubmission.type}&entity_id=${selectedSubmission.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setImages(res.data.files || []);
      } catch (err) {
        console.error('Error fetching images:', err);
        setImages([]);
      } finally {
        setLoadingImages(false);
      }
    };
    fetchImages();
  }, [selectedSubmission, projectId, token]);

  const handleDeleteImage = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/projects/${projectId}/pole-survey/files/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setImages(prev => prev.filter(img => img.id !== fileId));
    } catch (err) {
      console.error('Error deleting image:', err);
      alert('Failed to delete image');
    }
  };

  const handleUploadNewImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("Image too large. Please choose a smaller image.");
      return;
    }

    const options = {
      maxSizeMB: 0.4,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.75,
    };

    try {
      console.log(`Original size: ${(file.size / 1024).toFixed(2)} KB`);
      const compressedFile = await imageCompression(file, options);
      console.log(`Compressed size: ${(compressedFile.size / 1024).toFixed(2)} KB`);
      
      const fileName = file.name.split('.')[0] + '_compressed.jpg';
      const renamedFile = new File([compressedFile], fileName, { type: 'image/jpeg' });

      const id = selectedSubmission.id;
      
      const formData = new FormData();
      formData.append('file', renamedFile);
      formData.append('entity_type', selectedSubmission.type);
      formData.append('entity_id', id);

      await axios.post(`${API_BASE_URL}/projects/${projectId}/pole-survey/files`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Refetch images
      const refreshRes = await axios.get(`${API_BASE_URL}/projects/${projectId}/pole-survey/files?entity_type=${selectedSubmission.type}&entity_id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setImages(refreshRes.data.files || []);
      
      alert('Image uploaded successfully!');
    } catch (err) {
      console.error('Error uploading image:', err);
      alert('Failed to upload image');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
      
      // Auto-fill rules (only for pratheekar1997@gmail.com)
      if (isAutofillUser) {
        if (name === 'pole_type') {
          if (value === 'RCC' || value === 'PSC') {
            updated.pole_height_mtrs = '9';
            updated.pole_condition = 'Good';
            updated.pole_earthing_exists = 'NO';
          } else if (value === 'High Mast') {
            updated.pole_height_mtrs = '16';
            updated.pole_condition = 'Good';
            updated.pole_earthing_exists = 'YES';
          } else if (value === 'Mini Mast') {
            updated.pole_height_mtrs = '12';
            updated.pole_condition = 'Good';
            updated.pole_earthing_exists = 'YES';
          }
        } else if (name === 'arm_type') {
          if (value === 'empty/not present') {
            updated.arm_status = 'empty/not present';
            updated.present_arm_length_mtrs = '0';
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

  const renderField = (label, name, value, options = null) => {
    if (!isEditing) {
      return (
        <div>
          <p className="text-gray-500">{label}</p>
          <p className="font-medium">{value || 'N/A'}</p>
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
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-xs"
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
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-xs"
        />
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="premium-panel space-y-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="h-6 w-1/4 animate-pulse rounded bg-slate-200"></div>
          <div className="h-6 w-1/6 animate-pulse rounded bg-slate-200"></div>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-slate-100"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="premium-panel overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Submission Queue</h2>
            <p className="text-sm text-slate-500">
              {total} {activeType === 'all' ? 'records' : activeType === 'switch_point' ? 'switch points' : 'poles'} in the {activeTab} queue
            </p>
          </div>
        
          <div className="flex flex-wrap gap-3">
            {/* Status Tabs */}
            <div className="inline-flex rounded-lg bg-slate-100 p-1 self-start sm:self-auto">
              <button
                className={`rounded-md px-4 py-2 text-sm font-semibold transition ${activeTab === 'pending' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                onClick={() => { setActiveTab('pending'); setPage(1); }}
              >
                Pending
              </button>
              <button
                className={`rounded-md px-4 py-2 text-sm font-semibold transition ${activeTab === 'confirmed' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                onClick={() => { setActiveTab('confirmed'); setPage(1); }}
              >
                Confirmed
              </button>
            </div>

            {/* Type Tabs */}
            {!isTgpl && (
              <div className="inline-flex rounded-lg bg-slate-100 p-1 self-start sm:self-auto">
                <button
                  className={`rounded-md px-4 py-2 text-sm font-semibold transition ${activeType === 'all' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                  onClick={() => { setActiveType('all'); setPage(1); }}
                >
                  All
                </button>
                <button
                  className={`rounded-md px-4 py-2 text-sm font-semibold transition ${activeType === 'switch_point' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                  onClick={() => { setActiveType('switch_point'); setPage(1); }}
                >
                  Switch Points
                </button>
                <button
                  className={`rounded-md px-4 py-2 text-sm font-semibold transition ${activeType === 'pole' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                  onClick={() => { setActiveType('pole'); setPage(1); }}
                >
                  Poles
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="flex flex-wrap items-end gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="flex flex-col">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                const todayStr = getTodayDateString();
                setFromDate('');
                setToDate(todayStr);
                setPage(1);
              }}
              className="rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold shadow-sm transition-all"
            >
              Till Today
            </button>
            {(fromDate || toDate) && (
              <button
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                  setPage(1);
                }}
                className="rounded-md bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 px-3 py-1.5 text-xs font-semibold shadow-sm transition-all"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="premium-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>User ID</th>
              <th>Name</th>
              <th>Date</th>
              <th>Time</th>
              <th>Ward</th>
              <th>ULB Name</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((item) => {
              const displayDate = activeTab === 'confirmed' ? item.confirmed_at : item.created_at;
              const date = displayDate ? new Date(displayDate) : null;
              return (
                <tr key={`${item.type}-${item.id}`}>
                  <td>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.type === 'switch_point' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                      {item.type === 'switch_point' ? 'Switch Point' : 'Pole'}
                    </span>
                  </td>
                  <td>{item.user_id}</td>
                  <td className="font-semibold text-slate-950">{item.user_name}</td>
                  <td>{date ? date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}</td>
                  <td>{date ? date.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}</td>
                  <td>{item.ward_number}</td>
                  <td>{item.ulb_name || 'N/A'}</td>
                  <td>
                    <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedSubmission(item);
                        setFormData({ 
                          ...item,
                          pole_number: item.pole_number || item.identifier || ''
                        });
                        setIsEditing(false);
                      }}
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:text-primary-dark"
                    >
                      <SearchCheck size={14} /> Inspect
                    </button>
                    {activeTab === 'pending' && (
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to confirm this submission?')) {
                            confirmMutation.mutate({ id: item.id, type: item.type });
                          }
                        }}
                        className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800"
                      >
                        <CheckCircle2 size={14} /> Confirm
                      </button>
                    )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {queue.length > 0 && (
        <div className="flex items-center justify-between border-t border-slate-100 bg-white p-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className={`rounded-md border px-4 py-2 text-sm font-semibold ${page === 1 ? 'cursor-not-allowed bg-slate-50 text-slate-400' : 'text-slate-700 hover:bg-slate-50'}`}
          >
            Previous
          </button>
          <span className="text-sm text-slate-600">
            Page <span className="font-semibold text-slate-950">{page}</span> of <span className="font-semibold text-slate-950">{Math.ceil(total / limit) || 1}</span> ({total} items)
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={queue.length < limit}
            className={`rounded-md border px-4 py-2 text-sm font-semibold ${queue.length < limit ? 'cursor-not-allowed bg-slate-50 text-slate-400' : 'text-slate-700 hover:bg-slate-50'}`}
          >
            Next
          </button>
        </div>
      )}

      {queue.length === 0 && (
        <div className="py-12 text-center text-slate-500">No submissions found.</div>
      )}

      {/* Inspect Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-5xl rounded-lg bg-white p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Inspect {selectedSubmission.type === 'switch_point' ? 'Switch Point' : 'Pole'}
              </h3>
              <div className="flex items-center gap-4">
                {canShowEdit && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 text-primary hover:text-primary-dark font-medium text-sm"
                  >
                    <Edit2 size={16} />
                    <span>Edit</span>
                  </button>
                )}
                <button onClick={() => { setSelectedSubmission(null); setIsEditing(false); }} className="text-gray-500 hover:text-gray-700">Close</button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6 text-sm flex-1 overflow-y-auto">
              {/* Left Side: Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-gray-500 text-xs">Submitted By</p>
                    <p className="font-medium">{selectedSubmission.user_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Date/Time</p>
                    <p className="font-medium">{new Date(selectedSubmission.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                  </div>
                  {selectedSubmission.confirmed_by_name && (
                    <>
                      <div>
                        <p className="text-gray-500 text-xs">Confirmed By</p>
                        <p className="font-medium">{selectedSubmission.confirmed_by_name}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Confirmed At</p>
                        <p className="font-medium">{selectedSubmission.confirmed_at ? new Date(selectedSubmission.confirmed_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-gray-500 text-xs">Ward Number</p>
                    <p className="font-medium">{selectedSubmission.ward_number}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">ULB</p>
                    <p className="font-medium">{selectedSubmission.ulb_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Identifier</p>
                    <p className="font-medium">{selectedSubmission.identifier}</p>
                  </div>
                </div>

                <div className="border-top pt-2 mt-2">
                  <p className="font-semibold text-gray-700 mb-2">Technical Details</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {selectedSubmission.type === 'switch_point' ? (
                      <>
                        {renderField('Ward No', 'ward_number', selectedSubmission.ward_number)}
                        {renderField('Switch Point No', 'switch_point_number', selectedSubmission.switch_point_number)}
                        {renderField('Type', 'switch_point_type', selectedSubmission.switch_point_type, ['DP', 'MCB', 'SWITCH', 'HOOK'])}
                        {renderField('Meter Exists', 'meter_exists', selectedSubmission.meter_exists ? 'Yes' : 'No', ['YES', 'NO'])}
                        {renderField('Meter Type', 'meter_type', selectedSubmission.meter_type, ['1P', '3P'])}
                        {renderField('RR Number', 'meter_rr_number', selectedSubmission.meter_rr_number)}
                        {renderField('Serial Number', 'meter_serial_number', selectedSubmission.meter_serial_number)}
                        {renderField('Meter Condition', 'meter_condition', selectedSubmission.meter_condition, ['working', 'not working', 'missing'])}
                      </>
                    ) : isTgpl ? (
                      <>
                        {renderField('Ward No', 'ward_number', selectedSubmission.ward_number)}
                        {renderField('DTC No', 'dtc_number', selectedSubmission.dtc_number)}
                        {renderField('DTC Capacity', 'dtc_capacity', selectedSubmission.dtc_capacity)}
                        {renderField('CCMS No', 'ccms_number', selectedSubmission.ccms_number)}
                        {renderField('Meter Type', 'meter_type', selectedSubmission.meter_type, ['1P', '3P'])}
                        {renderField('RR Number', 'meter_rr_number', selectedSubmission.meter_rr_number)}
                        {renderField('Serial Number', 'meter_serial_number', selectedSubmission.meter_serial_number)}
                        {renderField('Meter Dim. Status', 'meter_dimensional_status', selectedSubmission.meter_dimensional_status, ['Working', 'not working', 'missing', 'door lock', 'no meter'])}
                        {renderField('Conductor Type', 'conductor_type', selectedSubmission.conductor_type, ['ABC', 'ACSR', 'UG'])}
                        {renderField('Pole No', 'pole_number', selectedSubmission.identifier)}
                        {renderField('Pole Type', 'pole_type', selectedSubmission.pole_type, ['Conical', 'Decorative', 'High Mast', 'Mini Mast', 'Octoganal', 'Post Top', 'PSC', 'RCC', 'Spun', 'Tubular'])}
                        {renderField('Height', 'pole_height', selectedSubmission.pole_height, ['0', '4', '5', '6', '7', '8', '9', '12', '16', '18', '24', '30'])}
                        {renderField('Distance', 'pole_to_pole_distance', selectedSubmission.pole_to_pole_distance)}
                        {renderField('ARM Type', 'arm_type', selectedSubmission.arm_type, ['single', 'double', 'multiple', 'multiply', 'empty/not present'])}
                        {renderField('ARM Status', 'arm_status', selectedSubmission.arm_status, ['new', 'old', 'deteriorated', 'missing', 'empty/not present'])}
                        {renderField('Present ARM No', 'present_arm_no', selectedSubmission.present_arm_no, Array.from({length: 12}, (_, i) => String(i)))}
                        {renderField('Present ARM Length', 'present_arm_length', selectedSubmission.present_arm_length, ['0', '1', '1.5', '2', '2.5'])}
                        {renderField('Lights Count', 'how_many_lights_in_pole', selectedSubmission.how_many_lights_in_pole, Array.from({length: 13}, (_, i) => String(i)))}
                        {renderField('Mounting Height', 'light_mounting_height', selectedSubmission.light_mounting_height, ['5', '6-7', '9', 'mini mast', 'high mast'])}
                        {renderField('Light Type', 'light_type', selectedSubmission.light_type, ['bulb', 'cfl', 'lamp', 'led', 'tube light', 'mh400', 't5', 'svl', 'empty', 'mini mast', 'high mast'])}
                        {renderField('Capacity', 'light_capacity', selectedSubmission.light_capacity, ['0W', '5W-25W', '40W', '65W', '90', '120', '150', '200', '250', '400'])}
                        {renderField('Working', 'light_working_status', selectedSubmission.light_working_status, ['yes', 'no'])}
                        {renderField('Road Cat', 'road_category', selectedSubmission.road_category, ['A1', 'A2', 'B1', 'B2', 'DTC', 'PARKS', 'SP'])}
                        {renderField('Road Type', 'road_type', selectedSubmission.road_type, ['MAIN ROAD', 'SUB MAIN ROAD', 'RESIDENTIAL ROAD', 'GALLI ROAD'])}
                        {renderField('Road Width', 'road_width_mtrs', selectedSubmission.road_width_mtrs, ['4', '5', '6', '7', '8', '9', '12', '16', '18', '24', '30'])}
                        {renderField('Earthing', 'pole_earthing_exists', selectedSubmission.pole_earthing_exists, ['YES', 'NO'])}
                        
                        <div className="col-span-3 border-t pt-2 mt-2 font-semibold text-gray-700">Proposal Form</div>
                        {renderField('Req ARM No', 'req_arm_number', selectedSubmission.req_arm_number)}
                        {renderField('Req ARM Length', 'req_arm_length', selectedSubmission.req_arm_length)}
                        {renderField('Req LED Lights No', 'req_led_lights_no', selectedSubmission.req_led_lights_no)}
                        {renderField('Req LED Wattage', 'req_led_wattage', selectedSubmission.req_led_wattage)}
                        {renderField('Req Dedicated Wire', 'req_dedicated_wire', selectedSubmission.req_dedicated_wire)}
                      </>
                    ) : (
                      <>
                        {renderField('Ward No', 'ward_number', selectedSubmission.ward_number)}
                        {renderField('Switch Point No', 'switch_point_number', selectedSubmission.switch_point_number)}
                        {renderField('Conductor Type', 'conductor_type', selectedSubmission.conductor_type, ['ABC', 'ACSR', 'UG'])}
                        {renderField('Pole No', 'pole_number', selectedSubmission.identifier)}
                        {renderField('Pole Type', 'pole_type', selectedSubmission.pole_type, ['Conical', 'Decorative', 'High Mast', 'Mini Mast', 'Octoganal', 'Post Top', 'PSC', 'RCC', 'Spun', 'Tubular'])}
                        {renderField('Height', 'pole_height_mtrs', selectedSubmission.pole_height_mtrs, ['0', '4', '5', '6', '7', '8', '9', '12', '16', '18', '24', '30'])}
                        {renderField('Condition', 'pole_condition', selectedSubmission.pole_condition, ['Good', 'defective', 'missing'])}
                        {renderField('Distance', 'pole_to_pole_distance_mtrs', selectedSubmission.pole_to_pole_distance_mtrs)}
                        {renderField('ARM Type', 'arm_type', selectedSubmission.arm_type, ['single', 'double', 'multiple', 'multiply', 'empty/not present'])}
                        {renderField('ARM Status', 'arm_status', selectedSubmission.arm_status, ['new', 'old', 'deteriorated', 'missing', 'empty/not present'])}
                        {renderField('Present ARM No', 'present_arm_no', selectedSubmission.present_arm_no, Array.from({length: 12}, (_, i) => String(i)))}
                        {renderField('Present ARM Length', 'present_arm_length_mtrs', selectedSubmission.present_arm_length_mtrs, ['0', '1', '1.5', '2', '2.5'])}
                        {renderField('Lights Count', 'how_many_lights_in_pole', selectedSubmission.how_many_lights_in_pole, Array.from({length: 13}, (_, i) => String(i)))}
                        {renderField('Mounting Height', 'light_mounting_height', selectedSubmission.light_mounting_height, ['5', '6-7', '9', 'mini mast', 'high mast'])}
                        {renderField('Light 1 Type', 'light_type', selectedSubmission.light_type, ['bulb', 'cfl', 'lamp', 'led', 'tube light', 'mh400', 't5', 'svl', 'empty', 'mini mast', 'high mast'])}
                        {renderField('Light 1 Capacity', 'light_capacity', selectedSubmission.light_capacity, ['0W', '5W-25W', '40W', '65W', '90', '120', '150', '200', '250', '400'])}
                        {renderField('Light 2 Type', 'light_type_2', selectedSubmission.light_type_2, ['bulb', 'cfl', 'lamp', 'led', 'tube light', 'mh400', 't5', 'svl', 'empty', 'mini mast', 'high mast'])}
                        {renderField('Light 2 Capacity', 'light_capacity_2', selectedSubmission.light_capacity_2, ['0W', '5W-25W', '40W', '65W', '90', '120', '150', '200', '250', '400'])}
                        {renderField('Working', 'light_working_status', selectedSubmission.light_working_status, ['yes', 'no'])}
                        {renderField('Road Cat', 'road_category', selectedSubmission.road_category, ['A1', 'A2', 'B1', 'B2', 'DTC', 'PARKS', 'SP'])}
                        {renderField('Road Type', 'road_type', selectedSubmission.road_type, ['MAIN ROAD', 'SUB MAIN ROAD', 'RESIDENTIAL ROAD', 'GALLI ROAD'])}
                        {renderField('Road Width', 'road_width_mtrs', selectedSubmission.road_width_mtrs, ['4', '5', '6', '7', '8', '9', '12', '16', '18', '24', '30'])}
                        {renderField('Earthing', 'pole_earthing_exists', selectedSubmission.pole_earthing_exists, ['YES', 'NO'])}
                      </>
                    )}
                  </div>
                </div>

                <div className="border-t pt-2 mt-2">
                  <p className="font-semibold text-gray-700 mb-2">GPS Coordinates</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-500 text-xs">Latitude</p>
                      <p className="font-medium text-sm">{selectedSubmission.latitude || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Longitude</p>
                      <p className="font-medium text-sm">{selectedSubmission.longitude || 'N/A'}</p>
                    </div>
                  </div>
                  {selectedSubmission.latitude && selectedSubmission.longitude && (
                    <div className="mt-3">
                      <a
                        href={`https://www.google.com/maps?q=${selectedSubmission.latitude},${selectedSubmission.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded transition-all justify-center shadow-sm"
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
                    {images.map((img) => (
                      <div key={img.id} className="border border-gray-100 rounded-lg overflow-hidden relative">
                        <img
                          src={img.signed_url}
                          alt="Survey"
                          className="w-full h-auto object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://placehold.co/400x300?text=Failed+to+Load';
                          }}
                        />
                        <p className="text-xs text-gray-400 p-1 text-center">{new Date(img.uploaded_at).toLocaleString()}</p>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => handleDeleteImage(img.id)}
                            className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700 shadow-lg"
                            title="Delete Image"
                          >
                            ✕
                          </button>
                        )}
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

                {/* Upload New Photo (Only in Edit Mode) */}
                {isEditing && (
                  <div className="border-2 border-dashed border-primary/30 p-4 rounded-lg bg-primary/5 text-center mt-2">
                    <p className="text-xs font-medium text-primary mb-2">Upload New Photo (Gallery)</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadNewImage}
                      className="text-xs"
                    />
                    <p className="text-xs text-gray-400 mt-1">Will be compressed automatically</p>
                  </div>
                )}
              </div>
            </div>
              
            <div className="flex justify-end gap-2 mt-6 border-t pt-4">
              <button
                onClick={() => { setSelectedSubmission(null); setIsEditing(false); }}
                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              {isEditing ? (
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Save size={16} />
                  <span>{saveMutation.isLoading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              ) : (
                activeTab === 'pending' && (
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to confirm this submission?')) {
                        confirmMutation.mutate({ id: selectedSubmission.id, type: selectedSubmission.type });
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    <span>Confirm Submission</span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

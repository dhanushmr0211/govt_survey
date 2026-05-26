import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState, useEffect } from 'react';
import { CheckCircle2, SearchCheck, Edit2, Save } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useToastStore } from '../../../store/toastStore';
import imageCompression from 'browser-image-compression';
import API_BASE_URL from '../../../config/api';

export const TodaySubmissionsView = ({ projectId: propProjectId }) => {
  const token = localStorage.getItem('token');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  const [page, setPage] = useState(1);
  const limit = 50;

  const user = useAuthStore((state) => state.user);
  const activeProject = useAuthStore((state) => state.activeProject);
  const projectId = propProjectId || activeProject?.id;

  const isMobileSurveyor = activeProject?.project_role === 'MOBILE_USER';

  const canShowEdit = user?.role === 'MASTER_ADMIN' || 
    (isMobileSurveyor && activeTab === 'pending') ||
    (activeProject?.section_i && activeTab === 'pending') || 
    (activeProject?.section_j && activeTab === 'confirmed');

  const canShowConfirm = (user?.role === 'MASTER_ADMIN' || 
    (activeProject?.section_i && activeTab === 'pending') || 
    (activeProject?.section_j && activeTab === 'confirmed')) && 
    !isMobileSurveyor;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [images, setImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const { data = { queue: [], total: 0 }, isLoading } = useQuery({
    queryKey: ['submissions', activeTab, page, projectId],
    queryFn: async () => {
      const endpoint = activeTab === 'pending' ? 'queue/pending' : 'queue/confirmed';
      const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/pole-survey/${endpoint}?page=${page}&limit=${limit}`, {
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
      const compressedFile = await imageCompression(file, options);
      const fileName = file.name.split('.')[0] + '_compressed.jpg';
      const renamedFile = new File([compressedFile], fileName, { type: 'image/jpeg' });

      const id = selectedSubmission.id;
      
      const fd = new FormData();
      fd.append('file', renamedFile);
      fd.append('entity_type', selectedSubmission.type);
      fd.append('entity_id', id);

      await axios.post(`${API_BASE_URL}/projects/${projectId}/pole-survey/files`, fd, {
        headers: { Authorization: `Bearer ${token}` },
      });

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
      
      // Auto-fill rules
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
      
      return updated;
    });
  };

  const renderField = (label, name, value, options = null) => {
    if (!isEditing) {
      return (
        <div>
          <p className="text-gray-500 text-xs">{label}</p>
          <p className="font-medium text-sm">{value || 'N/A'}</p>
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
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-xs p-1"
        />
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center mb-4">
          <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          <div className="h-6 bg-gray-200 rounded w-1/6 animate-pulse"></div>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Submissions</h2>
      </div>
      
      <div className="flex border-b border-gray-200 mb-4">
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'pending' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'confirmed' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('confirmed')}
        >
          Confirmed
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Ward</th>
              <th className="px-4 py-2">ULB</th>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((item) => {
              const displayDate = activeTab === 'confirmed' ? item.confirmed_at : item.created_at;
              const date = displayDate ? new Date(displayDate) : null;
              return (
                <tr key={`${item.type}-${item.id}`} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.type === 'switch_point' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                      {item.type === 'switch_point' ? 'Switch Point' : 'Pole'}
                    </span>
                  </td>
                  <td className="px-4 py-2">{item.ward_number}</td>
                  <td className="px-4 py-2">{item.ulb_name || 'N/A'}</td>
                   <td className="px-4 py-2">{date ? date.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => {
                        setSelectedSubmission(item);
                        setFormData({ 
                          ...item,
                          pole_number: item.type === 'pole' ? (item.pole_number || item.identifier) : undefined
                        });
                        setIsEditing(false);
                      }}
                      className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                    >
                      <SearchCheck size={14} /> VIEW DETAILS
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {queue.length > 0 && (
        <div className="flex justify-between items-center mt-4 p-4 bg-white border-t border-gray-100">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className={`px-4 py-2 border rounded text-sm font-medium ${page === 1 ? 'text-gray-400 bg-gray-50 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page <span className="font-medium">{page}</span> of <span className="font-medium">{Math.ceil(total / limit) || 1}</span> ({total} items)
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={queue.length < limit}
            className={`px-4 py-2 border rounded text-sm font-medium ${queue.length < limit ? 'text-gray-400 bg-gray-50 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            Next
          </button>
        </div>
      )}

      {queue.length === 0 && (
        <div className="text-gray-500 text-center py-6">No {activeTab} submissions found.</div>
      )}

      {/* Inspect Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
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
                <button onClick={() => { setSelectedSubmission(null); setIsEditing(false); }} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm flex-1 overflow-y-auto pr-2">
              {/* Left Side: Technical Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg">
                  <div><p className="text-gray-500 text-xs">ULB</p><p className="font-medium">{selectedSubmission.ulb_name || 'N/A'}</p></div>
                  <div><p className="text-gray-500 text-xs">Ward Number</p><p className="font-medium">{selectedSubmission.ward_number}</p></div>
                  <div><p className="text-gray-500 text-xs">Identifier</p><p className="font-medium">{selectedSubmission.identifier}</p></div>
                  <div><p className="text-gray-500 text-xs">{activeTab === 'confirmed' ? 'Confirmed Time' : 'Time'}</p><p className="font-medium">{new Date(activeTab === 'confirmed' ? (selectedSubmission.confirmed_at || selectedSubmission.created_at) : selectedSubmission.created_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}</p></div>
                </div>

                <div className="border-t pt-2">
                  <p className="font-semibold text-gray-700 mb-2">Technical Parameters</p>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedSubmission.type === 'switch_point' ? (
                      <>
                        {renderField('Switch Point No', 'switch_point_number', selectedSubmission.switch_point_number)}
                        {renderField('Type', 'switch_point_type', selectedSubmission.switch_point_type, ['DP', 'MCB', 'SWITCH', 'HOOK'])}
                        {renderField('Meter Exists', 'meter_exists', selectedSubmission.meter_exists ? 'Yes' : 'No', ['YES', 'NO'])}
                        {renderField('Meter Type', 'meter_type', selectedSubmission.meter_type, ['1P', '3P'])}
                        {renderField('RR Number', 'meter_rr_number', selectedSubmission.meter_rr_number)}
                        {renderField('Serial Number', 'meter_serial_number', selectedSubmission.meter_serial_number)}
                        {renderField('Condition', 'meter_condition', selectedSubmission.meter_condition, ['working', 'not working', 'missing'])}
                      </>
                    ) : (
                      <>
                        {renderField('Switch Point No', 'switch_point_number', selectedSubmission.switch_point_number)}
                        {renderField('Pole No', 'pole_number', selectedSubmission.identifier)}
                        {renderField('Conductor Type', 'conductor_type', selectedSubmission.conductor_type, ['ABC', 'ACSR', 'UG'])}
                        {renderField('Pole Type', 'pole_type', selectedSubmission.pole_type, ['Conical', 'Decorative', 'High Mast', 'Mini Mast', 'Octoganal', 'Post Top', 'PSC', 'RCC', 'Spun', 'Tubular'])}
                        {renderField('Height (m)', 'pole_height_mtrs', selectedSubmission.pole_height_mtrs, ['0', '4', '5', '6', '7', '8', '9', '12', '16', '18', '24', '30'])}
                        {renderField('Condition', 'pole_condition', selectedSubmission.pole_condition, ['Good', 'defective', 'missing'])}
                        {renderField('Distance (m)', 'pole_to_pole_distance_mtrs', selectedSubmission.pole_to_pole_distance_mtrs)}
                        {renderField('ARM Type', 'arm_type', selectedSubmission.arm_type, ['single', 'double', 'multiple', 'multiply', 'empty/not present'])}
                        {renderField('ARM Status', 'arm_status', selectedSubmission.arm_status, ['new', 'old', 'deteriorated', 'missing', 'empty/not present'])}
                        {renderField('ARM No', 'present_arm_no', selectedSubmission.present_arm_no, Array.from({length: 12}, (_, i) => String(i)))}
                        {renderField('ARM Length (m)', 'present_arm_length_mtrs', selectedSubmission.present_arm_length_mtrs, ['0', '1', '1.5', '2', '2.5'])}
                        {renderField('Lights Count', 'how_many_lights_in_pole', selectedSubmission.how_many_lights_in_pole, Array.from({length: 13}, (_, i) => String(i)))}
                        {renderField('Mounting Height', 'light_mounting_height', selectedSubmission.light_mounting_height, ['5', '6-7', '9', 'mini mast', 'high mast'])}
                        {renderField('Light Type', 'light_type', selectedSubmission.light_type, ['bulb', 'cfl', 'lamp', 'led', 'tube light', 'mh400', 't5', 'svl', 'empty', 'mini mast', 'high mast'])}
                        {renderField('Capacity', 'light_capacity', selectedSubmission.light_capacity, ['0W', '5W-25W', '40W', '65W', '90', '120', '150', '200', '250', '400'])}
                        {renderField('Working', 'light_working_status', selectedSubmission.light_working_status, ['yes', 'no'])}
                        {renderField('Road Cat', 'road_category', selectedSubmission.road_category, ['A1', 'A2', 'B1', 'B2', 'DTC', 'PARKS', 'SP'])}
                        {renderField('Road Type', 'road_type', selectedSubmission.road_type, ['MAIN ROAD', 'SUB MAIN ROAD', 'RESIDENTIAL ROAD', 'GALLI ROAD'])}
                        {renderField('Road Width (m)', 'road_width_mtrs', selectedSubmission.road_width_mtrs, ['4', '5', '6', '7', '8', '9', '12', '16', '18', '24', '30'])}
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

              {/* Right Side: Photos */}
              <div className="space-y-4">
                <p className="font-semibold text-gray-700">Photos</p>
                {loadingImages ? (
                   <div className="bg-gray-100 h-64 flex items-center justify-center text-gray-400 rounded-lg animate-pulse">Loading images...</div>
                ) : images.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto pr-1">
                    {images.map((img) => (
                      <div key={img.id} className="relative group rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={img.signed_url}
                          alt="Survey"
                          className="w-full h-auto object-cover"
                          onError={(e) => { e.target.src = 'https://placehold.co/400x300?text=Failed+to+Load'; }}
                        />
                        {isEditing && (
                          <button
                            onClick={() => handleDeleteImage(img.id)}
                            className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700 shadow-md"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed rounded-lg text-gray-400">
                    <SearchCheck size={48} className="mb-2 opacity-20" />
                    <p>No photos uploaded</p>
                  </div>
                )}

                {isEditing && (
                  <div className="p-4 border-2 border-dashed border-primary/20 rounded-lg bg-primary/5">
                    <p className="text-xs font-bold text-primary mb-2 uppercase">Upload New Photo</p>
                    <input type="file" accept="image/*" onChange={handleUploadNewImage} className="text-xs w-full" />
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6 border-t pt-4 bg-white">
              <button
                onClick={() => { setSelectedSubmission(null); setIsEditing(false); }}
                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                {isEditing ? 'Cancel' : 'Close'}
              </button>
              {isEditing ? (
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isLoading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 font-medium"
                >
                  <Save size={18} />
                  <span>{saveMutation.isLoading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              ) : (
                canShowConfirm && (
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to confirm this submission?')) {
                        confirmMutation.mutate({ id: selectedSubmission.id, type: selectedSubmission.type });
                      }
                    }}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 font-medium"
                  >
                    <CheckCircle2 size={18} />
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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';
import { CheckCircle2, SearchCheck, Edit2, Save } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';

export const SubmissionQueueView = ({ projectId = 2 }) => {
  const token = localStorage.getItem('token');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const limit = 50;

  const user = useAuthStore((state) => state.user);
  const canEdit = user?.role === 'MASTER_ADMIN' || user?.section_h;
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  const { data = { queue: [], total: 0 }, isLoading } = useQuery({
    queryKey: ['submissions', activeTab, page],
    queryFn: async () => {
      const endpoint = activeTab === 'pending' ? 'queue/pending' : 'queue/confirmed';
      const res = await axios.get(`https://govt-survey-backend-19218031051.asia-south1.run.app/api/v1/projects/${projectId}/pole-survey/${endpoint}?page=${page}&limit=${limit}`, {
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
        ? `https://govt-survey-backend-19218031051.asia-south1.run.app/api/v1/projects/${projectId}/pole-survey/switch-points/${id}/confirm`
        : `https://govt-survey-backend-19218031051.asia-south1.run.app/api/v1/projects/${projectId}/pole-survey/poles/${id}/confirm`;
      
      const res = await axios.post(endpoint, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['submissions']);
      alert('Submission confirmed successfully!');
      setSelectedSubmission(null);
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Error confirming submission');
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const endpoint = selectedSubmission.type === 'switch_point'
        ? `https://govt-survey-backend-19218031051.asia-south1.run.app/api/v1/projects/${projectId}/pole-survey/switch-points/${selectedSubmission.id}`
        : `https://govt-survey-backend-19218031051.asia-south1.run.app/api/v1/projects/${projectId}/pole-survey/poles/${selectedSubmission.id}`;
      
      const res = await axios.patch(endpoint, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['submissions']);
      alert('Changes saved successfully!');
      setIsEditing(false);
      setSelectedSubmission(null);
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Error saving changes');
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
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Submission Queue</h2>
          <p className="text-sm text-slate-500">{total} records in the {activeTab} queue</p>
        </div>
      
        <div className="inline-flex rounded-lg bg-slate-100 p-1">
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
              const date = new Date(item.created_at);
              return (
                <tr key={`${item.type}-${item.id}`}>
                  <td>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.type === 'switch_point' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                      {item.type === 'switch_point' ? 'Switch Point' : 'Pole'}
                    </span>
                  </td>
                  <td>{item.user_id}</td>
                  <td className="font-semibold text-slate-950">{item.user_name}</td>
                  <td>{date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                  <td>{date.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                  <td>{item.ward_number}</td>
                  <td>{item.ulb_name || 'N/A'}</td>
                  <td>
                    <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedSubmission(item);
                        setFormData({ ...item });
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
                {canEdit && !isEditing && (
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
                    <p className="text-gray-500 text-xs">Identifier</p>
                    <p className="font-medium">{selectedSubmission.identifier}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">ULB Name</p>
                    <p className="font-medium">{selectedSubmission.ulb_name || 'N/A'}</p>
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
                        {renderField('Light Type', 'light_type', selectedSubmission.light_type, ['bulb', 'cfl', 'lamp', 'led', 'tube light', 'mh400', 't5', 'svl', 'empty', 'mini mast', 'high mast'])}
                        {renderField('Capacity', 'light_capacity', selectedSubmission.light_capacity, ['0W', '5W-25W', '40W', '65W', '90', '120', '150', '200', '250', '400'])}
                        {renderField('Working', 'light_working_status', selectedSubmission.light_working_status, ['yes', 'no'])}
                        {renderField('Road Cat', 'road_category', selectedSubmission.road_category, ['A1', 'A2', 'B1', 'B2', 'DTC', 'PARKS', 'SP'])}
                        {renderField('Road Type', 'road_type', selectedSubmission.road_type, ['MAIN ROAD', 'SUB MAIN ROAD', 'RESIDENTIAL ROAD', 'GALLI ROAD'])}
                        {renderField('Road Width', 'road_width_mtrs', selectedSubmission.road_width_mtrs, ['4', '5', '6', '7', '8', '9', '12', '16', '18', '24', '30'])}
                        {renderField('Earthing', 'pole_earthing_exists', selectedSubmission.pole_earthing_exists, ['YES', 'NO'])}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side: Images */}
              <div className="space-y-2">
                <p className="font-semibold text-gray-700">Images</p>
                <div className="bg-gray-50 h-64 flex items-center justify-center text-gray-400 rounded-lg border-2 border-dashed border-gray-200">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4-4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="mt-1">Image Placeholder (Big)</p>
                  </div>
                </div>
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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState, useEffect } from 'react';

export const SubmissionQueueView = ({ projectId = 2 }) => {
  const token = localStorage.getItem('token');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const limit = 50;

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const { data = { queue: [], total: 0 }, isLoading } = useQuery({
    queryKey: ['submissions', activeTab, page],
    queryFn: async () => {
      const endpoint = activeTab === 'pending' ? 'queue/pending' : 'queue/confirmed';
      const res = await axios.get(`http://10.73.182.200:3000/api/v1/projects/${projectId}/pole-survey/${endpoint}?page=${page}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { queue: res.data.queue || [], total: res.data.total || 0 };
    },
  });

  const { queue, total } = data;

  const confirmMutation = useMutation({
    mutationFn: async ({ id, type }) => {
      const endpoint = type === 'switch_point' 
        ? `http://10.73.182.200:3000/api/v1/projects/${projectId}/pole-survey/switch-points/${id}/confirm`
        : `http://10.73.182.200:3000/api/v1/projects/${projectId}/pole-survey/poles/${id}/confirm`;
      
      const res = await axios.post(endpoint, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pendingSubmissions']);
      alert('Submission confirmed successfully!');
      setSelectedSubmission(null);
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Error confirming submission');
    }
  });

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm space-y-4">
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
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Submission Queue</h2>
      
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
              <th className="px-4 py-2">User ID</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Ward</th>
              <th className="px-4 py-2">Identifier</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((item) => {
              const date = new Date(item.created_at.replace('Z', ''));
              return (
                <tr key={`${item.type}-${item.id}`} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.type === 'switch_point' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                      {item.type === 'switch_point' ? 'Switch Point' : 'Pole'}
                    </span>
                  </td>
                  <td className="px-4 py-2">{item.user_id}</td>
                  <td className="px-4 py-2 font-medium text-gray-900">{item.user_name}</td>
                  <td className="px-4 py-2">{date.toLocaleDateString()}</td>
                  <td className="px-4 py-2">{date.toLocaleTimeString()}</td>
                  <td className="px-4 py-2">{item.ward_number}</td>
                  <td className="px-4 py-2">{item.identifier}</td>
                  <td className="px-4 py-2 flex gap-2">
                    <button
                      onClick={() => setSelectedSubmission(item)}
                      className="text-primary hover:underline font-medium"
                    >
                      INSPECT
                    </button>
                    {activeTab === 'pending' && (
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to confirm this submission?')) {
                            confirmMutation.mutate({ id: item.id, type: item.type });
                          }
                        }}
                        className="text-green-600 hover:underline font-medium"
                      >
                        CONFIRM
                      </button>
                    )}
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
        <div className="text-gray-500 text-center py-10">No pending submissions found.</div>
      )}

      {/* Inspect Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-width-4xl w-full mx-4" style={{ maxWidth: '800px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Inspect {selectedSubmission.type === 'switch_point' ? 'Switch Point' : 'Pole'}
              </h3>
              <button onClick={() => setSelectedSubmission(null)} className="text-gray-500 hover:text-gray-700">Close</button>
            </div>
            
            <div className="grid grid-cols-2 gap-6 text-sm">
              {/* Left Side: Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-gray-500 text-xs">Submitted By</p>
                    <p className="font-medium">{selectedSubmission.user_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Date/Time</p>
                    <p className="font-medium">{new Date(selectedSubmission.created_at.replace('Z', '')).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Ward Number</p>
                    <p className="font-medium">{selectedSubmission.ward_number}</p>
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
                        <div><p className="text-gray-500">Ward No</p><p className="font-medium">{selectedSubmission.ward_number}</p></div>
                        <div><p className="text-gray-500">Switch Point No</p><p className="font-medium">{selectedSubmission.identifier}</p></div>
                        <div><p className="text-gray-500">Type</p><p className="font-medium">{selectedSubmission.switch_point_type}</p></div>
                        <div><p className="text-gray-500">Meter Exists</p><p className="font-medium">{selectedSubmission.meter_exists ? 'Yes' : 'No'}</p></div>
                        <div><p className="text-gray-500">Meter Type</p><p className="font-medium">{selectedSubmission.meter_type}</p></div>
                        <div><p className="text-gray-500">RR Number</p><p className="font-medium">{selectedSubmission.meter_rr_number}</p></div>
                        <div><p className="text-gray-500">Serial Number</p><p className="font-medium">{selectedSubmission.meter_serial_number}</p></div>
                        <div><p className="text-gray-500">Meter Condition</p><p className="font-medium">{selectedSubmission.meter_condition}</p></div>
                      </>
                    ) : (
                      <>
                        <div><p className="text-gray-500">Ward No</p><p className="font-medium">{selectedSubmission.ward_number}</p></div>
                        <div><p className="text-gray-500">Switch Point No</p><p className="font-medium">{selectedSubmission.switch_point_number}</p></div>
                        <div><p className="text-gray-500">Conductor Type</p><p className="font-medium">{selectedSubmission.conductor_type}</p></div>
                        <div><p className="text-gray-500">Pole No</p><p className="font-medium">{selectedSubmission.pole_number}</p></div>
                        <div><p className="text-gray-500">Pole Type</p><p className="font-medium">{selectedSubmission.pole_type}</p></div>
                        <div><p className="text-gray-500">Height</p><p className="font-medium">{selectedSubmission.pole_height_mtrs}m</p></div>
                        <div><p className="text-gray-500">Condition</p><p className="font-medium">{selectedSubmission.pole_condition}</p></div>
                        <div><p className="text-gray-500">Distance</p><p className="font-medium">{selectedSubmission.pole_to_pole_distance_mtrs}m</p></div>
                        <div><p className="text-gray-500">ARM Type</p><p className="font-medium">{selectedSubmission.arm_type}</p></div>
                        <div><p className="text-gray-500">ARM Status</p><p className="font-medium">{selectedSubmission.arm_status}</p></div>
                        <div><p className="text-gray-500">Present ARM No</p><p className="font-medium">{selectedSubmission.present_arm_no}</p></div>
                        <div><p className="text-gray-500">ARM Length</p><p className="font-medium">{selectedSubmission.present_arm_length_mtrs}m</p></div>
                        <div><p className="text-gray-500">Lights Count</p><p className="font-medium">{selectedSubmission.how_many_lights_in_pole}</p></div>
                        <div><p className="text-gray-500">Mounting Height</p><p className="font-medium">{selectedSubmission.light_mounting_height}</p></div>
                        <div><p className="text-gray-500">Light Type</p><p className="font-medium">{selectedSubmission.light_type}</p></div>
                        <div><p className="text-gray-500">Capacity</p><p className="font-medium">{selectedSubmission.light_capacity}</p></div>
                        <div><p className="text-gray-500">Working</p><p className="font-medium">{selectedSubmission.light_working_status}</p></div>
                        <div><p className="text-gray-500">Road Cat</p><p className="font-medium">{selectedSubmission.road_category}</p></div>
                        <div><p className="text-gray-500">Road Type</p><p className="font-medium">{selectedSubmission.road_type}</p></div>
                        <div><p className="text-gray-500">Road Width</p><p className="font-medium">{selectedSubmission.road_width_mtrs}m</p></div>
                        <div><p className="text-gray-500">Earthing</p><p className="font-medium">{selectedSubmission.pole_earthing_exists}</p></div>
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
              
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                {activeTab === 'pending' && (
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to confirm this submission?')) {
                        confirmMutation.mutate({ id: selectedSubmission.id, type: selectedSubmission.type });
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Confirm Submission
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

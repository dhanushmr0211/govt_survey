import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';

export const TodaySubmissionsView = () => {
  const projectId = 2; // Fixed to match database
  const token = localStorage.getItem('token');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ['submissions', activeTab],
    queryFn: async () => {
      const endpoint = activeTab === 'pending' ? 'queue/pending' : 'queue/confirmed';
      const res = await axios.get(`http://10.73.182.200:3000/api/v1/projects/${projectId}/pole-survey/${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.queue || [];
    },
  });

  if (isLoading) return <div className="text-gray-500 text-center py-4">Loading submissions...</div>;

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
              <th className="px-4 py-2">Identifier</th>
              <th className="px-4 py-2">Time</th>
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
                  <td className="px-4 py-2">{item.ward_number}</td>
                  <td className="px-4 py-2">{item.identifier}</td>
                  <td className="px-4 py-2">{date.toLocaleTimeString()}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => setSelectedSubmission(item)}
                      className="text-primary hover:underline font-medium"
                    >
                      VIEW DETAILS
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {queue.length === 0 && (
        <div className="text-gray-500 text-center py-6">No submissions done today.</div>
      )}

      {/* Inspect Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-width-4xl w-full mx-4" style={{ maxWidth: '600px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Details: {selectedSubmission.type === 'switch_point' ? 'Switch Point' : 'Pole'}
              </h3>
              <button onClick={() => setSelectedSubmission(null)} className="text-gray-500 hover:text-gray-700">Close</button>
            </div>
            
            <div className="grid grid-cols-1 gap-4 text-sm max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                <div><p className="text-gray-500 text-xs">Ward Number</p><p className="font-medium">{selectedSubmission.ward_number}</p></div>
                <div><p className="text-gray-500 text-xs">Identifier</p><p className="font-medium">{selectedSubmission.identifier}</p></div>
                <div><p className="text-gray-500 text-xs">Time</p><p className="font-medium">{new Date(selectedSubmission.created_at.replace('Z', '')).toLocaleTimeString()}</p></div>
              </div>

              <div className="border-t pt-2 mt-2">
                <p className="font-semibold text-gray-700 mb-2">Technical Details</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {selectedSubmission.type === 'switch_point' ? (
                    <>
                      <div><p className="text-gray-500">Type</p><p className="font-medium">{selectedSubmission.switch_point_type}</p></div>
                      <div><p className="text-gray-500">Meter Exists</p><p className="font-medium">{selectedSubmission.meter_exists ? 'Yes' : 'No'}</p></div>
                      <div><p className="text-gray-500">Meter Type</p><p className="font-medium">{selectedSubmission.meter_type}</p></div>
                      <div><p className="text-gray-500">RR Number</p><p className="font-medium">{selectedSubmission.meter_rr_number}</p></div>
                      <div><p className="text-gray-500">Serial Number</p><p className="font-medium">{selectedSubmission.meter_serial_number}</p></div>
                      <div><p className="text-gray-500">Condition</p><p className="font-medium">{selectedSubmission.meter_condition}</p></div>
                    </>
                  ) : (
                    <>
                      <div><p className="text-gray-500">Conductor Type</p><p className="font-medium">{selectedSubmission.conductor_type}</p></div>
                      <div><p className="text-gray-500">Pole Type</p><p className="font-medium">{selectedSubmission.pole_type}</p></div>
                      <div><p className="text-gray-500">Height</p><p className="font-medium">{selectedSubmission.pole_height_mtrs}m</p></div>
                      <div><p className="text-gray-500">Condition</p><p className="font-medium">{selectedSubmission.pole_condition}</p></div>
                      <div><p className="text-gray-500">Distance</p><p className="font-medium">{selectedSubmission.pole_to_pole_distance_mtrs}m</p></div>
                      <div><p className="text-gray-500">ARM Type</p><p className="font-medium">{selectedSubmission.arm_type}</p></div>
                      <div><p className="text-gray-500">Lights Count</p><p className="font-medium">{selectedSubmission.how_many_lights_in_pole}</p></div>
                      <div><p className="text-gray-500">Light Type</p><p className="font-medium">{selectedSubmission.light_type}</p></div>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

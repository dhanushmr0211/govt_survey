import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import { useEmployeeTracking } from '../shared/hooks/useEmployeeTracking';
import { useMobileUserTracking } from '../shared/hooks/useMobileUserTracking';

export function EmployeeTrackingView({ projectId }) {
  const { data: tracking = [], isLoading } = useEmployeeTracking(projectId);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading tracking data...</div>;

  if (selectedEmp) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Tracking for {selectedEmp.name}</h2>
          <button onClick={() => setSelectedEmp(null)} className="text-sm text-primary hover:text-primary/80 font-bold">← Back to List</button>
        </div>
        
        <div className="flex space-x-4 mb-4 border-b border-gray-100">
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-2 text-sm font-medium ${activeTab === 'pending' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Pending (Open)
          </button>
          <button
            onClick={() => setActiveTab('confirmed')}
            className={`pb-2 text-sm font-medium ${activeTab === 'confirmed' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Confirmed (Resolved)
          </button>
        </div>

        {activeTab === 'pending' && (
          <UserSubmissionsList projectId={projectId} userId={selectedEmp.id} status="PENDING" />
        )}
        {activeTab === 'confirmed' && (
          <UserSubmissionsList projectId={projectId} confirmedBy={selectedEmp.id} status="CONFIRMED" />
        )}
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Employee Performance Tracking</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Resolved</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Total Resolved</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tracking.map((emp) => (
              <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{emp.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{emp.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{emp.today_resolved}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{emp.total_resolved}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button onClick={() => setSelectedEmp(emp)} className="text-primary hover:text-primary/80 font-bold underline">View Submissions</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MobileUserTrackingView({ projectId }) {
  const { data: tracking = [], isLoading } = useMobileUserTracking(projectId);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading tracking data...</div>;

  if (selectedUser) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Tracking for {selectedUser.name}</h2>
          <button onClick={() => setSelectedUser(null)} className="text-sm text-primary hover:text-primary/80 font-bold">← Back to List</button>
        </div>
        
        <div className="flex space-x-4 mb-4 border-b border-gray-100">
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-2 text-sm font-medium ${activeTab === 'pending' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Pending
          </button>
          <button
            onClick={() => setActiveTab('confirmed')}
            className={`pb-2 text-sm font-medium ${activeTab === 'confirmed' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Confirmed
          </button>
        </div>

        {activeTab === 'pending' && (
          <UserSubmissionsList projectId={projectId} userId={selectedUser.id} status="PENDING" />
        )}
        {activeTab === 'confirmed' && (
          <UserSubmissionsList projectId={projectId} userId={selectedUser.id} status="CONFIRMED" />
        )}
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Mobile User Activity Tracking</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Total</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Overall Total</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tracking.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{user.today_total}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{user.total}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button onClick={() => setSelectedUser(user)} className="text-primary hover:text-primary/80 font-bold underline">View Submissions</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserSubmissionsList({ projectId, userId, confirmedBy, status }) {
  const token = localStorage.getItem('token');
  const endpoint = status === 'PENDING' ? 'queue/pending' : 'queue/confirmed';
  const [selectedSub, setSelectedSub] = useState(null);
  const [images, setImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  
  const { data, isLoading } = useQuery({
    queryKey: ['user-submissions', projectId, userId, confirmedBy, status],
    queryFn: async () => {
      let url = `${API_BASE_URL}/projects/${projectId}/pole-survey/${endpoint}`;
      let params = [];
      if (userId) params.push(`userId=${userId}`);
      if (confirmedBy) params.push(`confirmedBy=${confirmedBy}`);
      if (params.length > 0) url += `?${params.join('&')}`;
      
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    }
  });

  useEffect(() => {
    const fetchImages = async () => {
      if (!selectedSub) {
        setImages([]);
        return;
      }

      setLoadingImages(true);
      try {
        const res = await axios.get(
          `${API_BASE_URL}/projects/${projectId}/pole-survey/files?entity_type=${selectedSub.type}&entity_id=${selectedSub.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setImages(res.data.files || []);
      } catch (err) {
        console.error('Failed to fetch submission images:', err);
        setImages([]);
      } finally {
        setLoadingImages(false);
      }
    };

    fetchImages();
  }, [selectedSub, projectId, token]);

  if (isLoading) return <div className="p-4 text-center text-slate-400">Loading submissions...</div>;

  const submissions = data?.queue || [];

  return (
    <div className="mt-4">
      <h3 className="text-md font-medium text-gray-900 mb-2">{status} Submissions ({data?.total || 0})</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ward</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ULB Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {submissions.map((sub, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${sub.type === 'switch_point' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {sub.type === 'switch_point' ? 'Switch' : 'Pole'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(sub.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(sub.created_at).toLocaleTimeString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sub.ward_number}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{sub.ulb_name || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                  <button onClick={() => setSelectedSub(sub)} className="text-primary hover:text-primary/80">INSPECT</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedSub && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white p-8 rounded-2xl max-w-4xl w-full mx-4 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">
                Inspection: {selectedSub.ulb_name || 'N/A'}
              </h3>
              <button onClick={() => setSelectedSub(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase">Submitted By</p>
                    <p className="font-bold text-slate-900">{selectedSub.user_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase">Ward</p>
                    <p className="font-bold text-slate-900">{selectedSub.ward_number}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase">ULB</p>
                    <p className="font-bold text-slate-900">{selectedSub.ulb_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase">Identifier</p>
                    <p className="font-bold text-slate-900">{selectedSub.identifier || 'N/A'}</p>
                  </div>
                </div>

                <div>
                   <p className="font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">Technical Specifications</p>
                   <div className="grid grid-cols-2 gap-y-2 text-sm">
                      {selectedSub.type === 'switch_point' ? (
                        <>
                          <span className="text-slate-500">Ward No</span><span className="font-semibold text-right">{selectedSub.ward_number || 'N/A'}</span>
                          <span className="text-slate-500">Switch Point No</span><span className="font-semibold text-right">{selectedSub.switch_point_number || 'N/A'}</span>
                          <span className="text-slate-500">Type</span><span className="font-semibold text-right">{selectedSub.switch_point_type || 'N/A'}</span>
                          <span className="text-slate-500">Meter Exists</span><span className="font-semibold text-right">{selectedSub.meter_exists ? 'Yes' : 'No'}</span>
                          <span className="text-slate-500">Meter Type</span><span className="font-semibold text-right">{selectedSub.meter_type || 'N/A'}</span>
                          <span className="text-slate-500">RR Number</span><span className="font-semibold text-right">{selectedSub.meter_rr_number || 'N/A'}</span>
                          <span className="text-slate-500">Serial Number</span><span className="font-semibold text-right">{selectedSub.meter_serial_number || 'N/A'}</span>
                          <span className="text-slate-500">Meter Condition</span><span className="font-semibold text-right">{selectedSub.meter_condition || 'N/A'}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-slate-500">Ward No</span><span className="font-semibold text-right">{selectedSub.ward_number || 'N/A'}</span>
                          <span className="text-slate-500">Switch Point No</span><span className="font-semibold text-right">{selectedSub.switch_point_number || 'N/A'}</span>
                          <span className="text-slate-500">Pole No</span><span className="font-semibold text-right">{selectedSub.identifier || 'N/A'}</span>
                          <span className="text-slate-500">Pole Type</span><span className="font-semibold text-right">{selectedSub.pole_type || 'N/A'}</span>
                          <span className="text-slate-500">Height</span><span className="font-semibold text-right">{selectedSub.pole_height_mtrs ? `${selectedSub.pole_height_mtrs} m` : 'N/A'}</span>
                          <span className="text-slate-500">Condition</span><span className="font-semibold text-right">{selectedSub.pole_condition || 'N/A'}</span>
                        </>
                      )}
                   </div>
                </div>

                <div>
                  <p className="font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">Location</p>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <span className="text-slate-500">Latitude</span>
                    <span className="font-semibold text-right">{selectedSub.latitude || 'N/A'}</span>
                    <span className="text-slate-500">Longitude</span>
                    <span className="font-semibold text-right">{selectedSub.longitude || 'N/A'}</span>
                  </div>
                  {selectedSub.latitude && selectedSub.longitude && (
                    <div className="mt-3">
                      <a
                        href={`https://www.google.com/maps?q=${selectedSub.latitude},${selectedSub.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded transition-all"
                      >
                        Open in Google Maps
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-900 mb-3">Field Images</p>
                {loadingImages ? (
                  <div className="aspect-video bg-slate-100 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 text-sm italic">Loading images...</p>
                  </div>
                ) : images.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto pr-1">
                    {images.map((img) => (
                      <div key={img.id} className="rounded-lg overflow-hidden border border-slate-200">
                        <img
                          src={img.signed_url}
                          alt="Submission"
                          className="w-full h-auto object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://placehold.co/400x300?text=Failed+to+Load';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="aspect-video bg-slate-100 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 text-sm italic">No images found for this submission.</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedSub(null)}
                className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

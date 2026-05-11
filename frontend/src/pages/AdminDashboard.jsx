import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useProjects } from '../shared/hooks/useProjects';
import { SummaryView } from '../modules/poleSurvey/components/SummaryView';
import { WardDetailsView } from '../modules/poleSurvey/components/WardDetailsView';
import { SubmissionQueueView } from '../modules/poleSurvey/components/SubmissionQueueView';
import { useEmployeeTracking } from '../shared/hooks/useEmployeeTracking';
import { useMobileUserTracking } from '../shared/hooks/useMobileUserTracking';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export default function AdminDashboard() {
  const user = useAuthStore((state) => state.user);
  const token = localStorage.getItem('token');
  const isMasterAdmin = user?.role === 'MASTER_ADMIN';
  const hasSectionA = isMasterAdmin || user?.section_a;
  const hasSectionB = isMasterAdmin || user?.section_b;
  const hasSectionC = isMasterAdmin || user?.section_c;
  const hasSectionE = isMasterAdmin || user?.section_e;
  const hasSectionF = isMasterAdmin || user?.section_f;
  
  const [activeView, setActiveView] = useState('projects');
  const [selectedProject, setSelectedProject] = useState(null); // { id, name }
  const [selectedUlb, setSelectedUlb] = useState(null);

  const { data: projects = [], isLoading } = useProjects();

  if (isLoading) return <div className="text-gray-500 text-center py-10">Loading projects...</div>;

  return (
    <div className="flex h-screen bg-gray-50 -m-6">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Govt Survey</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => { setActiveView('projects'); setSelectedUlb(null); }}
            className={`w-full text-left p-2 rounded text-sm ${activeView === 'projects' ? 'bg-primary/5 text-primary font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Projects
          </button>
          
          {selectedProject && (
            <div className="ml-4 space-y-1 border-l-2 border-gray-100 pl-2">
              {hasSectionA && (
                <button
                  onClick={() => { setActiveView('pole_survey_summary'); setSelectedUlb(null); }}
                  className={`w-full text-left p-2 text-xs rounded ${activeView === 'pole_survey_summary' ? 'text-primary font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  1: SUMMARY
                </button>
              )}
              {hasSectionB && (
                <button
                  onClick={() => { setActiveView('pole_survey_today'); setSelectedUlb(null); }}
                  className={`w-full text-left p-2 text-xs rounded ${activeView === 'pole_survey_today' ? 'text-primary font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  2: TODAY'S SUMMARY
                </button>
              )}
              {hasSectionC && (
                <button
                  onClick={() => { setActiveView('pole_survey_issues'); setSelectedUlb(null); }}
                  className={`w-full text-left p-2 text-xs rounded ${activeView === 'pole_survey_issues' ? 'text-primary font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  3: ISSUES
                </button>
              )}
            </div>
          )}
          
          {hasSectionE && (
            <button
              onClick={() => setActiveView('employee_tracking')}
              className={`w-full text-left p-2 text-sm rounded ${activeView === 'employee_tracking' ? 'text-primary font-medium bg-gray-50' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              EMPLOYEE TRACKING
            </button>
          )}

          {hasSectionF && (
            <button
              onClick={() => setActiveView('mobile_user_tracking')}
              className={`w-full text-left p-2 text-sm rounded ${activeView === 'mobile_user_tracking' ? 'text-primary font-medium bg-gray-50' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              MOBILE USER TRACKING
            </button>
          )}

          <button
            onClick={() => alert('Download Report flow will be implemented later.')}
            className="w-full text-left p-2 text-sm text-gray-600 hover:bg-gray-50 rounded"
          >
            DOWNLOAD REPORT
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {activeView === 'projects' ? 'My Projects' : selectedProject?.name}
            </h1>
            <p className="text-sm text-gray-500">Welcome, {user?.name}</p>
          </div>
        </div>

        {activeView === 'projects' && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Assigned Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div 
                  key={project.id}
                  onClick={() => {
                    setSelectedProject(project);
                    if (hasSectionA) setActiveView('pole_survey_summary');
                    else if (hasSectionB) setActiveView('pole_survey_today');
                    else if (hasSectionC) setActiveView('pole_survey_issues');
                  }}
                  className="p-6 border border-gray-200 rounded-lg hover:border-primary cursor-pointer transition-colors"
                >
                  <h3 className="font-semibold text-gray-900">{project.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">Manage project details, summaries, and approvals.</p>
                </div>
              ))}
              {projects.length === 0 && (
                <div className="text-gray-500 text-center py-10 col-span-3">No projects assigned yet.</div>
              )}
            </div>
          </div>
        )}

        {activeView === 'pole_survey_summary' && !selectedUlb && (
          <SummaryView onViewDetails={(ulb) => setSelectedUlb(ulb)} />
        )}
        
        {activeView === 'pole_survey_summary' && selectedUlb && (
          <WardDetailsView ulb={selectedUlb} onBack={() => setSelectedUlb(null)} />
        )}
        
        {activeView === 'pole_survey_today' && !selectedUlb && (
          <SummaryView date={new Date().toISOString().split('T')[0]} onViewDetails={(ulb) => setSelectedUlb(ulb)} />
        )}

        {activeView === 'pole_survey_today' && selectedUlb && (
          <WardDetailsView ulb={selectedUlb} onBack={() => setSelectedUlb(null)} />
        )}
        
        {activeView === 'pole_survey_issues' && (
          <SubmissionQueueView />
        )}

        {activeView === 'employee_tracking' && (
          <EmployeeTrackingView projectId={selectedProject?.id || 2} />
        )}

        {activeView === 'mobile_user_tracking' && (
          <MobileUserTrackingView projectId={selectedProject?.id || 2} />
        )}
      </div>
    </div>
  );
}

function EmployeeTrackingView({ projectId }) {
  const { data: tracking = [], isLoading } = useEmployeeTracking(projectId);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');

  if (isLoading) return <div>Loading tracking data...</div>;

  if (selectedEmp) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Tracking for {selectedEmp.name}</h2>
          <button onClick={() => setSelectedEmp(null)} className="text-sm text-primary hover:text-primary/80">Back</button>
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
          <UserSubmissionsList projectId={projectId} status="PENDING" />
        )}
        {activeTab === 'confirmed' && (
          <UserSubmissionsList projectId={projectId} confirmedBy={selectedEmp.id} status="CONFIRMED" />
        )}
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Employee Tracking</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Today's Resolved</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Resolved</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tracking.map((emp) => (
              <tr key={emp.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{emp.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.today_resolved}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.total_resolved}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button onClick={() => setSelectedEmp(emp)} className="text-primary hover:text-primary/80 font-medium">View More</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmployeeIssuesList({ projectId, userId, status }) {
  const token = localStorage.getItem('token');
  const [selectedIssue, setSelectedIssue] = useState(null);
  
  const { data, isLoading } = useQuery({
    queryKey: ['employee-issues', projectId, userId, status],
    queryFn: async () => {
      let url = `http://10.73.182.200:3000/api/v1/projects/${projectId}/issues?status=${status}`;
      if (userId) url += `&resolvedBy=${userId}`;
      
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    }
  });

  if (isLoading) return <div>Loading issues...</div>;

  const issues = data?.issues || [];

  return (
    <div className="mt-4">
      <h3 className="text-md font-medium text-gray-900 mb-2">{status === 'OPEN' ? 'Open' : 'Resolved'} Issues ({issues.length})</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {issues.map((issue) => (
              <tr key={issue.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${issue.entity_type === 'switch_point' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                    {issue.entity_type === 'switch_point' ? 'Switch Point' : 'Pole'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{issue.entity_id}</td>
                <td className="px-6 py-4 text-sm text-gray-900 truncate max-w-xs">{issue.issue_note}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(issue.raised_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(issue.raised_at).toLocaleTimeString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {status === 'OPEN' ? (
                    <span onClick={() => setSelectedIssue(issue)} className="text-red-600 cursor-pointer hover:text-red-800">INSPECT</span>
                  ) : (
                    <span onClick={() => setSelectedIssue(issue)} className="text-primary cursor-pointer hover:text-primary/80">VIEW MORE DETAILS</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MobileUserTrackingView({ projectId }) {
  const { data: tracking = [], isLoading } = useMobileUserTracking(projectId);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');

  if (isLoading) return <div>Loading tracking data...</div>;

  if (selectedUser) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Tracking for {selectedUser.name}</h2>
          <button onClick={() => setSelectedUser(null)} className="text-sm text-primary hover:text-primary/80">Back</button>
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
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Mobile User Tracking</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Today's Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tracking.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.today_total}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.total}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button onClick={() => setSelectedUser(user)} className="text-primary hover:text-primary/80 font-medium">View More</button>
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
  
  const { data, isLoading } = useQuery({
    queryKey: ['user-submissions', projectId, userId, confirmedBy, status],
    queryFn: async () => {
      let url = `http://10.73.182.200:3000/api/v1/projects/${projectId}/pole-survey/${endpoint}`;
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

  if (isLoading) return <div>Loading submissions...</div>;

  const submissions = data?.queue || [];

  return (
    <div className="mt-4">
      <h3 className="text-md font-medium text-gray-900 mb-2">{status} Submissions ({data?.total || 0})</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ward</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Identifier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {submissions.map((sub, i) => (
              <tr key={i}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${sub.type === 'switch_point' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                    {sub.type === 'switch_point' ? 'Switch Point' : 'Pole'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sub.user_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sub.user_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(sub.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(sub.created_at).toLocaleTimeString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sub.ward_number}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sub.identifier}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {status === 'PENDING' ? (
                    <span onClick={() => setSelectedSub(sub)} className="text-red-600 cursor-pointer hover:text-red-800">INSPECT</span>
                  ) : (
                    <span onClick={() => setSelectedSub(sub)} className="text-primary cursor-pointer hover:text-primary/80">VIEW MORE DETAILS</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedSub && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-width-4xl w-full mx-4" style={{ maxWidth: '800px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {status === 'PENDING' ? 'Inspect' : 'View'} {selectedSub.type === 'switch_point' ? 'Switch Point' : 'Pole'}
              </h3>
              <button onClick={() => setSelectedSub(null)} className="text-gray-500 hover:text-gray-700">Close</button>
            </div>
            
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-gray-500 text-xs">Submitted By</p>
                    <p className="font-medium">{selectedSub.user_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Date/Time</p>
                    <p className="font-medium">{new Date(selectedSub.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Ward Number</p>
                    <p className="font-medium">{selectedSub.ward_number}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Identifier</p>
                    <p className="font-medium">{selectedSub.identifier}</p>
                  </div>
                </div>

                <div className="border-t pt-2 mt-2">
                  <p className="font-semibold text-gray-700 mb-2">Technical Details</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {selectedSub.type === 'switch_point' ? (
                      <>
                        <div><p className="text-gray-500">Type</p><p className="font-medium">{selectedSub.switch_point_type || 'N/A'}</p></div>
                        <div><p className="text-gray-500">Meter Exists</p><p className="font-medium">{selectedSub.meter_exists ? 'Yes' : 'No'}</p></div>
                        <div><p className="text-gray-500">Meter Type</p><p className="font-medium">{selectedSub.meter_type || 'N/A'}</p></div>
                        <div><p className="text-gray-500">RR Number</p><p className="font-medium">{selectedSub.meter_rr_number || 'N/A'}</p></div>
                        <div><p className="text-gray-500">Serial Number</p><p className="font-medium">{selectedSub.meter_serial_number || 'N/A'}</p></div>
                      </>
                    ) : (
                      <>
                        <div><p className="text-gray-500">Pole Type</p><p className="font-medium">{selectedSub.pole_type || 'N/A'}</p></div>
                        <div><p className="text-gray-500">Height</p><p className="font-medium">{selectedSub.pole_height_mtrs || 'N/A'}m</p></div>
                        <div><p className="text-gray-500">Condition</p><p className="font-medium">{selectedSub.pole_condition || 'N/A'}</p></div>
                        <div><p className="text-gray-500">Light Type</p><p className="font-medium">{selectedSub.light_type || 'N/A'}</p></div>
                        <div><p className="text-gray-500">Working</p><p className="font-medium">{selectedSub.light_working_status || 'N/A'}</p></div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-gray-700">Images</p>
                <div className="bg-gray-50 h-64 flex items-center justify-center text-gray-400 rounded-lg border-2 border-dashed border-gray-200">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4-4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="mt-1">Image Placeholder</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setSelectedSub(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

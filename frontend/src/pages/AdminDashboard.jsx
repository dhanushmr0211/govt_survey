import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { SummaryView } from '../modules/poleSurvey/components/SummaryView';
import { WardDetailsView } from '../modules/poleSurvey/components/WardDetailsView';
import { SubmissionQueueView } from '../modules/poleSurvey/components/SubmissionQueueView';
import { useEmployeeTracking } from '../shared/hooks/useEmployeeTracking';
import { useMobileUserTracking } from '../shared/hooks/useMobileUserTracking';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { BarChart3, CalendarDays, ClipboardList, Download, Smartphone, UserCheck, ArrowLeft, Users as UsersIcon } from 'lucide-react';
import API_BASE_URL from '../config/api';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const { user, activeProject, clearActiveProject } = useAuthStore();
  
  const hasSectionA = activeProject?.section_a;
  const hasSectionB = activeProject?.section_b;
  const hasSectionC = activeProject?.section_c;
  const hasSectionD = activeProject?.section_d;
  const hasSectionE = activeProject?.section_e;
  const hasSectionF = activeProject?.section_f;
  const hasSectionG = activeProject?.section_g;
  
  // Set default view based on sections
  const [activeView, setActiveView] = useState(
    hasSectionA ? 'pole_survey_summary' : 
    hasSectionB ? 'pole_survey_today' : 
    hasSectionC ? 'pole_survey_issues' : 'pole_survey_summary'
  );
  
  const [selectedUlb, setSelectedUlb] = useState(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  const sectionItems = [
    hasSectionA && { key: 'pole_survey_summary', label: 'Summary', icon: BarChart3 },
    hasSectionB && { key: 'pole_survey_today', label: "Today's Summary", icon: CalendarDays },
    hasSectionC && { key: 'pole_survey_issues', label: 'Issues', icon: ClipboardList },
  ].filter(Boolean);

  const utilityItems = [
    hasSectionD && { key: 'users', label: 'Team', icon: UsersIcon, path: '/users' },
    hasSectionE && { key: 'employee_tracking', label: 'Employee Tracking', icon: UserCheck },
    hasSectionF && { key: 'mobile_user_tracking', label: 'Mobile User Tracking', icon: Smartphone },
  ].filter(Boolean);

  if (!activeProject) return null;

  return (
    <div className="min-h-full -m-4 bg-slate-100 sm:-m-6 xl:-m-8">
      <div className="mx-auto flex min-h-full w-full max-w-[1760px] gap-5 p-4 sm:p-6 xl:p-8">
        <aside className="hidden w-72 shrink-0 flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:flex">
          <div className="mb-4 rounded-lg bg-slate-950 p-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Admin workspace</p>
            <p className="mt-1 text-lg font-bold">{user?.name || 'Admin'}</p>
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Project</p>
              <p className="text-sm font-semibold text-primary truncate">{activeProject.name}</p>
            </div>
          </div>
          
          <nav className="space-y-2 flex-1">
            <button
              onClick={clearActiveProject}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950 transition-colors"
            >
              <ArrowLeft size={18} /> Switch Project
            </button>

            <div className="my-4 border-t border-slate-100"></div>

            {sectionItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => { setActiveView(item.key); setSelectedUlb(null); }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold transition-colors ${activeView === item.key ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
                >
                  <Icon size={18} /> {item.label}
                </button>
              );
            })}

            <div className="my-2"></div>

            {utilityItems.map((item) => {
              const Icon = item.icon;
              if (item.path) {
                return (
                  <Link
                    key={item.key}
                    to={item.path}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950 transition-colors"
                  >
                    <Icon size={18} /> {item.label}
                  </Link>
                );
              }
              return (
                <button
                  key={item.key}
                  onClick={() => { setActiveView(item.key); setSelectedUlb(null); }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold transition-colors ${activeView === item.key ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
                >
                  <Icon size={18} /> {item.label}
                </button>
              );
            })}

            {hasSectionG && (
              <button
                onClick={() => setIsDownloadModalOpen(true)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
              >
                <Download size={18} /> Download Report
              </button>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <section className="min-w-0 flex-1">
          <div className="mb-5 flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {activeProject.name} Dashboard
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 lg:text-3xl">
                {sectionItems.find(i => i.key === activeView)?.label || utilityItems.find(i => i.key === activeView)?.label || 'Overview'}
              </h1>
            </div>
            <div className="flex flex-wrap gap-2 lg:hidden">
              <button 
                onClick={clearActiveProject}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold bg-slate-100 text-slate-700"
              >
                <ArrowLeft size={14} /> Back
              </button>
              {[...sectionItems, ...utilityItems].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => { setActiveView(item.key); setSelectedUlb(null); }}
                    className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold ${activeView === item.key ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700'}`}
                  >
                    <Icon size={14} /> {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {activeView === 'pole_survey_summary' && !selectedUlb && (
            <SummaryView projectId={activeProject.id} onViewDetails={(ulb) => setSelectedUlb(ulb)} />
          ) }
          
          {activeView === 'pole_survey_summary' && selectedUlb && (
            <WardDetailsView projectId={activeProject.id} ulb={selectedUlb} onBack={() => setSelectedUlb(null)} />
          )}
          
          {activeView === 'pole_survey_today' && !selectedUlb && (
            <SummaryView projectId={activeProject.id} date={new Date().toISOString().split('T')[0]} onViewDetails={(ulb) => setSelectedUlb(ulb)} />
          )}

          {activeView === 'pole_survey_today' && selectedUlb && (
            <WardDetailsView projectId={activeProject.id} ulb={selectedUlb} onBack={() => setSelectedUlb(null)} />
          )}
          
          {activeView === 'pole_survey_issues' && (
            <SubmissionQueueView projectId={activeProject.id} />
          )}

          {activeView === 'employee_tracking' && (
            <EmployeeTrackingView projectId={activeProject.id} />
          )}

          {activeView === 'mobile_user_tracking' && (
            <MobileUserTrackingView projectId={activeProject.id} />
          )}
        </section>

        <DownloadReportModal 
          isOpen={isDownloadModalOpen} 
          onClose={() => setIsDownloadModalOpen(false)} 
          projectId={activeProject.id}
        />
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(sub.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(sub.created_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
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
                    <p className="font-medium">{new Date(selectedSub.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                  </div>
                  {selectedSub.confirmed_by_name && (
                    <>
                      <div>
                        <p className="text-gray-500 text-xs">Confirmed By</p>
                        <p className="font-medium">{selectedSub.confirmed_by_name}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Confirmed At</p>
                        <p className="font-medium">{selectedSub.confirmed_at ? new Date(selectedSub.confirmed_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}</p>
                      </div>
                    </>
                  )}
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
                        <div><p className="text-gray-500">Switch Point No#</p><p className="font-medium">{selectedSub.switch_point_number || 'N/A'}</p></div>
                        <div><p className="text-gray-500">Pole No#</p><p className="font-medium">{selectedSub.identifier || 'N/A'}</p></div>
                        <div><p className="text-gray-500">Conductor Type</p><p className="font-medium">{selectedSub.conductor_type || 'N/A'}</p></div>
                        <div><p className="text-gray-500">Pole Type</p><p className="font-medium">{selectedSub.pole_type || 'N/A'}</p></div>
                        <div><p className="text-gray-500">Height</p><p className="font-medium">{selectedSub.pole_height_mtrs || 'N/A'}m</p></div>
                        <div><p className="text-gray-500">Condition</p><p className="font-medium">{selectedSub.pole_condition || 'N/A'}</p></div>
                        <div><p className="text-gray-500">Distance</p><p className="font-medium">{selectedSub.pole_to_pole_distance_mtrs || 'N/A'}m</p></div>
                        <div><p className="text-gray-500">ARM Type</p><p className="font-medium">{selectedSub.arm_type || 'N/A'}</p></div>
                        <div><p className="text-gray-500">ARM Status</p><p className="font-medium">{selectedSub.arm_status || 'N/A'}</p></div>
                        <div><p className="text-gray-500">Present ARM No#</p><p className="font-medium">{selectedSub.present_arm_no || 'N/A'}</p></div>
                        <div><p className="text-gray-500">Present ARM Length</p><p className="font-medium">{selectedSub.present_arm_length_mtrs || 'N/A'}m</p></div>
                        <div><p className="text-gray-500">Lights Count</p><p className="font-medium">{selectedSub.how_many_lights_in_pole || 'N/A'}</p></div>
                        <div><p className="text-gray-500">Light Mounting Height</p><p className="font-medium">{selectedSub.light_mounting_height || 'N/A'}</p></div>
                        <div><p className="text-gray-500">Light Type</p><p className="font-medium">{selectedSub.light_type || 'N/A'}</p></div>
                        <div><p className="text-gray-500">Light Capacity</p><p className="font-medium">{selectedSub.light_capacity || 'N/A'}</p></div>
                        <div><p className="text-gray-500">Light Working Status</p><p className="font-medium">{selectedSub.light_working_status || 'N/A'}</p></div>
                        <div><p className="text-gray-500">Road Category</p><p className="font-medium">{selectedSub.road_category || 'N/A'}</p></div>
                        <div><p className="text-gray-500">Road Type</p><p className="font-medium">{selectedSub.road_type || 'N/A'}</p></div>
                        <div><p className="text-gray-500">Road Width</p><p className="font-medium">{selectedSub.road_width_mtrs || 'N/A'}m</p></div>
                        <div><p className="text-gray-500">Pole Earthing Exists</p><p className="font-medium">{selectedSub.pole_earthing_exists || 'N/A'}</p></div>
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

function DownloadReportModal({ isOpen, onClose, projectId }) {
  const token = localStorage.getItem('token');
  const [district, setDistrict] = useState('');
  const [tillDate, setTillDate] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: summary = [] } = useQuery({
    queryKey: ['districts', projectId],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/pole-survey/summary/districts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data.summary;
    },
    enabled: isOpen && !!projectId
  });

  const districts = Array.from(new Set(summary.map(s => s.district_id))).map(id => {
    const row = summary.find(s => s.district_id === id);
    return { id, name: row.district_name };
  });

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      let url = `${API_BASE_URL}/projects/${projectId}/pole-survey/report/download`;
      let params = [];
      if (district) params.push(`district=${district}`);
      if (tillDate) params.push(`tillDate=${tillDate}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `report_${projectId}_${district || 'all'}_${tillDate || 'all'}.xlsx`;
      link.click();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Failed to download report');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Download Report</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">Close</button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select District</label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm"
            >
              <option value="">All Districts</option>
              {districts.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Till Date</label>
            <input
              type="date"
              value={tillDate}
              onChange={(e) => setTillDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {isDownloading ? 'Downloading...' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  );
}

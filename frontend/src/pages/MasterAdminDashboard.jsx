import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { CreateAdminModal } from '../shared/components/CreateAdminModal';
import { SummaryView } from '../modules/poleSurvey/components/SummaryView';
import { WardDetailsView } from '../modules/poleSurvey/components/WardDetailsView';
import { SubmissionQueueView } from '../modules/poleSurvey/components/SubmissionQueueView';
import { useEmployeeTracking } from '../shared/hooks/useEmployeeTracking';
import { useMobileUserTracking } from '../shared/hooks/useMobileUserTracking';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { BarChart3, CalendarDays, ClipboardList, Download, FolderKanban, Smartphone, UserCheck, Users, Landmark, LogOut } from 'lucide-react';

export default function MasterAdminDashboard() {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeView, setActiveView] = useState(location.state?.activeView || 'projects');
  const [selectedProject, setSelectedProject] = useState(localStorage.getItem('selectedProject') || null);
  const [selectedProjectId, setSelectedProjectId] = useState(localStorage.getItem('selectedProjectId') ? Number(localStorage.getItem('selectedProjectId')) : null);
  const [selectedUlb, setSelectedUlb] = useState(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  const { data: projectsData = { projects: [] } } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://govt-survey-backend-19218031051.asia-south1.run.app/api/v1/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
  });
  const projects = projectsData.projects || [];

  useEffect(() => {
    if (location.state?.activeView) {
      setActiveView(location.state.activeView);
    }
    if (location.state?.openDownload) {
      setIsDownloadModalOpen(true);
    }
  }, [location.state]);

  const sectionItems = (selectedProject && activeView !== 'projects') ? [
    (user?.role === 'MASTER_ADMIN' || user?.section_a) && { key: 'pole_survey_summary', label: 'Summary', icon: BarChart3 },
    (user?.role === 'MASTER_ADMIN' || user?.section_b) && { key: 'pole_survey_today', label: "Today's Summary", icon: CalendarDays },
    (user?.role === 'MASTER_ADMIN' || user?.section_c) && { key: 'pole_survey_issues', label: 'Issues', icon: ClipboardList },
  ].filter(Boolean) : [];

  const utilityItems = (selectedProject && activeView !== 'projects') ? [
    (user?.role === 'MASTER_ADMIN' || user?.section_d) && { key: 'users', label: 'Users', icon: Users, path: selectedProjectId ? `/users?projectId=${selectedProjectId}` : '/users' },
    (user?.role === 'MASTER_ADMIN' || user?.section_e) && { key: 'employee_tracking', label: 'Employee Tracking', icon: UserCheck },
    (user?.role === 'MASTER_ADMIN' || user?.section_f) && { key: 'mobile_user_tracking', label: 'Mobile User Tracking', icon: Smartphone },
  ].filter(Boolean) : [];

  const pageTitle = activeView === 'projects' ? 'All Projects' : selectedProject || 'Project Workspace';

  return (
    <div className="min-h-full -m-4 bg-slate-100 sm:-m-6 xl:-m-8">
      <div className="mx-auto flex min-h-full w-full max-w-[1760px] gap-5 p-4 sm:p-6 xl:p-8">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-950 text-white lg:flex fixed top-16 left-0 h-[calc(100vh-4rem)] z-30">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/25">
                <Landmark size={22} />
              </div>
              <div>
                <p className="text-base font-bold tracking-tight">Govt Survey</p>
                <p className="text-xs font-medium text-slate-400">Operations Console</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 border-b border-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Master Workspace</p>
            <p className="mt-1 text-lg font-bold">{user?.name || 'Master Admin'}</p>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto no-scrollbar">
            <button
              onClick={() => { 
                setActiveView('projects'); 
                setSelectedUlb(null); 
                setSelectedProject(null);
                setSelectedProjectId(null);
                localStorage.removeItem('selectedProject');
                localStorage.removeItem('selectedProjectId');
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold transition-colors ${activeView === 'projects' ? 'bg-primary text-white shadow-sm' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
            >
              <FolderKanban size={18} /> Projects
            </button>

            {sectionItems.length > 0 && (
              <div className="space-y-1 border-l border-white/10 pl-3">
                {sectionItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      onClick={() => { setActiveView(item.key); setSelectedUlb(null); }}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold transition-colors ${activeView === item.key ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                    >
                      <Icon size={16} /> {item.label}
                    </button>
                  );
                })}
              </div>
            )}

            {utilityItems.length > 0 && (
              <div className="space-y-1 border-l border-white/10 pl-3">
                {utilityItems.map((item) => {
                  const Icon = item.icon;
                  if (item.path) {
                    return (
                      <Link
                        key={item.key}
                        to={item.path}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold transition-colors ${activeView === item.key ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                      >
                        <Icon size={16} /> {item.label}
                      </Link>
                    );
                  }
                  return (
                    <button
                      key={item.key}
                      onClick={() => setActiveView(item.key)}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold transition-colors ${activeView === item.key ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                    >
                      <Icon size={16} /> {item.label}
                    </button>
                  );
                })}
              </div>
            )}

            {selectedProject && activeView !== 'projects' && (user?.role === 'MASTER_ADMIN' || user?.section_g) && (
              <div className="space-y-1 border-l border-white/10 pl-3 mt-1">
                <button
                  onClick={() => setIsDownloadModalOpen(true)}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Download size={16} /> Download Report
                </button>
              </div>
            )}
          </nav>

          <div className="p-4 border-t border-white/10">
            <button
              onClick={() => useAuthStore.getState().logout()}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <section className="min-w-0 flex-1 lg:ml-64">
          <div className="mb-5 flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Dashboard</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 lg:text-3xl">
              {pageTitle}
            </h1>
            <p className="mt-1 text-sm text-slate-500">Welcome, {user?.name}. Review project health, queues, and field activity in a wide view.</p>
          </div>
          {user?.role === 'MASTER_ADMIN' && (
            <Link
              to="/users"
              className="inline-flex items-center gap-2 rounded-md bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Users size={16} /> Global Users
            </Link>
          )}
          <div className="flex flex-wrap gap-2 lg:hidden">
            {[{ key: 'projects', label: 'Projects', icon: FolderKanban }, ...sectionItems, ...utilityItems].map((item) => {
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

        {activeView === 'projects' && (
          <div className="premium-panel p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-950">Select a Project</h2>
              <p className="text-sm text-slate-500">Choose a survey program to open its operational dashboard.</p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {projects.length === 0 ? (
                <div className="col-span-full text-center py-10">
                  <p className="text-sm text-slate-500">No projects assigned to you.</p>
                </div>
              ) : (
                projects.map((p) => (
                  <div 
                    key={p.id}
                    onClick={() => {
                      setSelectedProject(p.name);
                      setSelectedProjectId(p.id);
                      localStorage.setItem('selectedProject', p.name);
                      localStorage.setItem('selectedProjectId', p.id);
                      
                      // Find first allowed view
                      const firstView = user?.role === 'MASTER_ADMIN' ? 'pole_survey_summary' :
                        user?.section_a ? 'pole_survey_summary' :
                        user?.section_b ? 'pole_survey_today' :
                        user?.section_c ? 'pole_survey_issues' :
                        user?.section_d ? 'users' :
                        user?.section_e ? 'employee_tracking' :
                        user?.section_f ? 'mobile_user_tracking' : 'projects';
                      
                      setActiveView(firstView);
                    }}
                    className="group cursor-pointer rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                  >
                    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-light text-primary-dark">
                      <FolderKanban size={22} />
                    </div>
                    <h3 className="font-bold text-slate-950">{p.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Manage {p.name} details, summaries, approvals, and tracking.</p>
                    <p className="mt-5 text-sm font-semibold text-primary">Open workspace</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeView === 'pole_survey_summary' && (user?.role === 'MASTER_ADMIN' || user?.section_a) && !selectedUlb && (
          <SummaryView projectId={selectedProjectId} onViewDetails={(ulb) => setSelectedUlb(ulb)} />
        )}
        
        {activeView === 'pole_survey_summary' && selectedUlb && (
          <WardDetailsView projectId={selectedProjectId} ulb={selectedUlb} onBack={() => setSelectedUlb(null)} />
        )}
        
        {activeView === 'pole_survey_today' && !selectedUlb && (
          <SummaryView projectId={selectedProjectId} date={new Date().toISOString().split('T')[0]} onViewDetails={(ulb) => setSelectedUlb(ulb)} />
        )}

        {activeView === 'pole_survey_today' && selectedUlb && (
          <WardDetailsView projectId={selectedProjectId} ulb={selectedUlb} onBack={() => setSelectedUlb(null)} />
        )}
        
        {activeView === 'pole_survey_issues' && (
          <SubmissionQueueView projectId={selectedProjectId} />
        )}
        
        {activeView === 'employee_tracking' && (
          <EmployeeTrackingView projectId={selectedProjectId} />
        )}
        
        {activeView === 'mobile_user_tracking' && (
          <MobileUserTrackingView projectId={2} />
        )}
        </section>
      </div>
      <CreateAdminModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <DownloadReportModal 
        isOpen={isDownloadModalOpen} 
        onClose={() => setIsDownloadModalOpen(false)} 
        projectId={2}
      />
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
      let url = `https://govt-survey-backend-19218031051.asia-south1.run.app/api/v1/projects/${projectId}/pole-survey/${endpoint}`;
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
      const res = await axios.get(`https://govt-survey-backend-19218031051.asia-south1.run.app/api/v1/projects/${projectId}/pole-survey/summary/districts`, {
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
      let url = `https://govt-survey-backend-19218031051.asia-south1.run.app/api/v1/projects/${projectId}/pole-survey/report/download`;
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

import { useState, useEffect } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { CreateAdminModal } from '../shared/components/CreateAdminModal';
import { SummaryView } from '../modules/poleSurvey/components/SummaryView';
import { WardDetailsView } from '../modules/poleSurvey/components/WardDetailsView';
import { SubmissionQueueView } from '../modules/poleSurvey/components/SubmissionQueueView';
import { UsersView } from './UsersView';
import { EmployeeTrackingView, MobileUserTrackingView } from './TrackingViews';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { BarChart3, CalendarDays, ClipboardList, Download, FolderKanban, Smartphone, UserCheck, Users, LogOut } from 'lucide-react';
import API_BASE_URL from '../config/api';
import { useProjects } from '../shared/hooks/useProjects';
import { getLocalDateString } from '../shared/utils/date';

export default function MasterAdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  
  const activeView = searchParams.get('view') || 'projects';
  const selectedProjectId = searchParams.get('projectId') ? Number(searchParams.get('projectId')) : null;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProjectName, setSelectedProjectName] = useState(localStorage.getItem('master_selectedProjectName') || null);
  const [selectedUlb, setSelectedUlb] = useState(null);
  const [ulbFilterParams, setUlbFilterParams] = useState(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  const { data: projects = [] } = useProjects();

  const currentProject = projects.find(p => p.id === Number(selectedProjectId));
  const activeProject = useAuthStore((state) => state.activeProject);
  const effectiveProject = currentProject || activeProject;

  useEffect(() => {
    if (location.state?.activeView) {
      setSearchParams({ ...Object.fromEntries(searchParams), view: location.state.activeView });
    }
    if (location.state?.openDownload) {
      setIsDownloadModalOpen(true);
    }
  }, [location.state]);

  const sectionItems = [
    effectiveProject?.section_a && { key: 'pole_survey_summary', label: 'Summary', icon: BarChart3 },
    effectiveProject?.section_b && { key: 'pole_survey_today', label: "Today's Summary", icon: CalendarDays },
    effectiveProject?.section_c && { key: 'pole_survey_issues', label: 'Inspect', icon: ClipboardList },
  ].filter(Boolean);

  const utilityItems = [
    effectiveProject?.section_d && { key: 'users', label: 'Team', icon: Users },
    effectiveProject?.section_e && { key: 'employee_tracking', label: 'Employee Tracking', icon: UserCheck },
    effectiveProject?.section_f && { key: 'mobile_user_tracking', label: 'Mobile User Tracking', icon: Smartphone },
  ].filter(Boolean);

  const pageTitle = activeView === 'projects' ? 'All Projects' : selectedProjectName || 'Project Workspace';

  return (
    <div className="min-h-full -m-4 bg-slate-100 sm:-m-6 xl:-m-8">
      <div className="mx-auto flex min-h-full w-full max-w-[1760px] gap-5 p-4 sm:p-6 xl:p-8">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-950 text-white lg:flex fixed top-16 left-0 h-[calc(100vh-4rem)] z-30">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="PR ELECTRICALS" className="h-11 w-11 rounded-full object-cover shadow-lg border border-white/10" />
              <div>
                <p className="text-base font-bold tracking-tight text-white">PR ELECTRICALS</p>
                <p className="text-xs font-medium text-slate-400">Master Admin</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 border-b border-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Global Control</p>
            <p className="mt-1 text-lg font-bold">{user?.name || 'Master Admin'}</p>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto no-scrollbar">
            <button
              onClick={() => { 
                setSearchParams({ view: 'projects' });
                setSelectedUlb(null); 
                setUlbFilterParams(null);
                setSelectedProjectName(null);
                localStorage.removeItem('master_selectedProjectName');
                localStorage.removeItem('master_selectedProjectId');
                // Also clear the global active project for consistency
                useAuthStore.getState().clearActiveProject();
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold transition-colors ${activeView === 'projects' ? 'bg-primary text-white shadow-sm' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
            >
              <FolderKanban size={18} /> Switch Project
            </button>

            {sectionItems.length > 0 && (
              <div className="space-y-1 border-l border-white/10 pl-3">
                {sectionItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      onClick={() => { 
                        setSearchParams({ projectId: String(effectiveProject?.id), view: item.key });
                        setSelectedUlb(null); 
                        setUlbFilterParams(null);
                      }}
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
                      onClick={() => setSearchParams({ projectId: String(effectiveProject?.id), view: item.key })}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold transition-colors ${activeView === item.key ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                    >
                      <Icon size={16} /> {item.label}
                    </button>
                  );
                })}
              </div>
            )}

            {selectedProjectId && activeView !== 'projects' && (
              <div className="space-y-1 border-l border-white/10 pl-3 mt-1">
                {effectiveProject?.section_g && (
                  <button
                    onClick={() => setIsDownloadModalOpen(true)}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Download size={16} /> Download Report
                  </button>
                )}
              </div>
            )}
          </nav>

          <div className="p-4 border-t border-white/10">
            <button
              onClick={logout}
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
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Master Console</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 lg:text-3xl">
              {pageTitle}
            </h1>
          </div>
          <Link
            to="/global-users"
            className="inline-flex items-center gap-2 rounded-md bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Users size={16} /> Global Users
          </Link>
        </div>

        {(activeView === 'projects' || !selectedProjectId) && (
          <div className="premium-panel p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-950">Select a Project</h2>
              <p className="text-sm text-slate-500">Choose a survey program to open its operational dashboard.</p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((p) => (
                <div 
                  key={p.id}
                  onClick={() => {
                    useAuthStore.getState().setActiveProject(p);
                    setSelectedProjectName(p.name);
                    localStorage.setItem('master_selectedProjectName', p.name);
                    localStorage.setItem('master_selectedProjectId', p.id);
                    setSearchParams({ projectId: String(p.id), view: 'pole_survey_summary' });
                  }}
                  className="group relative cursor-pointer rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <div className="absolute top-6 right-6 flex flex-col items-end gap-1.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-600 border border-orange-500/20 shadow-sm">
                      {(p.project_role || user?.role || 'MASTER_ADMIN').replace('_', ' ')}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-600 border border-orange-500/20 shadow-sm">
                      May/19/2026
                    </span>
                  </div>
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600">
                    <FolderKanban size={22} />
                  </div>
                  <h3 className="font-bold text-slate-950">{p.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Manage {p.name} details, summaries, and tracking.</p>
                  <p className="mt-5 text-sm font-semibold text-orange-500">Open workspace</p>
                </div>
              ))}
            </div>
          </div>
        )}

         {effectiveProject?.id && activeView === 'pole_survey_summary' && !selectedUlb && (
          <SummaryView projectId={effectiveProject.id} onViewDetails={(ulb) => setSelectedUlb(ulb)} />
        )}
        
        {effectiveProject?.id && activeView === 'pole_survey_summary' && selectedUlb && (
          <WardDetailsView projectId={effectiveProject.id} ulb={selectedUlb} onBack={() => setSelectedUlb(null)} />
        )}
        
        {effectiveProject?.id && activeView === 'pole_survey_today' && !selectedUlb && (
          <SummaryView 
            projectId={effectiveProject.id} 
            date={getLocalDateString()} 
            onViewDetails={(ulb, filters) => { 
              setSelectedUlb(ulb); 
              setUlbFilterParams(filters); 
            }} 
          />
        )}

        {effectiveProject?.id && activeView === 'pole_survey_today' && selectedUlb && (
          <WardDetailsView 
            projectId={effectiveProject.id} 
            ulb={selectedUlb} 
            onBack={() => { 
              setSelectedUlb(null); 
              setUlbFilterParams(null); 
            }} 
            date={ulbFilterParams?.date}
            mode={ulbFilterParams?.mode}
            fromDate={ulbFilterParams?.fromDate}
            toDate={ulbFilterParams?.toDate}
          />
        )}
        
        {effectiveProject?.id && activeView === 'pole_survey_issues' && (
          <SubmissionQueueView projectId={effectiveProject.id} />
        )}
        
        {effectiveProject?.id && activeView === 'users' && (
          <UsersView projectId={effectiveProject.id} />
        )}
        
        {effectiveProject?.id && activeView === 'employee_tracking' && (
          <EmployeeTrackingView projectId={effectiveProject.id} />
        )}
        
        {effectiveProject?.id && activeView === 'mobile_user_tracking' && (
          <MobileUserTrackingView projectId={effectiveProject.id} />
        )}
        </section>
      </div>
      <CreateAdminModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <DownloadReportModal 
        isOpen={isDownloadModalOpen} 
        onClose={() => setIsDownloadModalOpen(false)} 
        projectId={effectiveProject?.id}
      />
    </div>
  );
}



function DownloadReportModal({ isOpen, onClose, projectId }) {
  const token = localStorage.getItem('token');
  const today = getLocalDateString();
  const [district, setDistrict] = useState('');
  const [ulbId, setUlbId] = useState('');
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
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

  const ulbs = summary
    .filter(s => !district || s.district_id === Number(district))
    .map(s => ({ id: s.ulb_id, name: s.ulb_name }));

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      let url = `${API_BASE_URL}/projects/${projectId}/pole-survey/report/download`;
      let params = [];
      if (district) params.push(`district=${district}`);
      if (ulbId) params.push(`ulbId=${ulbId}`);
      if (fromDate) params.push(`fromDate=${fromDate}`);
      if (toDate) params.push(`toDate=${toDate}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      
      let filename = `report_${projectId}`;
      if (district) {
        const dName = districts.find(d => d.id === Number(district))?.name;
        filename += `_${dName || district}`;
      }
      if (ulbId) {
        const uName = ulbs.find(u => u.id === Number(ulbId))?.name;
        filename += `_${uName || ulbId}`;
      }
      if (fromDate) filename += `_${fromDate}`;
      if (toDate) filename += `_${toDate}`;
      filename += '.xlsx';

      link.download = filename;
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
              onChange={(e) => {
                setDistrict(e.target.value);
                setUlbId(''); // Reset ULB when district changes
              }}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm"
            >
              <option value="">All Districts</option>
              {districts.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select ULB</label>
            <select
              value={ulbId}
              onChange={(e) => setUlbId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              disabled={!district && districts.length > 0} // Optional: disable if no district selected, or allow searching all ULBs
            >
              <option value="">All ULBs</option>
              {ulbs.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              />
            </div>
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

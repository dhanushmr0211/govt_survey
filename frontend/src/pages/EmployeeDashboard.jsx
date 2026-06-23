import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { SummaryView } from '../modules/poleSurvey/components/SummaryView';
import { WardDetailsView } from '../modules/poleSurvey/components/WardDetailsView';
import { SubmissionQueueView } from '../modules/poleSurvey/components/SubmissionQueueView';
import { UsersView } from './UsersView';
import { EmployeeTrackingView, AdminTrackingView, MobileUserTrackingView } from './TrackingViews';
import { DownloadReportModal } from '../shared/components/DownloadReportModal';
import { BarChart3, CalendarDays, ClipboardList, ArrowLeft, Download, Landmark, LogOut, Users as UsersIcon, UserCheck, Smartphone, Shield } from 'lucide-react';
import { getLocalDateString } from '../shared/utils/date';

export default function EmployeeDashboard() {
  const { user, activeProject, clearActiveProject } = useAuthStore();
  
  const hasSectionA = activeProject?.section_a;
  const hasSectionB = activeProject?.section_b;
  const hasSectionC = activeProject?.section_c;
  const hasSectionD = activeProject?.section_d;
  const hasSectionE = activeProject?.section_e;
  const hasSectionF = activeProject?.section_f;
  const hasSectionG = activeProject?.section_g;
  const hasSectionK = activeProject?.section_k;

  const [activeView, setActiveView] = useState(
    hasSectionA ? 'pole_survey_summary' : 
    hasSectionB ? 'pole_survey_today' : 
    hasSectionC ? 'pole_survey_issues' : 'pole_survey_summary'
  );
  
  const [selectedUlb, setSelectedUlb] = useState(null);
  const [ulbFilterParams, setUlbFilterParams] = useState(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  const sectionItems = [
    hasSectionA && { key: 'pole_survey_summary', label: 'Summary', icon: BarChart3 },
    hasSectionB && { key: 'pole_survey_today', label: "Today's Summary", icon: CalendarDays },
    hasSectionC && { key: 'pole_survey_issues', label: 'Inspect', icon: ClipboardList },
  ].filter(Boolean);

  const utilityItems = [
    hasSectionD && { key: 'users', label: 'Team', icon: UsersIcon },
    hasSectionK && { key: 'admin_tracking', label: 'Admin Tracking', icon: Shield },
    hasSectionE && { key: 'employee_tracking', label: 'Employee Tracking', icon: UserCheck },
    hasSectionF && { key: 'mobile_user_tracking', label: 'Mobile User Tracking', icon: Smartphone },
  ].filter(Boolean);

  if (!activeProject) return null;

  return (
    <div className="min-h-full -m-4 bg-slate-100 sm:-m-6 xl:-m-8">
      <div className="mx-auto flex min-h-full w-full max-w-[1760px] gap-5 p-4 sm:p-6 xl:p-8">
        {/* Premium Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-950 text-white lg:flex fixed top-16 left-0 h-[calc(100vh-4rem)] z-30">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="PR ELECTRICALS" className="h-11 w-11 rounded-full object-cover shadow-lg border border-white/10" />
              <div>
                <p className="text-base font-bold tracking-tight text-white">PR ELECTRICALS</p>
                <p className="text-xs font-medium text-slate-400">Operations Console</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 border-b border-white/10 bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Employee Workspace</p>
            <p className="mt-1 text-lg font-bold truncate text-white">{user?.name || 'Employee'}</p>
            <div className="mt-2 text-xs font-medium text-emerald-500 truncate">
              {activeProject.name}
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto no-scrollbar">
            <button
              onClick={clearActiveProject}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} /> Switch Project
            </button>

            <div className="my-4 border-t border-white/10"></div>

            {sectionItems.length > 0 && (
              <div className="space-y-1 border-l border-white/10 pl-3">
                {sectionItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      onClick={() => { setActiveView(item.key); setSelectedUlb(null); setUlbFilterParams(null); }}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold transition-colors ${activeView === item.key ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                    >
                      <Icon size={16} /> {item.label}
                    </button>
                  );
                })}
              </div>
            )}

            {utilityItems.length > 0 && (
              <div className="space-y-1 border-l border-white/10 pl-3 mt-4">
                {utilityItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      onClick={() => { setActiveView(item.key); setSelectedUlb(null); setUlbFilterParams(null); }}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold transition-colors ${activeView === item.key ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                    >
                      <Icon size={16} /> {item.label}
                    </button>
                  );
                })}
              </div>
            )}

            {hasSectionG && (
              <div className="space-y-1 border-l border-white/10 pl-3 mt-4">
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
              <span>Logout Account</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <section className="min-w-0 flex-1 lg:ml-64">
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
                    onClick={() => { setActiveView(item.key); setSelectedUlb(null); setUlbFilterParams(null); }}
                    className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold ${activeView === item.key ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700'}`}
                  >
                    <Icon size={14} /> {item.label}
                  </button>
                );
              })}
              {hasSectionG && (
                <button
                  onClick={() => setIsDownloadModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  <Download size={14} /> Download Report
                </button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {activeView === 'pole_survey_summary' && !selectedUlb && (
              <SummaryView projectId={activeProject.id} onViewDetails={(ulb) => setSelectedUlb(ulb)} hideZeroCounts={true} />
            )}
            
            {activeView === 'pole_survey_summary' && selectedUlb && (
              <WardDetailsView projectId={activeProject.id} ulb={selectedUlb} onBack={() => setSelectedUlb(null)} />
            )}
            
            {activeView === 'pole_survey_today' && !selectedUlb && (
              <SummaryView 
                projectId={activeProject.id} 
                date={getLocalDateString()} 
                onViewDetails={(ulb, filters) => { 
                  setSelectedUlb(ulb); 
                  setUlbFilterParams(filters); 
                }} 
                hideZeroCounts={true} 
              />
            )}

            {activeView === 'pole_survey_today' && selectedUlb && (
              <WardDetailsView 
                projectId={activeProject.id} 
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

            {activeView === 'pole_survey_issues' && (
              <SubmissionQueueView projectId={activeProject.id} />
            )}

            {activeView === 'users' && (
              <UsersView projectId={activeProject.id} roleFilter="MOBILE_USER" />
            )}
            
            {activeView === 'admin_tracking' && (
              <AdminTrackingView projectId={activeProject.id} />
            )}

            {activeView === 'employee_tracking' && (
              <EmployeeTrackingView projectId={activeProject.id} />
            )}
            
            {activeView === 'mobile_user_tracking' && (
              <MobileUserTrackingView projectId={activeProject.id} />
            )}
          </div>
        </section>
      </div>
      <DownloadReportModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        projectId={activeProject.id}
      />
    </div>
  );
}

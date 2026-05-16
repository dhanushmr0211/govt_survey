import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { SummaryView } from '../modules/poleSurvey/components/SummaryView';
import { WardDetailsView } from '../modules/poleSurvey/components/WardDetailsView';
import { SubmissionQueueView } from '../modules/poleSurvey/components/SubmissionQueueView';
import { UsersView } from './UsersView';
import { EmployeeTrackingView, MobileUserTrackingView } from './TrackingViews';
import { BarChart3, CalendarDays, ClipboardList, ArrowLeft, Download, Landmark, LogOut, Users as UsersIcon, UserCheck, Smartphone } from 'lucide-react';

export default function EmployeeDashboard() {
  const { user, activeProject, clearActiveProject } = useAuthStore();
  
  const hasSectionA = activeProject?.section_a;
  const hasSectionB = activeProject?.section_b;
  const hasSectionC = activeProject?.section_c;
  const hasSectionD = activeProject?.section_d;
  const hasSectionE = activeProject?.section_e;
  const hasSectionF = activeProject?.section_f;
  const hasSectionG = activeProject?.section_g;

  const [activeView, setActiveView] = useState(
    hasSectionA ? 'pole_survey_summary' : 
    hasSectionB ? 'pole_survey_today' : 
    hasSectionC ? 'pole_survey_issues' : 'pole_survey_summary'
  );
  
  const [selectedUlb, setSelectedUlb] = useState(null);

  const sectionItems = [
    hasSectionA && { key: 'pole_survey_summary', label: 'Summary', icon: BarChart3 },
    hasSectionB && { key: 'pole_survey_today', label: "Today's Summary", icon: CalendarDays },
    hasSectionC && { key: 'pole_survey_issues', label: 'Issues', icon: ClipboardList },
  ].filter(Boolean);

  const utilityItems = [
    hasSectionD && { key: 'users', label: 'Team', icon: UsersIcon },
    hasSectionE && { key: 'employee_tracking', label: 'Employee Tracking', icon: UserCheck },
    hasSectionF && { key: 'mobile_user_tracking', label: 'Mobile User Tracking', icon: Smartphone },
  ].filter(Boolean);

  if (!activeProject) return null;

  return (
    <div className="fixed inset-0 bg-slate-100 flex overflow-hidden">
      {/* Premium Sidebar */}
      <aside className="w-64 shrink-0 flex flex-col bg-slate-950 text-white z-30 shadow-2xl">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-600 shadow-lg shadow-emerald-500/25">
              <Landmark size={22} />
            </div>
            <div>
              <p className="text-base font-bold tracking-tight text-white">Govt Survey</p>
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
            <div className="space-y-1 border-l border-white/10 pl-3 mt-4">
              {utilityItems.map((item) => {
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

          {hasSectionG && (
            <div className="space-y-1 border-l border-white/10 pl-3 mt-4">
              <button
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
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {sectionItems.find(i => i.key === activeView)?.label || utilityItems.find(i => i.key === activeView)?.label || 'Overview'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{activeProject.name}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-[1400px] mx-auto">
            {activeView === 'pole_survey_summary' && !selectedUlb && (
              <SummaryView projectId={activeProject.id} onViewDetails={(ulb) => setSelectedUlb(ulb)} hideZeroCounts={true} />
            )}
            
            {activeView === 'pole_survey_summary' && selectedUlb && (
              <WardDetailsView projectId={activeProject.id} ulb={selectedUlb} onBack={() => setSelectedUlb(null)} />
            )}
            
            {activeView === 'pole_survey_today' && !selectedUlb && (
              <SummaryView projectId={activeProject.id} date={new Date().toISOString().split('T')[0]} onViewDetails={(ulb) => setSelectedUlb(ulb)} hideZeroCounts={true} />
            )}

            {activeView === 'pole_survey_today' && selectedUlb && (
              <WardDetailsView projectId={activeProject.id} ulb={selectedUlb} onBack={() => setSelectedUlb(null)} />
            )}

            {activeView === 'pole_survey_issues' && (
              <SubmissionQueueView projectId={activeProject.id} />
            )}

            {activeView === 'users' && (
              <UsersView projectId={activeProject.id} roleFilter="MOBILE_USER" />
            )}
            
            {activeView === 'employee_tracking' && (
              <EmployeeTrackingView projectId={activeProject.id} />
            )}
            
            {activeView === 'mobile_user_tracking' && (
              <MobileUserTrackingView projectId={activeProject.id} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

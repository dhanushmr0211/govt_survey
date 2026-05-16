import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { SummaryView } from '../modules/poleSurvey/components/SummaryView';
import { WardDetailsView } from '../modules/poleSurvey/components/WardDetailsView';
import { SubmissionQueueView } from '../modules/poleSurvey/components/SubmissionQueueView';
import { BarChart3, CalendarDays, ClipboardList, ArrowLeft, Download, Landmark, LogOut, Users as UsersIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ClientDashboard() {
  const { user, activeProject, clearActiveProject, logout } = useAuthStore();
  
  const hasSectionA = activeProject?.section_a;
  const hasSectionB = activeProject?.section_b;
  const hasSectionC = activeProject?.section_c;
  const hasSectionD = activeProject?.section_d;
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

  if (!activeProject) return null;

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
                <p className="text-xs font-medium text-slate-400">Client Console</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 border-b border-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Client Workspace</p>
            <p className="mt-1 text-lg font-bold truncate">{user?.name || 'Client'}</p>
            <div className="mt-2 bg-white/5 rounded-md p-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Project</p>
              <p className="text-xs font-semibold text-primary truncate">{activeProject.name}</p>
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

            {hasSectionD && (
              <Link
                to="/users"
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <UsersIcon size={16} /> Team
              </Link>
            )}

            {hasSectionG && (
              <button
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Download size={18} /> Download Report
              </button>
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
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {activeProject.name}
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 lg:text-3xl">
                {sectionItems.find(i => i.key === activeView)?.label || 'Overview'}
              </h1>
              <p className="mt-1 text-sm text-slate-500">Welcome, {user?.name}. Reviewing project health and data.</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-h-[600px]">
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
          </div>
        </section>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { SummaryView } from '../modules/poleSurvey/components/SummaryView';
import { WardDetailsView } from '../modules/poleSurvey/components/WardDetailsView';
import { SubmissionQueueView } from '../modules/poleSurvey/components/SubmissionQueueView';
import { BarChart3, CalendarDays, ClipboardList, FolderKanban, Smartphone, UserCheck, Download, Users, Landmark, LogOut } from 'lucide-react';

export default function ClientDashboard() {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const [activeView, setActiveView] = useState(location.state?.activeView || 'pole_survey_summary');
  const [selectedUlb, setSelectedUlb] = useState(null);

  const sectionItems = [
    (user?.role === 'MASTER_ADMIN' || user?.section_a) && { key: 'pole_survey_summary', label: 'Summary', icon: BarChart3 },
    (user?.role === 'MASTER_ADMIN' || user?.section_b) && { key: 'pole_survey_today', label: "Today's Summary", icon: CalendarDays },
    (user?.role === 'MASTER_ADMIN' || user?.section_c) && { key: 'pole_survey_issues', label: 'Issues', icon: ClipboardList },
  ].filter(Boolean);

  const utilityItems = [
    (user?.role === 'MASTER_ADMIN' || user?.section_d) && { key: 'users', label: 'Users', icon: Users, path: '/users' },
    (user?.role === 'MASTER_ADMIN' || user?.section_e) && { key: 'employee_tracking', label: 'Employee Tracking', icon: UserCheck },
    (user?.role === 'MASTER_ADMIN' || user?.section_f) && { key: 'mobile_user_tracking', label: 'Mobile User Tracking', icon: Smartphone },
  ].filter(Boolean);

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
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Client Workspace</p>
            <p className="mt-1 text-lg font-bold">{user?.name || 'Client'}</p>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto no-scrollbar">
            <div className="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold bg-primary text-white shadow-sm">
              <FolderKanban size={18} /> Projects
            </div>

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

            {utilityItems.map((item) => {
              const Icon = item.icon;
              if (item.path) {
                return (
                  <Link
                    key={item.key}
                    to={item.path}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Icon size={18} /> {item.label}
                  </Link>
                );
              }
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveView(item.key)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold transition-colors ${activeView === item.key ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                >
                  <Icon size={18} /> {item.label}
                </button>
              );
            })}

            <button
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Download size={18} /> Download Report
            </button>
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
                Client Dashboard
              </h1>
              <p className="mt-1 text-sm text-slate-500">Welcome, {user?.name}. Review project health and data.</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            {activeView === 'pole_survey_summary' && !selectedUlb && (
              <SummaryView onViewDetails={(ulb) => setSelectedUlb(ulb)} hideZeroCounts={true} />
            )}
            
            {activeView === 'pole_survey_summary' && selectedUlb && (
              <WardDetailsView ulb={selectedUlb} onBack={() => setSelectedUlb(null)} />
            )}
            
            {activeView === 'pole_survey_today' && !selectedUlb && (
              <SummaryView date={new Date().toISOString().split('T')[0]} onViewDetails={(ulb) => setSelectedUlb(ulb)} hideZeroCounts={true} />
            )}

            {activeView === 'pole_survey_today' && selectedUlb && (
              <WardDetailsView ulb={selectedUlb} onBack={() => setSelectedUlb(null)} />
            )}

            {activeView === 'pole_survey_issues' && (
              <SubmissionQueueView />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

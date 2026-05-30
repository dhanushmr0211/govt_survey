import { useAuthStore } from '../store/authStore';
import { useProjects } from '../shared/hooks/useProjects';
import { FolderKanban, LogOut, ShieldCheck, User, Users } from 'lucide-react';

export default function ProjectSelector() {
  const { user, setActiveProject, logout } = useAuthStore();
  const { data: projects = [], isLoading } = useProjects();

  const handleSelect = (project) => {
    setActiveProject(project);
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'ADMIN': return <ShieldCheck size={14} />;
      case 'CLIENT': return <User size={14} />;
      case 'EMPLOYEE': return <Users size={14} />;
      default: return <FolderKanban size={14} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">Welcome back, {user?.name}</h1>
            <p className="text-slate-500 mt-1">Please select a project to access your dashboard.</p>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-red-600 transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4">
              <FolderKanban size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-950">No projects assigned</h2>
            <p className="text-slate-500 mt-2">You don't have any projects assigned to your account yet. Please contact your administrator.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.isArray(projects) && projects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleSelect(project)}
                className="group relative flex flex-col text-left bg-white rounded-2xl border border-slate-200 p-8 shadow-sm transition-all hover:border-primary/50 hover:shadow-xl hover:-translate-y-1"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <FolderKanban size={24} />
                </div>
                
                <div className="absolute top-8 right-8 flex flex-col items-end gap-1.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-600 border border-orange-500/20 shadow-sm">
                    {getRoleIcon(project.project_role)}
                    {(project.project_role || 'MEMBER').replace('_', ' ')}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-600 border border-orange-500/20 shadow-sm">
                    May/19/2026
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    {(project.project_type || 'POLE_SURVEY').replace('_', ' ')}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-950 mb-2 group-hover:text-primary transition-colors">
                  {project.name}
                </h3>
                
                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                  Manage operations, view summaries, and track field progress for the {project.name} program.
                </p>

                <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-sm font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Enter Workspace &rarr;
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

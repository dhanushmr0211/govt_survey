import { useAuthStore } from '../../store/authStore';

export const Topbar = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const activeProject = useAuthStore((state) => state.activeProject);
  
  // Show project role if available, otherwise fallback to global role
  const displayRole = activeProject?.project_role || user?.role || 'Role';
  const role = displayRole.replaceAll('_', ' ').toLowerCase();

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="Logo" className="h-10 w-10 rounded-lg object-cover border border-slate-700" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-500">Control center</p>
          <p className="text-sm font-semibold text-slate-400">Live survey operations</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex flex-col text-right">
          <span className="font-semibold text-white">{user?.name || 'User'}</span>
          <span className="text-xs capitalize text-slate-500">{role}</span>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500 font-bold text-white shadow-sm">
          {user?.name?.[0] || 'U'}
        </div>
        <button 
          onClick={logout} 
          className="ml-4 text-sm font-semibold text-orange-500 hover:text-orange-400 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

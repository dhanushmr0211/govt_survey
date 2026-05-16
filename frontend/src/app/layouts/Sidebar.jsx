import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderTree, Users, Settings, LogOut, Landmark } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const Sidebar = () => {
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);

  const user = useAuthStore((state) => state.user);
  const navItems = [
    { name: 'Projects', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Submissions', icon: FolderTree, path: '/today-submissions' },
    { name: 'Settings', icon: Settings, path: '/profile' },
  ].filter(item => {
    if (item.name === 'Submissions') {
      return user?.role === 'MOBILE_USER';
    }
    return true;
  });

  return (
    <aside className="w-72 shrink-0 border-r border-slate-200 bg-slate-950 text-white flex flex-col">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="h-10 w-10 rounded-lg object-cover border border-slate-700" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-500">Control center</p>
            <p className="text-sm font-semibold text-slate-400">Live survey operations</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
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
  );
};

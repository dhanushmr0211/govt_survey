import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderTree, Users, Settings, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const Sidebar = () => {
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);

  const user = useAuthStore((state) => state.user);
  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Today Submissions', icon: FolderTree, path: '/today-submissions' },
    { name: 'Projects', icon: FolderTree, path: '/projects' },
    { name: 'Users', icon: Users, path: '/users' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ].filter(item => {
    if (item.name === 'Today Submissions') {
      return user?.role === 'MOBILE_USER';
    }
    if (item.name === 'Users') {
      return user?.role === 'MASTER_ADMIN' || user?.section_d;
    }
    if (item.name === 'Projects') {
      return user?.role === 'MASTER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'EMPLOYEE';
    }
    return true;
  });

  return (
    <div className="w-64 bg-primary text-white flex flex-col">
      <div className="p-6 flex items-center gap-2 font-bold text-xl border-b border-primary-dark">
        <span>Govt Survey</span>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-dark text-white'
                  : 'text-primary-light hover:bg-primary-dark hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-primary-dark">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full p-3 text-primary-light hover:bg-primary-dark hover:text-white rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

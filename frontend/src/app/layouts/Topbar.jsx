import { useAuthStore } from '../../store/authStore';

export const Topbar = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6">
      <div className="text-gray-500 font-medium">
        Overview
      </div>
      <div className="flex items-center gap-4">
        <div className="flex flex-col text-right">
          <span className="font-semibold text-gray-900">{user?.name || 'User'}</span>
          <span className="text-xs text-gray-500 capitalize">{user?.role || 'Role'}</span>
        </div>
        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-700">
          {user?.name?.[0] || 'U'}
        </div>
      </div>
    </header>
  );
};

import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuthStore } from '../../store/authStore';

export const DashboardLayout = () => {
  const user = useAuthStore((state) => state.user);
  const isMobile = user?.role === 'MOBILE_USER';

  return (
    <div className="flex h-screen bg-background">
      {!isMobile && <Sidebar />}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!isMobile && <Topbar />}
        <main className={`flex-1 overflow-x-hidden overflow-y-auto ${isMobile ? 'p-0' : 'p-6'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

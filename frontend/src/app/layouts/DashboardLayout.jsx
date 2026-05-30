import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuthStore } from '../../store/authStore';

export const DashboardLayout = () => {
  const user = useAuthStore((state) => state.user);
  const isMobile = user?.role === 'MOBILE_USER';

  return (
    <div className="flex h-screen bg-background text-slate-900">
      <div className="flex-1 flex flex-col overflow-hidden">
        {!isMobile && <Topbar />}
        <main className={`flex-1 overflow-x-hidden overflow-y-auto flex flex-col justify-between ${isMobile ? 'p-0' : 'p-4 sm:p-6 xl:p-8'}`}>
          <div className="flex-1">
            <Outlet />
          </div>
          <footer className="mt-8 py-4 border-t border-slate-200/60 text-center text-xs text-slate-400">
            <div className="flex justify-center gap-4">
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Privacy Policy</a>
              <span>|</span>
              <a href="/terms-conditions" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Terms & Conditions</a>
              <span>|</span>
              <a href="/contact-us" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Contact Us</a>
            </div>
            <p className="mt-2">© {new Date().getFullYear()} PR Electricals. All rights reserved.</p>
          </footer>
        </main>
      </div>
    </div>
  );
};

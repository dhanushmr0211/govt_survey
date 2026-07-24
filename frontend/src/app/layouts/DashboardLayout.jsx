import { Outlet, Link } from 'react-router-dom';
import { useState } from 'react';
import { X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuthStore } from '../../store/authStore';

export const DashboardLayout = () => {
  const user = useAuthStore((state) => state.user);
  const isMobile = user?.role === 'MOBILE_USER';
  const [showNotice, setShowNotice] = useState(true);

  return (
    <div className="flex h-screen bg-background text-slate-900">
      <div className="flex-1 flex flex-col overflow-hidden">
        {showNotice && (
          <div className="sticky top-0 z-50 w-full border-b border-amber-300/70 bg-amber-50 text-amber-950 shadow-lg">
            <div className="mx-auto flex w-full max-w-7xl items-start gap-4 px-4 py-3 sm:px-6 lg:px-8">
              <div className="flex-1 space-y-1 text-sm leading-relaxed">
                <p className="font-extrabold tracking-wide">⚠️ Important Notice</p>
                <p>
                  From <strong>tomorrow</strong>, this portal will be available only at:
                </p>
                <p className="font-semibold">
                  <a
                    href="https://prelectricals.in"
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-amber-500/70 underline-offset-4 hover:text-amber-800"
                  >
                    https://prelectricals.in
                  </a>
                </p>
                <p>Please update your bookmark and use the new website from tomorrow.</p>
                <a
                  href="https://prelectricals.in"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-amber-400 bg-white px-4 py-2 text-sm font-bold text-amber-950 shadow-sm transition-colors hover:bg-amber-100"
                >
                  Open New Website
                </a>
              </div>
              <button
                type="button"
                onClick={() => setShowNotice(false)}
                aria-label="Close notice"
                className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-300 bg-white text-amber-950 shadow-sm transition-colors hover:bg-amber-100"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}
        {!isMobile && <Topbar />}
        <main className={`flex-1 overflow-x-hidden overflow-y-auto flex flex-col justify-between ${isMobile ? 'p-0' : 'p-4 sm:p-6 xl:p-8'}`}>
          <div className="flex-1">
            <Outlet />
          </div>
          <footer className="mt-8 py-4 border-t border-slate-200/60 text-center text-xs text-slate-400">
            <div className="flex justify-center gap-4">
              <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
              <span>|</span>
              <Link to="/terms-conditions" className="hover:text-primary transition-colors">Terms & Conditions</Link>
              <span>|</span>
              <Link to="/contact-us" className="hover:text-primary transition-colors">Contact Us</Link>
            </div>
            <p className="mt-2">© {new Date().getFullYear()} PR Electricals. All rights reserved.</p>
          </footer>
        </main>
      </div>
    </div>
  );
};

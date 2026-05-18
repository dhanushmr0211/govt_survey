import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users as UsersIcon, UserPlus, Search, Landmark, LogOut, FolderKanban, Eye } from 'lucide-react';
import { CreateAdminModal } from '../shared/components/CreateAdminModal';
import { ViewUserProjectsModal } from '../shared/components/ViewUserProjectsModal';
import { useAuthStore } from '../store/authStore';
import API_BASE_URL from '../config/api';

export default function GlobalUsers() {
  const { user, logout, token } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [userToView, setUserToView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isMasterAdmin = user?.role === 'MASTER_ADMIN';

  const fetchUsers = async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/auth/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      // If server returned 500 (internal) try a fallback using active project
      if (res.status >= 500 && useAuthStore.getState().activeProject) {
        try {
          const pid = useAuthStore.getState().activeProject.id;
          const r2 = await fetch(`${API_BASE_URL}/auth/users?projectId=${pid}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const d2 = await r2.json();
          if (r2.ok) {
            setUsers(d2.users || []);
            return;
          }
        } catch (fallbackErr) {
          console.warn('Fallback fetch by project failed', fallbackErr);
        }
      }

      if (res.ok) {
        setUsers(data.users || []);
      } else {
        setError(data.message || 'Failed to load users');
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isMasterAdmin && token) {
      fetchUsers();
    }
  }, [isMasterAdmin, token]);

  if (!isMasterAdmin) {
    return <div className="p-8 text-center">Unauthorized Access</div>;
  }

  return (
    <div className="min-h-full -m-4 bg-slate-100 sm:-m-6 xl:-m-8">
      <div className="mx-auto flex min-h-full w-full max-w-[1760px] gap-5 p-4 sm:p-6 xl:p-8">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-950 text-white lg:flex fixed top-16 left-0 h-[calc(100vh-4rem)] z-30">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="PR ELECTRICALS" className="h-11 w-11 rounded-full object-cover shadow-lg border border-white/10" />
              <div>
                <p className="text-base font-bold tracking-tight text-white">PR ELECTRICALS</p>
                <p className="text-xs font-medium text-slate-400">Master Admin</p>
              </div>
            </div>
          </div>
          
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto no-scrollbar">
            <Link
              to="/dashboard"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              <FolderKanban size={18} /> Switch Project
            </Link>

            <div className="my-4 border-t border-white/10"></div>

            <button className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold bg-white text-slate-950 shadow-sm">
              <UsersIcon size={16} /> Global Users
            </button>
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

        <section className="min-w-0 flex-1 lg:ml-64">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h1 className="text-2xl font-bold text-slate-950">Global User Management</h1>
              <p className="text-slate-500 text-sm">Managing all users across the system</p>
            </div>
            <button 
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all"
              onClick={() => setIsModalOpen(true)}
            >
              <UserPlus size={18} /> Add New User
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search by name or email..." 
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Mobile Number</th>
                    <th className="px-6 py-4">Global Role</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500">Loading users...</td></tr>
                  ) : error ? (
                    <tr><td colSpan="5" className="px-6 py-12 text-center text-red-500">{error}</td></tr>
                  ) : users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{u.name}</td>
                      <td className="px-6 py-4 text-slate-600">{u.email}</td>
                      <td className="px-6 py-4 text-slate-600">{u.phone || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.role === 'MASTER_ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => { setUserToView(u); setIsViewModalOpen(true); }}
                          className="p-2 text-slate-400 hover:text-primary transition-colors hover:bg-primary/5 rounded-lg"
                          title="View Assignments"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
      <CreateAdminModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); fetchUsers(); }} />
      <ViewUserProjectsModal 
        isOpen={isViewModalOpen} 
        onClose={() => setIsViewModalOpen(false)} 
        user={userToView} 
      />
    </div>
  );
}

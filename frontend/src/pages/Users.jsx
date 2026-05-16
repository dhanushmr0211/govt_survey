import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import TopNav from '../components/TopNav';
import { Users as UsersIcon, UserPlus, Search, Shield, User, BarChart3, CalendarDays, ClipboardList, FolderKanban, Smartphone, UserCheck, Download, Landmark, LogOut } from 'lucide-react';
import { CreateAdminModal } from '../shared/components/CreateAdminModal';
import { EditUserModal } from '../shared/components/EditUserModal';
import { useAuthStore } from '../store/authStore';
import API_BASE_URL from '../config/api';

export default function Users() {
  const user = useAuthStore((state) => state.user);
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [loading, setLoading] = useState(true);

  const isMasterAdmin = user?.role === 'MASTER_ADMIN';
  const hasSectionD = user?.section_d;

  const selectedProject = localStorage.getItem('selectedProject');
  const selectedProjectId = localStorage.getItem('selectedProjectId');

  const sectionItems = selectedProject ? [
    (user?.role === 'MASTER_ADMIN' || user?.section_a) && { key: 'pole_survey_summary', label: 'Summary', icon: BarChart3 },
    (user?.role === 'MASTER_ADMIN' || user?.section_b) && { key: 'pole_survey_today', label: "Today's Summary", icon: CalendarDays },
    (user?.role === 'MASTER_ADMIN' || user?.section_c) && { key: 'pole_survey_issues', label: 'Issues', icon: ClipboardList },
  ].filter(Boolean) : [];

  const utilityItems = selectedProject ? [
    (user?.role === 'MASTER_ADMIN' || user?.section_d) && { key: 'users', label: 'Users', icon: UsersIcon, path: selectedProjectId ? `/users?projectId=${selectedProjectId}` : '/users' },
    (user?.role === 'MASTER_ADMIN' || user?.section_e) && { key: 'employee_tracking', label: 'Employee Tracking', icon: UserCheck },
    (user?.role === 'MASTER_ADMIN' || user?.section_f) && { key: 'mobile_user_tracking', label: 'Mobile User Tracking', icon: Smartphone },
  ].filter(Boolean) : [];

  if (!isMasterAdmin && !hasSectionD) {
    return (
      <div className="app-container">
        <TopNav user={user} />
        <main className="main-content">
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <h1 style={{ color: '#ef4444', marginBottom: '1rem' }}>Unauthorized Access</h1>
            <p style={{ color: 'var(--text-muted)' }}>You do not have permission to access the Team Management page.</p>
          </div>
        </main>
      </div>
    );
  }

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const searchParams = new URLSearchParams(window.location.search);
      const projectId = searchParams.get('projectId');
      
      let url = `${API_BASE_URL}/auth/users`;
      if (projectId) {
        url += `?projectId=${projectId}`;
      }
      
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users from real backend API
  useEffect(() => {
    fetchUsers();
  }, [window.location.search]);

  const adminsCount = users.filter(u => u.role === 'ADMIN').length;
  const employeesCount = users.filter(u => u.role === 'EMPLOYEE').length;
  const mobileUsersCount = users.filter(u => u.role === 'MOBILE_USER').length;
  const clientsCount = users.filter(u => u.role === 'CLIENT').length;

  return (
    <>
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
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{user?.role === 'MASTER_ADMIN' ? 'Master Workspace' : 'Client Workspace'}</p>
            <p className="mt-1 text-lg font-bold">{user?.name || 'User'}</p>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto no-scrollbar">
            <Link
              to="/dashboard"
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <FolderKanban size={18} /> Projects
            </Link>

            {sectionItems.length > 0 && (
              <div className="space-y-1 border-l border-white/10 pl-3">
                {sectionItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.key}
                      to="/dashboard"
                      state={{ activeView: item.key }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
                    >
                      <Icon size={16} /> {item.label}
                    </Link>
                  );
                })}
              </div>
            )}

            {utilityItems.length > 0 && (
              <div className="space-y-1 border-l border-white/10 pl-3">
                {utilityItems.map((item) => {
                  const Icon = item.icon;
                  if (item.path) {
                    return (
                      <Link
                        key={item.key}
                        to={item.path}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold transition-colors ${item.key === 'users' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                      >
                        <Icon size={16} /> {item.label}
                      </Link>
                    );
                  }
                  return (
                    <Link
                      key={item.key}
                      to="/dashboard"
                      state={{ activeView: item.key }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold transition-colors text-slate-300 hover:bg-white/10 hover:text-white"
                    >
                      <Icon size={16} /> {item.label}
                    </Link>
                  );
                })}
              </div>
            )}

            {(user?.role === 'MASTER_ADMIN' || user?.section_g) && (
              <div className="space-y-1 border-l border-white/10 pl-3 mt-1">
                <Link
                  to="/dashboard"
                  state={{ openDownload: true }}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Download size={16} /> Download Report
                </Link>
              </div>
            )}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Team Management</h1>
            <p style={{ color: 'var(--text-muted)' }}>Manage administrators and field surveyors.</p>
          </div>
          {(user.role === 'MASTER_ADMIN' || user.role === 'ADMIN' || user.role === 'EMPLOYEE') && (
            <button className="btn btn-primary" onClick={() => { setIsModalOpen(true); }}>
              <UserPlus size={18} /> {user.role === 'MASTER_ADMIN' ? 'Create Admin' : user.role === 'ADMIN' ? 'Create Employee' : 'Create Mobile User'}
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Admins</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{adminsCount}</p>
            </div>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: '50%', display: 'flex' }}>
              <Shield size={20} color="#3b82f6" />
            </div>
          </div>
          <div className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Employees</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{employeesCount}</p>
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.75rem', borderRadius: '50%', display: 'flex' }}>
              <UserCheck size={20} color="#f59e1b" />
            </div>
          </div>
          <div className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Mobile Users</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{mobileUsersCount}</p>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '50%', display: 'flex' }}>
              <User size={20} color="#10b981" />
            </div>
          </div>
          <div className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Clients</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{clientsCount}</p>
            </div>
            <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '0.75rem', borderRadius: '50%', display: 'flex' }}>
              <UsersIcon size={20} color="var(--primary-purple)" />
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="input-group" style={{ flex: 1, margin: 0, flexDirection: 'row', alignItems: 'center', background: '#f9fafb', padding: '0 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <Search size={20} color="var(--text-muted)" />
              <input type="text" placeholder="Search users by name or email..." style={{ border: 'none', background: 'transparent', width: '100%', padding: '0.75rem', outline: 'none' }} />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  <th style={{ padding: '1rem' }}>User</th>
                  <th style={{ padding: '1rem' }}>Role</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading users from database...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No users found.</td></tr>
                ) : users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {u.name ? u.name.charAt(0).toUpperCase() : <User size={16} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: '500' }}>{u.name}</div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', 
                        background: u.role === 'MASTER_ADMIN' ? 'rgba(139, 92, 246, 0.1)' : u.role === 'ADMIN' ? 'rgba(59, 130, 246, 0.1)' : '#f3f4f6',
                        color: u.role === 'MASTER_ADMIN' ? 'var(--primary-purple)' : u.role === 'ADMIN' ? '#3b82f6' : '#4b5563'
                      }}>
                        {u.role === 'MASTER_ADMIN' && <Shield size={12} />}
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: '#059669' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span> Active
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {u.role !== 'MOBILE_USER' && (
                        <button className="btn" style={{ background: 'transparent', color: '#3b82f6', padding: '0' }} onClick={() => { setUserToEdit(u); setIsEditModalOpen(true); }}>Edit</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </section>
      </div>
    </div>
    <CreateAdminModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    <EditUserModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} user={userToEdit} onSave={fetchUsers} />
    </>
  )
}

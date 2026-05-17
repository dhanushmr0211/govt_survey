import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users as UsersIcon, UserPlus, Search, Shield, User, BarChart3, CalendarDays, ClipboardList, FolderKanban, Smartphone, UserCheck, Download, Landmark, LogOut, ArrowLeft } from 'lucide-react';
import { CreateAdminModal } from '../shared/components/CreateAdminModal';
import { EditUserModal } from '../shared/components/EditUserModal';
import { useAuthStore } from '../store/authStore';
import API_BASE_URL from '../config/api';

export default function Users() {
  const location = useLocation();
  const { user, activeProject, clearActiveProject, logout } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);

  const searchParams = new URLSearchParams(location.search);
  const queryProjectId = searchParams.get('projectId');
  const effectiveProjectId = queryProjectId || activeProject?.id;

  const isMasterAdmin = user?.role === 'MASTER_ADMIN';
  const hasSectionD = activeProject?.section_d;
  const visibleUsers = users.filter((member) => member.id !== user?.id);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      let url = `${API_BASE_URL}/auth/users`;
      if (effectiveProjectId) {
        url += `?projectId=${effectiveProjectId}`;
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

  const fetchProject = async () => {
    if (!effectiveProjectId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        const found = data.projects?.find(p => p.id === Number(effectiveProjectId));
        setProject(found || null);
      }
    } catch (err) {
      console.error("Failed to fetch project details:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchProject();
  }, [effectiveProjectId]);

  // Redirect to dashboard if project is cleared (only for non-master users)
  useEffect(() => {
    if (!activeProject && user?.role !== 'MASTER_ADMIN') {
      // If we're not on dashboard, go there
      if (window.location.pathname !== '/dashboard') {
        window.location.href = '/dashboard';
      }
    }
  }, [activeProject, user]);

  if (!isMasterAdmin && !hasSectionD) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-slate-200">
          <Shield size={48} className="mx-auto text-red-500 mb-4 opacity-20" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Unauthorized Access</h1>
          <p className="text-slate-500 max-w-xs mx-auto">You do not have permission to access the Team Management page for this project.</p>
          <Link to="/dashboard" className="mt-6 inline-block text-primary font-semibold hover:underline">Return to Dashboard</Link>
        </div>
      </div>
    );
  }

  const adminsCount = visibleUsers.filter(u => u.project_role === 'ADMIN').length;
  const employeesCount = visibleUsers.filter(u => u.project_role === 'EMPLOYEE').length;
  const mobileUsersCount = visibleUsers.filter(u => u.project_role === 'MOBILE_USER').length;
  const clientsCount = visibleUsers.filter(u => u.project_role === 'CLIENT').length;

  const displayProject = project || activeProject;

  const sectionItems = [
    displayProject?.section_a && { key: 'pole_survey_summary', label: 'Summary', icon: BarChart3 },
    displayProject?.section_b && { key: 'pole_survey_today', label: "Today's Summary", icon: CalendarDays },
    displayProject?.section_c && { key: 'pole_survey_issues', label: 'Issues', icon: ClipboardList },
  ].filter(Boolean);

  const utilityItems = [
    displayProject?.section_d && { key: 'users', label: 'Users', icon: UsersIcon },
    displayProject?.section_e && { key: 'employee_tracking', label: 'Employee Tracking', icon: UserCheck },
    displayProject?.section_f && { key: 'mobile_user_tracking', label: 'Mobile User Tracking', icon: Smartphone },
  ].filter(Boolean);

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
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Team Workspace</p>
            <p className="mt-1 text-lg font-bold">{user?.name || 'User'}</p>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto no-scrollbar">
            <button
              onClick={clearActiveProject}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              <FolderKanban size={18} /> Switch Project
            </button>

            <div className="my-4 border-t border-white/10"></div>

            {sectionItems.length > 0 && (
              <div className="space-y-1 border-l border-white/10 pl-3">
                {sectionItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.key}
                      to={`/dashboard?projectId=${effectiveProjectId}&view=${item.key}`}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
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
                  const isActive = item.key === 'users';
                  return (
                    <Link
                      key={item.key}
                      to={isActive ? '#' : `/dashboard?projectId=${effectiveProjectId}&view=${item.key}`}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold transition-colors ${isActive ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                    >
                      <Icon size={16} /> {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
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

        {/* Main Content */}
        <section className="min-w-0 flex-1 lg:ml-64">
          <div className="mb-5 flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Master Console</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 lg:text-3xl">
                {displayProject?.name || 'Team Management'}
              </h1>
              <p className="text-slate-500 text-xs mt-1 font-medium">Managing users and permissions</p>
            </div>
            <div className="flex items-center gap-3">
              {isMasterAdmin && (
                <Link
                  to="/global-users"
                  className="inline-flex items-center gap-2 rounded-md bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <UsersIcon size={16} /> Global Users
                </Link>
              )}
              <button 
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all text-sm"
                onClick={() => setIsModalOpen(true)}
              >
                <UserPlus size={18} /> Add Team Member
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Admins', count: adminsCount, icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Employees', count: employeesCount, icon: UserCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Mobile Users', count: mobileUsersCount, icon: Smartphone, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Clients', count: clientsCount, icon: UsersIcon, color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-950">{stat.count}</p>
                </div>
                <div className={`${stat.bg} p-3 rounded-lg ${stat.color}`}>
                  <stat.icon size={24} />
                </div>
              </div>
            ))}
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
                    <th className="px-6 py-4">Team Member</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-500">Loading team members...</td></tr>
                  ) : visibleUsers.length === 0 ? (
                    <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-500">No members found for this project.</td></tr>
                  ) : visibleUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{u.name}</div>
                            <div className="text-xs text-slate-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          u.project_role === 'ADMIN' ? 'bg-blue-100 text-blue-700' :
                          u.project_role === 'EMPLOYEE' ? 'bg-amber-100 text-amber-700' :
                          u.project_role === 'MOBILE_USER' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {u.project_role || 'No Role'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => { setUserToEdit(u); setIsEditModalOpen(true); }}
                          className="text-primary font-bold text-xs hover:underline"
                        >
                          Permissions
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
    </div>
    <CreateAdminModal 
      isOpen={isModalOpen} 
      onClose={() => { setIsModalOpen(false); fetchUsers(); }} 
      defaultProjectId={effectiveProjectId}
    />
    <EditUserModal 
      isOpen={isEditModalOpen} 
      onClose={() => setIsEditModalOpen(false)} 
      user={userToEdit} 
      projectId={effectiveProjectId}
      onSave={fetchUsers} 
    />
    </>
  )
}

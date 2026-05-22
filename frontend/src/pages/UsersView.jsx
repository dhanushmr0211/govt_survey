import { useState, useEffect } from 'react';
import { Users as UsersIcon, UserPlus, Search, Shield, Smartphone, UserCheck } from 'lucide-react';
import { CreateAdminModal } from '../shared/components/CreateAdminModal';
import { EditUserModal } from '../shared/components/EditUserModal';
import { useAuthStore } from '../store/authStore';
import API_BASE_URL from '../config/api';

export const UsersView = ({ projectId, roleFilter }) => {
  const currentUser = useAuthStore((state) => state.user);
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/auth/users?projectId=${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        let allUsers = data.users || [];
        if (roleFilter) {
          allUsers = allUsers.filter(u => u.project_role === roleFilter);
        }
        setUsers(allUsers);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchUsers();
      setSelectedRole('ALL');
      setSearchQuery('');
    }
  }, [projectId]);

  const visibleUsers = users.filter((member) => member.id !== currentUser?.id);

  const filteredUsers = visibleUsers.filter((u) => {
    // 1. Role Filter
    if (selectedRole !== 'ALL' && u.project_role !== selectedRole) {
      return false;
    }
    // 2. Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        u.name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.phone?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const adminsCount = visibleUsers.filter(u => u.project_role === 'ADMIN').length;
  const employeesCount = visibleUsers.filter(u => u.project_role === 'EMPLOYEE').length;
  const mobileUsersCount = visibleUsers.filter(u => u.project_role === 'MOBILE_USER').length;
  const clientsCount = visibleUsers.filter(u => u.project_role === 'CLIENT').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Team Management</h2>
          <p className="text-sm text-slate-500">Manage access and roles for this project</p>
        </div>
        <button 
          className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all text-sm"
          onClick={() => setIsModalOpen(true)}
        >
          <UserPlus size={18} /> Add Team Member
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or mobile..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm"
            />
          </div>
          {!roleFilter && (
            <div className="w-full sm:w-48">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-slate-700"
              >
                <option value="ALL">All Roles</option>
                <option value="ADMIN">Admin</option>
                <option value="CLIENT">Client</option>
                <option value="EMPLOYEE">Employee</option>
                <option value="MOBILE_USER">Mobile User</option>
              </select>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Team Member</th>
                <th className="px-6 py-4">Mobile Number</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500">Loading team members...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500">No members found for this project.</td></tr>
              ) : filteredUsers.map(u => (
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
                  <td className="px-6 py-4 text-slate-600 font-medium text-sm">{u.phone || '—'}</td>
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
                    {u.is_blocked ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                        Blocked
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => { setUserToEdit(u); setIsEditModalOpen(true); }}
                      className="text-orange-500 font-bold text-xs hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CreateAdminModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); fetchUsers(); }} 
        defaultProjectId={projectId}
        fixedRole={roleFilter}
      />
      <EditUserModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        user={userToEdit} 
        projectId={projectId}
        onSave={fetchUsers} 
      />
    </div>
  );
};

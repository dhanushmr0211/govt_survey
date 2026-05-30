import { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config/api';
import { useAuthStore } from '../../store/authStore';

export const EditUserModal = ({ isOpen, onClose, user, projectId, onSave }) => {
  const { user: loggedInUser, activeProject } = useAuthStore();

  const buildFormState = (sourceUser) => {
    const dScope = Array.isArray(sourceUser?.district_scope) ? sourceUser.district_scope.map(Number) : [];
    const uScope = Array.isArray(sourceUser?.ulb_scope) ? sourceUser.ulb_scope.map(Number) : [];

    let initialScopeType = 'all';
    if (uScope.length > 0) initialScopeType = 'ulbs';
    else if (dScope.length > 0) initialScopeType = 'districts';

    return {
      formData: {
        name: sourceUser?.name || '',
        email: sourceUser?.email || '',
        phone: sourceUser?.phone || '',
        is_blocked: sourceUser?.is_blocked || false,
        section_a: sourceUser?.section_a || false,
        section_b: sourceUser?.section_b || false,
        section_c: sourceUser?.section_c || false,
        section_d: sourceUser?.section_d || false,
        section_e: sourceUser?.section_e || false,
        section_f: sourceUser?.section_f || false,
        section_g: sourceUser?.section_g || false,
        section_h: sourceUser?.section_h || false,
        section_i: sourceUser?.section_i || false,
        section_j: sourceUser?.section_j || false,
        district_scope: dScope,
        ulb_scope: uScope
      },
      scopeType: initialScopeType
    };
  };

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    is_blocked: false,
    section_a: false, section_b: false, section_c: false, section_d: false,
    section_e: false, section_f: false, section_g: false, section_h: false, section_i: false, section_j: false,
    district_scope: [],
    ulb_scope: []
  });
  const [scopeType, setScopeType] = useState('all'); // 'all', 'districts', 'ulbs'
  const [structure, setStructure] = useState({ districts: [], ulbs: [] });
  const [loadingStructure, setLoadingStructure] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      const nextState = buildFormState(user);
      setFormData(nextState.formData);
      setScopeType(nextState.scopeType);
    }

    if (!isOpen) {
      setFormData({
        name: '',
        email: '',
        phone: '',
        is_blocked: false,
        section_a: false, section_b: false, section_c: false, section_d: false,
        section_e: false, section_f: false, section_g: false, section_h: false, section_i: false, section_j: false,
        district_scope: [],
        ulb_scope: []
      });
      setScopeType('all');
    }
  }, [isOpen, user]);

  useEffect(() => {
    const fetchStructure = async () => {
      if (isOpen && projectId) {
        setLoadingStructure(true);
        try {
          const token = localStorage.getItem('token');
          const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/structure`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setStructure(res.data);
        } catch (err) {
          console.error("Failed to fetch project structure:", err);
        } finally {
          setLoadingStructure(false);
        }
      }
    };
    fetchStructure();
  }, [isOpen, projectId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const toggleItem = (listName, id) => {
    setFormData(prev => {
      const current = prev[listName] || [];
      if (current.includes(id)) {
        return { ...prev, [listName]: current.filter(item => item !== id) };
      } else {
        return { ...prev, [listName]: [...current, id] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    // Clean up scopes based on scopeType
    const finalData = { ...formData };
    if (scopeType === 'all') {
      finalData.district_scope = null;
      finalData.ulb_scope = null;
    } else if (scopeType === 'districts') {
      finalData.ulb_scope = null;
    } else if (scopeType === 'ulbs') {
      finalData.district_scope = null;
    }

    try {
      await axios.put(`${API_BASE_URL}/auth/users/${user.id}/access`, {
        ...finalData,
        projectId: Number(projectId)
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onSave();
      onClose();
    } catch (error) {
      if (user) {
        const nextState = buildFormState(user);
        setFormData(nextState.formData);
        setScopeType(nextState.scopeType);
      }
      alert(error.response?.data?.message || 'Error updating access');
    }
  };

  if (!isOpen) return null;

  const canEditDetails = loggedInUser?.role === 'MASTER_ADMIN' || !!activeProject?.section_d;
  const canEditPermissions = loggedInUser?.role === 'MASTER_ADMIN' || !!activeProject?.section_h;
  const canBlockTarget = canEditDetails && user?.id !== loggedInUser?.id && user?.role !== 'MASTER_ADMIN';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Edit Team Member</h2>
            <p className="text-xs font-semibold text-slate-500 mt-1">{user?.name} ({user?.email})</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* User Profile Details */}
          <section>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
              User Profile Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  disabled={!canEditDetails}
                  required
                  placeholder="Enter full name"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-slate-900 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  disabled={!canEditDetails}
                  required
                  placeholder="Enter email address"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-slate-900 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                <input 
                  type="text" 
                  name="phone" 
                  value={formData.phone || ''} 
                  onChange={handleChange} 
                  disabled={!canEditDetails}
                  placeholder="Enter phone number"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-slate-900 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Account Status</label>
                <div className="flex items-center gap-3">
                  <label className={`flex items-center gap-3 cursor-pointer p-2.5 rounded-xl border transition-all w-full h-[46px] ${!canBlockTarget ? 'opacity-40 cursor-not-allowed' : formData.is_blocked ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                    <input 
                      type="checkbox" 
                      name="is_blocked" 
                      checked={formData.is_blocked} 
                      onChange={handleChange} 
                      disabled={!canBlockTarget}
                      className="rounded text-red-500 focus:ring-red-500 w-4 h-4 disabled:opacity-50" 
                    />
                    <span className={`text-sm font-semibold ${formData.is_blocked ? 'text-red-900' : 'text-green-900'}`}>
                      {formData.is_blocked ? 'Blocked' : 'Active'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Project Section Access */}
          {user?.project_role !== 'MOBILE_USER' && (
            <section className="pt-6 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-orange-500 rounded-full"></span>
                Project Section Access
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { id: 'section_a', label: 'Summary & Dashboard' },
                  { id: 'section_b', label: "Today's Summary" },
                  { id: 'section_c', label: 'Issues & Approval' },
                  { id: 'section_d', label: 'Team Management' },
                  { id: 'section_e', label: 'Employee Tracking' },
                  { id: 'section_f', label: 'Mobile User Tracking' },
                  { id: 'section_g', label: 'Download Reports' },
                  { id: 'section_h', label: 'Edit User Permissions' },
                  { id: 'section_i', label: 'Edit Survey Data (Images/Records)' },
                  { id: 'section_j', label: 'Edit Confirmed Data' },
                ].map(sec => {
                  const allowed = canEditPermissions && (loggedInUser?.role === 'MASTER_ADMIN' || !!activeProject?.[sec.id]);
                  return (
                    <label key={sec.id} className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-all ${!allowed ? 'opacity-40 cursor-not-allowed' : formData[sec.id] ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100 hover:bg-white hover:border-slate-200'}`}>
                      <input 
                        type="checkbox" 
                        name={sec.id} 
                        checked={formData[sec.id]} 
                        onChange={handleChange} 
                        disabled={!allowed}
                        className="rounded text-orange-500 focus:ring-orange-500 w-4 h-4 disabled:opacity-50" 
                      />
                      <span className={`text-sm font-medium ${formData[sec.id] ? 'text-orange-900' : 'text-slate-600'}`}>{sec.label}</span>
                    </label>
                  );
                })}
              </div>
            </section>
          )}

          {/* Data Scoping */}
          <section className="pt-6 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
              Data Visibility Scope
            </h3>
            
            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg mb-6 w-fit">
              {Number(projectId) === 3 ? (
                [
                  { id: 'all', label: 'All Wards' },
                  { id: 'ulbs', label: 'Ward wise' }
                ].map(type => (
                  <button
                    key={type.id}
                    type="button"
                    disabled={!canEditPermissions}
                    onClick={() => setScopeType(type.id)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${scopeType === type.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {type.label}
                  </button>
                ))
              ) : (
                [
                  { id: 'all', label: 'All Districts' },
                  { id: 'districts', label: 'Specific Districts' },
                  { id: 'ulbs', label: 'Specific ULBs' }
                ].map(type => (
                  <button
                    key={type.id}
                    type="button"
                    disabled={!canEditPermissions}
                    onClick={() => setScopeType(type.id)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${scopeType === type.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {type.label}
                  </button>
                ))
              )}
            </div>

            {scopeType === 'districts' && Number(projectId) !== 3 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-2">
                {structure.districts.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    disabled={!canEditPermissions}
                    onClick={() => toggleItem('district_scope', d.id)}
                    className={`p-2.5 text-left text-xs font-semibold rounded-lg border transition-all ${formData.district_scope?.includes(d.id) ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'} disabled:opacity-70 disabled:cursor-not-allowed`}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            )}

            {scopeType === 'ulbs' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                {structure.districts.map(d => {
                  const districtUlbs = structure.ulbs.filter(u => u.district_id === d.id);
                  if (districtUlbs.length === 0) return null;
                  return (
                    <div key={d.id} className="space-y-2">
                      {Number(projectId) !== 3 && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{d.name}</p>}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {districtUlbs.map(u => (
                          <button
                            key={u.id}
                            type="button"
                            disabled={!canEditPermissions}
                            onClick={() => toggleItem('ulb_scope', u.id)}
                            className={`p-2.5 text-left text-xs font-semibold rounded-lg border transition-all ${formData.ulb_scope?.includes(u.id) ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'} disabled:opacity-70 disabled:cursor-not-allowed`}
                          >
                            {u.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {scopeType === 'all' && (
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-sm">
                {Number(projectId) === 3 ? (
                  <span>User will have access to data across <strong>all wards</strong> in this project.</span>
                ) : (
                  <span>User will have access to data across <strong>all districts and ULBs</strong> in this project.</span>
                )}
              </div>
            )}
          </section>

          <div className="flex justify-end gap-3 pt-6 sticky bottom-0 bg-white">
            <button type="button" onClick={onClose} className="px-6 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-all">Cancel</button>
            <button type="submit" className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
};

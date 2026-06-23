import { useState, useEffect } from 'react';
import axios from 'axios';
import { Landmark, Shield, User, Briefcase, X } from 'lucide-react';
import API_BASE_URL from '../../config/api';

export const ViewUserProjectsModal = ({ isOpen, onClose, user }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      fetchAssignments();
    }
  }, [isOpen, user]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/auth/users/${user.id}/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssignments(res.data.assignments || []);
    } catch (err) {
      console.error("Failed to fetch user assignments:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <User size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{user?.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200/50 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Project Assignments</h3>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
            {loading ? (
              <div className="py-12 text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm text-slate-500 font-medium">Fetching assignments...</p>
              </div>
            ) : assignments.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Briefcase className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-sm text-slate-500 font-medium">No projects assigned to this user.</p>
              </div>
            ) : assignments.map((asgn) => (
              <div key={asgn.id} className="group p-4 rounded-xl border border-slate-100 bg-white hover:border-primary/20 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Landmark size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{asgn.name}</h4>
                      <p className="text-xs text-slate-500 font-medium">{asgn.project_type || 'Survey'}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    asgn.project_role === 'ADMIN' ? 'bg-blue-100 text-blue-700' :
                    asgn.project_role === 'CLIENT' ? 'bg-purple-100 text-purple-700' :
                    asgn.project_role === 'EMPLOYEE' ? 'bg-amber-100 text-amber-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {asgn.project_role}
                  </span>
                </div>
                
                <div className="mt-3 pt-3 border-t border-slate-50 flex flex-wrap gap-1.5">
                  {[
                    { key: 'section_a', label: 'Summary' },
                    { key: 'section_b', label: 'Real-time' },
                    { key: 'section_c', label: 'Issues' },
                    { key: 'section_d', label: 'Users' },
                    { key: 'section_k', label: 'Admin Track' },
                    { key: 'section_e', label: 'Emp Track' },
                    { key: 'section_f', label: 'Field Track' },
                    { key: 'section_g', label: 'Reports' },
                    { key: 'section_h', label: 'Edit' }
                  ].map(sec => asgn[sec.key] && (
                    <span key={sec.key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                      <Shield size={8} /> {sec.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

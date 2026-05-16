import { useAuthStore } from '../store/authStore';
import { SubmissionQueueView } from '../modules/poleSurvey/components/SubmissionQueueView';
import { ArrowLeft, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EmployeeDashboard() {
  const { user, activeProject, clearActiveProject } = useAuthStore();
  
  const hasSectionC = activeProject?.section_c;
  const hasSectionD = activeProject?.section_d;

  if (!activeProject) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
              Employee Workspace
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">
              {activeProject.name}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-950">Operations Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Logged in as {user?.name}</p>
        </div>
        
        <button 
          onClick={clearActiveProject}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
        >
          <ArrowLeft size={16} /> Switch Project
        </button>
      </div>
      
      {hasSectionC ? (
        <SubmissionQueueView projectId={activeProject.id} />
      ) : (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500">
          <p className="font-semibold text-slate-950 mb-1">No Operations Access</p>
          <p className="text-sm">You don't have access to the submission queue for this project.</p>
        </div>
      )}

      {hasSectionD && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950 mb-4">Team Management</h2>
          <div className="flex gap-4">
            <Link 
              to="/users"
              className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
            >
              <Users size={18} /> Manage Team Members
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

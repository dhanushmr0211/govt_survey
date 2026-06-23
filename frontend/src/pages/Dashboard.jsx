import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useProjects } from '../shared/hooks/useProjects';
import MasterAdminDashboard from './MasterAdminDashboard';
import AdminDashboard from './AdminDashboard';
import EmployeeDashboard from './EmployeeDashboard';
import ClientDashboard from './ClientDashboard';
import MobileSurvey from '../modules/poleSurvey/pages/MobileSurvey';
import ProjectSelector from './ProjectSelector';
import { ArrowLeft } from 'lucide-react';

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const activeProject = useAuthStore((state) => state.activeProject);
  const clearActiveProject = useAuthStore((state) => state.clearActiveProject);
  const logout = useAuthStore((state) => state.logout);
  const setActiveProject = useAuthStore((state) => state.setActiveProject);
  const queryClient = useQueryClient();
  
  const { data: freshProjects = [] } = useProjects();

  // Sync fresh project permissions to activeProject state dynamically
  useEffect(() => {
    if (activeProject && freshProjects.length > 0) {
      const updatedProject = freshProjects.find(p => p.id === activeProject.id);
      if (updatedProject) {
        // Compare only critical permission fields to avoid infinite render loops
        const keysToCompare = [
          'id', 'name', 'project_type', 'project_role',
          'section_a', 'section_b', 'section_c', 'section_d',
          'section_e', 'section_f', 'section_g', 'section_h',
          'section_i', 'section_j', 'section_k', 'district_scope', 'ulb_scope', 'is_blocked'
        ];
        const hasDiff = keysToCompare.some(k => {
          const val1 = activeProject[k];
          const val2 = updatedProject[k];
          if (Array.isArray(val1) || Array.isArray(val2)) {
            return JSON.stringify(val1) !== JSON.stringify(val2);
          }
          return val1 !== val2;
        });
        if (hasDiff) {
          setActiveProject(updatedProject);
        }
      }
    }
  }, [freshProjects, activeProject, setActiveProject]);
  
  if (!user) return null;

  // MASTER_ADMIN always sees the global dashboard
  if (user.role === 'MASTER_ADMIN') {
    return <MasterAdminDashboard />;
  }

  // Everyone else (MEMBER) must select a project first
  if (!activeProject) {
    return <ProjectSelector />;
  }

  // Once a project is selected, render the dashboard specific to their role in THAT project
  switch (activeProject.project_role) {
    case 'ADMIN':
      return <AdminDashboard />;
    case 'EMPLOYEE':
      return <EmployeeDashboard />;
    case 'CLIENT':
      return <AdminDashboard />;
    case 'MOBILE_USER':
      return <MobileSurvey />;
    default:
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <header className="bg-white p-4 border-b border-gray-100 shadow-sm flex justify-between items-center sticky top-0 z-10 w-full">
            <div className="flex items-center gap-2">
              <button onClick={clearActiveProject} className="text-primary mr-1">
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-lg font-bold text-gray-900">PR ELECTRICALS</h1>
            </div>
            <button onClick={logout} className="text-sm text-red-500 font-medium px-2 py-1">Logout</button>
          </header>
          <div className="text-gray-500 text-lg font-semibold">Unknown Project Role: {activeProject.project_role}</div>
          <button 
            onClick={clearActiveProject}
            className="text-primary font-bold underline"
          >
            Go Back to Project Selection
          </button>
        </div>
      );
  }
}

import { useAuthStore } from '../store/authStore';
import MasterAdminDashboard from './MasterAdminDashboard';
import AdminDashboard from './AdminDashboard';
import EmployeeDashboard from './EmployeeDashboard';
import ClientDashboard from './ClientDashboard';
import MobileSurvey from '../modules/poleSurvey/pages/MobileSurvey';
import ProjectSelector from './ProjectSelector';

export default function Dashboard() {
  const { user, activeProject } = useAuthStore();
  
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
      return <ClientDashboard />;
    case 'MOBILE_USER':
      return <MobileSurvey />;
    default:
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div className="text-gray-500 text-lg font-semibold">Unknown Project Role: {activeProject.project_role}</div>
          <button 
            onClick={() => useAuthStore.getState().clearActiveProject()}
            className="text-primary font-bold underline"
          >
            Go Back to Project Selection
          </button>
        </div>
      );
  }
}

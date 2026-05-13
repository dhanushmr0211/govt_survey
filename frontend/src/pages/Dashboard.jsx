import { useAuthStore } from '../store/authStore';
import MasterAdminDashboard from './MasterAdminDashboard';
import AdminDashboard from './AdminDashboard';
import EmployeeDashboard from './EmployeeDashboard';
import ClientDashboard from './ClientDashboard';
import MobileSurvey from '../modules/poleSurvey/pages/MobileSurvey';

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  
  const role = user?.role;

  switch (role) {
    case 'MASTER_ADMIN':
      return <MasterAdminDashboard />;
    case 'ADMIN':
      return <MasterAdminDashboard />;
    case 'EMPLOYEE':
      return <MasterAdminDashboard />;
    case 'CLIENT':
      return <MasterAdminDashboard />;
    case 'MOBILE_USER':
      return <MobileSurvey />;
    default:
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500 text-lg">Loading your dashboard or unauthorized...</div>
        </div>
      );
  }
}

import { useAuthStore } from '../store/authStore';
import { SubmissionQueueView } from '../modules/poleSurvey/components/SubmissionQueueView';

export default function EmployeeDashboard() {
  const user = useAuthStore((state) => state.user);
  const isMasterAdmin = user?.role === 'MASTER_ADMIN';
  const hasSectionC = isMasterAdmin || user?.section_c;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Employee Dashboard</h1>
        <span className="text-sm text-gray-500">Welcome, {user?.name}</span>
      </div>
      
      {hasSectionC && <SubmissionQueueView />}

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors">Create Mobile User</button>
      </div>
    </div>
  );
}

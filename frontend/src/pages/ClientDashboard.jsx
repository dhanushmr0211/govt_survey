import { useAuthStore } from '../store/authStore';

export default function ClientDashboard() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Client Dashboard</h1>
        <span className="text-sm text-gray-500">Welcome, {user?.name}</span>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Project Summary</h2>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">Export to Excel</button>
        </div>
        <div className="text-gray-500 text-center py-10">
          Confirmed data summary will appear here.
        </div>
      </div>
    </div>
  );
}

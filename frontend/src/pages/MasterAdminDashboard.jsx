import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { CreateAdminModal } from '../shared/components/CreateAdminModal';

export default function MasterAdminDashboard() {
  const user = useAuthStore((state) => state.user);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Master Admin Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome, {user?.name}</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-dark transition-colors"
        >
          + Create Admin
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Total Projects</h3>
          <p className="text-3xl font-bold text-gray-900">12</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Active Issues</h3>
          <p className="text-3xl font-bold text-gray-900">4</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Total Admins</h3>
          <p className="text-3xl font-bold text-gray-900">5</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Confirmed Records</h3>
          <p className="text-3xl font-bold text-gray-900">1,240</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">All Projects</h2>
        <div className="text-gray-500 text-center py-10">
          Projects list will appear here (DataTable).
        </div>
      </div>
      <CreateAdminModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

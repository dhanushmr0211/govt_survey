import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { SummaryView } from '../modules/poleSurvey/components/SummaryView';
import { WardDetailsView } from '../modules/poleSurvey/components/WardDetailsView';

export default function ClientDashboard() {
  const user = useAuthStore((state) => state.user);
  const [selectedUlb, setSelectedUlb] = useState(null);

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
        
        {!selectedUlb ? (
          <SummaryView onViewDetails={(ulb) => setSelectedUlb(ulb)} hideZeroCounts={true} />
        ) : (
          <WardDetailsView ulb={selectedUlb} onBack={() => setSelectedUlb(null)} />
        )}
      </div>
    </div>
  );
}

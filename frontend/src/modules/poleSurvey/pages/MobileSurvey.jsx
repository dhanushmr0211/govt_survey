import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { SwitchPointForm } from '../components/SwitchPointForm';
import { PoleForm } from '../components/PoleForm';
import { TodaySubmissionsView } from '../components/TodaySubmissionsView';
import { useAuthStore } from '../../../store/authStore';
import { useUserStats } from '../../../shared/hooks/useUserStats';
import { BarChart3, ClipboardList, FileCheck, WifiOff } from 'lucide-react';
import API_BASE_URL from '../../../config/api';
import { OfflineQueueView } from '../components/OfflineQueueView';
import { offlineSyncService } from '../services/offlineSyncService';
import { useEffect } from 'react';

export default function MobileSurvey() {
  const [searchTerm, setSearchTerm] = useState('');
  const { logout, activeProject } = useAuthStore();
  const [selectedUlb, setSelectedUlb] = useState(null);
  const [view, setView] = useState(null); // 'switch_point' or 'pole'
  const [activeTab, setActiveTab] = useState('survey');
  const [pendingCount, setPendingCount] = useState(0);

  const projectId = activeProject?.id;

  useEffect(() => {
    offlineSyncService.start();
    
    const updateCount = async () => {
      const count = await offlineSyncService.getPendingCount();
      setPendingCount(count);
    };

    updateCount();
    const interval = setInterval(updateCount, 10000);
    return () => clearInterval(interval);
  }, []);

  const { data: ulbs = [] } = useQuery({
    queryKey: ['ulbs', searchTerm],
    queryFn: async () => {
      if (searchTerm.length < 2) return [];
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/pole-survey/ulbs/search?q=${searchTerm}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.ulbs || [];
    },
    enabled: searchTerm.length >= 2,
  });

  const { data: stats = { switch_points: 0, poles: 0 } } = useUserStats(projectId, { enabled: activeTab === 'dashboard' });

  return (
    <div className="max-w-md mx-auto flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white p-4 border-b border-gray-100 shadow-sm flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="h-8 w-8 rounded-lg object-cover" />
          <h1 className="text-lg font-bold text-gray-900">GovtSurvey</h1>
        </div>
        <button onClick={logout} className="text-sm text-red-500 font-medium">Logout</button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Your Dashboard</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex flex-col items-center">
                <span className="text-xs text-gray-500">Switch Points</span>
                <span className="text-2xl font-bold text-primary">{stats.switch_points}</span>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex flex-col items-center">
                <span className="text-xs text-gray-500">Poles</span>
                <span className="text-2xl font-bold text-primary">{stats.poles}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'survey' && (
          <>
            {!selectedUlb ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Enter Taluk / ULB Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="e.g. CMC RANIBENNURU"
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                  {ulbs.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
                      {ulbs.map((ulb) => (
                        <div
                          key={ulb.id}
                          onClick={() => {
                            setSelectedUlb(ulb);
                            setSearchTerm(ulb.name);
                          }}
                          className="p-3 hover:bg-gray-50 cursor-pointer text-sm"
                        >
                          {ulb.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500">Selected ULB</p>
                    <p className="font-semibold text-gray-900">{selectedUlb.name}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedUlb(null);
                      setSearchTerm('');
                      setView(null);
                    }}
                    className="text-xs text-primary font-medium"
                  >
                    Change
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <button
                    onClick={() => setView('switch_point')}
                    className={`p-4 rounded-lg border flex flex-col items-center justify-center gap-2 transition-colors ${
                      view === 'switch_point'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 hover:border-primary/50'
                    }`}
                  >
                    <span className="text-sm font-medium">Create Switch Point</span>
                  </button>
                  <button
                    onClick={() => setView('pole')}
                    className={`p-4 rounded-lg border flex flex-col items-center justify-center gap-2 transition-colors ${
                      view === 'pole'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 hover:border-primary/50'
                    }`}
                  >
                    <span className="text-sm font-medium">Pole Details</span>
                  </button>
                </div>
              </div>
            )}

            {view === 'switch_point' && selectedUlb && (
              <SwitchPointForm ulb={selectedUlb} onBack={() => setView(null)} />
            )}

            {view === 'pole' && selectedUlb && (
              <PoleForm ulb={selectedUlb} onBack={() => setView(null)} />
            )}
          </>
        )}

        {activeTab === 'submissions' && (
          <TodaySubmissionsView projectId={projectId} />
        )}

        {activeTab === 'offline_queue' && (
          <OfflineQueueView />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 shadow-lg max-w-md mx-auto z-50">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center p-2 text-xs font-medium transition-colors ${activeTab === 'dashboard' ? 'text-primary' : 'text-gray-500'}`}
        >
          <BarChart3 size={20} className="mb-1" />
          <span>Dashboard</span>
        </button>
        <button
          onClick={() => setActiveTab('survey')}
          className={`flex flex-col items-center p-2 text-xs font-medium transition-colors ${activeTab === 'survey' ? 'text-primary' : 'text-gray-500'}`}
        >
          <ClipboardList size={20} className="mb-1" />
          <span>Survey</span>
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          className={`flex flex-col items-center p-2 text-xs font-medium transition-colors ${activeTab === 'submissions' ? 'text-primary' : 'text-gray-500'}`}
        >
          <FileCheck size={20} className="mb-1" />
          <span>Submissions</span>
        </button>
        <button
          onClick={() => setActiveTab('offline_queue')}
          className={`flex flex-col items-center p-2 text-xs font-medium transition-colors relative ${activeTab === 'offline_queue' ? 'text-primary' : 'text-gray-500'}`}
        >
          <WifiOff size={20} className="mb-1" />
          <span>Pending</span>
          {pendingCount > 0 && (
            <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
              {pendingCount}
            </span>
          )}
        </button>
      </nav>
    </div>
  );
}

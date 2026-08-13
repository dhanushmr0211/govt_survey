import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { CcmsForm } from '../components/CcmsForm';
import { SwitchPointForm } from '../components/SwitchPointForm';
import { PoleForm } from '../components/PoleForm';
import { TodaySubmissionsView } from '../components/TodaySubmissionsView';
import { useAuthStore } from '../../../store/authStore';
import { BarChart3, ClipboardList, FileCheck, WifiOff, ArrowLeft } from 'lucide-react';
import API_BASE_URL from '../../../config/api';
import { OfflineQueueView } from '../../poleSurvey/components/OfflineQueueView';
import { offlineSyncService } from '../../poleSurvey/services/offlineSyncService';
import { getLocalDateString } from '../../../shared/utils/date';

export default function MobileSurvey() {
  const { logout, activeProject, clearActiveProject } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUlb, setSelectedUlb] = useState(null);
  const [formType, setFormType] = useState(null);
  const [activeTab, setActiveTab] = useState('survey');
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateString());

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

  const { data: wards = [] } = useQuery({
    queryKey: ['tgpl2-wards', searchTerm, projectId],
    queryFn: async () => {
      if (searchTerm.length < 1) return [];
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/tgpl2-survey/wards`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return (res.data.ulbs || []).filter((w) => w.name.toLowerCase().includes(searchTerm.toLowerCase()));
    },
    enabled: searchTerm.length >= 1 && !!projectId && activeTab === 'survey',
  });

  const { data: stats = {
    total: { ccms_units: 0, switch_points: 0, poles: 0 },
    today: { ccms_units: 0, switch_points: 0, poles: 0 },
    dateWise: { date: selectedDate, ccms_units: 0, switch_points: 0, poles: 0 }
  } } = useQuery({
    queryKey: ['tgpl2-my-stats', projectId, selectedDate],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/tgpl2-survey/my-stats?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    enabled: !!projectId && activeTab === 'dashboard',
  });

  const resetWard = () => {
    setSelectedUlb(null);
    setSearchTerm('');
    setFormType(null);
  };

  return (
    <div className="max-w-md mx-auto flex flex-col h-screen bg-gray-50">
      <header className="bg-white p-4 border-b border-gray-100 shadow-sm flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button onClick={clearActiveProject} className="text-primary mr-1">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-900">PR ELECTRICALS</h1>
        </div>
        <button onClick={logout} className="text-sm text-red-500 font-medium px-2 py-1">Logout</button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {activeTab === 'dashboard' && (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white p-5 rounded-xl shadow">
              <h2 className="text-xl font-bold">TGPL-2 Dashboard</h2>
              <p className="text-xs text-teal-100 mt-1">Project ID: {projectId}</p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-3 bg-emerald-500 rounded-full"></span>
                Today's Submissions
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <span className="text-xs font-semibold text-gray-400">CCMS Units</span>
                  <p className="text-2xl font-black text-gray-900 mt-1">{stats?.today?.ccms_units ?? 0}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <span className="text-xs font-semibold text-gray-400">Switch Points</span>
                  <p className="text-2xl font-black text-gray-900 mt-1">{stats?.today?.switch_points ?? 0}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm col-span-2">
                  <span className="text-xs font-semibold text-gray-400">Poles</span>
                  <p className="text-2xl font-black text-gray-900 mt-1">{stats?.today?.poles ?? 0}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-3 bg-blue-500 rounded-full"></span>
                Total Submissions
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <span className="text-xs font-semibold text-gray-400">CCMS Units</span>
                  <p className="text-2xl font-black text-gray-900 mt-1">{stats?.total?.ccms_units ?? 0}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <span className="text-xs font-semibold text-gray-400">Switch Points</span>
                  <p className="text-2xl font-black text-gray-900 mt-1">{stats?.total?.switch_points ?? 0}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm col-span-2">
                  <span className="text-xs font-semibold text-gray-400">Poles</span>
                  <p className="text-2xl font-black text-gray-900 mt-1">{stats?.total?.poles ?? 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-2">
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-amber-500 rounded-full"></span>
                  Date-Wise Submissions
                </h3>
                <p className="text-xs text-gray-400">Select a specific date to view statistics</p>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex flex-col">
                  <span className="text-xs font-semibold text-amber-700">CCMS Units</span>
                  <span className="text-2xl font-black text-gray-900 mt-1">{stats?.dateWise?.ccms_units ?? 0}</span>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex flex-col">
                  <span className="text-xs font-semibold text-amber-700">Switch Points</span>
                  <span className="text-2xl font-black text-gray-900 mt-1">{stats?.dateWise?.switch_points ?? 0}</span>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 col-span-2 flex flex-col">
                  <span className="text-xs font-semibold text-amber-700">Poles</span>
                  <span className="text-2xl font-black text-gray-900 mt-1">{stats?.dateWise?.poles ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'survey' && (
          <>
            <div className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white p-4 rounded-xl shadow">
              <h2 className="text-lg font-bold">TGPL-2 Mobile Survey</h2>
              <p className="text-xs text-teal-100 mt-0.5">Project ID: {projectId}</p>
            </div>

            {!selectedUlb ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Enter Ward Name</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="e.g. 34-JP Park"
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                />
                {wards.length > 0 && (
                  <div className="bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {wards.map((w) => (
                      <button
                        type="button"
                        key={w.id}
                        onClick={() => {
                          setSelectedUlb(w);
                          setSearchTerm(w.name);
                        }}
                        className="block w-full p-3 hover:bg-gray-50 cursor-pointer text-sm border-b text-left"
                      >
                        {w.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-xs text-gray-400">Selected Ward</p>
                    <p className="font-semibold text-gray-900">{selectedUlb.name}</p>
                  </div>
                  <button onClick={resetWard} className="text-xs text-primary font-medium">Change</button>
                </div>

                {!formType ? (
                  <div className="grid grid-cols-1 gap-3">
                    <button onClick={() => setFormType('ccms')} className="p-4 rounded-lg border bg-white hover:bg-gray-50 text-sm font-medium text-gray-800 shadow-sm text-center">
                      CREATE CCMS POINT
                    </button>
                    <button onClick={() => setFormType('switch_point')} className="p-4 rounded-lg border bg-white hover:bg-gray-50 text-sm font-medium text-gray-800 shadow-sm text-center">
                      CREATE SWITCH POINT
                    </button>
                    <button onClick={() => setFormType('pole')} className="p-4 rounded-lg border bg-white hover:bg-gray-50 text-sm font-medium text-gray-800 shadow-sm text-center">
                      CREATE POLE
                    </button>
                  </div>
                ) : (
                  <div>
                    {formType === 'ccms' && <CcmsForm ulb={selectedUlb} projectId={projectId} onBack={() => setFormType(null)} />}
                    {formType === 'switch_point' && <SwitchPointForm ulb={selectedUlb} projectId={projectId} onBack={() => setFormType(null)} />}
                    {formType === 'pole' && <PoleForm ulb={selectedUlb} projectId={projectId} onBack={() => setFormType(null)} />}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'submissions' && <TodaySubmissionsView projectId={projectId} />}

        {activeTab === 'offline_queue' && <OfflineQueueView />}
      </main>

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
          <span>Offline</span>
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

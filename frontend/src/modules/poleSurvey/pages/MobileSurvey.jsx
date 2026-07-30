import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { SwitchPointForm } from '../components/SwitchPointForm';
import { PoleForm } from '../components/PoleForm';
import { InstallationForm } from '../components/InstallationForm';
import { TodaySubmissionsView } from '../components/TodaySubmissionsView';
import { useAuthStore } from '../../../store/authStore';
import { useUserStats } from '../../../shared/hooks/useUserStats';
import { BarChart3, ClipboardList, FileCheck, WifiOff, ArrowLeft, Wrench } from 'lucide-react';
import API_BASE_URL from '../../../config/api';
import { OfflineQueueView } from '../components/OfflineQueueView';
import { offlineSyncService } from '../services/offlineSyncService';
import { useEffect } from 'react';
import { getLocalDateString } from '../../../shared/utils/date';

export default function MobileSurvey() {
  const [searchTerm, setSearchTerm] = useState('');
  const { logout, activeProject, clearActiveProject } = useAuthStore();
  const [selectedUlb, setSelectedUlb] = useState(null);
  const [view, setView] = useState(null); // 'switch_point' or 'pole'
  const [activeTab, setActiveTab] = useState('survey');
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateString());
  const [selectedInstallationWard, setSelectedInstallationWard] = useState(null);
  const [installationSearchTerm, setInstallationSearchTerm] = useState('');

  const projectId = activeProject?.id;
  const isTgpl = activeProject?.project_type === 'TGPL_SURVEY' || String(activeProject?.id) === '3';

  useEffect(() => {
    if (isTgpl && selectedUlb && !view) {
      setView('pole');
    }
  }, [isTgpl, selectedUlb, view]);

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

  const { data: installationWards = [] } = useQuery({
    queryKey: ['installationWards', installationSearchTerm],
    queryFn: async () => {
      if (installationSearchTerm.length < 2) return [];
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/pole-survey/ulbs/search?q=${installationSearchTerm}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.ulbs || [];
    },
    enabled: installationSearchTerm.length >= 2,
  });

  const { data: stats = {
    total: { switch_points: 0, poles: 0 },
    today: { switch_points: 0, poles: 0 },
    dateWise: { date: '', switch_points: 0, poles: 0 }
  } } = useUserStats(projectId, selectedDate, { enabled: activeTab === 'dashboard' });

  return (
    <div className="max-w-md mx-auto flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white p-4 border-b border-gray-100 shadow-sm flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button onClick={clearActiveProject} className="text-primary mr-1">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-900">PR ELECTRICALS</h1>
        </div>
        <button onClick={logout} className="text-sm text-red-500 font-medium px-2 py-1">Logout</button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Header/Welcome Card with Premium Gradient */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-5 rounded-2xl shadow-md relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full blur-xl -mr-6 -mt-6"></div>
              <h2 className="text-xl font-bold tracking-tight">Surveyor Console</h2>
              <p className="text-xs text-emerald-100 mt-1 font-medium">Real-time survey progress and analytics</p>
            </div>

              {/* Today's Activity Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-emerald-500 rounded-full"></span>
                  Today's Submissions
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {!isTgpl ? (
                    <>
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col transition-all hover:shadow-md hover:border-emerald-100">
                        <span className="text-xs font-semibold text-gray-400">Switch Points</span>
                        <span className="text-2xl font-black text-gray-900 mt-1">{stats?.today?.switch_points ?? 0}</span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col transition-all hover:shadow-md hover:border-emerald-100">
                        <span className="text-xs font-semibold text-gray-400">Poles</span>
                        <span className="text-2xl font-black text-gray-900 mt-1">{stats?.today?.poles ?? 0}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col transition-all hover:shadow-md hover:border-emerald-100">
                        <span className="text-xs font-semibold text-gray-400">Survey Poles</span>
                        <span className="text-2xl font-black text-gray-900 mt-1">{stats?.today?.survey_poles ?? 0}</span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col transition-all hover:shadow-md hover:border-emerald-100">
                        <span className="text-xs font-semibold text-gray-400">Installation Poles</span>
                        <span className="text-2xl font-black text-gray-900 mt-1">{stats?.today?.installation_poles ?? 0}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
 
              {/* Total Activity Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-blue-500 rounded-full"></span>
                  Total Submissions
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {!isTgpl ? (
                    <>
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col transition-all hover:shadow-md hover:border-blue-100">
                        <span className="text-xs font-semibold text-gray-400">Switch Points</span>
                        <span className="text-2xl font-black text-gray-900 mt-1">{stats?.total?.switch_points ?? 0}</span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col transition-all hover:shadow-md hover:border-blue-100">
                        <span className="text-xs font-semibold text-gray-400">Poles</span>
                        <span className="text-2xl font-black text-gray-900 mt-1">{stats?.total?.poles ?? 0}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col transition-all hover:shadow-md hover:border-blue-100">
                        <span className="text-xs font-semibold text-gray-400">Survey Poles</span>
                        <span className="text-2xl font-black text-gray-900 mt-1">{stats?.total?.survey_poles ?? 0}</span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col transition-all hover:shadow-md hover:border-blue-100">
                        <span className="text-xs font-semibold text-gray-400">Installation Poles</span>
                        <span className="text-2xl font-black text-gray-900 mt-1">{stats?.total?.installation_poles ?? 0}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
 
             {/* Date-wise Section */}
             <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
               <div className="flex flex-col gap-2">
                 <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-2">
                   <span className="w-1.5 h-3 bg-amber-50 rounded-full"></span>
                   Date-Wise Submissions
                 </h3>
                 <p className="text-xs text-gray-400">Select a specific date to view statistics</p>
               </div>
               <div className="relative">
                 <input
                   type="date"
                   value={selectedDate}
                   onChange={(e) => setSelectedDate(e.target.value)}
                   className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm font-medium text-gray-700 bg-gray-50/50 cursor-pointer"
                 />
               </div>
               <div className="grid grid-cols-2 gap-4 mt-2">
                 {!isTgpl ? (
                   <>
                     <div className="bg-amber-50/30 p-4 rounded-xl border border-amber-100/50 flex flex-col items-center">
                       <span className="text-xs font-semibold text-amber-700/80">Switch Points</span>
                       <span className="text-2xl font-black text-amber-900 mt-1">{stats?.dateWise?.switch_points ?? 0}</span>
                     </div>
                     <div className="bg-amber-50/30 p-4 rounded-xl border border-amber-100/50 flex flex-col items-center">
                       <span className="text-xs font-semibold text-amber-700/80">Poles</span>
                       <span className="text-2xl font-black text-amber-900 mt-1">{stats?.dateWise?.poles ?? 0}</span>
                     </div>
                   </>
                 ) : (
                   <>
                     <div className="bg-amber-50/30 p-4 rounded-xl border border-amber-100/50 flex flex-col items-center">
                       <span className="text-xs font-semibold text-amber-700/80">Survey Poles</span>
                       <span className="text-2xl font-black text-amber-900 mt-1">{stats?.dateWise?.survey_poles ?? 0}</span>
                     </div>
                     <div className="bg-amber-50/30 p-4 rounded-xl border border-amber-100/50 flex flex-col items-center">
                       <span className="text-xs font-semibold text-amber-700/80">Installation Poles</span>
                       <span className="text-2xl font-black text-amber-900 mt-1">{stats?.dateWise?.installation_poles ?? 0}</span>
                     </div>
                   </>
                 )}
               </div>
             </div>
          </div>
        )}

        {activeTab === 'survey' && (
          <>
            {!selectedUlb ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{isTgpl ? 'Enter Ward' : 'Enter Taluk / ULB Name'}</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={isTgpl ? "e.g. Ward 1" : "e.g. CMC RANIBENNURU"}
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
                    <p className="text-xs text-gray-500">{isTgpl ? 'Selected Ward' : 'Selected ULB'}</p>
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
                  {!isTgpl && (
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
                  )}
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

        {activeTab === 'installation' && isTgpl && (
          <>
            {!selectedInstallationWard ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Enter Ward</label>
                <div className="relative">
                  <input
                    type="text"
                    value={installationSearchTerm}
                    onChange={(e) => setInstallationSearchTerm(e.target.value)}
                    placeholder="e.g. Ward 15"
                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                  {installationWards.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
                      {installationWards.map((ward) => (
                        <div
                          key={ward.id}
                          onClick={() => {
                            setSelectedInstallationWard(ward);
                            setInstallationSearchTerm(ward.name);
                          }}
                          className="p-3 hover:bg-gray-50 cursor-pointer text-sm"
                        >
                          {ward.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <InstallationForm
                ward={selectedInstallationWard}
                onBack={() => {
                  setSelectedInstallationWard(null);
                  setInstallationSearchTerm('');
                }}
              />
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
        {isTgpl && (
          <button
            onClick={() => setActiveTab('installation')}
            className={`flex flex-col items-center p-2 text-xs font-medium transition-colors ${activeTab === 'installation' ? 'text-primary' : 'text-gray-500'}`}
          >
            <Wrench size={20} className="mb-1" />
            <span>Installation</span>
          </button>
        )}
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

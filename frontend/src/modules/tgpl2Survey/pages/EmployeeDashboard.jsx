import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import API_BASE_URL from '../../../config/api';
import { useAuthStore } from '../../../store/authStore';
import { SubmissionQueueView } from '../components/SubmissionQueueView';
import { WardSummaryView } from '../components/WardSummaryView';
import { CcmsSummaryView } from '../components/CcmsSummaryView';
import { SwitchPointDetailsView } from '../components/SwitchPointDetailsView';

export default function Tgpl2EmployeeDashboard() {
  const { activeProject, clearActiveProject, logout } = useAuthStore();
  const projectId = activeProject?.id;
  const [activeView, setActiveView] = useState('queue');
  const [selectedWard, setSelectedWard] = useState(null);
  const [selectedCcms, setSelectedCcms] = useState(null);
  const [selectedSwitchPoint, setSelectedSwitchPoint] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const token = localStorage.getItem('token');

  const { data: wards = [], isLoading: isWardsLoading } = useQuery({
    queryKey: ['tgpl2-ward-cards', projectId],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/tgpl2-survey/summary/wards`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data?.wards || [];
    },
    enabled: !!projectId && activeView === 'summary' && !selectedWard
  });

  const downloadReport = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/tgpl2-survey/report/download`, {
        headers: { Authorization: `Bearer ${token}` }, responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `tgpl2_survey_report_${projectId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <section className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
          <div><p className="text-xs font-semibold uppercase text-emerald-600">TGPL-2</p><h1 className="text-xl font-bold">Inspection Console</h1></div>
          <div className="flex gap-2"><button onClick={clearActiveProject} className="rounded border px-3 py-2 text-sm">Projects</button><button onClick={downloadReport} disabled={downloading} className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">{downloading ? 'Downloading…' : 'Download Report'}</button><button onClick={logout} className="rounded border px-3 py-2 text-sm text-red-600">Logout</button></div>
        </header>

        <div className="flex gap-2 rounded-xl bg-white p-2 shadow-sm">
          <button
            onClick={() => setActiveView('queue')}
            className={`rounded px-3 py-2 text-sm font-semibold ${activeView === 'queue' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
          >
            Submission Queue
          </button>
          <button
            onClick={() => {
              setActiveView('summary');
              setSelectedWard(null);
              setSelectedCcms(null);
              setSelectedSwitchPoint(null);
            }}
            className={`rounded px-3 py-2 text-sm font-semibold ${activeView === 'summary' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
          >
            Summary Drill-down
          </button>
        </div>

        {activeView === 'queue' && <SubmissionQueueView projectId={projectId} />}

        {activeView === 'summary' && !selectedWard && (
          <section className="rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-4">
              <p className="text-sm font-semibold text-slate-500">Ward &gt; CCMS &gt; Switch Point</p>
              <h2 className="text-lg font-bold text-slate-900">Ward Cards</h2>
            </div>
            {isWardsLoading ? (
              <p className="p-6 text-center text-slate-500">Loading wards...</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {wards.map((ward) => (
                  <button
                    key={ward.ward_id}
                    onClick={() => setSelectedWard(ward)}
                    className="rounded-lg border border-slate-200 p-4 text-left hover:bg-slate-50"
                  >
                    <p className="text-sm font-bold text-slate-900">{ward.ward_name}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <p>CCMS: {ward.total_ccms || 0}</p>
                      <p>Switch Points: {ward.total_switch_points || 0}</p>
                      <p>Poles: {ward.total_poles || 0}</p>
                      <p>Pending: {ward.pending_poles || 0}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {activeView === 'summary' && selectedWard && !selectedCcms && (
          <WardSummaryView
            projectId={projectId}
            ward={selectedWard}
            onSelectCcms={setSelectedCcms}
            onBackToWards={() => setSelectedWard(null)}
          />
        )}

        {activeView === 'summary' && selectedWard && selectedCcms && !selectedSwitchPoint && (
          <CcmsSummaryView
            projectId={projectId}
            ward={selectedWard}
            ccms={selectedCcms}
            onSelectSwitchPoint={setSelectedSwitchPoint}
            onBackToWard={() => {
              setSelectedWard(null);
              setSelectedCcms(null);
            }}
            onBackToCcms={() => setSelectedCcms(null)}
          />
        )}

        {activeView === 'summary' && selectedWard && selectedCcms && selectedSwitchPoint && (
          <SwitchPointDetailsView
            projectId={projectId}
            ward={selectedWard}
            ccms={selectedCcms}
            switchPoint={selectedSwitchPoint}
            onBackToCcms={() => setSelectedSwitchPoint(null)}
            onBackToWard={() => {
              setSelectedWard(null);
              setSelectedCcms(null);
              setSelectedSwitchPoint(null);
            }}
          />
        )}
      </section>
    </main>
  );
}

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import API_BASE_URL from '../../../config/api';
import { useAuthStore } from '../../../store/authStore';
import { PoleInspectModal } from '../components/PoleInspectModal';

export default function Tgpl2EmployeeDashboard() {
  const { activeProject, clearActiveProject, logout } = useAuthStore();
  const projectId = activeProject?.id;
  const queryClient = useQueryClient();
  const [selectedPole, setSelectedPole] = useState(null);
  const [tab, setTab] = useState('PENDING');
  const [downloading, setDownloading] = useState(false);

  const { data: poles = [], isLoading } = useQuery({
    queryKey: ['tgpl2-poles', projectId, tab],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const endpoint = tab === 'PENDING' ? 'queue/pending' : 'queue/confirmed';
      const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/tgpl2-survey/${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.poles || [];
    },
    enabled: !!projectId,
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
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-4 flex gap-2"><button onClick={() => setTab('PENDING')} className={`rounded px-3 py-2 text-sm font-semibold ${tab === 'PENDING' ? 'bg-amber-500 text-white' : 'bg-slate-100'}`}>Pending</button><button onClick={() => setTab('CONFIRMED')} className={`rounded px-3 py-2 text-sm font-semibold ${tab === 'CONFIRMED' ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>Confirmed</button></div>
          {isLoading ? <p className="p-6 text-center text-slate-500">Loading poles…</p> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="border-b text-left text-slate-500"><tr><th className="p-3">Pole</th><th className="p-3">Ward</th><th className="p-3">CCMS / Switch Point</th><th className="p-3">Surveyor</th><th className="p-3">Action</th></tr></thead><tbody>{poles.map((pole) => <tr key={pole.id} className="border-b"><td className="p-3 font-semibold">{pole.pole_number || '—'}</td><td className="p-3">{pole.ward_name}</td><td className="p-3">{pole.ccms_number} / {pole.switch_point_number}</td><td className="p-3">{pole.surveyor_name || '—'}</td><td className="p-3"><button onClick={() => setSelectedPole(pole)} className="font-semibold text-emerald-700">Inspect</button></td></tr>)}</tbody></table>{poles.length === 0 && <p className="p-6 text-center text-slate-500">No {tab.toLowerCase()} poles.</p>}</div>}
        </section>
      </section>
      {selectedPole && <PoleInspectModal pole={selectedPole} projectId={projectId} onClose={() => setSelectedPole(null)} onRefresh={() => queryClient.invalidateQueries({ queryKey: ['tgpl2-poles', projectId] })} />}
    </main>
  );
}

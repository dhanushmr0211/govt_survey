import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import API_BASE_URL from '../../../config/api';
import { PoleInspectModal } from './PoleInspectModal';
import { CcmsInspectModal } from './CcmsInspectModal';
import { SwitchPointInspectModal } from './SwitchPointInspectModal';

const TYPE_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pole', label: 'Pole' },
  { key: 'switch_point', label: 'Switch Point' },
  { key: 'ccms', label: 'CCMS Point' }
];

function TypeBadge({ type }) {
  const styles = type === 'pole'
    ? 'bg-amber-50 text-amber-700'
    : type === 'switch_point'
      ? 'bg-blue-50 text-blue-700'
      : 'bg-indigo-50 text-indigo-700';

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>
      {type === 'pole' ? 'Pole' : type === 'switch_point' ? 'Switch Point' : 'CCMS'}
    </span>
  );
}

export function SubmissionQueueView({ projectId }) {
  const queryClient = useQueryClient();
  const [statusTab, setStatusTab] = useState('pending');
  const [typeTab, setTypeTab] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);

  const token = localStorage.getItem('token');
  const endpoint = statusTab === 'pending' ? 'queue/pending' : 'queue/confirmed';

  const { data = { rows: [], total: 0 }, isLoading } = useQuery({
    queryKey: ['tgpl2-submission-queue', projectId, statusTab, typeTab],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/tgpl2-survey/${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { type: typeTab, page: 1, limit: 200 }
      });
      const rows = res.data?.queue || res.data?.poles || [];
      return { rows, total: Number(res.data?.total || rows.length || 0) };
    },
    enabled: !!projectId
  });

  const sortedRows = useMemo(() => {
    return [...data.rows].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [data.rows]);

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">Submission Queue</h2>
        <div className="text-xs font-semibold text-slate-500">{data.total} records</div>
      </div>

      <div className="mb-3 flex gap-2">
        <button onClick={() => setStatusTab('pending')} className={`rounded px-3 py-2 text-sm font-semibold ${statusTab === 'pending' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700'}`}>Pending</button>
        <button onClick={() => setStatusTab('confirmed')} className={`rounded px-3 py-2 text-sm font-semibold ${statusTab === 'confirmed' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}>Confirmed</button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTypeTab(tab.key)}
            className={`rounded-md px-3 py-2 text-sm font-semibold ${typeTab === tab.key ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="p-6 text-center text-slate-500">Loading queue...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b text-left text-slate-500">
              <tr>
                <th className="p-3">Type</th>
                <th className="p-3">Identifier</th>
                <th className="p-3">Ward</th>
                <th className="p-3">Submitted By</th>
                <th className="p-3">Submitted At</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((item) => (
                <tr key={`${item.submission_type}-${item.id}`} className="border-b">
                  <td className="p-3"><TypeBadge type={item.submission_type} /></td>
                  <td className="p-3 font-semibold text-slate-900">{item.identifier || '-'}</td>
                  <td className="p-3">{item.ward_name || '-'}</td>
                  <td className="p-3">{item.user_name || '-'}</td>
                  <td className="p-3">{item.created_at ? new Date(item.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-'}</td>
                  <td className="p-3">
                    <button onClick={() => setSelectedItem(item)} className="font-semibold text-emerald-700 hover:text-emerald-800">Inspect</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sortedRows.length === 0 && <p className="p-6 text-center text-slate-500">No records found.</p>}
        </div>
      )}

      {selectedItem?.submission_type === 'ccms' && (
        <CcmsInspectModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
      {selectedItem?.submission_type === 'switch_point' && (
        <SwitchPointInspectModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
      {selectedItem?.submission_type === 'pole' && (
        <PoleInspectModal
          pole={selectedItem}
          projectId={projectId}
          onClose={() => setSelectedItem(null)}
          onRefresh={() => {
            queryClient.invalidateQueries({ queryKey: ['tgpl2-submission-queue', projectId] });
          }}
        />
      )}
    </section>
  );
}

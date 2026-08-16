import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import API_BASE_URL from '../../../config/api';

export function CcmsSummaryView({ projectId, ward, ccms, onSelectSwitchPoint, onBackToWard, onBackToCcms }) {
  const token = localStorage.getItem('token');

  const { data: switchPoints = [], isLoading } = useQuery({
    queryKey: ['tgpl2-ccms-summary', projectId, ccms?.ccms_id],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/tgpl2-survey/summary/ccms/${ccms.ccms_id}/switch-points`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data?.switch_points || [];
    },
    enabled: !!projectId && !!ccms?.ccms_id
  });

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-500">Ward &gt; CCMS &gt; Switch Point</p>
          <div className="flex gap-2">
            <button onClick={onBackToCcms} className="text-sm font-semibold text-primary">Back to CCMS</button>
            <button onClick={onBackToWard} className="text-sm font-semibold text-primary">Back to Wards</button>
          </div>
        </div>
        <h3 className="text-lg font-bold text-slate-900">
          {ward?.ward_name || '-'} / {ccms?.ccms_number || '-'}
        </h3>
      </div>

      <h3 className="mb-3 text-base font-bold text-slate-900">Switch Points</h3>
      {isLoading ? (
        <p className="p-4 text-center text-slate-500">Loading switch points...</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {switchPoints.map((sp) => (
            <button
              key={sp.sp_id}
              onClick={() => onSelectSwitchPoint(sp)}
              className="rounded-lg border border-slate-200 p-4 text-left hover:bg-slate-50"
            >
              <p className="text-sm font-bold text-slate-900">{sp.switch_point_number || '-'}</p>
              <div className="mt-2 text-xs text-slate-600">
                <p>Poles: {sp.pole_count || 0}</p>
                <p>Pending: {sp.pending_count || 0}</p>
                <p>Confirmed: {sp.confirmed_count || 0}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

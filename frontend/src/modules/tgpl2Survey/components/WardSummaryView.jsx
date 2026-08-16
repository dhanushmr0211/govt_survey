import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import API_BASE_URL from '../../../config/api';

export function WardSummaryView({ projectId, ward, onSelectCcms, onBackToWards }) {
  const token = localStorage.getItem('token');

  const { data: ccmsList = [], isLoading } = useQuery({
    queryKey: ['tgpl2-ward-summary', projectId, ward?.ward_id],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/tgpl2-survey/summary/wards/${ward.ward_id}/ccms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data?.ccms || [];
    },
    enabled: !!projectId && !!ward?.ward_id
  });

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">Ward &gt; CCMS &gt; Switch Point</p>
          <h2 className="text-lg font-bold text-slate-900">{ward?.ward_name || '-'} - CCMS List</h2>
        </div>
        <button onClick={onBackToWards} className="text-sm font-semibold text-primary">Back to Wards</button>
      </div>

      {isLoading ? (
        <p className="p-6 text-center text-slate-500">Loading CCMS...</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {ccmsList.map((ccms) => (
            <button
              key={ccms.ccms_id}
              onClick={() => onSelectCcms(ccms)}
              className="rounded-lg border border-slate-200 p-4 text-left hover:bg-slate-50"
            >
              <p className="text-sm font-bold text-slate-900">{ccms.ccms_number || '-'}</p>
              <div className="mt-2 text-xs text-slate-600">
                <p>Switch Points: {ccms.switch_point_count || 0}</p>
                <p>Poles: {ccms.pole_count || 0}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

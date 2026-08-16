import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import API_BASE_URL from '../../../config/api';

export function SwitchPointDetailsView({ projectId, ward, ccms, switchPoint, onBackToCcms, onBackToWard }) {
  const token = localStorage.getItem('token');

  const { data: poles = [], isLoading } = useQuery({
    queryKey: ['tgpl2-switch-point-details', projectId, switchPoint?.sp_id],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/tgpl2-survey/summary/switch-points/${switchPoint.sp_id}/poles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data?.poles || [];
    },
    enabled: !!projectId && !!switchPoint?.sp_id
  });

  return (
    <section className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-500">Ward &gt; CCMS &gt; Switch Point</p>
          <div className="flex gap-2">
            <button onClick={onBackToCcms} className="text-sm font-semibold text-primary">Back to CCMS</button>
            <button onClick={onBackToWard} className="text-sm font-semibold text-primary">Back to Wards</button>
          </div>
        </div>
        <p className="text-sm text-slate-600">{ward?.ward_name || '-'} / {ccms?.ccms_number || '-'} / {switchPoint?.switch_point_number || '-'}</p>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-base font-bold text-slate-900">Poles</h3>
        {isLoading ? (
          <p className="p-4 text-center text-slate-500">Loading poles...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b text-left text-slate-500">
                <tr>
                  <th className="p-3">Pole Number</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Surveyor</th>
                  <th className="p-3">Created At</th>
                </tr>
              </thead>
              <tbody>
                {poles.map((pole) => (
                  <tr key={pole.id} className="border-b">
                    <td className="p-3 font-semibold text-slate-900">{pole.pole_number || '-'}</td>
                    <td className="p-3">{pole.status || '-'}</td>
                    <td className="p-3">{pole.user_name || '-'}</td>
                    <td className="p-3">{pole.created_at ? new Date(pole.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {poles.length === 0 && <p className="p-6 text-center text-slate-500">No poles found.</p>}
          </div>
        )}
      </div>
    </section>
  );
}

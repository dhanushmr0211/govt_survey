import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import API_BASE_URL from '../../../config/api';

export const TodaySubmissionsView = ({ projectId }) => {
  const token = localStorage.getItem('token');

  const { data: poles = [], isLoading } = useQuery({
    queryKey: ['tgpl2-all-submissions', projectId],
    queryFn: async () => {
      const [pendingRes, confirmedRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/projects/${projectId}/tgpl2-survey/queue/pending`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/projects/${projectId}/tgpl2-survey/queue/confirmed`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);

      const merged = [...(pendingRes.data.poles || []), ...(confirmedRes.data.poles || [])];
      return merged.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    },
    enabled: !!projectId,
  });

  if (isLoading) {
    return <p className="p-6 text-center text-sm text-gray-500">Loading submissions...</p>;
  }

  return (
    <div className="space-y-3">
      <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
        <h2 className="text-base font-bold text-gray-900">All Submissions</h2>
        <p className="text-xs text-gray-500 mt-1">{poles.length} TGPL-2 pole submissions</p>
      </div>

      {poles.length === 0 ? (
        <div className="bg-white p-6 rounded-lg border border-gray-100 text-center text-sm text-gray-500">
          No submissions found.
        </div>
      ) : (
        poles.map((pole) => (
          <div key={pole.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm space-y-2">
            <div className="flex justify-between gap-3">
              <div>
                <p className="text-xs uppercase font-semibold text-gray-400">Pole Number</p>
                <p className="font-semibold text-gray-900">{pole.pole_number || '-'}</p>
              </div>
              <span className={`h-fit rounded px-2 py-1 text-xs font-semibold ${pole.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {pole.status || 'PENDING'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
              <p><span className="font-semibold text-gray-500">Ward:</span> {pole.ward_name || '-'}</p>
              <p><span className="font-semibold text-gray-500">CCMS:</span> {pole.ccms_number || '-'}</p>
              <p><span className="font-semibold text-gray-500">Switch:</span> {pole.switch_point_number || '-'}</p>
              <p><span className="font-semibold text-gray-500">Road:</span> {pole.road_type || '-'}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

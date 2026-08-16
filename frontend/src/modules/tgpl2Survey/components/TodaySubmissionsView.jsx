import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { CheckCircle2, Edit2, Save, SearchCheck } from 'lucide-react';
import { useState } from 'react';
import API_BASE_URL from '../../../config/api';
import { useAuthStore } from '../../../store/authStore';

export const TodaySubmissionsView = ({ projectId }) => {
  const token = localStorage.getItem('token');
  const user = useAuthStore((state) => state.user);
  const activeProject = useAuthStore((state) => state.activeProject);
  const queryClient = useQueryClient();
  const [selectedPole, setSelectedPole] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  const canEdit =
    user?.role === 'MASTER_ADMIN' ||
    activeProject?.project_role === 'MOBILE_USER' ||
    activeProject?.section_i ||
    activeProject?.section_j;

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

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!selectedPole) return;
    try {
      await axios.patch(`${API_BASE_URL}/projects/${projectId}/tgpl2-survey/poles/${selectedPole.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      queryClient.invalidateQueries({ queryKey: ['tgpl2-all-submissions', projectId] });
      setSelectedPole({ ...selectedPole, ...formData });
      setIsEditing(false);
      alert('Survey details updated successfully.');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update survey details');
    }
  };

  const handleConfirm = async () => {
    if (!selectedPole) return;
    try {
      await axios.post(`${API_BASE_URL}/projects/${projectId}/tgpl2-survey/poles/${selectedPole.id}/confirm`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      queryClient.invalidateQueries({ queryKey: ['tgpl2-all-submissions', projectId] });
      setSelectedPole(null);
      setIsEditing(false);
      alert('Survey confirmed successfully.');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to confirm survey');
    }
  };

  const renderField = (label, field, value, options = null) => {
    const isReadOnly = !isEditing;
    const fieldValue = formData[field] ?? value ?? '';

    if (options) {
      return (
        <div key={field} className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</label>
          {isReadOnly ? (
            <p className="rounded-md border border-gray-100 bg-gray-50 px-2.5 py-2 text-sm text-gray-900">{fieldValue || 'N/A'}</p>
          ) : (
            <select
              value={fieldValue}
              onChange={(e) => handleFieldChange(field, e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none"
            >
              <option value="">Select...</option>
              {options.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          )}
        </div>
      );
    }

    return (
      <div key={field} className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</label>
        {isReadOnly ? (
          <p className="rounded-md border border-gray-100 bg-gray-50 px-2.5 py-2 text-sm text-gray-900">{fieldValue || 'N/A'}</p>
        ) : (
          <input
            value={fieldValue}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            className="w-full rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none"
          />
        )}
      </div>
    );
  };

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
            <div className="pt-2">
              <button
                onClick={() => {
                  setSelectedPole(pole);
                  setFormData({ ...pole });
                  setIsEditing(false);
                }}
                className="inline-flex items-center gap-1 rounded-md bg-primary/5 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10"
              >
                <SearchCheck size={14} />
                View Details
              </button>
            </div>
          </div>
        ))
      )}

      {selectedPole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Submitted Survey</p>
                <h3 className="text-lg font-bold text-gray-900">Pole Details</h3>
              </div>
              <div className="flex items-center gap-3">
                {canEdit && !isEditing && selectedPole.status !== 'CONFIRMED' && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary"
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                )}
                {selectedPole.status !== 'CONFIRMED' && (
                  <button
                    onClick={handleConfirm}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                  >
                    <CheckCircle2 size={14} /> Confirm
                  </button>
                )}
                <button onClick={() => { setSelectedPole(null); setIsEditing(false); }} className="text-sm font-medium text-gray-500">Close</button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {renderField('Created By', 'user_name', selectedPole.user_name)}
              {renderField('Confirmed By', 'confirmed_by_name', selectedPole.confirmed_by_name)}
              {renderField('Ward', 'ward_name', selectedPole.ward_name)}
              {renderField('CCMS Number', 'ccms_number', selectedPole.ccms_number)}
              {renderField('Switch Point', 'switch_point_number', selectedPole.switch_point_number)}
              {renderField('Pole Number', 'pole_number', selectedPole.pole_number)}
              {renderField('Road Type', 'road_type', selectedPole.road_type, ['MAIN ROAD', 'SUB MAIN ROAD', 'RESIDENTIAL ROAD', 'GALLI ROAD'])}
              {renderField('Road Width', 'road_width_mtrs', selectedPole.road_width_mtrs)}
              {renderField('Pole Type', 'pole_type', selectedPole.pole_type, ['PSC', 'RCC', 'SPUN', 'CONICAL', 'OCTOGANAL', 'POST TOP'])}
              {renderField('Pole Condition', 'pole_condition', selectedPole.pole_condition, ['Good', 'Defective', 'Missing'])}
              {renderField('Light Type', 'light_type', selectedPole.light_type, ['LED', 'BULB', 'CFL', 'TUBE LIGHT', 'MH400', 'EMPTY'])}
              {renderField('Light Capacity', 'light_capacity', selectedPole.light_capacity, ['40W', '65W', '90W', '120W', '150W', '200W', '250W'])}
              {renderField('Latitude', 'latitude', selectedPole.latitude)}
              {renderField('Longitude', 'longitude', selectedPole.longitude)}
              {renderField('Status', 'status', selectedPole.status)}
            </div>

            {isEditing && (
              <div className="mt-5 flex justify-end gap-3 border-t border-gray-200 pt-4">
                <button
                  onClick={() => setIsEditing(false)}
                  className="rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  <Save size={14} /> Save Changes
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

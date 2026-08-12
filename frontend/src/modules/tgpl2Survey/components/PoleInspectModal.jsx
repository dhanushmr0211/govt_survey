import { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../../config/api';

export const PoleInspectModal = ({ pole, onClose, onRefresh, projectId }) => {
  const [formData, setFormData] = useState({ ...pole });
  const [warningMessage, setWarningMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setWarningMessage('');
    try {
      const token = localStorage.getItem('token');
      // Validate move
      const valRes = await axios.post(`${API_BASE_URL}/projects/${projectId}/tgpl2-survey/validate-move`, {
        id: pole.id,
        ward_id: formData.ward_id,
        ccms_id: formData.ccms_id,
        switch_point_id: formData.switch_point_id,
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (valRes.data.shouldWarn) {
        const proceed = window.confirm(valRes.data.message);
        if (!proceed) {
          setLoading(false);
          return;
        }
      }

      await axios.patch(`${API_BASE_URL}/projects/${projectId}/tgpl2-survey/poles/${pole.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Survey data updated successfully!');
      onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update pole details');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/projects/${projectId}/tgpl2-survey/poles/${pole.id}/confirm`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Pole survey confirmed!');
      onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to confirm pole');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-y-auto max-h-[90vh] flex flex-col">
        <header className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
          <h3 className="font-bold text-gray-900">Inspect Pole Details</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">Close</button>
        </header>

        <div className="p-4 space-y-4 flex-1">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-600 uppercase">Pole Number</label>
            <input type="text" name="pole_number" value={formData.pole_number || ''} onChange={handleChange} className="w-full p-2.5 border rounded text-sm" />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-600 uppercase">Road Type</label>
            <input type="text" name="road_type" value={formData.road_type || ''} onChange={handleChange} className="w-full p-2.5 border rounded text-sm" />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-600 uppercase">Road Width</label>
            <input type="number" step="any" name="road_width" value={formData.road_width || ''} onChange={handleChange} className="w-full p-2.5 border rounded text-sm" />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="pole_defective" checked={formData.pole_defective || false} onChange={handleChange} />
              Defective Pole
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="arm_deteriorated" checked={formData.arm_deteriorated || false} onChange={handleChange} />
              Deteriorated Arm
            </label>
          </div>
        </div>

        <footer className="p-4 border-t flex justify-end gap-2 bg-gray-50 sticky bottom-0">
          <button onClick={handleSave} disabled={loading} className="px-4 py-2 border rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            Save Changes
          </button>
          {pole.status !== 'CONFIRMED' && (
            <button onClick={handleConfirm} disabled={loading} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium">
              Confirm Survey
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};

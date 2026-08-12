import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import API_BASE_URL from '../../../config/api';

export const SwitchPointForm = ({ ulb, onBack, projectId }) => {
  const [formData, setFormData] = useState({
    ward_id: ulb.id,
    ccms_id: '',
    switch_point_number: '',
    meter_status: 'Meter Exists',
    meter_type: '',
    rr_number: '',
    serial_number: '',
  });
  const [loading, setLoading] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  // Fetch CCMS list under the selected Ward
  const { data: ccmsList = [] } = useQuery({
    queryKey: ['tgpl2-ccms', ulb.id, projectId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/tgpl2-survey/ccms?ward_id=${ulb.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.ccms || [];
    }
  });

  // Auto-select last CCMS if available
  useEffect(() => {
    if (ccmsList.length > 0) {
      setFormData((prev) => ({ ...prev, ccms_id: String(ccmsList[0].id) }));
    }
  }, [ccmsList]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'switch_point_number') {
      setWarningMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setWarningMessage('');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/projects/${projectId}/tgpl2-survey/switch-points`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Switch Point created successfully!');
      onBack();
    } catch (err) {
      console.error(err);
      if (err.response?.status === 409) {
        setWarningMessage('Already exists under this CCMS unit of this ward');
      } else {
        alert(err.response?.data?.message || 'Failed to create Switch Point');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
      <div className="flex justify-between items-center border-b pb-2">
        <h3 className="font-bold text-gray-900">Create Switch Point</h3>
        <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">Selected Ward</label>
        <input type="text" value={ulb.name} disabled className="w-full p-2.5 border rounded bg-gray-50 text-gray-500 text-sm" />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">Select CCMS Point *</label>
        <select name="ccms_id" required value={formData.ccms_id} onChange={handleChange} className="w-full p-2.5 border rounded text-sm focus:ring-1 focus:ring-primary">
          <option value="">-- Choose CCMS Point --</option>
          {ccmsList.map((c) => (
            <option key={c.id} value={c.id}>{c.ccms_number}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">Switch Point Number *</label>
        <input type="text" name="switch_point_number" required value={formData.switch_point_number} onChange={handleChange} className="w-full p-2.5 border rounded text-sm focus:ring-1 focus:ring-primary" placeholder="Enter Switch Point Number" />
        {warningMessage && (
          <p className="text-xs text-amber-600 font-semibold">{warningMessage}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">Meter Status</label>
        <select name="meter_status" value={formData.meter_status} onChange={handleChange} className="w-full p-2.5 border rounded text-sm focus:ring-1 focus:ring-primary">
          <option value="Meter Exists">Meter Exists</option>
          <option value="No Meter">No Meter</option>
          <option value="Meter Burnt">Meter Burnt</option>
          <option value="Meter Sticky">Meter Sticky</option>
        </select>
      </div>

      {formData.meter_status === 'Meter Exists' && (
        <>
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-600 uppercase">Meter Type</label>
            <input type="text" name="meter_type" value={formData.meter_type} onChange={handleChange} className="w-full p-2.5 border rounded text-sm focus:ring-1 focus:ring-primary" placeholder="e.g. 3 Phase, 1 Phase" />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-600 uppercase">RR Number</label>
            <input type="text" name="rr_number" value={formData.rr_number} onChange={handleChange} className="w-full p-2.5 border rounded text-sm focus:ring-1 focus:ring-primary" placeholder="Enter RR Number" />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-600 uppercase">Meter Serial Number</label>
            <input type="text" name="serial_number" value={formData.serial_number} onChange={handleChange} className="w-full p-2.5 border rounded text-sm focus:ring-1 focus:ring-primary" placeholder="Enter Serial Number" />
          </div>
        </>
      )}

      <button type="submit" disabled={loading} className="w-full p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium text-sm transition-colors">
        {loading ? 'Submitting...' : 'Create Switch Point'}
      </button>
    </form>
  );
};

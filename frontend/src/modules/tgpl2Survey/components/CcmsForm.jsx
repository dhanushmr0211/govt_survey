import { useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../../config/api';

export const CcmsForm = ({ ulb, onBack, projectId }) => {
  const [formData, setFormData] = useState({
    ward_id: ulb.id,
    ward_number: ulb.name,
    dtc_number: '',
    dtc_capacity: '',
    ccms_number: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/projects/${projectId}/tgpl2-survey/ccms`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('CCMS Point created successfully!');
      onBack();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to create CCMS Point');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
      <div className="flex justify-between items-center border-b pb-2">
        <h3 className="font-bold text-gray-900">Create CCMS Point</h3>
        <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">Ward Name</label>
        <input type="text" value={formData.ward_number} disabled className="w-full p-2.5 border rounded bg-gray-50 text-gray-500 text-sm" />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">CCMS Number *</label>
        <input type="text" name="ccms_number" required value={formData.ccms_number} onChange={handleChange} className="w-full p-2.5 border rounded text-sm focus:ring-1 focus:ring-primary" placeholder="Enter CCMS Number" />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">DTC Number</label>
        <input type="text" name="dtc_number" value={formData.dtc_number} onChange={handleChange} className="w-full p-2.5 border rounded text-sm focus:ring-1 focus:ring-primary" placeholder="Enter DTC Number" />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">DTC Capacity (kVA)</label>
        <input type="text" name="dtc_capacity" value={formData.dtc_capacity} onChange={handleChange} className="w-full p-2.5 border rounded text-sm focus:ring-1 focus:ring-primary" placeholder="Enter DTC Capacity" />
      </div>

      <button type="submit" disabled={loading} className="w-full p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium text-sm transition-colors">
        {loading ? 'Submitting...' : 'Create CCMS Point'}
      </button>
    </form>
  );
};

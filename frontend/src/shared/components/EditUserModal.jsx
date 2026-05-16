import { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config/api';

export const EditUserModal = ({ isOpen, onClose, user, onSave }) => {
  const [formData, setFormData] = useState({
    section_a: false,
    section_b: false,
    section_c: false,
    section_d: false,
    section_e: false,
    section_f: false,
    section_g: false,
    section_h: false,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        section_a: user.section_a || false,
        section_b: user.section_b || false,
        section_c: user.section_c || false,
        section_d: user.section_d || false,
        section_e: user.section_e || false,
        section_f: user.section_f || false,
        section_g: user.section_g || false,
        section_h: user.section_h || false,
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      await axios.put(`${API_BASE_URL}/auth/users/${user.id}/access`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating access:', error);
      alert(error.response?.data?.message || 'Error updating access');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md space-y-4 shadow-xl">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Edit Access - {user?.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Restricted Section Access</label>
            <div className="flex flex-col gap-2 p-3 border border-gray-100 rounded">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="section_a" checked={formData.section_a} onChange={handleChange} className="rounded text-primary focus:ring-primary" />
                <span>Section A: Summary</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="section_b" checked={formData.section_b} onChange={handleChange} className="rounded text-primary focus:ring-primary" />
                <span>Section B: Today's Summary</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="section_c" checked={formData.section_c} onChange={handleChange} className="rounded text-primary focus:ring-primary" />
                <span>Section C: Issues</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="section_d" checked={formData.section_d} onChange={handleChange} className="rounded text-primary focus:ring-primary" />
                <span>Section D: Users (Team Management)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="section_e" checked={formData.section_e} onChange={handleChange} className="rounded text-primary focus:ring-primary" />
                <span>Section E: Employee Tracking</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="section_f" checked={formData.section_f} onChange={handleChange} className="rounded text-primary focus:ring-primary" />
                <span>Section F: Mobile User Tracking</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="section_g" checked={formData.section_g} onChange={handleChange} className="rounded text-primary focus:ring-primary" />
                <span>Section G: Download Report</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="section_h" checked={formData.section_h} onChange={handleChange} className="rounded text-primary focus:ring-primary" />
                <span>Section H: Edit Details</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
};

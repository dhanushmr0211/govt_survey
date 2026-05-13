import { useState } from 'react';
import { FileUploader } from '../../../shared/uploads/FileUploader';
import axios from 'axios';

export const SwitchPointForm = ({ ulb, onBack }) => {
  const [formData, setFormData] = useState({
    ward_number: '',
    switch_point_number: '',
    switch_point_type: '',
    meter_exists: '',
    meter_type: '',
    meter_rr_number: '',
    meter_serial_number: '',
    meter_condition: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const projectId = 2; // Fixed to match database
    try {
      const isMeterYes = formData.meter_exists === 'yes';
      const res = await axios.post(`http://10.73.182.200:3000/api/v1/projects/${projectId}/pole-survey/switch-point`, {
        ...formData,
        ulb_id: ulb.id,
        meter_exists: isMeterYes,
        meter_type: isMeterYes ? formData.meter_type : null,
        meter_condition: isMeterYes ? formData.meter_condition : null,
        meter_rr_number: isMeterYes ? formData.meter_rr_number : null,
        meter_serial_number: isMeterYes ? formData.meter_serial_number : null,
        latitude: null,
        longitude: null,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Switch Point created:', res.data);
      alert('Switch Point created successfully!');
      onBack();
    } catch (error) {
      console.error('Error creating switch point:', error);
      alert(error.response?.data?.message || 'Error creating switch point');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold text-gray-900">Create Switch Point</h2>
        <button type="button" onClick={onBack} className="text-sm text-gray-500">Back</button>
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <label className="block text-gray-700 font-medium mb-1">Ward Number</label>
          <input type="text" name="ward_number" value={formData.ward_number} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" required />
        </div>
        <div>
          <label className="block text-gray-700 font-medium mb-1">Switch Point Number</label>
          <input type="text" name="switch_point_number" value={formData.switch_point_number} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" required />
        </div>
        <div>
          <label className="block text-gray-700 font-medium mb-1">Switch Point Type</label>
          <select name="switch_point_type" value={formData.switch_point_type} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" required>
            <option value="">Select Type</option>
            <option value="DP">DP</option>
            <option value="MCB">MCB</option>
            <option value="SWITCH">SWITCH</option>
            <option value="HOOK">HOOK</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-700 font-medium mb-1">Does Meter Exist?</label>
          <select name="meter_exists" value={formData.meter_exists} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" required>
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        
        {formData.meter_exists === 'yes' && (
          <>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Meter Type</label>
              <select name="meter_type" value={formData.meter_type} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" required>
                <option value="">Select Meter Type</option>
                <option value="1P">1P</option>
                <option value="3P">3P</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Meter RR Number</label>
              <input type="text" name="meter_rr_number" value={formData.meter_rr_number} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Meter Serial Number</label>
              <input type="text" name="meter_serial_number" value={formData.meter_serial_number} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Meter Condition</label>
              <select name="meter_condition" value={formData.meter_condition} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" required>
                <option value="">Select Condition</option>
                <option value="working">Working</option>
                <option value="not working">Not Working</option>
                <option value="missing">Missing</option>
              </select>
            </div>
          </>
        )}

        <div>
          <label className="block text-gray-700 font-medium mb-1">Photos</label>
          <FileUploader onUpload={() => {}} />
        </div>

        <button type="submit" className="w-full bg-primary text-white p-3 rounded-lg font-medium hover:bg-primary-dark transition-colors mt-4">
          Submit Switch Point
        </button>
      </div>
    </form>
  );
};

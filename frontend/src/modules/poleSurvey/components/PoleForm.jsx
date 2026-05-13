import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { FileUploader } from '../../../shared/uploads/FileUploader';

export const PoleForm = ({ ulb, onBack }) => {
  const [formData, setFormData] = useState({
    ward_number: '',
    switch_point_id: '',
    switch_point_number: '',
    conductor_type: '',
    pole_number: '',
    pole_type: '',
    pole_height: '',
    pole_condition: '',
    distance_mtrs: '',
    arm_type: '',
    arm_status: '',
    present_arm_no: '',
    present_arm_length: '',
    how_many_lights: '',
    light_mounting_height: '',
    light_type: '',
    light_capacity: '',
    light_working_status: '',
    road_category: '',
    road_type: '',
    road_width: '',
    pole_earthing_exists: '',
  });

  const projectId = 2; // Updated to match database id

  // Fetch switch points when ward_number changes
  const { data: switchPoints = [], refetch } = useQuery({
    queryKey: ['switchPoints', ulb.id, formData.ward_number],
    queryFn: async () => {
      if (!formData.ward_number) return [];
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://10.73.182.200:3000/api/v1/projects/${projectId}/pole-survey/switch-points?ward_number=${formData.ward_number}&ulb_id=${ulb.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.switchPoints || [];
    },
    enabled: !!formData.ward_number,
  });

  // Auto-select latest switch point
  useEffect(() => {
    if (switchPoints.length > 0) {
      setFormData((prev) => ({ 
        ...prev, 
        switch_point_id: switchPoints[0].id,
        switch_point_number: switchPoints[0].switch_point_number 
      }));
    }
  }, [switchPoints]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchPointChange = (e) => {
    const id = e.target.value;
    const selectedSp = switchPoints.find(sp => sp.id === Number(id));
    setFormData((prev) => ({ 
      ...prev, 
      switch_point_id: id,
      switch_point_number: selectedSp ? selectedSp.switch_point_number : ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await axios.post(`http://10.73.182.200:3000/api/v1/projects/${projectId}/pole-survey/pole`, {
        ...formData,
        pole_height_mtrs: Number(formData.pole_height),
        pole_to_pole_distance_mtrs: Number(formData.distance_mtrs),
        present_arm_length_mtrs: Number(formData.present_arm_length),
        how_many_lights_in_pole: formData.how_many_lights,
        road_width_mtrs: Number(formData.road_width),
        latitude: null,
        longitude: null,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Pole created:', res.data);
      alert('Pole created successfully!');
      onBack();
    } catch (error) {
      console.error('Error creating pole:', error);
      alert(error.response?.data?.message || 'Error creating pole');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm space-y-4 max-h-[70vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold text-gray-900">Pole Form</h2>
        <button type="button" onClick={onBack} className="text-sm text-gray-500">Back</button>
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <label className="block text-gray-700 font-medium mb-1">Ward No#</label>
          <input type="text" name="ward_number" value={formData.ward_number} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" required />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Switch Point No#</label>
          <select name="switch_point_id" value={formData.switch_point_id} onChange={handleSwitchPointChange} className="w-full p-2 border border-gray-200 rounded" required>
            <option value="">Select Switch Point</option>
            {switchPoints.map((sp) => (
              <option key={sp.id} value={sp.id}>SP No: {sp.switch_point_number} (ID: {sp.id})</option>
            ))}
          </select>
          {switchPoints.length > 0 && (
            <p className="text-xs text-green-600 mt-1">Latest switch point auto-selected.</p>
          )}
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Conductor Type</label>
          <select name="conductor_type" value={formData.conductor_type} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" required>
            <option value="">Select Conductor Type</option>
            <option value="ABC">ABC</option>
            <option value="ACSR">ACSR</option>
            <option value="UG">UG</option>
          </select>
        </div>



        <div>
          <label className="block text-gray-700 font-medium mb-1">Pole No#</label>
          <input type="text" name="pole_number" value={formData.pole_number} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" required />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Pole Type</label>
          <select name="pole_type" value={formData.pole_type} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" required>
            <option value="">Select Pole Type</option>
            {['Conical', 'Decorative', 'High Mast', 'Mini Mast', 'Octoganal', 'Post Top', 'PSC', 'RCC', 'Spun', 'Tubular'].map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Pole Height (mtrs)</label>
          <select name="pole_height" value={formData.pole_height} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" required>
            <option value="">Select Height</option>
            {[0, 4, 5, 6, 7, 8, 9, 12, 16, 18, 24, 30].map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Pole Condition</label>
          <select name="pole_condition" value={formData.pole_condition} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" required>
            <option value="">Select Condition</option>
            <option value="Good">Good</option>
            <option value="defective">Defective</option>
            <option value="missing">Missing</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Pole To Pole Distance (mtrs)</label>
          <input type="text" name="distance_mtrs" value={formData.distance_mtrs} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded" />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">ARM Type</label>
          <select name="arm_type" value={formData.arm_type} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded">
            <option value="">Select ARM Type</option>
            {['single', 'double', 'multiple', 'multiply', 'empty/not present'].map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">ARM Status</label>
          <select name="arm_status" value={formData.arm_status} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded">
            <option value="">Select ARM Status</option>
            {['new', 'old', 'deteriorated', 'missing', 'empty/not present'].map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Present ARM No#</label>
          <select name="present_arm_no" value={formData.present_arm_no} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded">
            <option value="">Select ARM No#</option>
            {Array.from({ length: 12 }, (_, i) => i).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Present ARM Length (mtrs)</label>
          <select name="present_arm_length" value={formData.present_arm_length} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded">
            <option value="">Select Length</option>
            {[0, 1, 1.5, 2, 2.5].map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">How Many Lights in Pole</label>
          <select name="how_many_lights" value={formData.how_many_lights} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded">
            <option value="">Select Count</option>
            {Array.from({ length: 13 }, (_, i) => i).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Light Mounting Height</label>
          <select name="light_mounting_height" value={formData.light_mounting_height} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded">
            <option value="">Select Height</option>
            {['5', '6-7', '9', 'mini mast', 'high mast'].map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Light Type</label>
          <select name="light_type" value={formData.light_type} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded">
            <option value="">Select Type</option>
            {['bulb', 'cfl', 'lamp', 'led', 'tube light', 'mh400', 't5', 'svl', 'empty', 'mini mast', 'high mast'].map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Light Capacity</label>
          <select name="light_capacity" value={formData.light_capacity} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded">
            <option value="">Select Capacity</option>
            {['0W', '5W-25W', '40W', '65W', '90', '120', '150', '200', '250', '400'].map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Light Working Status</label>
          <select name="light_working_status" value={formData.light_working_status} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded">
            <option value="">Select Status</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Road Category</label>
          <select name="road_category" value={formData.road_category} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded">
            <option value="">Select Category</option>
            {['A1', 'A2', 'B1', 'B2', 'DTC', 'PARKS', 'SP'].map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Road Type</label>
          <select name="road_type" value={formData.road_type} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded">
            <option value="">Select Type</option>
            {['MAIN ROAD', 'SUB MAIN ROAD', 'RESIDENTIAL ROAD', 'GALLI ROAD'].map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Road Width (mtrs)</label>
          <select name="road_width" value={formData.road_width} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded">
            <option value="">Select Width</option>
            {[4, 5, 6, 7, 8, 9, 12, 16, 18, 24, 30].map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Pole Earthing Exists</label>
          <select name="pole_earthing_exists" value={formData.pole_earthing_exists} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded">
            <option value="">Select Earthing</option>
            <option value="YES">YES</option>
            <option value="NO">NO</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Photos</label>
          <FileUploader onUpload={() => {}} />
        </div>

        <button type="submit" className="w-full bg-primary text-white p-3 rounded-lg font-medium hover:bg-primary-dark transition-colors mt-4">
          Submit Pole
        </button>
      </div>
    </form>
  );
};

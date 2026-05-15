import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';
import { ArrowLeft, Lightbulb, Zap, Edit2, Save } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';

export const WardDetailsView = ({ projectId = 2, ulb, onBack }) => {
  const token = localStorage.getItem('token');
  const [selectedWard, setSelectedWard] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null); // { type: 'switch_point' | 'pole', data: ... }
  const queryClient = useQueryClient();

  const user = useAuthStore((state) => state.user);
  const canEdit = user?.role === 'MASTER_ADMIN' || user?.section_h;
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  const { data: wards = [], isLoading: isLoadingWards } = useQuery({
    queryKey: ['wardSummary', ulb.ulb_id],
    queryFn: async () => {
      const res = await axios.get(`https://govt-survey-backend-19218031051.asia-south1.run.app/api/v1/projects/${projectId}/pole-survey/summary/ulbs/${ulb.ulb_id}/wards`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.summary || [];
    },
  });

  const { data: details = [], isLoading: isLoadingDetails } = useQuery({
    queryKey: ['wardDetails', ulb.ulb_id, selectedWard],
    queryFn: async () => {
      if (!selectedWard) return [];
      const res = await axios.get(`https://govt-survey-backend-19218031051.asia-south1.run.app/api/v1/projects/${projectId}/pole-survey/summary/ulbs/${ulb.ulb_id}/wards/${selectedWard}/details`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.details || [];
    },
    enabled: !!selectedWard,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const endpoint = selectedDetail.type === 'switch_point'
        ? `https://govt-survey-backend-19218031051.asia-south1.run.app/api/v1/projects/${projectId}/pole-survey/switch-points/${selectedDetail.data.id}`
        : `https://govt-survey-backend-19218031051.asia-south1.run.app/api/v1/projects/${projectId}/pole-survey/poles/${selectedDetail.data.pole_id}`;
      
      const res = await axios.patch(endpoint, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['wardDetails']);
      alert('Changes saved successfully!');
      setIsEditing(false);
      setSelectedDetail(null);
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Error saving changes');
    }
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const renderField = (label, name, value, options = null) => {
    if (!isEditing) {
      return (
        <div>
          <p className="text-gray-500">{label}</p>
          <p className="font-medium">{value || 'N/A'}</p>
        </div>
      );
    }

    if (options) {
      return (
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <select
            name={name}
            value={formData[name] || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-xs"
          >
            <option value="">Select...</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <input
          type="text"
          name={name}
          value={formData[name] || ''}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-xs"
        />
      </div>
    );
  };

  // Group details by switch point
  const switchPoints = details.reduce((acc, item) => {
    const spId = item.switch_point_id;
    if (!acc[spId]) {
      acc[spId] = {
        id: item.switch_point_id,
        switch_point_number: item.switch_point_number,
        switch_point_type: item.switch_point_type,
        meter_exists: item.meter_exists,
        meter_type: item.meter_type,
        meter_rr_number: item.meter_rr_number,
        meter_serial_number: item.meter_serial_number,
        meter_condition: item.meter_condition,
        ward_number: item.ward_number,
        sp_confirmed_by_name: item.sp_confirmed_by_name,
        sp_confirmed_at: item.sp_confirmed_at,
        poles: [],
      };
    }
    if (item.pole_id) {
      acc[spId].poles.push(item);
    }
    return acc;
  }, {});

  return (
    <div className="premium-panel overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-100 p-5">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="rounded-full p-2 hover:bg-slate-100 transition">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-950">Ward Wise Summary</h2>
            <p className="text-sm text-slate-500">{ulb?.ulb_name || ulb?.name || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Ward List */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 p-5 border-b border-slate-100 bg-slate-50">
        {isLoadingWards ? (
          [...Array(8)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-white"></div>
          ))
        ) : (
          wards.map((ward) => (
            <button
              key={ward.ward_number}
              onClick={() => setSelectedWard(ward.ward_number)}
              className={`rounded-lg border p-3 text-center transition ${selectedWard === ward.ward_number ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`}
            >
              <p className="text-xs text-slate-500">Ward</p>
              <p className="text-lg font-bold">{ward.ward_number}</p>
              <p className="text-xs text-slate-500">{ward.total_poles} Poles</p>
            </button>
          ))
        )}
      </div>

      {/* Ward Details */}
      {!selectedWard ? (
        <div className="py-20 text-center text-slate-500">Select a ward to view details</div>
      ) : (
        <div className="p-5">
          {isLoadingDetails ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-100"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.values(switchPoints).map((sp) => (
                <div key={sp.id} className="rounded-lg border border-slate-150 overflow-hidden">
                  {/* Switch Point Header */}
                  <div className="bg-slate-50 p-4 border-b border-slate-150 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Switch Point</span>
                      <h3 className="text-base font-bold text-slate-950">SP #{sp.switch_point_number}</h3>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div><span className="text-slate-500">Type:</span> <span className="font-semibold text-slate-700">{sp.switch_point_type || 'N/A'}</span></div>
                      <div><span className="text-slate-500">Meter:</span> <span className="font-semibold text-slate-700">{sp.meter_exists ? 'Yes' : 'No'}</span></div>
                      <button 
                        onClick={() => {
                          setSelectedDetail({ type: 'switch_point', data: sp });
                          setFormData({ ...sp });
                          setIsEditing(false);
                        }}
                        className="font-semibold text-primary hover:text-primary-dark"
                      >
                        View Details
                      </button>
                    </div>
                  </div>

                  {/* Poles Table */}
                  <div className="overflow-x-auto">
                    <table className="premium-table text-sm">
                      <thead>
                        <tr>
                          <th>Pole No</th>
                          <th>Type</th>
                          <th>Condition</th>
                          <th>Light Type</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sp.poles.map((pole) => (
                          <tr key={pole.pole_id}>
                            <td className="font-semibold text-slate-950">{pole.pole_number}</td>
                            <td>{pole.pole_type}</td>
                            <td>{pole.pole_condition}</td>
                            <td>{pole.light_type}</td>
                            <td>
                              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${pole.light_working_status === 'yes' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                {pole.light_working_status === 'yes' ? 'Working' : 'Not Working'}
                              </span>
                            </td>
                            <td>
                              <button 
                                onClick={() => {
                                  setSelectedDetail({ type: 'pole', data: pole });
                                  setFormData({ ...pole });
                                  setIsEditing(false);
                                }}
                                className="font-semibold text-primary hover:text-primary-dark"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                        {sp.poles.length === 0 && (
                          <tr><td colSpan="6" className="text-center text-slate-500">No poles under this switch point.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {Object.values(switchPoints).length === 0 && (
                <div className="py-10 text-center text-slate-500">No switch points found in this ward.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-5xl rounded-lg bg-white p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedDetail.type === 'switch_point' ? 'Switch Point Details' : 'Pole Details'}
              </h3>
              <div className="flex items-center gap-4">
                {canEdit && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 text-primary hover:text-primary-dark font-medium text-sm"
                  >
                    <Edit2 size={16} />
                    <span>Edit</span>
                  </button>
                )}
                <button onClick={() => { setSelectedDetail(null); setIsEditing(false); }} className="text-gray-500 hover:text-gray-700">Close</button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6 text-sm flex-1 overflow-y-auto">
              {/* Left Side: Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-gray-500 text-xs">ULB</p>
                    <p className="font-medium">{ulb?.ulb_name || ulb?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Confirmed By</p>
                    <p className="font-medium">
                      {selectedDetail.type === 'switch_point' 
                        ? selectedDetail.data.sp_confirmed_by_name || 'N/A'
                        : selectedDetail.data.pole_confirmed_by_name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Confirmed At</p>
                    <p className="font-medium">
                      {selectedDetail.type === 'switch_point'
                        ? selectedDetail.data.sp_confirmed_at ? new Date(selectedDetail.data.sp_confirmed_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'
                        : selectedDetail.data.pole_confirmed_at ? new Date(selectedDetail.data.pole_confirmed_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-2 mt-2">
                  <p className="font-semibold text-gray-700 mb-2">Technical Details</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {selectedDetail.type === 'switch_point' ? (
                      <>
                        {renderField('Ward No', 'ward_number', selectedDetail.data.ward_number)}
                        {renderField('Switch Point No', 'switch_point_number', selectedDetail.data.switch_point_number)}
                        {renderField('Type', 'switch_point_type', selectedDetail.data.switch_point_type, ['DP', 'MCB', 'SWITCH', 'HOOK'])}
                        {renderField('Meter Exists', 'meter_exists', selectedDetail.data.meter_exists ? 'Yes' : 'No', ['YES', 'NO'])}
                        {renderField('Meter Type', 'meter_type', selectedDetail.data.meter_type, ['1P', '3P'])}
                        {renderField('RR Number', 'meter_rr_number', selectedDetail.data.meter_rr_number)}
                        {renderField('Serial Number', 'meter_serial_number', selectedDetail.data.meter_serial_number)}
                        {renderField('Meter Condition', 'meter_condition', selectedDetail.data.meter_condition, ['working', 'not working', 'missing'])}
                      </>
                    ) : (
                      <>
                        {renderField('Ward No', 'ward_number', selectedDetail.data.ward_number)}
                        {renderField('Switch Point No', 'switch_point_number', selectedDetail.data.switch_point_number)}
                        {renderField('Conductor Type', 'conductor_type', selectedDetail.data.conductor_type, ['ABC', 'ACSR', 'UG'])}
                        {renderField('Pole No', 'pole_number', selectedDetail.data.pole_number)}
                        {renderField('Pole Type', 'pole_type', selectedDetail.data.pole_type, ['Conical', 'Decorative', 'High Mast', 'Mini Mast', 'Octoganal', 'Post Top', 'PSC', 'RCC', 'Spun', 'Tubular'])}
                        {renderField('Height', 'pole_height_mtrs', selectedDetail.data.pole_height_mtrs, ['0', '4', '5', '6', '7', '8', '9', '12', '16', '18', '24', '30'])}
                        {renderField('Condition', 'pole_condition', selectedDetail.data.pole_condition, ['Good', 'defective', 'missing'])}
                        {renderField('Distance', 'pole_to_pole_distance_mtrs', selectedDetail.data.pole_to_pole_distance_mtrs)}
                        {renderField('ARM Type', 'arm_type', selectedDetail.data.arm_type, ['single', 'double', 'multiple', 'multiply', 'empty/not present'])}
                        {renderField('ARM Status', 'arm_status', selectedDetail.data.arm_status, ['new', 'old', 'deteriorated', 'missing', 'empty/not present'])}
                        {renderField('Present ARM No', 'present_arm_no', selectedDetail.data.present_arm_no, Array.from({length: 12}, (_, i) => String(i)))}
                        {renderField('Present ARM Length', 'present_arm_length_mtrs', selectedDetail.data.present_arm_length_mtrs, ['0', '1', '1.5', '2', '2.5'])}
                        {renderField('Lights Count', 'how_many_lights_in_pole', selectedDetail.data.how_many_lights_in_pole, Array.from({length: 13}, (_, i) => String(i)))}
                        {renderField('Mounting Height', 'light_mounting_height', selectedDetail.data.light_mounting_height, ['5', '6-7', '9', 'mini mast', 'high mast'])}
                        {renderField('Light Type', 'light_type', selectedDetail.data.light_type, ['bulb', 'cfl', 'lamp', 'led', 'tube light', 'mh400', 't5', 'svl', 'empty', 'mini mast', 'high mast'])}
                        {renderField('Capacity', 'light_capacity', selectedDetail.data.light_capacity, ['0W', '5W-25W', '40W', '65W', '90', '120', '150', '200', '250', '400'])}
                        {renderField('Working', 'light_working_status', selectedDetail.data.light_working_status, ['yes', 'no'])}
                        {renderField('Road Cat', 'road_category', selectedDetail.data.road_category, ['A1', 'A2', 'B1', 'B2', 'DTC', 'PARKS', 'SP'])}
                        {renderField('Road Type', 'road_type', selectedDetail.data.road_type, ['MAIN ROAD', 'SUB MAIN ROAD', 'RESIDENTIAL ROAD', 'GALLI ROAD'])}
                        {renderField('Road Width', 'road_width_mtrs', selectedDetail.data.road_width_mtrs, ['4', '5', '6', '7', '8', '9', '12', '16', '18', '24', '30'])}
                        {renderField('Earthing', 'pole_earthing_exists', selectedDetail.data.pole_earthing_exists, ['YES', 'NO'])}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side: Images */}
              <div className="space-y-2">
                <p className="font-semibold text-gray-700">Images</p>
                <div className="bg-gray-50 h-64 flex items-center justify-center text-gray-400 rounded-lg border-2 border-dashed border-gray-200">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4-4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="mt-1">Image Placeholder (Big)</p>
                  </div>
                </div>
              </div>
            </div>
              
            <div className="flex justify-end gap-2 mt-6 border-t pt-4">
              <button
                onClick={() => { setSelectedDetail(null); setIsEditing(false); }}
                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              {isEditing && (
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Save size={16} />
                  <span>{saveMutation.isLoading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

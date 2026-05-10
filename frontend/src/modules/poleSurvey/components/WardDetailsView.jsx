import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';

export const WardDetailsView = ({ ulb, onBack }) => {
  const token = localStorage.getItem('token');
  const [selectedWard, setSelectedWard] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null); // { type: 'switch_point' | 'pole', data: ... }

  const { data: wards = [], isLoading: isLoadingWards } = useQuery({
    queryKey: ['wardSummary', ulb.ulb_id],
    queryFn: async () => {
      const res = await axios.get(`http://10.73.182.200:3000/api/v1/projects/2/pole-survey/summary/ulbs/${ulb.ulb_id}/wards`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.summary || [];
    },
  });

  const { data: details = [], isLoading: isLoadingDetails } = useQuery({
    queryKey: ['wardDetails', ulb.ulb_id, selectedWard],
    queryFn: async () => {
      if (!selectedWard) return [];
      const res = await axios.get(`http://10.73.182.200:3000/api/v1/projects/2/pole-survey/summary/ulbs/${ulb.ulb_id}/wards/${selectedWard}/details`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.details || [];
    },
    enabled: !!selectedWard,
  });

  if (isLoadingWards) return <div className="text-gray-500">Loading wards...</div>;

  // Group details by switch point
  const switchPoints = details.reduce((acc, row) => {
    if (!acc[row.switch_point_id]) {
      acc[row.switch_point_id] = {
        id: row.switch_point_id,
        number: row.switch_point_number,
        type: row.switch_point_type,
        meter_exists: row.meter_exists,
        meter_type: row.meter_type,
        meter_condition: row.meter_condition,
        meter_rr_number: row.meter_rr_number,
        meter_serial_number: row.meter_serial_number,
        sp_confirmed_by_name: row.sp_confirmed_by_name,
        sp_confirmed_at: row.sp_confirmed_at,
        poles: [],
      };
    }
    if (row.pole_id) {
      acc[row.switch_point_id].poles.push(row);
    }
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">{ulb.ulb_name} - Ward Details</h2>
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">Back to Districts</button>
      </div>

      {/* Total Stats Card */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Total Switch Points</p>
            <p className="text-2xl font-bold text-gray-900">{wards.reduce((sum, w) => sum + parseInt(w.total_switch_points || 0), 0)}</p>
          </div>
          <div className="bg-blue-50 p-3 rounded-full">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Total Poles</p>
            <p className="text-2xl font-bold text-gray-900">{wards.reduce((sum, w) => sum + parseInt(w.total_poles || 0), 0)}</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-full">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {wards.map((ward) => (
          <div
            key={ward.ward_number}
            onClick={() => setSelectedWard(ward.ward_number)}
            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
              selectedWard === ward.ward_number
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 hover:border-primary/50'
            }`}
          >
            <h3 className="font-semibold text-gray-900">Ward No: {ward.ward_number}</h3>
            <p className="text-sm text-gray-500">Switch Points: {ward.total_switch_points}</p>
            <p className="text-sm text-gray-500">Poles: {ward.total_poles}</p>
          </div>
        ))}
      </div>

      {selectedWard && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Ward {selectedWard} Details</h3>
            <div className="flex gap-4 text-sm text-gray-500">
              <span>Total Switch Points: {Object.keys(switchPoints).length}</span>
              <span>Total Poles: {details.filter(d => d.pole_id).length}</span>
            </div>
          </div>
          
          {isLoadingDetails ? (
            <div className="text-gray-500">Loading details...</div>
          ) : (
            <div className="space-y-4">
              {Object.values(switchPoints).map((sp) => (
                <div key={sp.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 p-4 flex justify-between items-center">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">Switch Point No: {sp.number}</span>
                      <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded">{sp.type}</span>
                      <button 
                        onClick={() => setSelectedDetail({ type: 'switch_point', data: sp })}
                        className="ml-4 text-xs text-primary hover:underline"
                      >
                        View Full Details
                      </button>
                    </div>
                    <span className="text-sm text-gray-500">{sp.poles.length} Poles</span>
                  </div>
                  
                  <div className="p-4">
                    <table className="w-full text-xs text-left text-gray-500">
                      <thead className="text-gray-700 uppercase bg-gray-50">
                        <tr>
                          <th className="px-2 py-1">Pole No</th>
                          <th className="px-2 py-1">Type</th>
                          <th className="px-2 py-1">Condition</th>
                          <th className="px-2 py-1">Light Type</th>
                          <th className="px-2 py-1">Status</th>
                          <th className="px-2 py-1">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sp.poles.map((pole) => (
                          <tr key={pole.pole_id} className="border-b">
                            <td className="px-2 py-1 font-medium text-gray-900">{pole.pole_number}</td>
                            <td className="px-2 py-1">{pole.pole_type}</td>
                            <td className="px-2 py-1">{pole.pole_condition}</td>
                            <td className="px-2 py-1">{pole.light_type}</td>
                            <td className="px-2 py-1">
                              <span className={`px-1 rounded ${pole.light_working_status === 'yes' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {pole.light_working_status === 'yes' ? 'Working' : 'Not Working'}
                              </span>
                            </td>
                            <td className="px-2 py-1">
                              <button 
                                onClick={() => setSelectedDetail({ type: 'pole', data: pole })}
                                className="text-primary hover:underline"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                        {sp.poles.length === 0 && (
                          <tr><td colSpan="6" className="px-2 py-1 text-center text-gray-500">No poles under this switch point.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {Object.values(switchPoints).length === 0 && (
                <div className="text-gray-500 text-center py-10">No switch points found in this ward.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-4xl w-full mx-4" style={{ maxWidth: '800px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedDetail.type === 'switch_point' ? 'Switch Point Details' : 'Pole Details'}
              </h3>
              <button onClick={() => setSelectedDetail(null)} className="text-gray-500 hover:text-gray-700">Close</button>
            </div>
            
            <div className="grid grid-cols-2 gap-6 text-sm">
              {/* Left Side: Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
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
                        ? selectedDetail.data.sp_confirmed_at ? new Date(selectedDetail.data.sp_confirmed_at).toLocaleString() : 'N/A'
                        : selectedDetail.data.pole_confirmed_at ? new Date(selectedDetail.data.pole_confirmed_at).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-2 mt-2">
                  <p className="font-semibold text-gray-700 mb-2">Technical Details</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {selectedDetail.type === 'switch_point' ? (
                      <>
                        <div><p className="text-gray-500">Ward No</p><p className="font-medium">{selectedDetail.data.ward_number}</p></div>
                        <div><p className="text-gray-500">Switch Point No</p><p className="font-medium">{selectedDetail.data.number}</p></div>
                        <div><p className="text-gray-500">Type</p><p className="font-medium">{selectedDetail.data.type}</p></div>
                        <div><p className="text-gray-500">Meter Exists</p><p className="font-medium">{selectedDetail.data.meter_exists ? 'Yes' : 'No'}</p></div>
                        <div><p className="text-gray-500">Meter Type</p><p className="font-medium">{selectedDetail.data.meter_type}</p></div>
                        <div><p className="text-gray-500">RR Number</p><p className="font-medium">{selectedDetail.data.meter_rr_number}</p></div>
                        <div><p className="text-gray-500">Serial Number</p><p className="font-medium">{selectedDetail.data.meter_serial_number}</p></div>
                        <div><p className="text-gray-500">Meter Condition</p><p className="font-medium">{selectedDetail.data.meter_condition}</p></div>
                      </>
                    ) : (
                      <>
                        <div><p className="text-gray-500">Ward No</p><p className="font-medium">{selectedDetail.data.ward_number}</p></div>
                        <div><p className="text-gray-500">Switch Point No</p><p className="font-medium">{selectedDetail.data.switch_point_number}</p></div>
                        <div><p className="text-gray-500">Conductor Type</p><p className="font-medium">{selectedDetail.data.conductor_type}</p></div>
                        <div><p className="text-gray-500">Pole No</p><p className="font-medium">{selectedDetail.data.pole_number}</p></div>
                        <div><p className="text-gray-500">Pole Type</p><p className="font-medium">{selectedDetail.data.pole_type}</p></div>
                        <div><p className="text-gray-500">Height</p><p className="font-medium">{selectedDetail.data.pole_height_mtrs}m</p></div>
                        <div><p className="text-gray-500">Condition</p><p className="font-medium">{selectedDetail.data.pole_condition}</p></div>
                        <div><p className="text-gray-500">Distance</p><p className="font-medium">{selectedDetail.data.pole_to_pole_distance_mtrs}m</p></div>
                        <div><p className="text-gray-500">ARM Type</p><p className="font-medium">{selectedDetail.data.arm_type}</p></div>
                        <div><p className="text-gray-500">ARM Status</p><p className="font-medium">{selectedDetail.data.arm_status}</p></div>
                        <div><p className="text-gray-500">Present ARM No</p><p className="font-medium">{selectedDetail.data.present_arm_no}</p></div>
                        <div><p className="text-gray-500">ARM Length</p><p className="font-medium">{selectedDetail.data.present_arm_length_mtrs}m</p></div>
                        <div><p className="text-gray-500">Lights Count</p><p className="font-medium">{selectedDetail.data.how_many_lights_in_pole}</p></div>
                        <div><p className="text-gray-500">Mounting Height</p><p className="font-medium">{selectedDetail.data.light_mounting_height}</p></div>
                        <div><p className="text-gray-500">Light Type</p><p className="font-medium">{selectedDetail.data.light_type}</p></div>
                        <div><p className="text-gray-500">Capacity</p><p className="font-medium">{selectedDetail.data.light_capacity}</p></div>
                        <div><p className="text-gray-500">Working</p><p className="font-medium">{selectedDetail.data.light_working_status}</p></div>
                        <div><p className="text-gray-500">Road Cat</p><p className="font-medium">{selectedDetail.data.road_category}</p></div>
                        <div><p className="text-gray-500">Road Type</p><p className="font-medium">{selectedDetail.data.road_type}</p></div>
                        <div><p className="text-gray-500">Road Width</p><p className="font-medium">{selectedDetail.data.road_width_mtrs}m</p></div>
                        <div><p className="text-gray-500">Earthing</p><p className="font-medium">{selectedDetail.data.pole_earthing_exists}</p></div>
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
                    <p className="mt-1">Image Placeholder</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

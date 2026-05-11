import { useState } from 'react';
import { useSummary } from '../../../shared/hooks/useSummary';

export const SummaryView = ({ projectId = 2, date = null, onViewDetails, hideZeroCounts = false }) => {
  const token = localStorage.getItem('token');
  const [selectedFilter, setSelectedFilter] = useState('today');
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);

  let effectiveDate = null;
  let mode = 'exact';
  
  if (selectedFilter === 'today') {
    effectiveDate = date;
  } else if (selectedFilter === 'till_yesterday') {
    effectiveDate = 'till_yesterday';
  } else if (selectedFilter === 'till_date') {
    effectiveDate = customDate;
    mode = 'cumulative';
  }

  const { data: summary = [], isLoading } = useSummary(projectId, effectiveDate, mode);

  if (isLoading) return <div className="text-gray-500">Loading summary...</div>;

  // Group by district
  const districts = summary.reduce((acc, row) => {
    if (!acc[row.district_id]) {
      acc[row.district_id] = {
        id: row.district_id,
        name: row.district_name,
        ulbs: [],
        total_switch_points: 0,
        total_poles: 0,
      };
    }
    acc[row.district_id].ulbs.push(row);
    acc[row.district_id].total_switch_points += parseInt(row.total_switch_points || 0);
    acc[row.district_id].total_poles += parseInt(row.total_poles || 0);
    return acc;
  }, {});
  const filteredDistricts = Object.values(districts).filter(d => 
    !hideZeroCounts || d.total_switch_points > 0 || d.total_poles > 0
  ).map(d => ({
    ...d,
    ulbs: d.ulbs.filter(u => !hideZeroCounts || parseInt(u.total_switch_points) > 0 || parseInt(u.total_poles) > 0)
  })).filter(d => !hideZeroCounts || d.ulbs.length > 0);


  const totalSwitchPoints = summary.reduce((sum, row) => sum + parseInt(row.total_switch_points || 0), 0);
  const totalPoles = summary.reduce((sum, row) => sum + parseInt(row.total_poles || 0), 0);

  return (
    <div className="space-y-6">
      {date && (
        <div className="flex justify-end gap-2 items-center">
          <select 
            value={selectedFilter} 
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="p-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white shadow-sm"
          >
            <option value="today">Today</option>
            <option value="till_yesterday">Till Yesterday</option>
            <option value="till_date">Till Date</option>
          </select>
          
          {selectedFilter === 'till_date' && (
            <input 
              type="date" 
              value={customDate} 
              onChange={(e) => setCustomDate(e.target.value)}
              className="p-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white shadow-sm"
            />
          )}
        </div>
      )}
      {/* Total Stats Card */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Total Switch Points</p>
            <p className="text-2xl font-bold text-gray-900">{totalSwitchPoints}</p>
          </div>
          <div className="bg-blue-50 p-3 rounded-full">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Total Poles</p>
            <p className="text-2xl font-bold text-gray-900">{totalPoles}</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-full">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          </div>
        </div>
      </div>

      {filteredDistricts.map((district) => (
        <div key={district.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {district.name.toUpperCase().replace(' DISTRICT', '')} DISTRICT
            </h2>
            <div className="flex gap-4">
              <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg text-center min-w-[120px]">
                <p className="text-xs text-blue-600 font-medium">Switch Points</p>
                <p className="text-lg font-bold text-blue-800">{district.total_switch_points}</p>
              </div>
              <div className="bg-purple-50 border border-purple-100 px-4 py-2 rounded-lg text-center min-w-[120px]">
                <p className="text-xs text-purple-600 font-medium">Total Poles</p>
                <p className="text-lg font-bold text-purple-800">{district.total_poles}</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-2">TMC/CMC</th>
                  <th className="px-4 py-2">Total Switch Points</th>
                  <th className="px-4 py-2">Total Poles</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {district.ulbs.map((ulb) => (
                  <tr key={ulb.ulb_id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">{ulb.ulb_name}</td>
                    <td className="px-4 py-2">{ulb.total_switch_points}</td>
                    <td className="px-4 py-2">{ulb.total_poles}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => onViewDetails(ulb)}
                        className="text-primary hover:underline font-medium"
                      >
                        View Full Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {Object.values(districts).length === 0 && (
        <div className="text-gray-500 text-center py-10">No data found for this period.</div>
      )}
    </div>
  );
};

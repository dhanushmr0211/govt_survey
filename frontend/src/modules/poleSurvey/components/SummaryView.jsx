import { useState } from 'react';
import { useSummary } from '../../../shared/hooks/useSummary';
import { Zap, Lightbulb, ArrowUpRight } from 'lucide-react';
import { getLocalDateString } from '../../../shared/utils/date';
import { useAuthStore } from '../../../store/authStore';
import { isTgpl2Project, isTgplProject } from '../../../shared/utils/projectType';

export const SummaryView = ({ projectId, date = null, onViewDetails, hideZeroCounts = false }) => {
  const activeProject = useAuthStore((state) => state.activeProject);
  const isTgpl = isTgplProject(projectId, activeProject);
  const isTgpl2 = isTgpl2Project(projectId, activeProject);

  const [selectedFilter, setSelectedFilter] = useState('today');
  const today = getLocalDateString();
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  let effectiveDate = null;
  let mode = 'exact';
  let effectiveFromDate = null;
  let effectiveToDate = null;
  
  if (selectedFilter === 'today') {
    effectiveDate = date;
  } else if (selectedFilter === 'till_yesterday') {
    effectiveDate = 'till_yesterday';
  } else if (selectedFilter === 'till_date') {
    effectiveFromDate = fromDate;
    effectiveToDate = toDate;
  }

  const { data: summary = [], isLoading } = useSummary(projectId, effectiveDate, mode, effectiveFromDate, effectiveToDate);

  if (isLoading) return <div className="premium-panel p-8 text-slate-500">Loading summary...</div>;

  // Group by district / ward
  const districts = summary.reduce((acc, row) => {
    const districtId = row.district_id ?? row.ward_id ?? row.id ?? row.ward_name ?? 'unknown';
    const districtName = row.district_name ?? row.ward_name ?? 'Ward';

    if (!acc[districtId]) {
      acc[districtId] = {
        id: districtId,
        name: districtName,
        ulbs: [],
        total_ccms: 0,
        total_switch_points: 0,
        total_poles: 0,
        total_survey_poles: 0,
        total_inst_poles: 0,
      };
    }
    acc[districtId].ulbs.push(row);
    acc[districtId].total_ccms += parseInt(row.total_ccms || 0);
    acc[districtId].total_switch_points += parseInt(row.total_switch_points || 0);
    acc[districtId].total_poles += parseInt(row.total_poles || 0);
    acc[districtId].total_survey_poles += parseInt(row.total_survey_poles || 0);
    acc[districtId].total_inst_poles += parseInt(row.total_inst_poles || 0);
    return acc;
  }, {});
  const filteredDistricts = Object.values(districts).filter(d => 
    !hideZeroCounts || d.total_ccms > 0 || d.total_switch_points > 0 || d.total_poles > 0 || d.total_survey_poles > 0 || d.total_inst_poles > 0
  ).map(d => ({
    ...d,
    ulbs: d.ulbs.filter(u => !hideZeroCounts || parseInt(u.total_ccms || u.total_ccms_units || 0) > 0 || parseInt(u.total_switch_points || 0) > 0 || parseInt(u.total_poles || 0) > 0 || parseInt(u.total_survey_poles || 0) > 0 || parseInt(u.total_inst_poles || 0) > 0)
  })).filter(d => !hideZeroCounts || d.ulbs.length > 0);

  const totalCCMS = summary.reduce((sum, row) => sum + parseInt(row.total_ccms || 0), 0);
  const totalSwitchPoints = summary.reduce((sum, row) => sum + parseInt(row.total_switch_points || 0), 0);
  const totalPoles = summary.reduce((sum, row) => sum + parseInt(row.total_poles || 0), 0);
  const totalSurveyPoles = summary.reduce((sum, row) => sum + parseInt(row.total_survey_poles || 0), 0);
  const totalInstPoles = summary.reduce((sum, row) => sum + parseInt(row.total_inst_poles || 0), 0);

  return (
    <div className="space-y-5">
      {date && (
        <div className="premium-panel flex flex-wrap justify-end gap-2 p-3">
          <select 
            value={selectedFilter} 
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
          >
            <option value="today">Today</option>
            <option value="till_yesterday">Till Yesterday</option>
            <option value="till_date">Till Date</option>
          </select>
          
          {selectedFilter === 'till_date' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-col">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">From</label>
                <input 
                  type="date" 
                  value={fromDate} 
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">To</label>
                <input 
                  type="date" 
                  value={toDate} 
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
                />
              </div>
            </div>
          )}
        </div>
      )}
      {/* Total Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isTgpl2 ? (
          <>
            <div className="premium-panel flex items-center justify-between p-5">
              <div>
                <p className="text-sm font-medium text-slate-500">Total CCMS Units</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{totalCCMS}</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3 text-blue-700">
                <Zap size={26} />
              </div>
            </div>
            <div className="premium-panel flex items-center justify-between p-5">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Switch Points</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{totalSwitchPoints}</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3 text-amber-700">
                <Lightbulb size={26} />
              </div>
            </div>
            <div className="premium-panel flex items-center justify-between p-5 md:col-span-2">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Poles</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{totalPoles}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3 text-emerald-700">
                <Lightbulb size={26} />
              </div>
            </div>
          </>
        ) : !isTgpl ? (
          <>
            <div className="premium-panel flex items-center justify-between p-5">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Switch Points</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{totalSwitchPoints}</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3 text-blue-700">
                <Zap size={26} />
              </div>
            </div>
            <div className="premium-panel flex items-center justify-between p-5">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Poles</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{totalPoles}</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3 text-amber-700">
                <Lightbulb size={26} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="premium-panel flex items-center justify-between p-5">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Installation Count</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{totalInstPoles}</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3 text-blue-700">
                <Zap size={26} />
              </div>
            </div>
            <div className="premium-panel flex items-center justify-between p-5">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Poles</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{totalPoles}</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3 text-amber-700">
                <Lightbulb size={26} />
              </div>
            </div>
          </>
        )}
      </div>

      {filteredDistricts.map((district) => (
        <div key={district.id} className="premium-panel overflow-hidden">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center">
            <h2 className="text-lg font-bold text-slate-950">
              {isTgpl2
                ? (typeof district?.name === 'string' ? district.name : 'Ward').toUpperCase()
                : `${(typeof district?.name === 'string' ? district.name.toUpperCase().replace(' DISTRICT', '') : 'DISTRICT')} DISTRICT`}
            </h2>
            <div className="flex flex-wrap gap-3">
              {isTgpl2 ? (
                <>
                  <div className="min-w-[130px] rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-center">
                    <p className="text-xs font-semibold text-blue-700">CCMS Units</p>
                    <p className="text-xl font-bold text-blue-900">{district.total_ccms}</p>
                  </div>
                  <div className="min-w-[130px] rounded-lg border border-violet-100 bg-violet-50 px-4 py-2 text-center">
                    <p className="text-xs font-semibold text-violet-700">Switch Points</p>
                    <p className="text-xl font-bold text-violet-900">{district.total_switch_points}</p>
                  </div>
                  <div className="min-w-[130px] rounded-lg border border-amber-100 bg-amber-50 px-4 py-2 text-center">
                    <p className="text-xs font-semibold text-amber-700">Total Poles</p>
                    <p className="text-xl font-bold text-amber-900">{district.total_poles}</p>
                  </div>
                </>
              ) : !isTgpl ? (
                <>
                  <div className="min-w-[130px] rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-center">
                    <p className="text-xs font-semibold text-blue-700">Switch Points</p>
                    <p className="text-xl font-bold text-blue-900">{district.total_switch_points}</p>
                  </div>
                  <div className="min-w-[130px] rounded-lg border border-amber-100 bg-amber-50 px-4 py-2 text-center">
                    <p className="text-xs font-semibold text-amber-700">Total Poles</p>
                    <p className="text-xl font-bold text-amber-900">{district.total_poles}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="min-w-[130px] rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-center">
                    <p className="text-xs font-semibold text-blue-700">Installation Count</p>
                    <p className="text-xl font-bold text-blue-900">{district.total_inst_poles}</p>
                  </div>
                  <div className="min-w-[130px] rounded-lg border border-amber-100 bg-amber-50 px-4 py-2 text-center">
                    <p className="text-xs font-semibold text-amber-700">Total Poles</p>
                    <p className="text-xl font-bold text-amber-900">{district.total_poles}</p>
                  </div>
                </>
              )}
            </div>
          </div>
          {!isTgpl && !isTgpl2 ? (
            <div className="overflow-x-auto p-2 sm:p-4">
              <table className="w-full min-w-full divide-y divide-gray-100">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">TMC/CMC</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">TOTAL SWITCH POINTS</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">TOTAL POLES</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {district.ulbs.map((ulb) => (
                    <tr key={ulb.ulb_id ?? ulb.id ?? ulb.ulb_name} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 text-sm font-semibold text-slate-900">{String(ulb.ulb_name || 'N/A')}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{Number(ulb.total_switch_points || 0)}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{Number(ulb.total_poles || 0)}</td>
                      <td className="px-4 py-4 text-sm">
                        <button
                          onClick={() => onViewDetails(ulb, { date: effectiveDate, mode, fromDate: effectiveFromDate, toDate: effectiveToDate })}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-red-500 hover:text-red-700 transition-colors"
                        >
                          View Full Details <ArrowUpRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto p-2 sm:p-4">
              <table className="w-full min-w-full divide-y divide-gray-100">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">WARD / ULB</th>
                    {isTgpl2 ? (
                      <>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">CCMS UNITS</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">SWITCH POINTS</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">TOTAL POLES</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">INSTALLATION COUNT</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">TOTAL POLES</th>
                      </>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {district.ulbs.map((ulb) => (
                    <tr key={ulb.ulb_id ?? ulb.id ?? ulb.ulb_name} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 text-sm font-semibold text-slate-900">{String(ulb.ulb_name || 'N/A')}</td>
                      {isTgpl2 ? (
                        <>
                          <td className="px-4 py-4 text-sm text-slate-600">{Number(ulb.total_ccms || 0)}</td>
                          <td className="px-4 py-4 text-sm text-slate-600">{Number(ulb.total_switch_points || 0)}</td>
                          <td className="px-4 py-4 text-sm text-slate-600">{Number(ulb.total_poles || 0)}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-4 text-sm text-slate-600">{Number(ulb.total_inst_poles || 0)}</td>
                          <td className="px-4 py-4 text-sm text-slate-600">{Number(ulb.total_poles || 0)}</td>
                        </>
                      )}
                      <td className="px-4 py-4 text-sm">
                        <button
                          onClick={() => onViewDetails(ulb, { date: effectiveDate, mode, fromDate: effectiveFromDate, toDate: effectiveToDate })}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-red-500 hover:text-red-700 transition-colors"
                        >
                          View Full Details <ArrowUpRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
      {Object.values(districts).length === 0 && (
        <div className="premium-panel py-12 text-center text-slate-500">No data found for this period.</div>
      )}
    </div>
  );
};

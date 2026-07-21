import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import { useEmployeeTracking } from '../shared/hooks/useEmployeeTracking';
import { useAdminTracking } from '../shared/hooks/useAdminTracking';
import { useMobileUserTracking } from '../shared/hooks/useMobileUserTracking';
import { getLocalDateString } from '../shared/utils/date';
import { PoleInspectModal } from '../modules/poleSurvey/components/PoleInspectModal';
import { SwitchPointInspectModal } from '../modules/poleSurvey/components/SwitchPointInspectModal';

export function AdminTrackingView({ projectId }) {
  const { data: tracking = [], isLoading } = useAdminTracking(projectId);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const today = getLocalDateString();
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const isTgpl = String(projectId) === '3';

  const [downloading, setDownloading] = useState(false);

  const handleDownloadEmpReport = async (empId, empName) => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const surveyPath = isTgpl ? 'tgpl-survey' : 'pole-survey';
      let url = `${API_BASE_URL}/projects/${projectId}/${surveyPath}/report/download?confirmedBy=${empId}`;
      if (fromDate) url += `&fromDate=${encodeURIComponent(fromDate)}`;
      if (toDate) url += `&toDate=${encodeURIComponent(toDate)}`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      const safeName = (empName || 'employee').replace(/\s+/g, '_');
      link.download = `report_${safeName}_${fromDate || 'from'}_${toDate || 'to'}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('Failed to download report:', err);
      alert(err.response?.data?.message || 'Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading tracking data...</div>;

  if (selectedEmp) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Tracking for {selectedEmp.name}</h2>
          <button onClick={() => setSelectedEmp(null)} className="text-sm text-primary hover:text-primary/80 font-bold">← Back to List</button>
        </div>

        <div className="mb-4 flex flex-wrap gap-3 items-end rounded-lg border border-slate-100 bg-slate-50 p-3">
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
          <button
            onClick={() => handleDownloadEmpReport(selectedEmp.id, selectedEmp.name)}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white px-4 py-2 text-sm font-semibold shadow-sm transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {downloading ? 'Downloading...' : 'Download Report'}
          </button>
        </div>

        <UserSubmissionsList projectId={projectId} confirmedBy={selectedEmp.id} status="CONFIRMED" fromDate={fromDate} toDate={toDate} dateField="confirmed_at" />
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Performance Tracking</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
              {!isTgpl ? (
                <>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Switch Points</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Poles</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Total Switch Points</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Total Poles</th>
                </>
              ) : (
                <>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Survey</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Inst</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Total Survey</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Total Inst</th>
                </>
              )}
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tracking.map((emp) => (
              <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{emp.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{emp.email}</td>
                {!isTgpl ? (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{emp.today_sp_resolved}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{emp.today_poles_resolved}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{emp.total_sp_resolved}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{emp.total_poles_resolved}</td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{emp.today_survey_resolved}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{emp.today_inst_resolved}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{emp.total_survey_resolved}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{emp.total_inst_resolved}</td>
                  </>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    onClick={() => {
                      setSelectedEmp(emp);
                      setFromDate(today);
                      setToDate(today);
                    }}
                    className="text-primary hover:text-primary/80 font-bold underline"
                  >
                    View Submissions
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function EmployeeTrackingView({ projectId }) {
  const { data: tracking = [], isLoading } = useEmployeeTracking(projectId);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const today = getLocalDateString();
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const isTgpl = String(projectId) === '3';

  const [downloading, setDownloading] = useState(false);

  const handleDownloadEmpReport = async (empId, empName) => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const surveyPath = isTgpl ? 'tgpl-survey' : 'pole-survey';
      let url = `${API_BASE_URL}/projects/${projectId}/${surveyPath}/report/download?confirmedBy=${empId}`;
      if (fromDate) url += `&fromDate=${encodeURIComponent(fromDate)}`;
      if (toDate) url += `&toDate=${encodeURIComponent(toDate)}`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      const safeName = (empName || 'employee').replace(/\s+/g, '_');
      link.download = `report_${safeName}_${fromDate || 'from'}_${toDate || 'to'}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('Failed to download report:', err);
      alert(err.response?.data?.message || 'Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading tracking data...</div>;

  if (selectedEmp) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Tracking for {selectedEmp.name}</h2>
          <button onClick={() => setSelectedEmp(null)} className="text-sm text-primary hover:text-primary/80 font-bold">← Back to List</button>
        </div>

        <div className="mb-4 flex flex-wrap gap-3 items-end rounded-lg border border-slate-100 bg-slate-50 p-3">
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
          <button
            onClick={() => handleDownloadEmpReport(selectedEmp.id, selectedEmp.name)}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white px-4 py-2 text-sm font-semibold shadow-sm transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {downloading ? 'Downloading...' : 'Download Report'}
          </button>
        </div>

        <UserSubmissionsList projectId={projectId} confirmedBy={selectedEmp.id} status="CONFIRMED" fromDate={fromDate} toDate={toDate} dateField="confirmed_at" />
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Employee Performance Tracking</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
              {!isTgpl ? (
                <>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Switch Points</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Poles</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Total Switch Points</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Total Poles</th>
                </>
              ) : (
                <>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Survey</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Inst</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Total Survey</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Total Inst</th>
                </>
              )}
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tracking.map((emp) => (
              <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{emp.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{emp.email}</td>
                {!isTgpl ? (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{emp.today_sp_resolved}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{emp.today_poles_resolved}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{emp.total_sp_resolved}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{emp.total_poles_resolved}</td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{emp.today_survey_resolved}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{emp.today_inst_resolved}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{emp.total_survey_resolved}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{emp.total_inst_resolved}</td>
                  </>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    onClick={() => {
                      setSelectedEmp(emp);
                      setFromDate(today);
                      setToDate(today);
                    }}
                    className="text-primary hover:text-primary/80 font-bold underline"
                  >
                    View Submissions
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MobileUserTrackingView({ projectId }) {
  const { data: tracking = [], isLoading } = useMobileUserTracking(projectId);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const today = getLocalDateString();
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const isTgpl = String(projectId) === '3';

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading tracking data...</div>;

  if (selectedUser) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Tracking for {selectedUser.name}</h2>
          <button onClick={() => setSelectedUser(null)} className="text-sm text-primary hover:text-primary/80 font-bold">← Back to List</button>
        </div>
        
        <div className="flex space-x-4 mb-4 border-b border-gray-100">
          <button
            onClick={() => {
              setActiveTab('pending');
              setFromDate(today);
              setToDate(today);
            }}
            className={`pb-2 text-sm font-medium ${activeTab === 'pending' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Pending
          </button>
          <button
            onClick={() => {
              setActiveTab('confirmed');
              setFromDate(today);
              setToDate(today);
            }}
            className={`pb-2 text-sm font-medium ${activeTab === 'confirmed' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Confirmed
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
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

        {activeTab === 'pending' && (
          <UserSubmissionsList projectId={projectId} userId={selectedUser.id} status="PENDING" fromDate={fromDate} toDate={toDate} dateField="created_at" />
        )}
        {activeTab === 'confirmed' && (
          <UserSubmissionsList projectId={projectId} userId={selectedUser.id} status="CONFIRMED" fromDate={fromDate} toDate={toDate} dateField="confirmed_at" />
        )}
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Mobile User Activity Tracking</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
              {!isTgpl ? (
                <>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Switch Points</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Poles</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Overall Switch Points</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Overall Poles</th>
                </>
              ) : (
                <>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Survey</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Inst</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Overall Survey</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Overall Inst</th>
                </>
              )}
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tracking.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{user.email}</td>
                {!isTgpl ? (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{user.today_sp}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{user.today_poles}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{user.total_sp}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{user.total_poles}</td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{user.today_survey}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{user.today_inst}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{user.total_survey}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{user.total_inst}</td>
                  </>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    onClick={() => {
                      setSelectedUser(user);
                      setActiveTab('pending');
                      setFromDate(today);
                      setToDate(today);
                    }}
                    className="text-primary hover:text-primary/80 font-bold underline"
                  >
                    View Submissions
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserSubmissionsList({ projectId, userId, confirmedBy, status, fromDate = null, toDate = null, dateField = 'created_at' }) {
  const token = localStorage.getItem('token');
  const queryClient = useQueryClient();
  const endpoint = status === 'PENDING' ? 'queue/pending' : 'queue/confirmed';
  const [selectedSub, setSelectedSub] = useState(null);
  const [images, setImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [activeType, setActiveType] = useState('all');
  const [activeSurveyType, setActiveSurveyType] = useState('survey');
  const [page, setPage] = useState(1);
  const limit = 50;
  const isTgpl = String(projectId) === '3';

  // Reset page when key filters change
  useEffect(() => {
    setPage(1);
  }, [projectId, userId, confirmedBy, status, fromDate, toDate, activeType, activeSurveyType]);
  
  const { data, isLoading } = useQuery({
    queryKey: ['user-submissions', projectId, userId, confirmedBy, status, fromDate, toDate, dateField, activeType, activeSurveyType, page],
    queryFn: async () => {
      let url = `${API_BASE_URL}/projects/${projectId}/pole-survey/${endpoint}`;
      let params = [];
      if (userId) params.push(`userId=${userId}`);
      if (confirmedBy) params.push(`confirmedBy=${confirmedBy}`);
      if (fromDate) params.push(`fromDate=${fromDate}`);
      if (toDate) params.push(`toDate=${toDate}`);
      if (dateField) params.push(`dateField=${dateField}`);
      if (activeType && activeType !== 'all') params.push(`type=${activeType}`);
      if (isTgpl && activeSurveyType) params.push(`surveyType=${activeSurveyType}`);
      params.push(`page=${page}`);
      params.push(`limit=${limit}`);
      if (params.length > 0) url += `?${params.join('&')}`;
      
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    }
  });
  
  // Keep selectedSub in sync with the updated data in the query to prevent resetting to old values
  useEffect(() => {
    if (selectedSub && data?.queue) {
      const latest = data.queue.find(item => item.id === selectedSub.id && item.type === selectedSub.type);
      if (latest && latest !== selectedSub) {
        setSelectedSub(latest);
      }
    }
  }, [data, selectedSub]);

  useEffect(() => {
    const fetchImages = async () => {
      if (!selectedSub) {
        setImages([]);
        return;
      }

      setLoadingImages(true);
      try {
        const res = await axios.get(
          `${API_BASE_URL}/projects/${projectId}/pole-survey/files?entity_type=${selectedSub.type}&entity_id=${selectedSub.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setImages(res.data.files || []);
      } catch (err) {
        console.error('Failed to fetch submission images:', err);
        setImages([]);
      } finally {
        setLoadingImages(false);
      }
    };

    fetchImages();
  }, [selectedSub, projectId, token]);

  if (isLoading) return <div className="p-4 text-center text-slate-400">Loading submissions...</div>;

  const submissions = data?.queue || [];

  return (
    <div className="mt-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-md font-medium text-gray-900">{status} Submissions ({data?.total || 0})</h3>
        
        {/* Type Filter Tabs */}
        {!isTgpl ? (
          <div className="inline-flex rounded-lg bg-slate-100 p-1 self-start sm:self-auto">
            <button
              className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${activeType === 'all' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              onClick={() => setActiveType('all')}
            >
              All
            </button>
            <button
              className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${activeType === 'switch_point' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              onClick={() => setActiveType('switch_point')}
            >
              Switch Points
            </button>
            <button
              className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${activeType === 'pole' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              onClick={() => setActiveType('pole')}
            >
              Poles
            </button>
          </div>
        ) : (
          <div className="inline-flex rounded-lg bg-slate-100 p-1 self-start sm:self-auto">
            <button
              className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${activeSurveyType === 'survey' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              onClick={() => setActiveSurveyType('survey')}
            >
              Survey
            </button>
            <button
              className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${activeSurveyType === 'installation' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              onClick={() => setActiveSurveyType('installation')}
            >
              Installation
            </button>
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-slate-50">
              {!isTgpl && <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>}
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Identifier</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ward</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ULB Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {submissions.map((sub, i) => {
              const displayDate = status === 'CONFIRMED' ? sub.confirmed_at : sub.created_at;
              return (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  {!isTgpl && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${sub.type === 'switch_point' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {sub.type === 'switch_point' ? 'Switch' : 'Pole'}
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {displayDate ? new Date(displayDate).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {displayDate ? new Date(displayDate).toLocaleTimeString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{sub.pole_number || sub.identifier || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sub.ward_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{sub.ulb_name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                    <button onClick={() => setSelectedSub(sub)} className="text-primary hover:text-primary/80">INSPECT</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {submissions.length > 0 && (
        <div className="flex items-center justify-between border-t border-slate-100 bg-white p-4 mt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className={`rounded-md border px-4 py-2 text-sm font-semibold ${page === 1 ? 'cursor-not-allowed bg-slate-50 text-slate-400' : 'text-slate-700 hover:bg-slate-50'}`}
          >
            Previous
          </button>
          <span className="text-sm text-slate-600">
            Page <span className="font-semibold text-slate-950">{page}</span> of <span className="font-semibold text-slate-950">{Math.ceil((data?.total || 0) / limit) || 1}</span> ({data?.total || 0} items)
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={submissions.length < limit}
            className={`rounded-md border px-4 py-2 text-sm font-semibold ${submissions.length < limit ? 'cursor-not-allowed bg-slate-50 text-slate-400' : 'text-slate-700 hover:bg-slate-50'}`}
          >
            Next
          </button>
        </div>
      )}

      {submissions.length === 0 && (
        <div className="py-12 text-center text-slate-500">No submissions found.</div>
      )}

      {selectedSub && selectedSub.type === 'pole' && (
        <PoleInspectModal
          pole={{ ...selectedSub, status: selectedSub.status || status }}
          onClose={() => setSelectedSub(null)}
          onSuccess={() => {
            setSelectedSub(null);
            queryClient.invalidateQueries(['user-submissions']);
          }}
        />
      )}

      {selectedSub && selectedSub.type === 'switch_point' && (
        <SwitchPointInspectModal
          switchPoint={{ ...selectedSub, status: selectedSub.status || status }}
          onClose={() => setSelectedSub(null)}
          onSuccess={() => {
            setSelectedSub(null);
            queryClient.invalidateQueries(['user-submissions']);
          }}
        />
      )}
    </div>
  );
}

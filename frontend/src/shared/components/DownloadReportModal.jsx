import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import API_BASE_URL from '../../config/api';
import { getLocalDateString } from '../utils/date';

export function DownloadReportModal({ isOpen, onClose, projectId }) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const today = getLocalDateString();
  const isTgpl = String(projectId) === '3';
  const [reportType, setReportType] = useState('poles'); // 'poles' or 'installation'
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [districtId, setDistrictId] = useState('');
  const [ulbId, setUlbId] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadedBytes, setDownloadedBytes] = useState(0);

  const isTgpl2 = String(projectId) === '4';

  const { data: summary = [] } = useQuery({
    queryKey: ['report-districts', projectId, token],
    queryFn: async () => {
      const surveyPath = isTgpl2 ? 'tgpl2-survey' : (isTgpl ? 'tgpl-survey' : 'pole-survey');
      const summaryPath = isTgpl2 ? 'summary/wards' : 'summary/districts';
      const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/${surveyPath}/${summaryPath}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data?.summary || res.data?.wards || [];
    },
    enabled: isOpen && !!projectId && !!token,
  });

  const districtOptions = useMemo(() => {
    const map = new Map();
    summary.forEach((row) => {
      if (!map.has(row.district_id)) {
        map.set(row.district_id, row.district_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [summary]);

  const ulbOptions = useMemo(() => {
    const rows = districtId ? summary.filter((row) => row.district_id === Number(districtId)) : summary;
    const map = new Map();
    rows.forEach((row) => {
      if (!map.has(row.ulb_id)) {
        map.set(row.ulb_id, row.ulb_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [summary, districtId]);

  const handleClose = () => {
    setDistrictId('');
    setUlbId('');
    setReportType('poles');
    setFromDate(today);
    setToDate(today);
    setIsDownloading(false);
    setDownloadedBytes(0);
    onClose();
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadedBytes(0);
    try {
      const surveyPath = isTgpl2 ? 'tgpl2-survey' : (isTgpl ? 'tgpl-survey' : 'pole-survey');
      let url = `${API_BASE_URL}/projects/${projectId}/${surveyPath}/report/download`;
      const params = [];
      if (districtId) params.push(`district=${encodeURIComponent(districtId)}`);
      if (ulbId) params.push(`ulbId=${encodeURIComponent(ulbId)}`);
      if (fromDate) params.push(`fromDate=${encodeURIComponent(fromDate)}`);
      if (toDate) params.push(`toDate=${encodeURIComponent(toDate)}`);
      if (isTgpl && reportType) {
        params.push(`reportType=${encodeURIComponent(reportType)}`);
      }
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          setDownloadedBytes(progressEvent.loaded);
        }
      });

      if (res.data?.type === 'application/json' || (res.headers && res.headers['content-type'] && res.headers['content-type'].includes('application/json'))) {
        const text = await res.data.text();
        const json = JSON.parse(text);
        throw new Error(json.message || 'Server returned an error');
      }

      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      const typeSuffix = isTgpl ? `_${reportType}` : '';
      link.download = `report_${projectId}${typeSuffix}_${fromDate || 'from'}_${toDate || 'to'}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
      handleClose();
    } catch (error) {
      console.error('Failed to download report:', error);
      let errorMsg = error.message || 'Failed to download report';
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          if (json.message) errorMsg = json.message;
        } catch (e) {}
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      }
      alert(errorMsg);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Download Report</h3>
          <button onClick={handleClose} className="text-sm font-medium text-gray-500 hover:text-gray-700">
            Close
          </button>
        </div>

        {/* For Project 3 (TGPL), show 2 tabs: Poles & Installation */}
        {isTgpl && (
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-bold text-gray-600 uppercase tracking-wider">Report Category</label>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setReportType('poles')}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                  reportType === 'poles'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📍 Survey Poles
              </button>
              <button
                type="button"
                onClick={() => setReportType('installation')}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                  reportType === 'installation'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ⚙️ Installation Form
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {(isTgpl || isTgpl2) ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Select Ward</label>
              <select
                value={ulbId}
                onChange={(e) => setUlbId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">All Wards</option>
                {ulbOptions.map((ward) => (
                  <option key={ward.id} value={ward.id}>{ward.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Select District</label>
                <select
                  value={districtId}
                  onChange={(e) => {
                    setDistrictId(e.target.value);
                    setUlbId('');
                  }}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
                >
                  <option value="">All Districts</option>
                  {districtOptions.map((district) => (
                    <option key={district.id} value={district.id}>{district.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{isTgpl2 ? 'Select Ward' : 'Select ULB'}</label>
                <select
                  value={ulbId}
                  onChange={(e) => setUlbId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
                >
                  <option value="">All Accessible ULBs</option>
                  {ulbOptions.map((ulb) => (
                    <option key={ulb.id} value={ulb.id}>{ulb.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
        </div>

        {isDownloading && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            <div className="text-sm font-medium text-blue-700">
              Downloading: {(downloadedBytes / (1024 * 1024)).toFixed(2)} MB received...
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={handleClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-50 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="rounded-lg bg-primary px-5 py-2 text-white hover:bg-primary/90 disabled:opacity-50 text-sm font-bold shadow-md shadow-primary/20"
          >
            {isDownloading ? 'Downloading...' : 'Download Report'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import API_BASE_URL from '../../config/api';

export function DownloadReportModal({ isOpen, onClose, projectId }) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const isMasterAdmin = user?.role === 'MASTER_ADMIN';
  const today = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [districtId, setDistrictId] = useState('');
  const [ulbId, setUlbId] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: summary = [] } = useQuery({
    queryKey: ['report-districts', projectId, token],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/pole-survey/summary/districts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.summary || [];
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
    setFromDate(today);
    setToDate(today);
    setIsDownloading(false);
    onClose();
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      let url = `${API_BASE_URL}/projects/${projectId}/pole-survey/report/download`;
      const params = [];
      if (districtId && isMasterAdmin) params.push(`district=${encodeURIComponent(districtId)}`);
      if (ulbId) params.push(`ulbId=${encodeURIComponent(ulbId)}`);
      if (fromDate) params.push(`fromDate=${encodeURIComponent(fromDate)}`);
      if (toDate) params.push(`toDate=${encodeURIComponent(toDate)}`);
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }

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
      link.download = `report_${projectId}_${fromDate || 'from'}_${toDate || 'to'}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
      handleClose();
    } catch (error) {
      console.error('Failed to download report:', error);
      alert(error.response?.data?.message || 'Failed to download report');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Download Report</h3>
          <button onClick={handleClose} className="text-sm font-medium text-gray-500 hover:text-gray-700">
            Close
          </button>
        </div>

        <div className="space-y-4">
          {isMasterAdmin && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Select District</label>
              <select
                value={districtId}
                onChange={(e) => {
                  setDistrictId(e.target.value);
                  setUlbId('');
                }}
                className="w-full rounded-lg border border-gray-300 p-2 text-sm"
              >
                <option value="">All Districts</option>
                {districtOptions.map((district) => (
                  <option key={district.id} value={district.id}>{district.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Select ULB</label>
            <select
              value={ulbId}
              onChange={(e) => setUlbId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2 text-sm"
            >
              <option value="">All Accessible ULBs</option>
              {ulbOptions.map((ulb) => (
                <option key={ulb.id} value={ulb.id}>{ulb.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={handleClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {isDownloading ? 'Downloading...' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config/api';

export function DownloadReportModal({ isOpen, onClose, projectId }) {
  const token = localStorage.getItem('token');
  const [tillDate, setTillDate] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      let url = `${API_BASE_URL}/projects/${projectId}/pole-survey/report/download`;
      if (tillDate) {
        url += `?tillDate=${encodeURIComponent(tillDate)}`;
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
      link.download = `report_${projectId}_all_${tillDate || 'all'}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
      onClose();
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
          <button onClick={onClose} className="text-sm font-medium text-gray-500 hover:text-gray-700">
            Close
          </button>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Till Date</label>
          <input
            type="date"
            value={tillDate}
            onChange={(e) => setTillDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-2 text-sm"
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
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

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import API_BASE_URL from '../../config/api';

export const useSummary = (projectId, date = null, mode = 'exact', fromDate = null, toDate = null) => {
  const token = localStorage.getItem('token');
  const isTgpl2 = String(projectId) === '4';

  return useQuery({
    queryKey: ['districtSummary', projectId, date, mode, fromDate, toDate],
    queryFn: async () => {
      try {
        const surveyPath = isTgpl2 ? 'tgpl2-survey' : 'pole-survey';
        const summarySegment = isTgpl2 ? 'summary/wards' : 'summary/districts';
        let url = `${API_BASE_URL}/projects/${projectId}/${surveyPath}/${summarySegment}`;
        const queryParams = [];
        if (fromDate) queryParams.push(`fromDate=${fromDate}`);
        if (toDate) queryParams.push(`toDate=${toDate}`);
        if (!fromDate && !toDate && date) queryParams.push(`date=${date}`);
        if (mode) queryParams.push(`mode=${mode}`);
        if (queryParams.length > 0) url += `?${queryParams.join('&')}`;

        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (isTgpl2) return res.data?.wards || res.data?.summary || [];
        return res.data?.summary || [];
      } catch (err) {
        console.error('useSummary hook error:', err);
        return [];
      }
    },
    enabled: !!projectId,
  });
};

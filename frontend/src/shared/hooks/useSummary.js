import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import API_BASE_URL from '../../config/api';

export const useSummary = (projectId, date = null, mode = 'exact', fromDate = null, toDate = null) => {
  const token = localStorage.getItem('token');
  
  return useQuery({
    queryKey: ['districtSummary', projectId, date, mode, fromDate, toDate],
    queryFn: async () => {
      try {
        let url = `${API_BASE_URL}/projects/${projectId}/pole-survey/summary/districts`;
        const queryParams = [];
        if (fromDate) queryParams.push(`fromDate=${fromDate}`);
        if (toDate) queryParams.push(`toDate=${toDate}`);
        if (!fromDate && !toDate && date) queryParams.push(`date=${date}`);
        if (mode) queryParams.push(`mode=${mode}`);
        if (queryParams.length > 0) url += `?${queryParams.join('&')}`;
        
        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        return res.data?.summary || [];
      } catch (err) {
        console.error("useSummary hook error:", err);
        return [];
      }
    },
    enabled: !!projectId,
  });
};

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import API_BASE_URL from '../../config/api';

export const useSummary = (projectId, date = null, mode = 'exact') => {
  const token = localStorage.getItem('token');
  
  return useQuery({
    queryKey: ['districtSummary', projectId, date, mode],
    queryFn: async () => {
      let url = `${API_BASE_URL}/projects/${projectId}/pole-survey/summary/districts`;
      const queryParams = [];
      if (date) queryParams.push(`date=${date}`);
      if (mode) queryParams.push(`mode=${mode}`);
      if (queryParams.length > 0) url += `?${queryParams.join('&')}`;
      
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.summary || [];
    },
    enabled: !!projectId,
  });
};

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import API_BASE_URL from '../../config/api';

export const useUserStats = (projectId, date = null, options = {}) => {
  const token = localStorage.getItem('token');
  
  return useQuery({
    queryKey: ['my-stats', projectId, date],
    queryFn: async () => {
      const url = date 
        ? `${API_BASE_URL}/projects/${projectId}/pole-survey/my-stats?date=${date}`
        : `${API_BASE_URL}/projects/${projectId}/pole-survey/my-stats`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.stats;
    },
    enabled: !!projectId && options.enabled !== false,
    ...options,
  });
};

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import API_BASE_URL from '../../config/api';

export const useUserStats = (projectId, options = {}) => {
  const token = localStorage.getItem('token');
  
  return useQuery({
    queryKey: ['my-stats', projectId],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/pole-survey/my-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.stats;
    },
    enabled: !!projectId && options.enabled !== false,
    ...options,
  });
};

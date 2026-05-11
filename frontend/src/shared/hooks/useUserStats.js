import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export const useUserStats = (projectId, options = {}) => {
  const token = localStorage.getItem('token');
  
  return useQuery({
    queryKey: ['my-stats', projectId],
    queryFn: async () => {
      const res = await axios.get(`http://10.73.182.200:3000/api/v1/projects/${projectId}/pole-survey/my-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.stats;
    },
    enabled: !!projectId && options.enabled !== false,
    ...options,
  });
};

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export const useMobileUserTracking = (projectId, options = {}) => {
  const token = localStorage.getItem('token');
  
  return useQuery({
    queryKey: ['mobile-user-tracking', projectId],
    queryFn: async () => {
      const res = await axios.get(`http://10.73.182.200:3000/api/v1/projects/${projectId}/pole-survey/mobile-user-tracking`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.tracking;
    },
    enabled: !!projectId && options.enabled !== false,
    ...options,
  });
};

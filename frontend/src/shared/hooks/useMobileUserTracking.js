import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import API_BASE_URL from '../../config/api';

export const useMobileUserTracking = (projectId, options = {}) => {
  const token = localStorage.getItem('token');
  
  return useQuery({
    queryKey: ['mobile-user-tracking', projectId],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/pole-survey/mobile-user-tracking`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.tracking;
    },
    enabled: !!projectId && options.enabled !== false,
    ...options,
  });
};

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import API_BASE_URL from '../../config/api';

export const usePendingQueue = (projectId) => {
  const token = localStorage.getItem('token');
  
  return useQuery({
    queryKey: ['pendingQueue', projectId],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/pole-survey/queue/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.queue || [];
    },
    enabled: !!projectId,
  });
};

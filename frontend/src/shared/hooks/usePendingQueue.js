import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export const usePendingQueue = (projectId) => {
  const token = localStorage.getItem('token');
  
  return useQuery({
    queryKey: ['pendingQueue', projectId],
    queryFn: async () => {
      const res = await axios.get(`http://10.73.182.200:3000/api/v1/projects/${projectId}/pole-survey/queue/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.queue || [];
    },
    enabled: !!projectId,
  });
};

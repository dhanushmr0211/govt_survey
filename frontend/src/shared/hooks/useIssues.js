import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export const useIssues = (projectId) => {
  const token = localStorage.getItem('token');
  
  return useQuery({
    queryKey: ['issues', projectId],
    queryFn: async () => {
      const res = await axios.get(`http://10.73.182.200:3000/api/v1/projects/${projectId}/issues`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.issues || [];
    },
    enabled: !!projectId,
  });
};

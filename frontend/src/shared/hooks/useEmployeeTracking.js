import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export const useEmployeeTracking = (projectId, options = {}) => {
  const token = localStorage.getItem('token');
  
  return useQuery({
    queryKey: ['employee-tracking', projectId],
    queryFn: async () => {
      const res = await axios.get(`https://govt-survey-backend-19218031051.asia-south1.run.app/api/v1/projects/${projectId}/pole-survey/employee-tracking`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.tracking;
    },
    enabled: !!projectId && options.enabled !== false,
    ...options,
  });
};

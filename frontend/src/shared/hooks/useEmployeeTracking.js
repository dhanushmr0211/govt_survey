import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import API_BASE_URL from '../../config/api';

export const useEmployeeTracking = (projectId, options = {}) => {
  const token = localStorage.getItem('token');
  const isTgpl2 = String(projectId) === '4';

  return useQuery({
    queryKey: ['employee-tracking', projectId],
    queryFn: async () => {
      const surveyPath = isTgpl2 ? 'tgpl2-survey' : 'pole-survey';
      const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/${surveyPath}/employee-tracking`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data?.tracking;
    },
    enabled: !!projectId && options.enabled !== false,
    ...options,
  });
};

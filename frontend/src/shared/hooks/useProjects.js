import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export const useProjects = () => {
  const token = localStorage.getItem('token');
  
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await axios.get('https://govt-survey-backend-19218031051.asia-south1.run.app/api/v1/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.projects || [];
    },
  });
};

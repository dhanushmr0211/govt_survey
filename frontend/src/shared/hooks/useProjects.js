import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export const useProjects = () => {
  const token = localStorage.getItem('token');
  
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await axios.get('http://10.73.182.200:3000/api/v1/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.projects || [];
    },
  });
};

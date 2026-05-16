import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import API_BASE_URL from '../../config/api';

export const useProjects = () => {
  const token = localStorage.getItem('token');
  
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.projects || [];
    },
  });
};

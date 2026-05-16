import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import API_BASE_URL from '../../config/api';

export const useProjects = () => {
  const token = localStorage.getItem('token');
  
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/projects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.data?.projects;
        return Array.isArray(data) ? data : [];
      } catch (err) {
        console.error("useProjects hook error:", err);
        return [];
      }
    },
    initialData: [],
    staleTime: 1 * 60 * 1000, // 1 minute - balances cache benefit with freshness
    gcTime: 0, // Don't keep data in cache after unmount (was cacheTime)
  });
};

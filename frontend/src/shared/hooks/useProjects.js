import { useQuery } from '@tanstack/react-query';
import API_BASE_URL from '../../config/api';
import { useAuthStore } from '../../store/authStore';

export const useProjects = () => {
  const token = useAuthStore((state) => state.token);
  
  return useQuery({
    queryKey: ['projects', token], // Include token in key so it refetches when token changes
    queryFn: async () => {
      if (!token) {
        console.log('[useProjects] No token available');
        return [];
      }
      try {
        console.log('[useProjects] Fetching with token:', token?.substring(0, 20) + '...');
        const res = await fetch(`${API_BASE_URL}/projects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }
        const data = await res.json();
        console.log('[useProjects] API returned:', data?.projects?.length || 0, 'projects');
        const projects = data?.projects;
        return Array.isArray(projects) ? projects : [];
      } catch (err) {
        console.error("[useProjects] Error fetching projects:", err);
        return [];
      }
    },
    enabled: !!token, // Only run query if token exists
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 0, // Don't cache in background
  });
};

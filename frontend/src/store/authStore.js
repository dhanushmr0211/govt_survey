import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token') || null,
  activeProject: JSON.parse(localStorage.getItem('activeProject')) || null,
  
  setUser: (user) => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
    set({ user });
  },
  
  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
    set({ token });
  },

  setActiveProject: (project) => {
    if (project) {
      localStorage.setItem('activeProject', JSON.stringify(project));
    } else {
      localStorage.removeItem('activeProject');
    }
    set({ activeProject: project });
  },

  clearActiveProject: () => {
    localStorage.removeItem('activeProject');
    set({ activeProject: null });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeProject');
    set({ user: null, token: null, activeProject: null });
  },
}));

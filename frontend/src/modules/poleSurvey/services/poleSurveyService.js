import axios from 'axios';

const API_URL = 'https://govt-survey-backend-19218031051.asia-south1.run.app/api/v1'; // In production, this would use import.meta.env.VITE_API_URL

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

export const getSwitchPoints = async (projectId, status = 'PENDING') => {
  const response = await axios.get(`${API_URL}/projects/${projectId}/pole-survey/switch-points?status=${status}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const getPoles = async (projectId, status = 'PENDING') => {
  const response = await axios.get(`${API_URL}/projects/${projectId}/pole-survey/poles?status=${status}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const confirmPole = async (projectId, poleId) => {
  const response = await axios.post(`${API_URL}/projects/${projectId}/pole-survey/poles/${poleId}/confirm`, {}, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const confirmSwitchPoint = async (projectId, spId) => {
  const response = await axios.post(`${API_URL}/projects/${projectId}/pole-survey/switch-points/${spId}/confirm`, {}, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

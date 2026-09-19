import axios from 'axios';
import API_BASE_URL from '../../../config/api';

const API_URL = API_BASE_URL;

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

export const confirmPole = async (projectId, poleId, surveyType = 'survey') => {
  const isTgpl = String(projectId) === '3';
  const surveyPath = isTgpl ? 'tgpl-survey' : 'pole-survey';
  const response = await axios.post(`${API_URL}/projects/${projectId}/${surveyPath}/poles/${poleId}/confirm`, {
    survey_type: surveyType
  }, {
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

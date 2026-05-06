import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5005';

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
});

export const getApiErrorMessage = (error, fallback = 'Server temporarily unavailable.') => {
  if (!error) return fallback;

  if (error.code === 'ERR_NETWORK') {
    return 'Server temporarily unavailable. Check your internet connection.';
  }

  const status = error.response?.status;
  const message = error.response?.data?.message;

  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  if (status === 401) return 'Session expired. Please log in again.';
  if (status === 403) return 'You do not have permission to complete this action.';
  if (status === 404) return 'Requested data was not found.';
  if (status >= 500) return 'Server temporarily unavailable. Please try again shortly.';

  return fallback;
};

export const buildAuthHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
});

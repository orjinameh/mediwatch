import { API } from './theme';

const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('mw_token');
};

export const apiFetch = async (path: string, options: RequestInit = {}) => {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  // Auto-redirect on 401
  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('mw_token');
    localStorage.removeItem('mw_user');
    window.location.href = '/login';
  }
  return data;
};

// Auth helpers
export const authApi = {
  signup: (body: object) => apiFetch('/api/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login:  (body: object) => apiFetch('/api/auth/login',  { method: 'POST', body: JSON.stringify(body) }),
  me:     () => apiFetch('/api/auth/me'),
  changePassword: (body: object) => apiFetch('/api/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),
};

// Patient helpers
export const patientApi = {
  list:   () => apiFetch('/api/patients'),
  get:    (id: string) => apiFetch(`/api/patients/${id}`),
  create: (body: object) => apiFetch('/api/patients', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: object) => apiFetch(`/api/patients/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch(`/api/patients/${id}`, { method: 'DELETE' }),
};

// Vitals helpers
export const vitalsApi = {
  history: (id: string, limit = 50) => apiFetch(`/api/vitals/${id}?limit=${limit}`),
  latest:  (id: string) => apiFetch(`/api/vitals/${id}/latest`),
  post:    (id: string, body: object) => apiFetch(`/api/vitals/${id}`, { method: 'POST', body: JSON.stringify(body) }),
};

// Alert helpers
export const alertApi = {
  list:        () => apiFetch('/api/alerts'),
  forPatient:  (id: string) => apiFetch(`/api/alerts/${id}`),
  acknowledge: (alertId: string) => apiFetch(`/api/alerts/${alertId}/acknowledge`, { method: 'PATCH', body: JSON.stringify({}) }),
};

// AI helpers
export const aiApi = {
  ask:     (id: string, query: string, askedBy = 'nurse') => apiFetch(`/api/ai/${id}`, { method: 'POST', body: JSON.stringify({ query, askedBy }) }),
  history: (id: string) => apiFetch(`/api/ai/${id}/history`),
};

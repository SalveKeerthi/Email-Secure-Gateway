import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sg_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response interceptor ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.error || err.message || 'Network error';
    return Promise.reject(new Error(msg));
  }
);

// ─── Auth / Gmail OAuth ───────────────────────────────────────────────────────
export const authApi = {
  getGmailAuthUrl: () => api.get('/auth/gmail/url'),
  getGmailStatus: (email) => api.get('/auth/gmail/status', { params: { email } }),
  disconnectGmail: (accountId) => api.delete(`/auth/gmail/disconnect/${accountId}`),
};

// ─── Gmail account management ─────────────────────────────────────────────────
export const gmailApi = {
  getAccounts: () => api.get('/gmail/accounts'),
  getAccountStatus: (id) => api.get(`/gmail/accounts/${id}/status`),
  syncNow: (id) => api.post(`/gmail/accounts/${id}/sync`),
  updateMonitoring: (id, enabled, syncIntervalSeconds) =>
    api.patch(`/gmail/accounts/${id}/monitoring`, { enabled, sync_interval_seconds: syncIntervalSeconds }),
};

// ─── Emails ───────────────────────────────────────────────────────────────────
export const emailApi = {
  getIncoming: (params) => api.get('/emails/incoming', { params }),
  getQuarantined: (params) => api.get('/emails/quarantined', { params }),
  getBlocked: (params) => api.get('/emails/blocked', { params }),
  search: (q, accountId) => api.get('/emails/search', { params: { q, accountId } }),
  getById: (id) => api.get(`/emails/${id}`),
  manualScan: (data) => api.post('/emails/manual-scan', data),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  getStats: (accountId) => api.get('/dashboard/stats', { params: { accountId } }),
  getRecentEmails: (accountId, limit = 20) =>
    api.get('/dashboard/recent-emails', { params: { accountId, limit } }),
  getTimeline: () => api.get('/dashboard/timeline'),
};

// ─── Settings ─────────────────────────────────────────────────────────────────
export const settingsApi = {
  get: (accountId) => api.get(`/settings/${accountId}`),
  update: (accountId, data) => api.patch(`/settings/${accountId}`, data),
};

export default api;

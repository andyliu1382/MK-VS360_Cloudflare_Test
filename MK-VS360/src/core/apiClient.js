const API_BASE = '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const apiClient = {
  auth: {
    me: () => request('/auth/me'),
    register: payload => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
    login: payload => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    googleStartUrl: () => `${API_BASE}/auth/google/start`
  },
  projects: {
    list: () => request('/projects'),
    create: payload => request('/projects', { method: 'POST', body: JSON.stringify(payload) }),
    get: projectId => request(`/projects/${encodeURIComponent(projectId)}`),
    update: (projectId, payload) => request(`/projects/${encodeURIComponent(projectId)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    delete: projectId => request(`/projects/${encodeURIComponent(projectId)}`, { method: 'DELETE' }),
    publish: (projectId, payload) => request(`/projects/${encodeURIComponent(projectId)}/publish`, { method: 'POST', body: JSON.stringify(payload) })
  },
  uploads: {
    init: payload => request('/uploads/init', { method: 'POST', body: JSON.stringify(payload) }),
    complete: payload => request('/uploads/complete', { method: 'POST', body: JSON.stringify(payload) })
  },
  tours: {
    get: shareId => request(`/tours/${encodeURIComponent(shareId)}`)
  }
};

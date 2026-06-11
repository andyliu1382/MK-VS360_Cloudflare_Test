import { apiClient } from './apiClient.js';

const listeners = new Set();
let session = null;

function persist(nextSession) {
  session = nextSession;
  listeners.forEach(listener => listener(session));
}

function localMember(email, provider = 'password') {
  return { id: `${provider}_${crypto.randomUUID()}`, email, role: 'member', provider };
}

export const authStore = {
  async init() {
    try {
      const data = await apiClient.auth.me();
      persist({ ...data.user, role: 'member' });
    } catch {
      persist(null);
    }
    return session;
  },
  getSession: () => session,
  isAuthenticated: () => Boolean(session),
  isMember: () => session?.role === 'member',
  isGuest: () => session?.role === 'guest',
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  async registerWithEmail({ email, password }) {
    if (!email || !password) throw new Error('Please enter email and password.');
    if (password.length < 8) throw new Error('Password must be at least 8 characters.');
    if (import.meta.env.VITE_AUTH_BACKEND === 'mock') {
      persist(localMember(email.trim().toLowerCase()));
      return session;
    }
    const data = await apiClient.auth.register({ email, password });
    persist({ ...data.user, role: 'member' });
    return session;
  },
  async loginWithEmail({ email, password }) {
    if (!email || !password) throw new Error('Please enter email and password.');
    if (import.meta.env.VITE_AUTH_BACKEND === 'mock') {
      persist(localMember(email.trim().toLowerCase()));
      return session;
    }
    const data = await apiClient.auth.login({ email, password });
    persist({ ...data.user, role: 'member' });
    return session;
  },
  async loginWithGoogle() {
    if (import.meta.env.VITE_AUTH_BACKEND === 'mock') {
      persist(localMember('google.user@example.com', 'google'));
      return session;
    }
    location.href = apiClient.auth.googleStartUrl();
    return null;
  },
  loginAsGuest() {
    const timestamp = Date.now();
    persist({
      id: `guest-${timestamp}`,
      projectId: `guest-${timestamp}`,
      role: 'guest',
      email: null,
      provider: 'guest'
    });
    return session;
  },
  async logout() {
    try { await apiClient.auth.logout(); } catch {}
    persist(null);
  }
};

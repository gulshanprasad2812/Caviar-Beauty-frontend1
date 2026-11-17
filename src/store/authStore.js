import { create } from 'zustand';
import api from '@/utils/api';

let authCheckPromise;

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async (email, password, isAdmin = false) => {
    const endpoint = isAdmin ? '/auth/admin-login' : '/auth/login';
    const { data } = await api.post(endpoint, { email, password });
    set({ user: data.user, isAuthenticated: true });
    return data;
  },
  register: async (userData) => {
    const { data } = await api.post('/auth/register', userData);
    set({ user: data.user, isAuthenticated: true });
    return data;
  },
  verifyEmailOtp: async (otp) => {
    const { data } = await api.post('/auth/verify-otp', { email: get().user?.email, otp });
    set({ user: { ...get().user, isVerified: true } });
    return data;
  },
  sendPhoneOtp: async (phone) => {
    const { data } = await api.post('/auth/phone/send-otp', { phone });
    if (phone) set({ user: { ...get().user, phone } });
    return data;
  },
  verifyPhoneOtp: async (otp) => {
    const { data } = await api.post('/auth/phone/verify-otp', { otp });
    set({ user: { ...get().user, phoneVerified: true } });
    return data;
  },
  googleLogin: async (credential) => {
    const { data } = await api.post('/auth/google', credential);
    set({ user: data.user, isAuthenticated: true });
    return data;
  },
  logout: async () => {
    try { await api.post('/auth/logout'); } catch {}
    set({ user: null, isAuthenticated: false });
  },
  checkAuth: () => {
    if (authCheckPromise) return authCheckPromise;
    authCheckPromise = (async () => {
      try {
        const { data } = await api.get('/auth/me');
        set({ user: data, isAuthenticated: true, isLoading: false });
      } catch {
        set({ user: null, isAuthenticated: false, isLoading: false });
      } finally {
        authCheckPromise = undefined;
      }
    })();
    return authCheckPromise;
  },
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  updateProfile: async (data) => {
    const res = await api.put('/auth/profile', data);
    set({ user: { ...get().user, ...res.data } });
    return res.data;
  },
}));

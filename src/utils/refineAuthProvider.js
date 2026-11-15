import adminApi from './adminApi';

// Refine auth provider backed by the existing cookie/CSRF admin session.
// The SPA keeps ownership of routing and the login screens; this provider only
// exposes session state to Refine's data layer.
const authProvider = {
  login: async ({ identifier, username, email, password }) => {
    const res = await adminApi.post('/api/auth/login', {
      identifier: identifier || username || email,
      password,
    });
    if (res.data?.twoFactorRequired) {
      return {
        success: false,
        error: new Error('Two-factor authentication is required'),
      };
    }
    return { success: true, redirectTo: '/admin/dashboard' };
  },

  logout: async () => {
    try {
      await adminApi.post('/api/admin/logout', {});
    } catch {
      // The local session still has to be cleared even if the server call fails.
    }
    return { success: true, redirectTo: '/login' };
  },

  check: async () => {
    try {
      const res = await adminApi.get('/api/admin/verify', { skipRedirect: true });
      if (res.data?.valid) {
        return { authenticated: true };
      }
    } catch {
      // fall through to the unauthenticated result
    }
    return {
      authenticated: false,
      redirectTo: '/login',
      logout: true,
    };
  },

  getIdentity: async () => {
    const res = await adminApi.get('/api/admin/verify');
    const admin = res.data?.admin || res.data;
    return {
      id: admin?._id,
      name: admin?.username || admin?.accountId,
      email: admin?.email,
      avatar: admin?.avatar,
      role: admin?.role,
    };
  },

  getPermissions: async () => {
    const res = await adminApi.get('/api/admin/verify');
    const admin = res.data?.admin || res.data;
    return admin?.role;
  },

  onError: async (error) => {
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      return { logout: true, redirectTo: '/login', error };
    }
    return { error };
  },
};

export default authProvider;

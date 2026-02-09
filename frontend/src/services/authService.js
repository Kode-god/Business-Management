const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const authService = {
  async login(email, password, businessId = null) {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, businessId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('business', JSON.stringify(data.business));
      localStorage.setItem('role', data.role);
      const safeBusinesses = Array.isArray(data.availableBusinesses) ? data.availableBusinesses : [];
      localStorage.setItem('availableBusinesses', JSON.stringify(safeBusinesses));


      return {
        success: true,
        user: data.user,
        business: data.business,
        role: data.role,
        availableBusinesses: data.availableBusinesses,
      };
    } catch (error) {
      throw new Error(error.message || 'Login failed');
    }
  },

  async register(userData) {
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const data = await response.json();

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('business', JSON.stringify(data.business));
      localStorage.setItem('role', data.role);

      return {
        success: true,
        user: data.user,
        business: data.business,
        role: data.role,
      };
    } catch (error) {
      throw new Error(error.message || 'Registration failed');
    }
  },

  async switchBusiness(businessId) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/auth/switch-business`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ businessId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to switch business');
      }

      const data = await response.json();

      localStorage.setItem('token', data.token);
      localStorage.setItem('business', JSON.stringify(data.business));
      localStorage.setItem('role', data.role);

      return {
        success: true,
        business: data.business,
        role: data.role,
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to switch business');
    }
  },

  async requestPasswordReset(email) {
    try {
      const response = await fetch(`${API_URL}/api/auth/request-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to request password reset');
      }

      return { success: true };
    } catch (error) {
      throw new Error(error.message || 'Failed to request password reset');
    }
  },

  async resetPassword(token, newPassword) {
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reset password');
      }

      return { success: true };
    } catch (error) {
      throw new Error(error.message || 'Failed to reset password');
    }
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('business');
    localStorage.removeItem('role');
    localStorage.removeItem('availableBusinesses');
  },

  clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('business');
    localStorage.removeItem('role');
    localStorage.removeItem('availableBusinesses');
  },

  getToken() {
    return localStorage.getItem('token');
  },

  getUser() {
    const raw = localStorage.getItem('user');
    if (!raw || raw === "undefined" || raw === "null") return null;
    try { return JSON.parse(raw); } catch { localStorage.removeItem('user'); return null; }
  },

    getBusiness() {
    const raw = localStorage.getItem('business');
    if (!raw || raw === "undefined" || raw === "null") return null;
    try { return JSON.parse(raw); } catch { localStorage.removeItem('business'); return null; }
  },

  getRole() {
    return localStorage.getItem('role');
  },

getAvailableBusinesses() {
  const raw = localStorage.getItem('availableBusinesses');

  // handle empty / corrupt values
  if (!raw || raw === "undefined" || raw === "null") return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    // auto-heal if something bad got stored
    localStorage.removeItem('availableBusinesses');
    return [];
  }
}

};

export default authService;

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('plantopia_user')); } catch { return null; }
  });

  function getAccessToken() {
    return localStorage.getItem('plantopia_token');
  }

  async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('plantopia_refresh');
    if (!refreshToken) return null;
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) throw new Error('refresh failed');
      const { accessToken } = await res.json();
      localStorage.setItem('plantopia_token', accessToken);
      return accessToken;
    } catch {
      logout();
      return null;
    }
  }

  // Authenticated fetch — handles 401 by trying one token refresh
  const authFetch = useCallback(async (url, options = {}) => {
    let token = getAccessToken();
    const makeRequest = (t) => fetch(url, {
      ...options,
      headers: { ...options.headers, ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    });

    let res = await makeRequest(token);
    if (res.status === 401) {
      token = await refreshAccessToken();
      if (token) res = await makeRequest(token);
    }
    return res;
  }, []);

  async function login(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('plantopia_token', data.accessToken);
    localStorage.setItem('plantopia_refresh', data.refreshToken);
    localStorage.setItem('plantopia_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  async function register(email, password, displayName) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    localStorage.setItem('plantopia_token', data.accessToken);
    localStorage.setItem('plantopia_refresh', data.refreshToken);
    localStorage.setItem('plantopia_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem('plantopia_token');
    localStorage.removeItem('plantopia_refresh');
    localStorage.removeItem('plantopia_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, authFetch, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

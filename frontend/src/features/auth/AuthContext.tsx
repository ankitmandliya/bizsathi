import { useState, useEffect, type ReactNode } from 'react';
import { clearAuthTokens, getAccessToken, setAuthTokens } from '../../services/auth/tokens';
import { AuthContext, type UserSession } from './AuthContextValue';
import apiClient from '../../services/api/client';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!getAccessToken());
  const [user, setUser] = useState<UserSession | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      setIsAuthenticated(true);
      apiClient.get('/api/v1/auth/me')
        .then(res => {
          if (res.data) {
            setUser({
              id: res.data.id,
              email: res.data.email,
              full_name: res.data.full_name,
              is_platform_admin: res.data.is_platform_admin,
              is_owner: res.data.is_owner,
              tenant_id: res.data.tenant_id,
              tenant_name: res.data.tenant_name,
              roles: res.data.roles,
              permissions: res.data.permissions,
            });
            if (res.data.tenant_name) {
              localStorage.setItem('bizsathi.business_name', res.data.tenant_name);
              window.dispatchEvent(new Event('business_name_updated'));
            }
          }
        })
        .catch(() => {
          // If token is invalid/expired, logout cleanly
          clearAuthTokens();
          setUser(null);
          setIsAuthenticated(false);
        });
    }
  }, []);

  const login = (accessToken: string, refreshToken: string, userData: UserSession) => {
    setAuthTokens(accessToken, refreshToken);
    setUser(userData);
    setIsAuthenticated(true);
    if (userData.tenant_name) {
      localStorage.setItem('bizsathi.business_name', userData.tenant_name);
      window.dispatchEvent(new Event('business_name_updated'));
    }
    // Refresh full profile in background
    apiClient.get('/api/v1/auth/me')
      .then(res => {
        if (res.data) {
          setUser({
            id: res.data.id,
            email: res.data.email,
            full_name: res.data.full_name,
            is_platform_admin: res.data.is_platform_admin,
            is_owner: res.data.is_owner,
            tenant_id: res.data.tenant_id,
            tenant_name: res.data.tenant_name,
            roles: res.data.roles,
            permissions: res.data.permissions,
          });
          if (res.data.tenant_name) {
            localStorage.setItem('bizsathi.business_name', res.data.tenant_name);
            window.dispatchEvent(new Event('business_name_updated'));
          }
        }
      })
      .catch(() => { /* silent fallback */ });
  };

  const logout = () => {
    clearAuthTokens();
    setUser(null);
    setIsAuthenticated(false);
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

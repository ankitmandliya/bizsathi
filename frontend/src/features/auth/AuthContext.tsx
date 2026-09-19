import { useState, useEffect, type ReactNode } from 'react';
import { clearAuthTokens, getAccessToken, setAuthTokens } from '../../services/auth/tokens';
import { AuthContext, type UserSession } from './AuthContextValue';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!getAccessToken());
  const [user, setUser] = useState<UserSession | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const login = (accessToken: string, refreshToken: string, userData: UserSession) => {
    setAuthTokens(accessToken, refreshToken);
    setUser(userData);
    setIsAuthenticated(true);
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

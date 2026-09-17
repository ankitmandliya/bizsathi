import { createContext } from 'react';

export type UserSession = {
  id: string;
  email: string;
  full_name: string;
  tenant_id?: string;
};

export type AuthContextType = {
  isAuthenticated: boolean;
  user: UserSession | null;
  login: (accessToken: string, refreshToken: string, userData: UserSession) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

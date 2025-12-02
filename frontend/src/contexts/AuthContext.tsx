import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import api, { setTokens, clearTokens, getAccessToken } from '@/services/api';
import type { User, AuthState, LoginCredentials, RegisterData } from '@/types';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  // Fetch current user on mount if we have a token
  useEffect(() => {
    const fetchUser = async () => {
      const token = getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get<User>('/auth/me/');
        setUser(response.data);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        clearTokens();
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Listen for logout events from the API interceptor
  useEffect(() => {
    const handleLogout = () => {
      logout();
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [logout]);

  const login = async (credentials: LoginCredentials) => {
    const response = await api.post<{ access: string; refresh: string; user: User }>(
      '/auth/login/',
      credentials
    );
    const { access, refresh, user: userData } = response.data;
    setTokens(access, refresh);
    setUser(userData);
  };

  const register = async (data: RegisterData) => {
    const response = await api.post<{ access: string; refresh: string; user: User }>(
      '/auth/register/',
      data
    );
    const { access, refresh, user: userData } = response.data;
    setTokens(access, refresh);
    setUser(userData);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

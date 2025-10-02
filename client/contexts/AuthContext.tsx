import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser, removeToken, type User } from '@/lib/auth';
import { apiService, type ApiError } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: ApiError | null;
  login: (user: User) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const checkAuth = async () => {
    try {
      setLoading(true);
      setError(null);
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (err) {
      setUser(null);
      setError({
        error: 'auth_check_failed',
        detail: err instanceof Error ? err.message : 'Authentication check failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const login = (userData: User) => {
    setUser(userData);
    setError(null);
  };

  const logout = () => {
    removeToken();
    setUser(null);
    setError(null);
  };

  const clearError = () => {
    setError(null);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error, 
      login, 
      logout, 
      checkAuth, 
      clearError 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  type AuthUser,
  signIn as authSignIn,
  signUp as authSignUp,
  signOut as authSignOut,
  getStoredToken,
  getStoredUser,
} from '@/lib/auth';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    const storedUser = getStoredUser();
    if (token && storedUser) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  async function signIn(email: string, password: string) {
    const { user, error } = await authSignIn(email, password);
    if (user) setUser(user);
    return { error };
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { user, error } = await authSignUp(email, password, fullName);
    if (user) setUser(user);
    return { error };
  }

  async function signOut() {
    await authSignOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

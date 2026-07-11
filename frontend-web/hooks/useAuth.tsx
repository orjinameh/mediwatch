'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

interface User { id: string; name: string; email: string; role: string; }
interface AuthCtx { user: User | null; loading: boolean; login: (token: string, user: User) => void; logout: () => void; }

const AuthContext = createContext<AuthCtx>({ user: null, loading: true, login: () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]     = useState<User | null>(null);
  const [loading, setLoad]  = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('mw_token');
    const stored = localStorage.getItem('mw_user');
    if (token && stored) {
      setUser(JSON.parse(stored));
      // Verify token is still valid
      authApi.me().then(r => {
        if (r.success) setUser(r.data);
        else { localStorage.removeItem('mw_token'); localStorage.removeItem('mw_user'); setUser(null); }
      }).finally(() => setLoad(false));
    } else {
      setLoad(false);
    }
  }, []);

  const login = (token: string, u: User) => {
    localStorage.setItem('mw_token', token);
    localStorage.setItem('mw_user', JSON.stringify(u));
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('mw_token');
    localStorage.removeItem('mw_user');
    setUser(null);
    router.push('/login');
  };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

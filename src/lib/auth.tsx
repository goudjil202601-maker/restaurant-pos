import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { StaffRole } from './types';

export interface CurrentUser {
  id: string;
  name: string;
  role: StaffRole;
}

interface AuthContextValue {
  user: CurrentUser | null;
  login: (user: CurrentUser) => void;
  logout: () => void;
  canAccess: (page: string) => boolean;
  canPay: (channel: string) => boolean;
  isManager: boolean;
  isCashier: boolean;
  isWaiter: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

const CASHIER_PAGES = ['dine_in', 'takeaway', 'delivery'];
const WAITER_PAGES = ['dine_in'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(() => {
    const saved = localStorage.getItem('pos_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback((u: CurrentUser) => {
    setUser(u);
    localStorage.setItem('pos_user', JSON.stringify(u));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('pos_user');
  }, []);

  const canAccess = useCallback((page: string) => {
    if (!user) return false;
    if (user.role === 'manager') return true;
    if (user.role === 'cashier') return CASHIER_PAGES.includes(page);
    if (user.role === 'waiter') return WAITER_PAGES.includes(page);
    return false;
  }, [user]);

  const canPay = useCallback((channel: string) => {
    if (!user) return false;
    if (user.role === 'manager' || user.role === 'cashier') return true;
    return false;
  }, [user]);

  const value: AuthContextValue = {
    user,
    login,
    logout,
    canAccess,
    canPay,
    isManager: user?.role === 'manager',
    isCashier: user?.role === 'cashier',
    isWaiter: user?.role === 'waiter',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

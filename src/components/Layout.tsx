import { type ReactNode, useState } from 'react';
import {
  LayoutDashboard, UtensilsCrossed, ShoppingBag, Bike, ClipboardList,
  BarChart3, Settings as SettingsIcon, Receipt, Wifi, WifiOff,
  Cloud, CloudOff, RefreshCw, Store, ChevronLeft, ChevronRight,
  LogOut, User,
} from 'lucide-react';
import { useApp } from '@/lib/context';
import { useAuth } from '@/lib/auth';

export type Page = 'dashboard' | 'dine_in' | 'takeaway' | 'delivery' | 'menu' | 'reports' | 'shifts' | 'settings';

interface LayoutProps {
  current: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
}

export function Layout({ current, onNavigate, children }: LayoutProps) {
  const { t, lang, isOnline, pendingSyncCount, sync, syncing, settings } = useApp();
  const { user, logout, canAccess } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const allNavItems: { id: Page; label: string; icon: ReactNode }[] = [
    { id: 'dashboard', label: t('dashboard'), icon: <LayoutDashboard size={20} /> },
    { id: 'dine_in', label: t('dineIn'), icon: <UtensilsCrossed size={20} /> },
    { id: 'takeaway', label: t('takeaway'), icon: <ShoppingBag size={20} /> },
    { id: 'delivery', label: t('delivery'), icon: <Bike size={20} /> },
    { id: 'menu', label: t('menu'), icon: <ClipboardList size={20} /> },
    { id: 'reports', label: t('reports'), icon: <BarChart3 size={20} /> },
    { id: 'shifts', label: t('shifts'), icon: <Receipt size={20} /> },
    { id: 'settings', label: t('settings'), icon: <SettingsIcon size={20} /> },
  ];

  const navItems = allNavItems.filter((item) => canAccess(item.id));

  const roleLabel = user?.role === 'manager' ? (lang === 'ar' ? 'مدير' : 'Manager') :
    user?.role === 'cashier' ? (lang === 'ar' ? 'كاشير' : 'Caissier') :
    user?.role === 'waiter' ? (lang === 'ar' ? 'نادل' : 'Serveur') : '';

  const sidebarWidth = collapsed ? 'w-20' : 'w-64';

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarWidth} bg-white border-r border-slate-100 flex flex-col transition-all duration-300 shrink-0`}>
        <div className="h-16 flex items-center px-4 border-b border-slate-100">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shrink-0">
              <Store size={20} className="text-white" />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="font-bold text-slate-800 text-sm truncate">{settings?.restaurant_name || t('appName')}</p>
                <p className="text-xs text-slate-400">POS System</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const active = current === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                  active
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User info + logout */}
        <div className="border-t border-slate-100 p-3">
          {!collapsed && user && (
            <div className="flex items-center gap-2 mb-2 px-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                user.role === 'manager' ? 'bg-violet-100 text-violet-600' :
                user.role === 'cashier' ? 'bg-blue-100 text-blue-600' :
                'bg-slate-100 text-slate-500'
              }`}>
                <User size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{user.name}</p>
                <p className="text-xs text-slate-400">{roleLabel}</p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-500 transition-colors"
          >
            <LogOut size={20} className="shrink-0" />
            {!collapsed && <span className="text-sm font-medium">{lang === 'ar' ? 'خروج' : 'Déconnexion'}</span>}
          </button>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="h-12 border-t border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
        >
          {collapsed ? (
            lang === 'ar' ? <ChevronLeft size={20} /> : <ChevronRight size={20} />
          ) : (
            lang === 'ar' ? <ChevronRight size={20} /> : <ChevronLeft size={20} />
          )}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0">
          <h1 className="text-lg font-bold text-slate-800">
            {navItems.find((n) => n.id === current)?.label || t('dashboard')}
          </h1>

          <div className="flex items-center gap-3">
            {/* Sync status */}
            {pendingSyncCount > 0 && (
              <button
                onClick={sync}
                disabled={syncing || !isOnline}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                <span>{pendingSyncCount} {t('pendingSync')}</span>
              </button>
            )}

            {/* Online/offline indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
              isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}>
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span>{isOnline ? t('online') : t('offline')}</span>
            </div>

            {/* Cloud icon */}
            <div className={`p-2 rounded-lg ${isOnline ? 'text-emerald-500' : 'text-slate-300'}`}>
              {isOnline ? <Cloud size={18} /> : <CloudOff size={18} />}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

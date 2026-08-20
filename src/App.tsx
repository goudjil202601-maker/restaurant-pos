import { useState } from 'react';
import { AppProvider } from '@/lib/context';
import { AuthProvider, useAuth } from '@/lib/auth';
import { Layout, type Page } from '@/components/Layout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { DineIn } from '@/pages/DineIn';
import { Takeaway } from '@/pages/Takeaway';
import { Delivery } from '@/pages/Delivery';
import { Menu } from '@/pages/Menu';
import { Reports } from '@/pages/Reports';
import { Shifts } from '@/pages/Shifts';
import { Settings } from '@/pages/Settings';

function AppContent() {
  const { user, canAccess } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');

  if (!user) return <Login />;

  const defaultPage: Page = user.role === 'waiter' ? 'dine_in' : user.role === 'cashier' ? 'dine_in' : 'dashboard';
  const safePage = canAccess(page) ? page : defaultPage;

  return (
    <Layout current={safePage} onNavigate={setPage}>
      {safePage === 'dashboard' && <Dashboard onNavigate={setPage} />}
      {safePage === 'dine_in' && <DineIn />}
      {safePage === 'takeaway' && <Takeaway />}
      {safePage === 'delivery' && <Delivery />}
      {safePage === 'menu' && <Menu />}
      {safePage === 'reports' && <Reports />}
      {safePage === 'shifts' && <Shifts />}
      {safePage === 'settings' && <Settings />}
    </Layout>
  );
}

function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </AppProvider>
  );
}

export default App;

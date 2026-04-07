import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import ArtikelPage from '@/pages/ArtikelPage';
import KategorienPage from '@/pages/KategorienPage';
import VerkaeuferPage from '@/pages/VerkaeuferPage';

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="artikel" element={<ArtikelPage />} />
              <Route path="kategorien" element={<KategorienPage />} />
              <Route path="verkaeufer" element={<VerkaeuferPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}

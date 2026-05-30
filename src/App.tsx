import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/app-shell';
import { LoginPage } from '@/pages/login-page';
import { BrandTrendsPage } from '@/pages/brand-trends-page';
import { ByRegionPage } from '@/pages/by-region-page';
import { RTSScanPage } from '@/pages/rts-scan-page';
import { RTSDashboardPage } from '@/pages/rts-dashboard-page';
import { UserManagementPage } from '@/pages/user-management-page';
import { useAuthStore } from '@/stores/auth-store';

function NavigationListener() {
  const navigate = useNavigate();

  useEffect(() => {
    const unlisten = listen<string>('navigate', (event) => {
      navigate(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [navigate]);

  return null;
}

function ProtectedLayout() {
  const { isAuthenticated, isValidating, validateSession } = useAuthStore();

  useEffect(() => {
    validateSession();
  }, [validateSession]);

  if (isValidating) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <Outlet />;
}

function RoleGuard({ role, children }: { role: string; children: React.ReactNode }) {
  const { user } = useAuthStore();
  return user?.role === role ? <>{children}</> : <Navigate to="/brand-trends" />;
}

export default function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <>
      <NavigationListener />
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/brand-trends" /> : <LoginPage />}
        />
        <Route element={<ProtectedLayout />}>
          <Route element={<AppShell />}>
            <Route path="/brand-trends" element={<BrandTrendsPage />} />
            <Route path="/by-region" element={<ByRegionPage />} />
            <Route path="/rts-scan" element={<RTSScanPage />} />
            <Route path="/rts-dashboard" element={<RTSDashboardPage />} />
            <Route
              path="/user-management"
              element={
                <RoleGuard role="admin">
                  <UserManagementPage />
                </RoleGuard>
              }
            />
            <Route path="*" element={<Navigate to="/brand-trends" />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

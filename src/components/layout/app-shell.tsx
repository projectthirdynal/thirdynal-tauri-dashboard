import { Outlet } from 'react-router-dom';
import { NavSidebar } from './nav-sidebar';
import { Header } from './header';
import { useUIStore } from '@/stores/ui-store';

export function AppShell() {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="flex h-screen bg-background">
      <NavSidebar collapsed={sidebarCollapsed} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

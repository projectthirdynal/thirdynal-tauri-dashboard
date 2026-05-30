import { Link, useLocation } from 'react-router-dom';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { TrendingUp, MapPin, ScanLine, ClipboardList, Users, ChevronLeft, ChevronRight } from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { path: '/brand-trends', label: 'Brand Trends', icon: TrendingUp },
  { path: '/by-region', label: 'By Region', icon: MapPin },
  { path: '/rts-scan', label: 'RTS Scan', icon: ScanLine },
  { path: '/rts-dashboard', label: 'RTS Dashboard', icon: ClipboardList },
  { path: '/user-management', label: 'Users', icon: Users, adminOnly: true },
];

export function NavSidebar({ collapsed }: { collapsed: boolean }) {
  const location = useLocation();
  const { toggleSidebar } = useUIStore();
  const { user } = useAuthStore();

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-14 items-center justify-between border-b px-4">
        {!collapsed && (
          <span className="font-semibold text-lg">THIRDYNAL</span>
        )}
        <button
          onClick={toggleSidebar}
          className="rounded-md p-1 hover:bg-accent"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems
          .filter((item) => !item.adminOnly || user?.role === 'admin')
          .map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon size={18} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
      </nav>
    </aside>
  );
}

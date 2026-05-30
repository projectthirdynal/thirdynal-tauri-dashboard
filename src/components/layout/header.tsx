import { useAuthStore } from '@/stores/auth-store';
import { LogOut, User } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuthStore();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <h1 className="text-lg font-semibold">Dashboard</h1>
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User size={16} />
            <span>{user.full_name}</span>
            <span className="rounded bg-secondary px-2 py-0.5 text-xs">
              {user.role}
            </span>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </header>
  );
}

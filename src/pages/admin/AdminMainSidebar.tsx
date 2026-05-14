import {
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Newspaper,
  Settings,
  Trophy,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clearAdminSession } from '@/lib/adminAuth';
import { isApiDataSource } from '@/lib/data/tournamentRepository';
import type { AdminPrimaryNavId } from './adminPanelTypes';
import { primaryNavLabel } from './adminPanelTypes';

const PRIMARY_ORDER: AdminPrimaryNavId[] = ['dashboard', 'torneos', 'jugadores', 'noticias', 'configuracion'];

const ICONS: Record<AdminPrimaryNavId, typeof Trophy> = {
  dashboard: LayoutDashboard,
  torneos: Trophy,
  jugadores: Users,
  noticias: Newspaper,
  configuracion: Settings,
};

type Props = {
  active: AdminPrimaryNavId;
  onNavigate: (id: AdminPrimaryNavId) => void;
  onNavigateHome: () => void;
};

export function AdminMainSidebar({ active, onNavigate, onNavigateHome }: Props) {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAdminSession();
    navigate(isApiDataSource() ? '/login' : '/', { replace: true });
  };

  const navBtn = (isActive: boolean) =>
    `flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm font-bold transition-colors ${
      isActive
        ? 'admin-theme-tab-active border-transparent shadow-sm'
        : 'border-transparent text-[#111318] dark:text-gray-200 hover:bg-gray-100/90 dark:hover:bg-gray-800/80'
    }`;

  return (
    <aside
      className="admin-main-sidebar fixed left-0 top-0 z-40 hidden h-svh w-[220px] flex-col border-r border-gray-200/80 bg-white/80 backdrop-blur-md dark:border-gray-700/70 dark:bg-gray-950/85 md:flex"
      aria-label="Panel de administración"
    >
      <div className="shrink-0 border-b border-gray-200/70 px-4 py-3 dark:border-gray-700/60">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#616f89] dark:text-gray-400">Admin</p>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-y-contain p-2.5" aria-label="Módulos">
        {PRIMARY_ORDER.map((id) => {
          const Icon = ICONS[id];
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className={navBtn(isActive)}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'opacity-100' : 'opacity-60'}`} aria-hidden />
              {primaryNavLabel(id)}
            </button>
          );
        })}
      </nav>

      <div className="shrink-0 space-y-1 border-t border-gray-200/70 bg-white/90 p-2.5 dark:border-gray-700/60 dark:bg-gray-950/90">
        <button
          type="button"
          onClick={onNavigateHome}
          className="flex w-full items-center gap-2 rounded-lg border border-gray-300/80 bg-white px-3 py-2 text-xs font-bold text-[#111318] transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900/70 dark:text-gray-100 dark:hover:bg-gray-800"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
          Volver al sitio
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

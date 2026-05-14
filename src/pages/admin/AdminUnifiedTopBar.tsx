import { Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { clearAdminSession } from '@/lib/adminAuth';
import { isApiDataSource } from '@/lib/data/tournamentRepository';
import type { AdminPrimaryNavId } from './adminPanelTypes';
import { primaryNavLabel } from './adminPanelTypes';

const PRIMARY_ITEMS: AdminPrimaryNavId[] = ['dashboard', 'torneos', 'jugadores', 'noticias', 'configuracion'];

type Props = {
  active: AdminPrimaryNavId;
  onNavigate: (id: AdminPrimaryNavId) => void;
  /** Si se pasa, reemplaza el enlace "Volver al sitio" por navegación condicional (cambios sin guardar). */
  onNavigateHome?: () => void;
};

export function AdminUnifiedTopBar({ active, onNavigate, onNavigateHome }: Props) {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAdminSession();
    navigate(isApiDataSource() ? '/login' : '/', { replace: true });
  };

  return (
    <div className="container-admin">
      <div className="flex min-h-[2.75rem] flex-nowrap items-center justify-between gap-2 py-2.5 sm:gap-3 md:min-h-[3rem] md:py-3">
        <div className="shrink-0 flex items-center">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#111318]/80 dark:text-white/85 whitespace-nowrap">
            Admin panel
          </p>
        </div>

        <nav
          className="flex-1 min-w-0 flex justify-center items-center overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Navegación principal del panel"
        >
          <div className="inline-flex items-center gap-0.5 sm:gap-1 flex-nowrap mx-auto">
            {PRIMARY_ITEMS.map((id) => {
              const isActive = active === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onNavigate(id)}
                  className={`shrink-0 h-9 rounded-lg px-2 sm:px-3 md:px-3.5 text-[11px] sm:text-xs md:text-sm font-bold transition-all border inline-flex items-center justify-center ${
                    isActive
                      ? 'bg-[#0d3b8a] text-white border-[#0d3b8a] shadow-sm dark:bg-primary dark:border-primary'
                      : 'border-transparent text-[#616f89] dark:text-gray-400 hover:bg-gray-100/90 dark:hover:bg-gray-800/90 hover:text-[#111318] dark:hover:text-white'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {primaryNavLabel(id)}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
          {onNavigateHome ? (
            <button
              type="button"
              onClick={onNavigateHome}
              className="h-9 inline-flex items-center justify-center rounded-lg px-2.5 sm:px-3 text-[11px] sm:text-xs md:text-sm font-bold border border-gray-300/90 dark:border-gray-600 bg-white/80 dark:bg-gray-900/60 text-[#111318] dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
            >
              Volver al sitio
            </button>
          ) : (
            <Link
              to="/"
              className="h-9 inline-flex items-center justify-center rounded-lg px-2.5 sm:px-3 text-[11px] sm:text-xs md:text-sm font-bold border border-gray-300/90 dark:border-gray-600 bg-white/80 dark:bg-gray-900/60 text-[#111318] dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
            >
              Volver al sitio
            </Link>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="h-9 inline-flex items-center justify-center gap-1 rounded-lg px-2 sm:px-2.5 text-[11px] sm:text-xs md:text-sm font-bold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/35 border border-transparent hover:border-red-200/80 dark:hover:border-red-900/50 transition-colors whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" aria-hidden />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
}

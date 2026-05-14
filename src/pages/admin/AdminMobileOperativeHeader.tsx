import { useEffect, useState } from 'react';
import { ExternalLink, LogOut, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clearAdminSession } from '@/lib/adminAuth';
import { isApiDataSource } from '@/lib/data/tournamentRepository';
import { CloseIcon, HamburgerIcon, primaryCtaClass } from '@/components/MobileNavDrawer';
import { useAdminRequestNavigate } from './AdminUnsavedChangesContext';

export function AdminMobileOperativeHeader() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const requestNavigate = useAdminRequestNavigate();

  const closeDrawer = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const runNav = (fn: () => void) => {
    requestNavigate(() => {
      fn();
      closeDrawer();
    });
  };

  const logout = () => {
    clearAdminSession();
    navigate(isApiDataSource() ? '/login' : '/', { replace: true });
  };

  return (
    <header className="app-site-header fixed left-0 right-0 top-0 z-[65] w-full border-b border-gray-200/90 md:hidden dark:border-gray-600/60">
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
        <div className="relative z-[70] flex items-center justify-between pb-3">
          <div className="min-w-0">
            <span className="block text-base font-black leading-tight tracking-[-0.015em] text-[#111318] dark:text-white">Admin · Torneos</span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#616f89] dark:text-gray-400">Operación rápida</span>
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gray-300/90 text-[#111318] transition-colors hover:bg-gray-100 dark:border-white/85 dark:text-white dark:hover:bg-white/10"
            aria-expanded={open}
            aria-haspopup="menu"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          >
            {open ? <CloseIcon className="h-6 w-6" aria-hidden /> : <HamburgerIcon className="h-6 w-6" aria-hidden />}
          </button>
        </div>

        {open ? (
          <div
            role="menu"
            aria-label="Acciones de administración"
            className="app-site-header-drawer z-[71] -mx-4 space-y-2 border-t border-gray-200/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-3 dark:border-gray-600/60"
          >
            <button type="button" role="menuitem" onClick={() => runNav(() => navigate('/admin/torneos'))} className={primaryCtaClass}>
              <Trophy className="size-4 shrink-0 opacity-90" aria-hidden />
              Ir a torneos
            </button>
            <button type="button" role="menuitem" onClick={() => runNav(() => navigate('/'))} className={primaryCtaClass}>
              <ExternalLink className="size-4 shrink-0 opacity-90" aria-hidden />
              Volver al sitio
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                closeDrawer();
                logout();
              }}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-bold text-red-700 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden />
              Salir de la cuenta
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}

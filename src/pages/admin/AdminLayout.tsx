import { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getAdminTournamentCssVariables } from '@/lib/admin/adminThemeStyle';
import { AdminUnsavedChangesProvider, useAdminRequestNavigate } from './AdminUnsavedChangesContext';
import { AdminMainSidebar } from './AdminMainSidebar';
import { AdminMobileOperativeHeader } from './AdminMobileOperativeHeader';
import { AdminModuleStrip } from './AdminModuleStrip';
import { adminHref, isAdminTournamentDetailPath, primaryNavFromPath } from './adminNavPaths';
import type { AdminPrimaryNavId } from './adminPanelTypes';
import { useAdminMobileLayout } from './useAdminMobileLayout';

function isMobileAdminForbiddenPath(pathname: string): boolean {
  const p = pathname.replace(/\/$/, '') || '/';
  if (p === '/admin') return true;
  if (p.startsWith('/admin/dashboard')) return true;
  if (p.startsWith('/admin/jugadores')) return true;
  if (p.startsWith('/admin/noticias')) return true;
  if (p.startsWith('/admin/configuracion')) return true;
  if (p.startsWith('/admin/torneos/nuevo')) return true;
  if (p.startsWith('/admin/torneos/constructor')) return true;
  return false;
}

function AdminLayoutShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const requestNavigate = useAdminRequestNavigate();
  const mainRef = useRef<HTMLElement | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const topNav = primaryNavFromPath(location.pathname);
  const hideModuleStrip = isAdminTournamentDetailPath(location.pathname);
  const mobileOperative = useAdminMobileLayout();

  useEffect(() => {
    if (!mobileOperative) return;
    if (!isMobileAdminForbiddenPath(location.pathname)) return;
    navigate('/admin/torneos', { replace: true });
  }, [mobileOperative, location.pathname, navigate]);

  const handlePrimaryNav = (id: AdminPrimaryNavId) => {
    requestNavigate(() => navigate(adminHref(id)));
  };

  const handleNavigateHome = () => {
    requestNavigate(() => navigate('/'));
  };

  const updateBackToTopVisibility = () => {
    const mainTop = mainRef.current?.scrollTop ?? 0;
    const windowTop = window.scrollY || document.documentElement.scrollTop || 0;
    setShowBackToTop(Math.max(mainTop, windowTop) > 160);
  };

  useEffect(() => {
    setShowBackToTop(false);
    mainRef.current?.scrollTo({ top: 0 });
  }, [location.pathname, location.search]);

  useEffect(() => {
    const main = mainRef.current;
    window.addEventListener('scroll', updateBackToTopVisibility, { passive: true });
    main?.addEventListener('scroll', updateBackToTopVisibility, { passive: true });
    updateBackToTopVisibility();
    return () => {
      window.removeEventListener('scroll', updateBackToTopVisibility);
      main?.removeEventListener('scroll', updateBackToTopVisibility);
    };
  });

  const scrollAdminToTop = () => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTo?.({ top: 0, behavior: 'smooth' });
    setShowBackToTop(false);
  };

  return (
    <div
      className="admin-layout-root admin-tournament-theme app-page-canvas min-h-screen max-w-[100vw] overflow-x-clip"
      style={getAdminTournamentCssVariables(1)}
    >
      <AdminMobileOperativeHeader />
      <AdminMainSidebar active={topNav} onNavigate={handlePrimaryNav} onNavigateHome={handleNavigateHome} />
      <div className="app-page-content admin-layout-body ml-0 flex min-h-0 min-w-0 flex-1 flex-col pt-[calc(4rem+env(safe-area-inset-top,0px))] md:ml-[220px] md:pt-0">
        {!hideModuleStrip ? (
          <div className="hidden md:block">
            <AdminModuleStrip pathname={location.pathname} />
          </div>
        ) : null}
        <main ref={mainRef} className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto">
          <Outlet />
        </main>
      </div>
      {showBackToTop ? (
        <button
          type="button"
          onClick={scrollAdminToTop}
          className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] right-4 z-[120] inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-[#111318]/90 text-white shadow-xl backdrop-blur-md transition-transform hover:scale-105 active:scale-95 md:bottom-6 md:right-6"
          aria-label="Volver arriba"
          title="Volver arriba"
        >
          <ArrowUp className="h-5 w-5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

export default function AdminLayout() {
  return (
    <AdminUnsavedChangesProvider>
      <AdminLayoutShell />
    </AdminUnsavedChangesProvider>
  );
}

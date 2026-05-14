import React, { useState } from 'react';
import { Circle, Search } from 'lucide-react';
import { useSiteSettings } from '../src/lib/siteSettings';
import { CloseIcon, HamburgerIcon, mobileNavDrawerItemClass, primaryCtaClass } from './MobileNavDrawer';

interface NavbarProps {
  currentScreen: string;
  setScreen: (screen: string) => void;
  onPlayerSearch?: (query: string) => void;
}

const logoImg = (() => {
  try {
    return new URL('../img/logo.webp', import.meta.url).href;
  } catch {
    return '';
  }
})();

export const Navbar: React.FC<NavbarProps> = ({ currentScreen, setScreen, onPlayerSearch }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const site = useSiteSettings();
  const logoSrc = site.branding.logoPrimaryDataUrl.trim() || logoImg;
  const brandName = site.branding.brandDisplayName.trim() || 'GREEK TENNIS';

  /** Ir a la solapa Jugadores (búsqueda en pantalla; sin modal). */
  const goToPlayersSearch = (query?: string) => {
    onPlayerSearch?.(query ?? '');
    setScreen('players');
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { id: 'home', label: 'Inicio' },
    { id: 'news', label: 'Novedades' },
    { id: 'directory', label: 'Torneos' },
    { id: 'rankings', label: 'Rankings' },
    { id: 'players', label: 'Jugadores' },
    { id: 'contact', label: 'Contacto' },
  ];

  const handleNavClick = (screenId: string) => {
    setScreen(screenId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="app-site-header fixed top-0 left-0 right-0 z-50 w-full border-b border-gray-200/90 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] dark:border-gray-600/60 md:px-10 md:pb-4 md:pt-[calc(1rem+env(safe-area-inset-top,0px))]">
      <div className="relative z-[55] mx-auto flex w-full max-w-[1440px] items-center justify-between">
        <div className="flex items-center gap-8 lg:gap-10">
          <button
            onClick={() => setScreen('home')}
            className="flex items-center gap-3 text-[#111318] transition-opacity hover:opacity-90 dark:text-white"
          >
            {logoSrc ? (
              <img src={logoSrc} alt={brandName} className="h-9 w-auto max-w-[140px] object-contain" />
            ) : (
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Circle className="w-6 h-6 fill-primary" aria-hidden />
              </div>
            )}
            <h2 className="hidden text-lg font-bold leading-tight tracking-[-0.015em] text-primary sm:block">{brandName}</h2>
          </button>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-7 md:flex lg:gap-9">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => setScreen(link.id)}
                className={`text-xs font-semibold uppercase tracking-[0.1em] transition-colors ${
                  currentScreen === link.id
                    ? 'text-primary'
                    : 'text-[#616f89] dark:text-gray-400 hover:text-primary'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Desktop: solo acción — búsqueda en modal */}
        <div className="hidden md:block">
          <button
            type="button"
            onClick={() => goToPlayersSearch('')}
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-5 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-primary-hover"
          >
            <Search className="size-4 shrink-0 opacity-90" aria-hidden />
            Buscar jugador
          </button>
        </div>

        {/* Mobile: hamburger button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="flex h-10 w-10 items-center justify-center rounded-md text-[#111318] transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800 md:hidden"
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {mobileMenuOpen ? <CloseIcon className="h-6 w-6" aria-hidden /> : <HamburgerIcon className="h-6 w-6" aria-hidden />}
        </button>
      </div>

      {/* Mobile menú: overlay + panel (misma base visual que `MobileNavDrawer` admin) */}
      {mobileMenuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[48] bg-black/50 backdrop-blur-[2px] md:hidden"
            aria-label="Cerrar menú"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            className="app-site-header-drawer absolute left-0 right-0 top-full z-[49] border border-t-0 border-gray-200/90 dark:border-gray-600 md:hidden"
            role="dialog"
            aria-label="Menú de navegación"
          >
            <nav className="flex max-h-[min(70vh,calc(100dvh-5rem))] flex-col space-y-1 overflow-y-auto overscroll-y-contain p-4">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => handleNavClick(link.id)}
                  className={mobileNavDrawerItemClass(currentScreen === link.id)}
                >
                  {link.label}
                </button>
              ))}
              <div className="mt-2 space-y-2 border-t border-[#e5e7eb] pt-3 dark:border-gray-700">
                <button type="button" onClick={() => goToPlayersSearch('')} className={primaryCtaClass}>
                  <Search className="size-4 shrink-0 opacity-90" aria-hidden />
                  Buscar jugador
                </button>
              </div>
            </nav>
          </div>
        </>
      ) : null}
    </header>
  );
};

import type { ReactNode } from 'react';

/** Icono hamburguesa (tres líneas) — mismo SVG que el sitio público. */
export function HamburgerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

/** Cierre (X) — mismo SVG que el sitio público. */
export function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/** Clases de cada ítem del menú vertical (alineado con `Navbar` público). */
export function mobileNavDrawerItemClass(active: boolean): string {
  return active
    ? 'w-full rounded-md px-4 py-3 text-left text-sm font-semibold transition-colors bg-primary/10 text-primary'
    : 'w-full rounded-md px-4 py-3 text-left text-sm font-semibold transition-colors text-[#111318] dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800';
}

const primaryCtaClass =
  'flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-primary-hover';

export { primaryCtaClass };

export type MobileNavDrawerItem = {
  id: string;
  label: string;
  description?: string;
  active?: boolean;
  onClick: () => void;
};

type MobileNavDrawerProps = {
  open: boolean;
  onClose: () => void;
  /** Clase Tailwind `top-*` para dejar visible la barra fija superior (admin / público). */
  topOffsetClass: string;
  ariaLabel: string;
  /** Logo; si no hay `src`, se muestra marcador de marca. */
  logoSrc?: string;
  logoAlt?: string;
  /** Texto junto al logo (ej. marca o “Admin”). */
  brandTitle?: string;
  items: MobileNavDrawerItem[];
  /** Botón principal inferior (estilo azul del sitio). */
  primaryAction?: { label: string; icon?: ReactNode; onClick: () => void };
  /** Acciones secundarias debajo del bloque principal. */
  secondaryActions?: ReactNode;
  /**
   * Si es true, no se muestra la fila superior del panel (título/logo + X).
   * Útil cuando el cierre ya está en la barra fija (ej. admin con hamburguesa/X arriba).
   */
  hideDrawerHeader?: boolean;
};

/**
 * Panel móvil full-anchura con overlay, mismo tratamiento visual que `.app-site-header-drawer`
 * y misma escala táctil que el menú público (`Navbar`).
 */
export function MobileNavDrawer({
  open,
  onClose,
  topOffsetClass,
  ariaLabel,
  logoSrc,
  logoAlt = '',
  brandTitle,
  items,
  primaryAction,
  secondaryActions,
  hideDrawerHeader = false,
}: MobileNavDrawerProps) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className={`fixed inset-x-0 bottom-0 z-[63] bg-black/50 backdrop-blur-[2px] md:hidden ${topOffsetClass}`}
        aria-label="Cerrar menú"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={`app-site-header-drawer fixed inset-x-0 bottom-0 z-[64] flex min-h-0 flex-col border-t border-gray-200/90 shadow-lg dark:border-gray-600 md:hidden ${topOffsetClass}`}
      >
        {!hideDrawerHeader ? (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200/80 px-4 py-3 dark:border-gray-700/80">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {logoSrc ? (
                <img src={logoSrc} alt={logoAlt} className="h-9 w-auto max-w-[140px] shrink-0 object-contain" />
              ) : brandTitle ? (
                <p className="truncate text-base font-bold leading-tight tracking-tight text-[#111318] dark:text-white">{brandTitle}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-[#111318] transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800"
              aria-label="Cerrar menú"
            >
              <CloseIcon className="h-7 w-7" aria-hidden />
            </button>
          </div>
        ) : null}

        {items.length > 0 ? (
          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-y-contain px-4 py-3">
            {items.map((item) => (
              <button key={item.id} type="button" onClick={item.onClick} className={mobileNavDrawerItemClass(!!item.active)}>
                <span className="block">{item.label}</span>
                {item.description ? (
                  <span className="mt-1 block text-xs font-normal leading-snug text-[#616f89] dark:text-gray-400">{item.description}</span>
                ) : null}
              </button>
            ))}
          </nav>
        ) : (
          <div className="min-h-0 flex-1" aria-hidden />
        )}

        {(primaryAction || secondaryActions) && (
          <div className="shrink-0 space-y-2 border-t border-[#e5e7eb] px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-3 dark:border-gray-700">
            {primaryAction ? (
              <button type="button" onClick={primaryAction.onClick} className={primaryCtaClass}>
                {primaryAction.icon}
                {primaryAction.label}
              </button>
            ) : null}
            {secondaryActions}
          </div>
        )}
      </div>
    </>
  );
}

import type { ReactNode } from 'react';

const btnGhost =
  'inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-semibold text-[#111318] dark:text-gray-200 admin-theme-accent-text hover:underline';

export interface AdminCmsEditorLayoutProps {
  /** Ej.: Noticias › Nueva noticia */
  breadcrumb?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  title: string;
  subtitle?: string;
  /** Pill de estado u otro control, arriba a la derecha */
  statusBadge?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Layout base para flujos tipo CMS en el admin (noticias, torneos, etc.):
 * volver al listado, cabecera y pie de acciones.
 */
export function AdminCmsEditorLayout({
  breadcrumb,
  onBack,
  backLabel = '← Volver al listado',
  title,
  subtitle,
  statusBadge,
  children,
  footer,
}: AdminCmsEditorLayoutProps) {
  return (
    <div className="admin-content-stack">
      <div className="flex flex-col gap-4 border-b border-gray-200/80 pb-5 dark:border-gray-600/60 sm:pb-6">
        {onBack ? (
          <button type="button" onClick={onBack} className={btnGhost}>
            {backLabel ?? '← Volver'}
          </button>
        ) : null}
        {breadcrumb ? (
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#616f89] dark:text-gray-500">{breadcrumb}</p>
        ) : null}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-3xl space-y-1">
            <h2 className="text-xl font-bold text-[#111318] dark:text-white md:text-2xl">{title}</h2>
            {subtitle ? <p className="text-sm leading-relaxed text-[#616f89] dark:text-gray-400">{subtitle}</p> : null}
          </div>
          {statusBadge ? <div className="shrink-0">{statusBadge}</div> : null}
        </div>
      </div>
      <div className="min-w-0">{children}</div>
      {footer ? <footer className="border-t border-gray-200/90 pt-5 dark:border-gray-600">{footer}</footer> : null}
    </div>
  );
}

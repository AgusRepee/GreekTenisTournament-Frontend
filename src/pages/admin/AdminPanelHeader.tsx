import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { AdminPrimaryNavId, TournamentNavId } from './adminPanelTypes';
import { primaryNavLabel, tournamentNavLabel } from './adminPanelTypes';
import { useOptionalAdminUnsavedChangesContext } from './AdminUnsavedChangesContext';

type TournamentHeaderProps = {
  context: 'tournament';
  section: TournamentNavId;
  statusLabel: 'En curso' | 'Finalizado' | 'Próximo';
  backTo?: string;
  backLabel?: string;
};

type GlobalHeaderProps = {
  context: 'global';
  primaryNav: AdminPrimaryNavId;
  title: string;
  subtitle: string;
};

type Props = TournamentHeaderProps | GlobalHeaderProps;

/**
 * Franja contextual bajo la barra principal (sin acciones duplicadas).
 */
export function AdminPanelHeader(props: Props) {
  if (props.context === 'global') {
    const { primaryNav, title, subtitle } = props;
    const currentPrimary = primaryNavLabel(primaryNav);

    return (
      <div className="app-glass-panel app-glass-panel--bar admin-theme-header-strip border-t border-gray-200/75 dark:border-gray-700/55">
        <div className="container-admin py-4 md:py-5">
          <div className="min-w-0 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#616f89] dark:text-gray-500">
              <span className="text-[#111318]/75 dark:text-white/80">Panel</span>
              <span className="mx-1.5 font-normal opacity-35" aria-hidden>
                /
              </span>
              <span>{currentPrimary}</span>
            </p>
            <h1 className="font-display text-xl font-bold tracking-tight text-[#111318] dark:text-white md:text-2xl">{title}</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-[#616f89] dark:text-gray-400">{subtitle}</p>
          </div>
        </div>
      </div>
    );
  }

  const { statusLabel, section, backTo, backLabel } = props;
  const sectionTitle = tournamentNavLabel(section);
  const navigate = useNavigate();
  const unsavedCtx = useOptionalAdminUnsavedChangesContext();

  return (
    <div className="app-glass-panel app-glass-panel--bar admin-theme-header-strip border-t border-gray-200/75 dark:border-gray-700/55">
      <div className="container-admin py-2 md:py-2.5 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          {backTo ? (
            <Link
              to={backTo}
              onClick={(e) => {
                if (!unsavedCtx) return;
                e.preventDefault();
                unsavedCtx.requestNavigate(() => navigate(backTo));
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#616f89] dark:text-gray-400 hover:text-[#111318] dark:hover:text-white transition-colors shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" aria-hidden />
              {backLabel ?? 'Volver'}
            </Link>
          ) : (
            <span />
          )}
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shrink-0 ${
              statusLabel === 'Finalizado'
                ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100'
                : statusLabel === 'Próximo'
                  ? 'bg-amber-100 text-amber-950 dark:bg-amber-900/45 dark:text-amber-100'
                  : 'bg-emerald-100 text-emerald-950 dark:bg-emerald-900/40 dark:text-emerald-100'
            }`}
          >
            {statusLabel}
          </span>
        </div>

        <p className="text-[11px] font-semibold text-[#616f89] dark:text-gray-500">
          Sección: <span className="text-[#111318] dark:text-gray-200">{sectionTitle}</span>
        </p>
      </div>
    </div>
  );
}

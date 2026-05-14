import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { LigaNumKey } from '@/lib/tennis/loadLigasFromDocs';
import { LIGA_NUMBERS } from '@/lib/tennis/loadLigasFromDocs';
import { novakTournamentId } from '@/lib/tennis/generateTournamentsFromLigas';
import type { AdminTournamentLifecycle } from '@/lib/admin/tournamentAdminLifecycle';
import { adminLifecycleLabel } from '@/lib/admin/tournamentAdminLifecycle';
import type { TournamentNavId } from './adminPanelTypes';
import { tournamentNavLabel } from './adminPanelTypes';
import { useOptionalAdminUnsavedChangesContext } from './AdminUnsavedChangesContext';

function lifecycleBadgeClass(l: AdminTournamentLifecycle): string {
  switch (l) {
    case 'archivado':
      return 'bg-slate-300/90 text-slate-900 dark:bg-slate-600 dark:text-slate-100';
    case 'finalizado':
      return 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100';
    case 'en_curso':
      return 'bg-emerald-500/20 text-emerald-950 ring-1 ring-emerald-600/35 dark:bg-emerald-900/40 dark:text-emerald-100';
    case 'configurado':
      return 'bg-sky-500/15 text-sky-950 ring-1 ring-sky-600/30 dark:bg-sky-900/35 dark:text-sky-100';
    default:
      return 'bg-amber-100 text-amber-950 ring-1 ring-amber-500/35 dark:bg-amber-900/40 dark:text-amber-100';
  }
}

type Props = {
  backTo: string;
  backLabel: string;
  tournamentName: string;
  lifecycle: AdminTournamentLifecycle;
  currentSection: TournamentNavId;
  /** Liga numérica del torneo (siempre visible). */
  ligaNum: LigaNumKey;
  showLeagueSwitcher: boolean;
  activeLeague: LigaNumKey;
};

export function AdminTournamentHeader({
  backTo,
  backLabel,
  tournamentName,
  lifecycle,
  currentSection,
  ligaNum,
  showLeagueSwitcher,
  activeLeague,
}: Props) {
  const navigate = useNavigate();
  const unsavedCtx = useOptionalAdminUnsavedChangesContext();

  const tabBtn = (active: boolean) =>
    `min-h-[2.35rem] px-3.5 py-2 rounded-lg text-xs font-bold transition-all border ${
      active
        ? 'admin-theme-tab-active shadow-sm'
        : 'bg-gray-100 text-[#111318] border-gray-200/90 hover:bg-gray-200/90 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-500/55 dark:hover:bg-gray-600'
    }`;

  return (
    <header className="app-glass-panel app-glass-panel--bar admin-theme-header-strip border-t border-gray-200/75 dark:border-gray-700/55">
      <div className="container-admin py-4 md:py-5 space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between min-w-0">
          <div className="min-w-0 space-y-3 flex-1">
            {backTo ? (
              <Link
                to={backTo}
                onClick={(e) => {
                  if (!unsavedCtx) return;
                  e.preventDefault();
                  unsavedCtx.requestNavigate(() => navigate(backTo));
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#616f89] dark:text-gray-400 hover:text-[#111318] dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" aria-hidden />
                {backLabel}
              </Link>
            ) : null}
            <div className="flex flex-wrap items-center gap-2.5 gap-y-2">
              <h1 className="font-display text-xl font-bold tracking-tight text-[#111318] dark:text-white md:text-2xl min-w-0 break-words">
                {tournamentName}
              </h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shrink-0 ${lifecycleBadgeClass(lifecycle)}`}
              >
                {adminLifecycleLabel(lifecycle)}
              </span>
              <span className="inline-flex items-center rounded-full border border-gray-200/90 bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#616f89] dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-300 shrink-0">
                Liga {ligaNum}
              </span>
            </div>
            <p className="text-xs text-[#616f89] dark:text-gray-500">
              Sección: <span className="font-semibold text-[#111318] dark:text-gray-200">{tournamentNavLabel(currentSection)}</span>
            </p>
          </div>
        </div>

        {showLeagueSwitcher ? (
          <div className="rounded-xl border border-gray-200/80 bg-white/40 px-3 py-3 dark:border-gray-600/60 dark:bg-gray-900/35">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#616f89] dark:text-gray-500 mb-2.5">
              Cambiar liga del mismo torneo
            </p>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Ligas del torneo">
              {LIGA_NUMBERS.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="tab"
                  aria-selected={activeLeague === n}
                  onClick={() => navigate(`/admin/torneos/${encodeURIComponent(novakTournamentId(n))}`)}
                  className={tabBtn(activeLeague === n)}
                >
                  Liga {n}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}

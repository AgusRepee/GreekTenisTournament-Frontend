import { useMemo } from 'react';
import { LayoutList } from 'lucide-react';
import { useClubData } from '@/lib/clubDataStore';
import { getTournamentById } from '@/lib/mockData';
import { effectiveTournamentCatalogType } from '@/lib/tennis/rankingPointsGreek500';
import { buildFixtureCatalogEntriesForTournament } from '@/lib/tennis/buildFixtureCatalog';
import { matchInputDedupeKey } from '@/lib/tennis/matchDedupe';
import { useMatchSchedules } from '@/lib/tennis/matchScheduleStore';
import type { LigaNumKey } from '@/lib/tennis/loadLigasFromDocs';
import type { MatchInput } from '@/types/tennisResults';
import { type AdminTournamentLifecycle, recommendNextAdminAction, isTournamentWorkspaceReadOnly } from '@/lib/admin/tournamentAdminLifecycle';
import type { TournamentNavId } from '../adminPanelTypes';

type Props = {
  ligaNum: LigaNumKey;
  tournamentId: string;
  results: MatchInput[];
  lifecycle: AdminTournamentLifecycle;
  onNavigate: (id: TournamentNavId) => void;
  /** Ir a Resultados y abrir el partido (solo si no es solo lectura). */
  onRequestCargarPendiente?: (dedupeKey: string) => void;
  /** Grupos completos pero falta confirmación oficial en Resultados. */
  showConfirmarGruposAlert?: boolean;
  onIrResultadosConfirm?: () => void;
  /** Grupos completos y cuadro KO aún sin armar. */
  showEliminacionArmadoAlert?: boolean;
  onIrEliminacion?: () => void;
};

function isStored(m: MatchInput): boolean {
  return m.status === 'played' && !!m.score?.trim();
}

const cardBase =
  'admin-theme-card app-glass-panel rounded-xl border border-gray-200/80 shadow-sm dark:border-gray-600/55 overflow-hidden';

export function AdminResumenView({
  ligaNum,
  tournamentId,
  results,
  lifecycle,
  onNavigate,
  onRequestCargarPendiente,
  showConfirmarGruposAlert = false,
  onIrResultadosConfirm,
  showEliminacionArmadoAlert = false,
  onIrEliminacion,
}: Props) {
  const readOnly = isTournamentWorkspaceReadOnly(lifecycle);
  const club = useClubData();
  const schedules = useMatchSchedules();
  const { players } = club;
  const isMasters1000 = useMemo(() => {
    const t = getTournamentById(tournamentId);
    return t != null && effectiveTournamentCatalogType(t) === 'masters1000';
  }, [tournamentId, club.tournaments]);
  const catalog = useMemo(() => {
    const t = getTournamentById(tournamentId);
    return buildFixtureCatalogEntriesForTournament(t, players);
  }, [tournamentId, players]);
  const completedKeys = new Set(results.filter(isStored).map((r) => matchInputDedupeKey(r)));
  const totalFixture = catalog.length;
  const played = catalog.filter((row) => completedKeys.has(row.dedupeKey)).length;
  const pending = totalFixture - played;
  const pct = totalFixture > 0 ? Math.round((played / totalFixture) * 100) : 0;
  const next = recommendNextAdminAction(catalog, completedKeys, pending, { isMasters1000 });
  const tournamentSchedules = schedules.filter((s) => s.tournamentId === tournamentId);
  const scheduleDrafts = tournamentSchedules.filter(
    (s) => s.scheduleStatus === 'scheduled' && !!s.date?.trim() && !!s.time?.trim(),
  ).length;
  const schedulePublished = tournamentSchedules.filter((s) => s.scheduleStatus === 'confirmed' || s.scheduleStatus === 'rescheduled').length;
  const scheduleAlerts = tournamentSchedules.filter(
    (s) => s.scheduleStatus === 'postponed' || s.scheduleStatus === 'suspended' || s.scheduleStatus === 'cancelled',
  ).length;

  return (
    <div className="space-y-6">
      <section className={`${cardBase} p-4 md:p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <LayoutList className="h-5 w-5 shrink-0 admin-theme-icon" aria-hidden />
            <h2 className="text-lg font-bold text-[#111318] dark:text-white">Resumen</h2>
          </div>
          {readOnly ? (
            <span className="shrink-0 rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-800 dark:bg-slate-700 dark:text-slate-100">
              Solo lectura
            </span>
          ) : null}
        </div>

        {isMasters1000 ? (
          <p className="mt-3 text-xs font-semibold leading-snug text-[#616f89] dark:text-gray-400">
            Masters 1000 · Top 8 del ranking · 2 grupos de 4 · semifinales y final
          </p>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-emerald-500/45 bg-emerald-50/85 px-3 py-3 dark:bg-emerald-950/30">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200">Jugados</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-950 dark:text-emerald-50">{played}</p>
          </div>
          <div className="rounded-lg border border-gray-200/90 bg-[#f8f9fb] px-3 py-3 dark:border-gray-600 dark:bg-gray-800/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#616f89]">Fixture total</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[#111318] dark:text-white">{totalFixture}</p>
          </div>
          <div className="rounded-lg border border-gray-200/90 bg-white px-3 py-3 dark:border-gray-600 dark:bg-gray-900/40">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#616f89]">Avance</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[#111318] dark:text-white">{pct}%</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="rounded-lg border border-gray-200/90 bg-white px-3 py-3 dark:border-gray-600 dark:bg-gray-900/40">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#616f89]">Estado</p>
            <p className="mt-1 text-sm font-bold text-[#111318] dark:text-white">{readOnly ? 'Solo lectura' : 'Operativo'}</p>
            <p className="mt-1 text-[11px] text-[#616f89] dark:text-gray-400">
              {readOnly ? 'Sin edición habilitada.' : 'Podés cargar y editar resultados.'}
            </p>
          </div>
        </div>
      </section>

      <section className={`${cardBase} p-4 md:p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#616f89] dark:text-gray-500">Operación</p>
            <h3 className="mt-1 text-base font-bold text-[#111318] dark:text-white">Agenda y carga</h3>
          </div>
          {!readOnly ? (
            <button
              type="button"
              className="admin-theme-btn inline-flex min-h-10 w-full items-center justify-center rounded-lg border px-3 py-2 text-xs font-bold shadow-sm sm:w-auto"
              onClick={() => onNavigate(scheduleDrafts > 0 ? 'fechas' : next.target)}
            >
              {scheduleDrafts > 0 ? 'Publicar horarios' : 'Continuar operación'}
            </button>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-sky-500/35 bg-sky-50/80 px-3 py-3 dark:border-sky-700/45 dark:bg-sky-950/30">
            <p className="text-[10px] font-bold uppercase tracking-wide text-sky-900 dark:text-sky-200">Por publicar</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-sky-950 dark:text-sky-50">{scheduleDrafts}</p>
            <p className="mt-1 text-[11px] text-sky-950/80 dark:text-sky-100/80">Horarios cargados que aún no ve el jugador.</p>
          </div>
          <div className="rounded-lg border border-emerald-500/35 bg-emerald-50/80 px-3 py-3 dark:border-emerald-700/45 dark:bg-emerald-950/30">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-900 dark:text-emerald-200">Publicados</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-emerald-950 dark:text-emerald-50">{schedulePublished}</p>
            <p className="mt-1 text-[11px] text-emerald-950/80 dark:text-emerald-100/80">Partidos visibles en programación pública.</p>
          </div>
          <div className="rounded-lg border border-amber-500/35 bg-amber-50/80 px-3 py-3 dark:border-amber-700/45 dark:bg-amber-950/30">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200">Alertas</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-amber-950 dark:text-amber-50">{scheduleAlerts}</p>
            <p className="mt-1 text-[11px] text-amber-950/80 dark:text-amber-100/80">Postergados, suspendidos o cancelados.</p>
          </div>
        </div>
      </section>

      {showConfirmarGruposAlert && onIrResultadosConfirm && !readOnly ? (
        <section
          className={`${cardBase} border border-amber-500/45 bg-amber-50/90 p-4 dark:border-amber-700/50 dark:bg-amber-950/35 md:p-5`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-950 dark:text-amber-200">Fase de grupos</p>
          <p className="mt-1 text-base font-bold text-[#111318] dark:text-white">Fase de grupos completa. Falta confirmar los resultados.</p>
          <p className="mt-1 text-sm text-amber-950/90 dark:text-amber-100/90">
            Confirmá oficialmente los resultados en la pestaña Resultados para habilitar el armado de la eliminación.
          </p>
          <button
            type="button"
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-amber-700/40 bg-white px-4 py-2.5 text-sm font-bold text-amber-950 shadow-sm hover:bg-amber-100/80 dark:border-amber-600/50 dark:bg-amber-900/40 dark:text-amber-50 dark:hover:bg-amber-900/60 sm:w-auto"
            onClick={() => onIrResultadosConfirm()}
          >
            Ir a Resultados
          </button>
        </section>
      ) : null}

      {showEliminacionArmadoAlert && onIrEliminacion && !readOnly ? (
        <section
          className={`${cardBase} border border-sky-500/40 bg-sky-50/90 p-4 dark:border-sky-600/50 dark:bg-sky-950/35 md:p-5`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-sky-900 dark:text-sky-200">Eliminación</p>
          <p className="mt-1 text-base font-bold text-[#111318] dark:text-white">Resultados de grupos confirmados. Falta armar la eliminación.</p>
          <p className="mt-1 text-sm text-sky-950/90 dark:text-sky-100/90">
            {isMasters1000
              ? 'Armá y confirmá las semifinales para crear los partidos pendientes en Resultados y Fechas.'
              : 'Armá y confirmá los cruces de cuartos para crear los partidos pendientes en Resultados y Fechas.'}
          </p>
          <button
            type="button"
            className="admin-theme-btn mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-bold shadow-sm sm:w-auto"
            onClick={() => onIrEliminacion()}
          >
            Ir a Eliminación
          </button>
        </section>
      ) : null}

      <section className={`${cardBase} p-4 md:p-5`}>
        <p className="text-[10px] font-bold tracking-[0.14em] text-[#616f89] dark:text-gray-500">Siguiente</p>
        <p className="mt-1.5 text-base font-bold text-[#111318] dark:text-white">{next.title}</p>
        {!readOnly ? (
          <div className="mt-4">
            <button
              type="button"
              className="admin-theme-btn inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-bold shadow-sm sm:w-auto"
              onClick={() => onNavigate(next.target)}
            >
              Ir a{' '}
              {next.target === 'resultados' ? 'Resultados' : next.target === 'tabla' ? 'Tabla' : 'Fechas'}
            </button>
          </div>
        ) : (
          <p className="mt-2 text-xs text-amber-900 dark:text-amber-200/90">Sin edición en este torneo.</p>
        )}
      </section>
    </div>
  );
}

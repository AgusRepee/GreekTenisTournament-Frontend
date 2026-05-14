import { useEffect, useMemo, useState } from 'react';
import { Plus, Wrench } from 'lucide-react';
import { useClubData } from '@/lib/clubDataStore';
import type { AdminTournamentProject } from '@/lib/admin/adminTournamentBuilderTypes';
import { loadAdminTournamentProjects, subscribeAdminTournamentProjects } from '@/lib/admin/adminTournamentBuilderStorage';
import { getTournamentById, isTournamentCurrent } from '@/lib/mockData';
import type { Tournament } from '@/lib/mockData';
import { isNovakTournamentId, novakTournamentId } from '@/lib/tennis/generateTournamentsFromLigas';
import { LIGA_NUMBERS, ligasData } from '@/lib/tennis/loadLigasFromDocs';
import { showAdminTournamentCreationUi } from '@/config/adminFeatures';
import { useSafeAdminNavigate } from '../AdminUnsavedChangesContext';
import { useResults } from '@/lib/tennis/resultsStore';
import { useMatchSchedules } from '@/lib/tennis/matchScheduleStore';
import { collectPendingWorkload } from '@/lib/tennis/adminPendingWorkload';

function getCoverUrl(filename: string): string {
  try {
    return new URL(`../../../../img/${filename}`, import.meta.url).href;
  } catch {
    return '';
  }
}

function visualStatus(t: Tournament | undefined): 'En curso' | 'Finalizado' | 'Próximo' {
  if (!t) return 'Próximo';
  if (t.status === 'finished') return 'Finalizado';
  if (t.status === 'upcoming' && isTournamentCurrent(t)) return 'En curso';
  return 'Próximo';
}

function aggregateNovakVisualStatus(): 'En curso' | 'Finalizado' | 'Próximo' {
  let hasCurrent = false;
  let allFinished = true;
  for (const n of LIGA_NUMBERS) {
    const t = getTournamentById(novakTournamentId(n));
    if (!t) continue;
    if (t.status !== 'finished') allFinished = false;
    if (t.status === 'upcoming' && isTournamentCurrent(t)) hasCurrent = true;
  }
  if (hasCurrent) return 'En curso';
  if (allFinished) return 'Finalizado';
  return 'Próximo';
}

const BUILDER_LIFECYCLE: Record<AdminTournamentProject['lifecycle'], string> = {
  draft: 'Borrador',
  groups_configured: 'Grupos listos',
  fixture_generated: 'Fixture',
  active: 'Activo',
  finished: 'Finalizado',
};

const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-bold border shadow-sm transition-opacity admin-theme-btn';

function statusBadgeClass(visual: 'En curso' | 'Finalizado' | 'Próximo'): string {
  if (visual === 'Finalizado') {
    return 'bg-slate-900/80 text-white dark:bg-slate-100/90 dark:text-slate-900';
  }
  if (visual === 'Próximo') {
    return 'bg-amber-500/90 text-amber-950';
  }
  return 'bg-emerald-600/90 text-white';
}

type CardProps = {
  to: string;
  title: string;
  description: string;
  status: 'En curso' | 'Finalizado' | 'Próximo';
  coverHref: string;
  pendingResults?: number;
  scheduleDrafts?: number;
};

function TournamentCard({ to, title, description, status, coverHref, pendingResults = 0, scheduleDrafts = 0 }: CardProps) {
  const safeNav = useSafeAdminNavigate();
  const badge = statusBadgeClass(status);
  return (
    <li>
      <button
        type="button"
        onClick={() => safeNav(to)}
        className="app-glass-panel app-interactive-card group flex w-full flex-col overflow-hidden rounded-xl text-left shadow-sm transition-colors"
      >
        <div
          className={`relative aspect-[21/9] w-full bg-cover bg-center ${!coverHref ? 'admin-theme-hero-fallback' : ''}`}
          style={coverHref ? { backgroundImage: `url("${coverHref}")` } : undefined}
        >
          {coverHref ? <div className="absolute inset-0 admin-theme-hero-overlay pointer-events-none" aria-hidden /> : null}
          <span
            className={`absolute right-3 top-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${badge}`}
          >
            {status}
          </span>
        </div>
        <div className="p-4 md:p-5 space-y-1.5">
          <h2 className="text-base md:text-lg font-bold text-[#111318] dark:text-white font-display tracking-tight group-hover:text-primary transition-colors">
            {title}
          </h2>
          <p className="text-sm text-[#616f89] dark:text-gray-400 leading-snug line-clamp-2">{description}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="inline-flex rounded-full bg-amber-500/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
              {pendingResults} resultados pendientes
            </span>
            <span className="inline-flex rounded-full bg-sky-500/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800 dark:text-sky-200">
              {scheduleDrafts} horarios por publicar
            </span>
          </div>
        </div>
      </button>
    </li>
  );
}

export function AdminTournamentListView() {
  const club = useClubData();
  const results = useResults();
  const schedules = useMatchSchedules();
  const safeNav = useSafeAdminNavigate();
  const [builderProjects, setBuilderProjects] = useState<AdminTournamentProject[]>(() => loadAdminTournamentProjects());

  useEffect(() => subscribeAdminTournamentProjects(() => setBuilderProjects(loadAdminTournamentProjects())), []);

  const novakEntry = useMemo(() => {
    const first = getTournamentById(novakTournamentId(1));
    const title = first?.name?.replace(/\s*[–-]\s*Liga\s*\d\s*$/i, '')?.trim() || first?.name || 'Novak Djokovic';
    const desc =
      ligasData[1]?.torneo ??
      'Torneo del sistema con seis ligas: fixture, resultados, tablas y eliminación por liga.';
    const cover = first?.coverImage ? getCoverUrl(first.coverImage) : '';
    return { title, desc, cover, to: `/admin/torneos/${encodeURIComponent(novakTournamentId(1))}` };
  }, [club]);

  const otherTournaments = useMemo(() => {
    const seen = new Set<string>();
    const out: Tournament[] = [];
    for (const t of club.tournaments) {
      if (isNovakTournamentId(t.id)) continue;
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      out.push(t);
    }
    return out.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [club.tournaments]);

  const novakStatus = aggregateNovakVisualStatus();
  const metricForTournament = (id: string) => ({
    pendingResults: collectPendingWorkload(id, results, club.players).length,
    scheduleDrafts: schedules.filter((s) => s.tournamentId === id && s.scheduleStatus === 'scheduled' && !!s.date?.trim() && !!s.time?.trim()).length,
  });
  const novakMetrics = LIGA_NUMBERS.reduce(
    (acc, n) => {
      const m = metricForTournament(novakTournamentId(n));
      return {
        pendingResults: acc.pendingResults + m.pendingResults,
        scheduleDrafts: acc.scheduleDrafts + m.scheduleDrafts,
      };
    },
    { pendingResults: 0, scheduleDrafts: 0 },
  );

  return (
    <div className="space-y-8">
      {showAdminTournamentCreationUi ? (
        <section className="app-glass-panel rounded-xl border border-primary/25 bg-primary/[0.04] p-5 dark:border-primary/30 dark:bg-primary/10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Constructor visual</p>
              <h2 className="text-lg font-bold text-[#111318] dark:text-white">Torneos nuevos (proyectos)</h2>
              <p className="max-w-xl text-sm leading-relaxed text-[#616f89] dark:text-gray-400">
                Creá torneos con ligas, reglas por liga y grupos con arrastre. Se guardan en este navegador; no reemplazan el catálogo del sitio.
              </p>
            </div>
            <button type="button" onClick={() => safeNav('/admin/torneos/nuevo')} className={`${btnPrimary} shrink-0`}>
              <Plus className="h-4 w-4" aria-hidden />
              Crear torneo
            </button>
          </div>
          {builderProjects.length === 0 ? (
            <p className="mt-4 text-sm text-[#616f89] dark:text-gray-400">Todavía no hay proyectos. Usá “Crear torneo” para empezar.</p>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {builderProjects
                .slice()
                .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                .map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => safeNav(`/admin/torneos/constructor/${encodeURIComponent(p.id)}`)}
                      className="flex w-full items-start gap-3 rounded-lg border border-gray-200/90 bg-white/80 p-4 text-left transition-colors hover:border-primary/40 dark:border-gray-600 dark:bg-gray-900/50 dark:hover:border-primary/35"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Wrench className="h-5 w-5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-[#111318] dark:text-white">{p.name.trim() || 'Sin nombre'}</p>
                        <p className="mt-1 text-xs text-[#616f89] dark:text-gray-500">
                          {BUILDER_LIFECYCLE[p.lifecycle]} · actualizado {p.updatedAt.slice(0, 10)}
                        </p>
                        {p.selectedLeagues.length ? (
                          <p className="mt-1 text-[11px] font-semibold text-primary">Ligas: {p.selectedLeagues.sort((a, b) => a - b).join(', ')}</p>
                        ) : null}
                      </div>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </section>
      ) : null}

      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#616f89] dark:text-gray-500">Torneos del catálogo</p>
        <ul className="mt-3 grid gap-4 sm:grid-cols-2">
        <TournamentCard
          to={novakEntry.to}
          title={novakEntry.title}
          description={novakEntry.desc}
          status={novakStatus}
          coverHref={novakEntry.cover}
          pendingResults={novakMetrics.pendingResults}
          scheduleDrafts={novakMetrics.scheduleDrafts}
        />
        {otherTournaments.map((t) => {
          const metrics = metricForTournament(t.id);
          return (
            <TournamentCard
              key={t.id}
              to={`/admin/torneos/${encodeURIComponent(t.id)}`}
              title={t.name}
              description={[t.location, t.category, t.startDate && t.endDate ? `${t.startDate} → ${t.endDate}` : t.startDate]
                .filter(Boolean)
                .join(' · ')}
              status={visualStatus(t)}
              coverHref={t.coverImage ? getCoverUrl(t.coverImage) : ''}
              pendingResults={metrics.pendingResults}
              scheduleDrafts={metrics.scheduleDrafts}
            />
          );
        })}
        </ul>
      </div>
    </div>
  );
}

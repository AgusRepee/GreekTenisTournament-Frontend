import { useMemo, useEffect, useState, useCallback, useRef, type MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  CalendarDays,
  GitBranch,
  History,
  LayoutList,
  ListChecks,
  ListOrdered,
  Table2,
} from 'lucide-react';
import { useClubData } from '@/lib/clubDataStore';
import { categoryToLeague, getPlayerById, getTournamentById } from '@/lib/mockData';
import { persistTournamentToStorage } from '@/lib/dataService';
import { refreshClubDataFromStorage } from '@/lib/clubDataStore';
import { getDataSourceMode } from '@/lib/data/tournamentRepository';
import { getTournamentLeaguePort } from '@/data/services/registry';
import {
  confirmGroupResults as apiConfirmGroupResults,
  reopenGroupResults as apiReopenGroupResults,
} from '@/lib/api/apiClient';
import { syncTournamentMatchesFromAdminApi } from '@/lib/api/syncTournamentMatchesFromAdmin';
import { hydrateTournamentPreclasificacionFromAdminApi } from '@/lib/api/tournamentPreclasificacionApi';
import type { Tournament } from '@/lib/mockData';
import { getAdminTournamentCssVariables } from '@/lib/admin/adminThemeStyle';
import {
  adminLifecycleLabel,
  deriveAdminTournamentLifecycle,
  isTournamentWorkspaceReadOnly,
  type AdminTournamentLifecycle,
} from '@/lib/admin/tournamentAdminLifecycle';
import { useResults } from '@/lib/tennis/resultsStore';
import { ligasData, LIGA_NUMBERS, type LigaNumKey } from '@/lib/tennis/loadLigasFromDocs';
import { isNovakTournamentId, ligaNumFromNovakTournamentId, novakTournamentId } from '@/lib/tennis/generateTournamentsFromLigas';
import { computeTournamentSnapshot } from '@/lib/tennis/computeTournamentSnapshot';
import {
  buildTournamentMetaForSnapshot,
  collectResultsForTournament,
  getEffectiveGrupos,
  getTemplateForTournament,
  snapshotToGroupTables,
} from '@/lib/tennis/tournamentSnapshotBridge';
import { matchInputDedupeKey } from '@/lib/tennis/matchDedupe';
import type { MatchScheduleEntry } from '@/lib/tennis/matchScheduleStore';
import { useMatchSchedules } from '@/lib/tennis/matchScheduleStore';
import { getBracketRoundsForUI } from '../../../components/tournament/TournamentBracket';
import { useTennisLiveData } from '@/lib/tennis/useTennisLiveData';
import { buildOfficialTournamentSeedMap } from '@/lib/tennis/tournamentSeeding';
import { collectTournamentParticipantIdsForSeeds } from '@/lib/admin/adminTournamentSeedDisplay';
import { AdminTournamentSeedProvider } from './AdminTournamentSeedContext';
import { getTemplateFechas } from '@/lib/tennis/ligaFechas';
import { AdminStatusLegend } from './AdminStatusLegend';
import { ADMIN_TOURNAMENT_NAV, ADMIN_TOURNAMENT_NAV_IDS } from './adminPanelTypes';
import type { TournamentNavId } from './adminPanelTypes';
import {
  useAdminRequestNavigate,
  useAdminUnsavedChangesRegister,
  useOptionalAdminUnsavedChangesContext,
} from './AdminUnsavedChangesContext';
import { AdminResumenView } from './views/AdminResumenView';
import { AdminFechasView } from './views/AdminFechasView';
import { AdminResultadosView } from './views/AdminResultadosView';
import { AdminTablaView } from './views/AdminTablaView';
import { AdminPreclasificacionView } from './views/AdminPreclasificacionView';
import { AdminEliminacionView } from './views/AdminEliminacionView';
import { AdminHistorialView } from './views/AdminHistorialView';
import {
  buildResultsDedupeMap,
  shouldShowResumenConfirmarGruposAlert,
  shouldShowResumenEliminacionArmadoAlert,
} from '@/lib/tennis/adminGroupPhaseCompletion';
import { effectiveTournamentCatalogType } from '@/lib/tennis/rankingPointsGreek500';
import { evaluateTournamentFinalize, finalizeTournamentInStorage } from '@/lib/admin/tournamentFinalize';
import { AdminConfirmDialog } from './AdminConfirmDialog';
function getCoverUrl(filename: string): string {
  try {
    return new URL(`../../../img/${filename}`, import.meta.url).href;
  } catch {
    return '';
  }
}

function clampLeague(n: number): LigaNumKey {
  if (n < 1) return 1;
  if (n > 6) return 6;
  return n as LigaNumKey;
}

function bannerDisplayTitle(name: string): string {
  return name.replace(/\s*[–-]\s*Liga\s*\d\s*$/i, '').trim() || name;
}

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

const sectionShell =
  'admin-theme-card app-glass-panel overflow-hidden rounded-xl border border-gray-200/80 shadow-sport-card dark:border-gray-600/55 dark:shadow-sport-card-dark';

/** Iconos en pestañas solo por debajo del breakpoint md. */
const TOURNAMENT_NAV_MOBILE_ICON: Record<TournamentNavId, LucideIcon> = {
  resumen: LayoutList,
  fechas: CalendarDays,
  resultados: ListChecks,
  tabla: Table2,
  preclasificacion: ListOrdered,
  eliminacion: GitBranch,
  historial: History,
};

/** Pestañas: en mobile solo ícono; desde md el texto completo. */
const tourSectionTabBase =
  'flex shrink-0 snap-start flex-col items-center justify-center border-b-[3px] border-solid border-t-0 border-x-0 min-h-[3rem] min-w-[3rem] px-1 pb-2 pt-2 transition-colors md:min-h-0 md:min-w-0 md:px-3 md:pb-2 md:pt-1.5 md:text-xs md:font-bold md:whitespace-nowrap';

/** Selector Liga 1–6: mismo acento que la liga activa (ver `.admin-liga-segment-*`). */
const ligaSegmentBase =
  'flex min-h-10 min-w-[3rem] items-center justify-center rounded-lg px-2.5 text-xs font-bold transition-all md:h-8 md:min-w-[2.85rem] md:rounded-md md:px-2 md:text-[11px]';

/** Pestañas ocultas solo en viewport móvil (desde md se muestran todas). */
const MOBILE_HIDDEN_TOURNAMENT_TABS = new Set<TournamentNavId>(['preclasificacion', 'historial']);

export default function AdminTournamentWorkspace() {
  const { tournamentId: tournamentIdParam } = useParams<{ tournamentId: string }>();
  const tournamentId = tournamentIdParam ? decodeURIComponent(tournamentIdParam) : '';
  const navigate = useNavigate();
  const unsavedCtx = useOptionalAdminUnsavedChangesContext();
  const requestNavigate = useAdminRequestNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [torneoSection, setTorneoSection] = useState<TournamentNavId>('resumen');
  const [resultsDirty, setResultsDirty] = useState(false);
  const [bracketDirty, setBracketDirty] = useState(false);
  const [scheduleConfirmPending, setScheduleConfirmPending] = useState(0);
  const [draftResetSignal, setDraftResetSignal] = useState(0);
  const [focusResultDedupeKey, setFocusResultDedupeKey] = useState<string | null>(null);
  const [focusScheduleDedupeKey, setFocusScheduleDedupeKey] = useState<string | null>(null);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const resultsBulkSaveRef = useRef<(() => Promise<boolean>) | null>(null);
  const [leagueApiGroupStatus, setLeagueApiGroupStatus] = useState<string | null>(null);
  const [tournamentLeagueDbId, setTournamentLeagueDbId] = useState<string | null>(null);
  const goSection = useCallback(
    (id: TournamentNavId) => {
      requestNavigate(() => {
        flushSync(() => {
          setTorneoSection(id);
          setSearchParams(
            (prev) => {
              const n = new URLSearchParams(prev);
              n.set('tab', id);
              return n;
            },
            { replace: true },
          );
        });
      });
    },
    [requestNavigate, setSearchParams],
  );

  useAdminUnsavedChangesRegister(() => {
    const scheduleDirty = scheduleConfirmPending > 0;
    if (!resultsDirty && !bracketDirty && !scheduleDirty) return null;
    const hints: string[] = [];
    if (resultsDirty || bracketDirty) {
      const tour = tournamentId.trim() ? getTournamentById(tournamentId) : undefined;
      const bracketHint =
        tour && effectiveTournamentCatalogType(tour) === 'masters1000'
          ? 'resultados o posiciones en semifinales'
          : 'resultados o posiciones en cuartos';
      hints.push(`Tenés cambios sin guardar (${bracketHint}). Guardá desde cada sección o descartá para salir sin aplicar.`);
    }
    if (scheduleDirty) {
      hints.push(
        'Hay horarios en Fechas pendientes de confirmación para el sitio público. Podés confirmarlos en Fechas o salir igual (los borradores quedan guardados).',
      );
    }
    return {
      isDirty: true,
      canSaveDraft: false,
      saveDraft: async () => {},
      bodyHint: hints.join(' '),
      discard: () => {
        flushSync(() => {
          setDraftResetSignal((n) => n + 1);
          setResultsDirty(false);
          setBracketDirty(false);
        });
      },
      bulkSave: resultsDirty && resultsBulkSaveRef.current ? () => resultsBulkSaveRef.current!() : undefined,
    };
  });

  const results = useResults();
  const matchSchedules = useMatchSchedules();
  const club = useClubData();
  const { rankingsByLeague } = useTennisLiveData();

  const tournament: Tournament | undefined = useMemo(() => getTournamentById(tournamentId), [tournamentId, club]);

  const isNovak = isNovakTournamentId(tournamentId);
  const ligaFromNovak = ligaNumFromNovakTournamentId(tournamentId);
  const ligaNum: LigaNumKey | null = useMemo(() => {
    if (!tournamentId || !tournament) return null;
    if (ligaFromNovak != null) return ligaFromNovak;
    const L = tournament.league ?? categoryToLeague(tournament.category);
    return clampLeague(L);
  }, [tournamentId, tournament, ligaFromNovak]);

  const lifecycle = useMemo(() => (tournament ? deriveAdminTournamentLifecycle(tournament) : 'borrador'), [tournament]);
  const workspaceReadOnly = isTournamentWorkspaceReadOnly(lifecycle);

  const finalizeReadiness = useMemo(
    () => (tournamentId ? evaluateTournamentFinalize(tournamentId) : { ok: false as const, reason: 'Sin torneo.' }),
    [tournamentId, club],
  );

  const finalizeDialogDescription = useMemo(() => {
    const r = finalizeReadiness;
    if (r.ok) {
      const cName = getPlayerById(r.championId)?.name?.trim() || r.championId;
      const fName = getPlayerById(r.finalistId)?.name?.trim() || r.finalistId;
      return (
        <div className="space-y-2">
          <p>Se marcará el torneo como finalizado. El espacio de trabajo pasará a solo lectura.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Campeón: <strong className="text-[#111318] dark:text-white">{cName}</strong>
            </li>
            <li>
              Finalista: <strong className="text-[#111318] dark:text-white">{fName}</strong>
            </li>
            <li>Marcador de referencia (cuadro): {r.score}</li>
          </ul>
          <p className="text-xs">Se consolidan ranking, perfiles y estadísticas según la configuración vigente y se registra en el historial.</p>
        </div>
      );
    }
    return r.reason;
  }, [finalizeReadiness]);

  const handleCargarPendiente = useCallback(
    (dedupeKey: string) => {
      if (workspaceReadOnly) return;
      requestNavigate(() => {
        flushSync(() => {
          setFocusResultDedupeKey(dedupeKey);
          setTorneoSection('resultados');
          setSearchParams(
            (prev) => {
              const n = new URLSearchParams(prev);
              n.set('tab', 'resultados');
              return n;
            },
            { replace: true },
          );
        });
      });
    },
    [requestNavigate, workspaceReadOnly, setSearchParams],
  );

  const handleRequestProgramarPartido = useCallback(
    (dedupeKey: string) => {
      if (workspaceReadOnly) return;
      requestNavigate(() => {
        flushSync(() => {
          setFocusScheduleDedupeKey(dedupeKey);
          setTorneoSection('fechas');
          setSearchParams(
            (prev) => {
              const n = new URLSearchParams(prev);
              n.set('tab', 'fechas');
              return n;
            },
            { replace: true },
          );
        });
      });
    },
    [requestNavigate, workspaceReadOnly, setSearchParams],
  );

  const processingProgramarRef = useRef(false);

  useEffect(() => {
    processingProgramarRef.current = false;
  }, [tournamentId]);

  /** Deep link: `/admin/torneos/:id?programar=<dedupeKey>` (p. ej. desde Wizard o carga rápida). */
  useEffect(() => {
    const k = searchParams.get('programar')?.trim();
    if (!k || processingProgramarRef.current) return;
    processingProgramarRef.current = true;
    flushSync(() => {
      setFocusScheduleDedupeKey(k);
      setTorneoSection('fechas');
      const withTab = new URLSearchParams(searchParams);
      withTab.set('tab', 'fechas');
      withTab.delete('programar');
      setSearchParams(withTab, { replace: true });
    });
    queueMicrotask(() => {
      processingProgramarRef.current = false;
    });
  }, [searchParams, setSearchParams]);

  if (!tournamentId || !tournament || ligaNum == null) {
    return <Navigate to="/admin/torneos" replace />;
  }

  const template = ligasData[ligaNum];
  if (!template) {
    return <Navigate to="/admin/torneos" replace />;
  }

  const templateHasGrupos = !!template.grupos && Object.keys(template.grupos).length > 0;
  const groupStageOfficiallyConfirmed =
    tournament.groupStageStatus === 'confirmed' || leagueApiGroupStatus === 'confirmed';

  const coverHref = tournament.coverImage ? getCoverUrl(tournament.coverImage) : '';

  const fechasList = useMemo(() => getTemplateFechas(ligaNum, template), [ligaNum, template]);

  useEffect(() => {
    setTorneoSection('resumen');
  }, [tournamentId]);

  useEffect(() => {
    const t = searchParams.get('tab')?.trim();
    if (t && (ADMIN_TOURNAMENT_NAV_IDS as readonly string[]).includes(t)) {
      setTorneoSection(t as TournamentNavId);
    }
  }, [searchParams]);

  /** En móvil no hay entrada a preclasificación / historial: corrección de URL y pestaña activa. */
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const coerceIfNeeded = () => {
      if (!mq.matches) return;
      if (!MOBILE_HIDDEN_TOURNAMENT_TABS.has(torneoSection)) return;
      flushSync(() => {
        setTorneoSection('resumen');
        setSearchParams(
          (prev) => {
            const n = new URLSearchParams(prev);
            n.set('tab', 'resumen');
            return n;
          },
          { replace: true },
        );
      });
    };
    coerceIfNeeded();
    mq.addEventListener('change', coerceIfNeeded);
    return () => mq.removeEventListener('change', coerceIfNeeded);
  }, [torneoSection, setSearchParams]);

  useEffect(() => {
    if (getDataSourceMode() !== 'api' || !tournamentId || ligaNum == null) {
      setTournamentLeagueDbId(null);
      setLeagueApiGroupStatus(null);
      return;
    }
    const port = getTournamentLeaguePort();
    const sync = () => {
      const row = port.getRow(tournamentId, ligaNum);
      setTournamentLeagueDbId(row?.id && !row.id.startsWith('local:') ? row.id : null);
      setLeagueApiGroupStatus(row?.groupStageStatus ?? null);
    };
    const unsub = port.subscribe(sync);
    void port.refreshForTournament(tournamentId).then(sync);
    return unsub;
  }, [tournamentId, ligaNum]);

  useEffect(() => {
    if (getDataSourceMode() !== 'api' || !tournamentId) return;
    void syncTournamentMatchesFromAdminApi(tournamentId).catch(() => {
      /* sin API o sin permisos */
    });
  }, [tournamentId]);

  useEffect(() => {
    if (getDataSourceMode() !== 'api' || !tournamentId) return;
    void hydrateTournamentPreclasificacionFromAdminApi(tournamentId).catch(() => {
      /* sin JWT o torneo sin fila */
    });
  }, [tournamentId]);

  /** Color del shell = liga vista (Liga 1–6 del torneo actual). */
  const adminThemeStyle = useMemo(() => getAdminTournamentCssVariables(ligaNum), [ligaNum]);

  const resultsByMatchId = useMemo(() => {
    const m = new Map<string, (typeof results)[number]>();
    for (const r of results) {
      m.set(matchInputDedupeKey(r), r);
    }
    return m;
  }, [results]);

  const resultsDedupeForElim = useMemo(() => buildResultsDedupeMap(results), [results]);

  const scheduleByDedupeForWorkspace = useMemo(() => {
    if (!tournamentId || ligaNum == null) return undefined;
    const m = new Map<string, MatchScheduleEntry>();
    for (const s of matchSchedules) {
      if (s.tournamentId === tournamentId && s.leagueNum === ligaNum) m.set(s.dedupeKey, s);
    }
    return m;
  }, [matchSchedules, tournamentId, ligaNum]);

  const showEliminacionArmadoResumenAlert = useMemo(
    () =>
      shouldShowResumenEliminacionArmadoAlert(
        tournamentId,
        isNovak,
        templateHasGrupos,
        results,
        club.players,
        resultsDedupeForElim,
        groupStageOfficiallyConfirmed,
      ),
    [tournamentId, isNovak, templateHasGrupos, results, club.players, resultsDedupeForElim, groupStageOfficiallyConfirmed],
  );

  const showResumenConfirmarGruposAlert = useMemo(
    () =>
      shouldShowResumenConfirmarGruposAlert(
        tournamentId,
        templateHasGrupos,
        results,
        club.players,
        resultsDedupeForElim,
        groupStageOfficiallyConfirmed,
        scheduleByDedupeForWorkspace,
      ),
    [
      tournamentId,
      templateHasGrupos,
      results,
      club.players,
      resultsDedupeForElim,
      groupStageOfficiallyConfirmed,
      scheduleByDedupeForWorkspace,
    ],
  );

  const handleGroupStageStatusChange = useCallback(
    (next: 'confirmed' | 'open') => {
      const t = getTournamentById(tournamentId);
      if (!t) return;
      if (getDataSourceMode() === 'api' && !tournamentLeagueDbId) {
        window.alert(
          'No se encontró la fila TournamentLeague en MySQL para este torneo/liga. Sincronizá el torneo en el backend antes de confirmar grupos.',
        );
        return;
      }
      void (async () => {
        if (getDataSourceMode() === 'api' && tournamentLeagueDbId) {
          try {
            if (next === 'confirmed') {
              await apiConfirmGroupResults(tournamentLeagueDbId, {});
            } else {
              await apiReopenGroupResults(tournamentLeagueDbId);
            }
            await getTournamentLeaguePort().refreshForTournament(tournamentId);
            const row = getTournamentLeaguePort().getRow(tournamentId, ligaNum!);
            setLeagueApiGroupStatus(row?.groupStageStatus ?? null);
          } catch (e) {
            console.error(e);
            window.alert(e instanceof Error ? e.message : 'No se pudo actualizar la fase de grupos en el servidor.');
            return;
          }
        }
        if (next === 'confirmed') {
          persistTournamentToStorage({ ...t, groupStageStatus: 'confirmed' });
        } else {
          const { groupStageStatus: _gs, ...rest } = t;
          persistTournamentToStorage(rest as Tournament);
        }
        refreshClubDataFromStorage();
      })();
    },
    [tournamentId, tournamentLeagueDbId, ligaNum],
  );

  const snapshot = useMemo(() => {
    const meta = buildTournamentMetaForSnapshot(tournament);
    const tpl = getTemplateForTournament(tournament);
    if (!meta || !tpl) return null;
    const filtered = collectResultsForTournament(tournament.id, tpl, results);
    return computeTournamentSnapshot(meta, { grupos: getEffectiveGrupos(tournament, tpl) }, filtered);
  }, [tournament, results, club]);

  const groupTablesLive = useMemo(() => {
    if (!snapshot) return [];
    return snapshotToGroupTables(snapshot, tournament);
  }, [tournament, snapshot, club]);

  const tournamentParticipantIdsForSeed = useMemo(
    () =>
      collectTournamentParticipantIdsForSeeds({
        groupTables: groupTablesLive,
        tournamentId,
        players: club.players,
      }),
    [groupTablesLive, tournamentId, club.players],
  );

  const officialSeedMap = useMemo(() => {
    if (!tournament || ligaNum == null) return new Map<string, number>();
    return buildOfficialTournamentSeedMap(
      tournament,
      tournamentParticipantIdsForSeed,
      rankingsByLeague.get(ligaNum) ?? [],
    );
  }, [tournament, ligaNum, tournamentParticipantIdsForSeed, rankingsByLeague]);

  const bracketRounds = useMemo(
    () => getBracketRoundsForUI(tournamentId, officialSeedMap),
    [tournamentId, officialSeedMap, club.matches],
  );

  const displayName = isNovak ? bannerDisplayTitle(tournament.name) : tournament.name;
  const backTo = '/admin/torneos';

  const navigateBackToList = (e: MouseEvent<HTMLButtonElement>) => {
    if (!unsavedCtx) return;
    e.preventDefault();
    unsavedCtx.requestNavigate(() => navigate(backTo));
  };

  const headerCover = Boolean(coverHref);
  const backNavClass = headerCover
    ? 'inline-flex min-h-10 items-center gap-1.5 rounded-md px-1 py-1 text-sm font-bold text-white/90 transition-colors hover:bg-white/10 hover:text-white md:min-h-0 md:gap-1 md:py-0 md:text-[11px]'
    : 'inline-flex min-h-10 items-center gap-1.5 rounded-md px-1 py-1 text-sm font-bold text-[#616f89] transition-colors hover:bg-gray-100/80 hover:text-[#111318] dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-white md:min-h-0 md:gap-1 md:py-0 md:text-[11px]';
  const titleClass = headerCover
    ? 'min-w-0 max-w-full truncate text-xl font-bold tracking-tight text-white drop-shadow-sm md:text-2xl'
    : 'min-w-0 max-w-full truncate text-xl font-bold tracking-tight text-[#111318] dark:text-white md:text-2xl';

  return (
    <div
      key={`${tournamentId}-${ligaNum}`}
      className="admin-tournament-theme flex min-h-0 flex-1 flex-col bg-transparent"
      style={adminThemeStyle}
    >
      <div
        className={`sticky top-0 z-30 shrink-0 border-b relative overflow-hidden ${
          headerCover
            ? 'border-white/15 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)]'
            : 'border-gray-200/80 bg-white/70 backdrop-blur-md dark:border-gray-700/60 dark:bg-gray-950/85'
        }`}
      >
        {headerCover ? (
          <>
            <div
              className="pointer-events-none absolute inset-0 bg-cover bg-[center_20%]"
              style={{ backgroundImage: `url("${coverHref}")` }}
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-0 admin-theme-hero-overlay" aria-hidden />
          </>
        ) : null}
        <div className="relative z-[1] container-admin">
          <div
            className={`border-b py-1.5 ${headerCover ? 'border-white/10' : 'border-gray-200/60 dark:border-gray-700/50'}`}
          >
            {unsavedCtx ? (
              <button type="button" onClick={navigateBackToList} className={backNavClass}>
                <ArrowLeft className="h-4 w-4 shrink-0 md:h-3.5 md:w-3.5" aria-hidden />
                Torneos
              </button>
            ) : (
              <Link to={backTo} className={backNavClass}>
                <ArrowLeft className="h-4 w-4 shrink-0 md:h-3.5 md:w-3.5" aria-hidden />
                Torneos
              </Link>
            )}
          </div>

          <div className="flex flex-col gap-2 py-2.5 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
            <div className="flex min-w-0 flex-1 items-start gap-3 md:gap-4">
              {!headerCover ? (
                <div
                  className="relative hidden h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-gray-200/90 bg-gray-100 shadow-md dark:border-gray-600/55 dark:bg-gray-900/80 md:block md:h-[4.5rem] md:w-[4.5rem] lg:h-20 lg:w-20"
                  aria-hidden
                >
                  <div className="h-full w-full admin-theme-hero-fallback" />
                </div>
              ) : null}
              <div className="min-w-0 flex-1 space-y-2">
                <div className="relative z-[1] flex min-w-0 flex-wrap items-center gap-2 gap-y-2">
                  <h1 className={titleClass} title={displayName}>
                    {displayName}
                  </h1>
                  <span className="admin-league-badge inline-flex shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold leading-none">
                    Liga {ligaNum}
                  </span>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide md:px-2 md:py-1 md:text-[10px] ${lifecycleBadgeClass(lifecycle)}`}
                  >
                    {adminLifecycleLabel(lifecycle)}
                  </span>
                  {!workspaceReadOnly && tournament.status !== 'finished' ? (
                    <button
                      type="button"
                      onClick={() => setFinalizeOpen(true)}
                      disabled={!finalizeReadiness.ok}
                      title={finalizeReadiness.ok ? 'Cerrar torneo y consolidar datos públicos' : finalizeReadiness.reason}
                      className="inline-flex min-h-10 shrink-0 items-center rounded-lg border px-3 py-2 text-xs font-bold admin-theme-btn disabled:cursor-not-allowed disabled:opacity-45 md:min-h-0 md:rounded-md md:px-2.5 md:py-1.5 md:text-[11px]"
                    >
                      Finalizar torneo
                    </button>
                  ) : null}
                </div>
                <div
                  className={`max-w-full ${headerCover ? 'block text-white/85 [&_.rounded-sm]:ring-white/25' : 'hidden md:block'}`}
                >
                  <AdminStatusLegend variant="compact" className="min-w-0" />
                </div>
              </div>
            </div>

            {isNovak ? (
              <div
                className={`admin-liga-selector-panel shrink-0 rounded-xl p-2 ${headerCover ? 'border-white/20 bg-black/25 shadow-lg backdrop-blur-sm dark:bg-black/30' : ''}`}
              >
                <p
                  className={`px-1 pb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] ${
                    headerCover ? 'text-white/80' : 'opacity-80 dark:text-gray-400'
                  }`}
                >
                  Ligas del torneo
                </p>
                <div className="flex flex-wrap gap-1" role="group" aria-label="Cambiar liga">
                  {LIGA_NUMBERS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={ligaNum === n}
                      onClick={() => navigate(`/admin/torneos/${encodeURIComponent(novakTournamentId(n))}`)}
                      className={`${ligaSegmentBase} ${
                        ligaNum === n
                          ? 'admin-liga-segment-active'
                          : `admin-liga-segment-inactive ${headerCover ? 'text-white/80 hover:text-white' : 'text-[#616f89] dark:text-gray-400'}`
                      }`}
                    >
                      Liga {n}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div
            className={`border-t ${headerCover ? 'border-white/15' : 'border-gray-200/70 dark:border-gray-700/55'}`}
          >
            <nav
              className="-mb-px flex snap-x snap-proximity gap-2 overflow-x-auto scroll-pl-1 scroll-pr-3 pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-1"
              role="tablist"
              aria-label="Secciones del torneo"
            >
              {ADMIN_TOURNAMENT_NAV.map((item) => {
                const NavIcon = TOURNAMENT_NAV_MOBILE_ICON[item.id];
                const hideOnMobile = MOBILE_HIDDEN_TOURNAMENT_TABS.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={torneoSection === item.id}
                    aria-label={item.label}
                    title={`${item.label}: ${item.description}`}
                    onClick={() => goSection(item.id)}
                    className={`${tourSectionTabBase} ${hideOnMobile ? 'hidden md:flex' : ''} ${
                      torneoSection === item.id
                        ? 'admin-tour-section-tab-active'
                        : headerCover
                          ? 'admin-tour-section-tab-inactive text-white/72 hover:text-white'
                          : 'admin-tour-section-tab-inactive text-[#616f89] dark:text-gray-400'
                    }`}
                  >
                    <NavIcon className="h-6 w-6 shrink-0 opacity-90 md:hidden" strokeWidth={2} aria-hidden />
                    <span className="hidden md:inline">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      <AdminTournamentSeedProvider seedMap={officialSeedMap} players={club.players}>
      <div className="container-admin flex min-w-0 flex-1 flex-col gap-4 py-4 md:py-5">
        {torneoSection === 'resumen' ? (
          <section className={`${sectionShell} overflow-hidden`}>
            {!headerCover ? (
              <div
                className={`relative hidden h-24 w-full bg-cover bg-center sm:h-28 md:block md:h-32 ${!coverHref ? 'admin-theme-hero-fallback' : ''}`}
                style={coverHref ? { backgroundImage: `url("${coverHref}")` } : undefined}
                aria-hidden
              >
                {coverHref ? <div className="pointer-events-none absolute inset-0 admin-theme-hero-overlay" aria-hidden /> : null}
              </div>
            ) : null}
            {workspaceReadOnly ? (
              <div className="border-t border-gray-200/80 bg-white/40 px-3 py-1.5 dark:border-gray-700/70 dark:bg-white/[0.04] sm:px-4 md:px-6">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">Solo lectura</span>
              </div>
            ) : null}
          </section>
        ) : workspaceReadOnly ? (
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Solo lectura</p>
        ) : null}

        <div className="min-w-0 flex-1 space-y-6">
          {torneoSection === 'resumen' && (
            <AdminResumenView
              ligaNum={ligaNum}
              tournamentId={tournamentId}
              results={results}
              lifecycle={lifecycle}
              onNavigate={goSection}
              onRequestCargarPendiente={handleCargarPendiente}
              showConfirmarGruposAlert={showResumenConfirmarGruposAlert}
              onIrResultadosConfirm={() => goSection('resultados')}
              showEliminacionArmadoAlert={showEliminacionArmadoResumenAlert}
              onIrEliminacion={() => goSection('eliminacion')}
            />
          )}

          {torneoSection === 'fechas' && (
            <div className={sectionShell}>
              <div className="p-4 md:p-5">
                <AdminFechasView
                  tournamentId={tournamentId}
                  ligaNum={ligaNum}
                  fechasList={fechasList}
                  resultsByKey={resultsByMatchId}
                  players={club.players}
                  groupStageOfficiallyConfirmed={groupStageOfficiallyConfirmed}
                  readOnly={workspaceReadOnly}
                  onScheduleConfirmPendingCount={setScheduleConfirmPending}
                  focusScheduleDedupeKey={focusScheduleDedupeKey}
                  onConsumedFocusScheduleDedupeKey={() => setFocusScheduleDedupeKey(null)}
                />
              </div>
            </div>
          )}

          {torneoSection === 'resultados' && (
            <div className={sectionShell}>
              <div className="p-4 md:p-5">
                <AdminResultadosView
                  tournamentId={tournamentId}
                  leagueNum={ligaNum}
                  draftResetSignal={draftResetSignal}
                  onResultsDirtyChange={setResultsDirty}
                  readOnly={workspaceReadOnly}
                  templateHasGrupos={templateHasGrupos}
                  groupTables={groupTablesLive}
                  groupStageStatus={tournament.groupStageStatus}
                  onGroupStageStatusChange={workspaceReadOnly ? undefined : handleGroupStageStatusChange}
                  onRegisterBulkSave={(fn) => {
                    resultsBulkSaveRef.current = fn;
                  }}
                  focusDedupeKey={focusResultDedupeKey}
                  onConsumedFocusDedupeKey={() => setFocusResultDedupeKey(null)}
                  onRequestProgramarPartido={handleRequestProgramarPartido}
                />
              </div>
            </div>
          )}

          {torneoSection === 'tabla' && (
            <div className={sectionShell}>
              <div className="p-4 md:p-5">
                <AdminTablaView
                  groupTables={groupTablesLive}
                  templateHasGrupos={!!template.grupos && Object.keys(template.grupos).length > 0}
                  tournament={tournament}
                  ligaNum={ligaNum}
                  template={template}
                  readOnly={workspaceReadOnly}
                />
              </div>
            </div>
          )}

          {torneoSection === 'preclasificacion' && ligaNum != null && (
            <div className={sectionShell}>
              <div className="p-4 md:p-5">
                <AdminPreclasificacionView
                  tournament={tournament}
                  ligaNum={ligaNum}
                  groupTables={groupTablesLive}
                  readOnly={workspaceReadOnly}
                />
              </div>
            </div>
          )}

          {torneoSection === 'eliminacion' && (
            <div className={sectionShell}>
              <div className="p-4 md:p-5">
                <AdminEliminacionView
                  tournamentId={tournamentId}
                  tournamentName={displayName}
                  ligaNum={ligaNum}
                  rounds={bracketRounds}
                  groupTables={groupTablesLive}
                  results={results}
                  resetDraftSignal={draftResetSignal}
                  readOnly={workspaceReadOnly}
                  groupStageOfficiallyConfirmed={groupStageOfficiallyConfirmed}
                  tournamentLeagueId={tournamentLeagueDbId ?? undefined}
                  onBracketDirtyChange={setBracketDirty}
                  onNavigateResultados={() => goSection('resultados')}
                />
              </div>
            </div>
          )}

          {torneoSection === 'historial' && (
            <div className={sectionShell}>
              <div className="p-4 md:p-5">
                <AdminHistorialView tournamentId={tournamentId} tournamentName={displayName} ligaNum={ligaNum} />
              </div>
            </div>
          )}
        </div>
      </div>
      </AdminTournamentSeedProvider>

      <AdminConfirmDialog
        open={finalizeOpen}
        title="Finalizar torneo"
        description={finalizeDialogDescription}
        confirmLabel="Confirmar finalización"
        variant="danger"
        irreversible
        panelClassName="max-w-lg"
        onClose={() => setFinalizeOpen(false)}
        onConfirm={() => {
          if (!finalizeReadiness.ok || !tournament || ligaNum == null) return false;
          finalizeTournamentInStorage({
            tournament,
            leagueNum: ligaNum,
            championId: finalizeReadiness.championId,
            finalistId: finalizeReadiness.finalistId,
            scoreSummary: finalizeReadiness.score,
          });
          return true;
        }}
      />
    </div>
  );
}

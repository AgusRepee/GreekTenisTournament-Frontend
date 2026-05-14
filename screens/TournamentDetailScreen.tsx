import React, { useState, useMemo, useEffect } from 'react';
import { useClubData } from '@/data/hooks/clubCatalog';
import { Calendar, MapPin, AlertTriangle, Trophy, Users, GitBranch, Award, FileText, ListChecks } from 'lucide-react';
import {
  getTournamentById,
  formatTournamentDate,
  getGroupTablesWithSetStats,
  getUpcomingMatchesForTournament,
  getPlayerById,
  DEFAULT_TOURNAMENT_RULES,
  BALL_RULE_TEXT,
  LATE_ARRIVAL_RULE_TITLE,
  LATE_ARRIVAL_RULE_TEXT,
  LIGA3_STATUS,
  getLiga3Preclasificacion,
  LIGA3_PLAYOFF_RULES,
  LIGA3_CLASSIFICATION_RULES,
  getBracketMatchesForLibrary,
  isTournamentPlaceholderDetail,
  EMPTY_BRACKET_TOURNAMENT_ID,
  categoryToLeague,
  getPlayersByFilters,
} from '../src/lib/mockData';
import { TournamentBracket, getBracketRoundsForUI } from '../components/tournament/TournamentBracket';
import {
  isGroupMatchStatsPending,
  isGroupRowStatsPending,
  isRankingRowPending,
  uiFormatPointsCell,
  uiFormatTableRank,
} from '../src/lib/playerUiFormat';
import { LIGA3_TOURNAMENT_ID, getLiga3PlayerByName } from '@/lib/liga3Data';
import {
  filterUpcomingStillPending,
  getTournamentTopRankingFromResults,
  listPublicTournamentResultRows,
  mergeLiga3GroupResultsWithStore,
} from '@/lib/tennis/derivedTennisData';
import { buildPublicGroupStageFixtures } from '@/lib/tennis/publicGroupFixtures';
import { computeTournamentSnapshot } from '@/lib/tennis/computeTournamentSnapshot';
import {
  buildTournamentCalendarRowsFromLigaDoc,
  buildTournamentMetaForSnapshot,
  collectResultsForTournament,
  getEffectiveGrupos,
  getTemplateForTournament,
  shouldUseEngineSnapshot,
  snapshotToGroupTables,
  snapshotToTournamentTopRanking,
} from '@/lib/tennis/tournamentSnapshotBridge';
import { buildOfficialTournamentSeedMap } from '@/lib/tennis/tournamentSeeding';
import { useTennisLiveData } from '@/lib/tennis/useTennisLiveData';
import {
  useMatchSchedules,
  type MatchScheduleStatus,
  mergeMatchScheduleRows,
} from '@/lib/tennis/matchScheduleStore';
import { scheduleEntryFromApiRow, type MatchScheduleEntry } from '@/data/services/contracts/matchSchedulePort';
import { getDataSourceMode } from '@/lib/data/tournamentRepository';
import { getPublicScheduleByTournamentId, getPublicEliminationByTournamentId } from '@/lib/api/apiClient';
import { hydrateTournamentPreclasificacionFromPublicApi } from '@/lib/api/tournamentPreclasificacionApi';
import { mapPrismaMatchRowToClubMatch } from '@/lib/api/syncTournamentMatchesFromAdmin';
import { mergePersistedMatches } from '@/lib/tennis/bracketPersist';
import {
  buildUpcomingFromConfirmedSchedules,
  mergeUpcomingPreferSchedule,
} from '@/lib/tennis/publicUpcomingFromSchedule';
import { buildSchedulableMatches } from '@/lib/tennis/schedulableMatchCatalog';
import { cleanPlayerName, matchInputDedupeKey } from '@/lib/tennis/matchDedupe';
import { parseMatch } from '@/lib/tennis/matchStatsEngine';
import { effectiveTournamentCatalogType } from '@/lib/tennis/rankingPointsGreek500';
import { getLeaguePublicTournamentTheme } from '@/lib/leagueColors';
import type { MatchInput } from '@/types/tennisResults';

function getCoverImageUrl(filename: string): string {
  try {
    return new URL(`../img/${filename}`, import.meta.url).href;
  } catch {
    return '';
  }
}

const pelotaImgUrl = getCoverImageUrl('pelota.webp');

function normalizePublicMatchName(value: string): string {
  return cleanPlayerName(value).toLowerCase();
}

function getPublicMatchWinnerSide(result: MatchInput | undefined): 'a' | 'b' | null {
  if (!result || result.status === 'pending' || result.status === 'suspended') return null;

  const explicitWinner = (result as MatchInput & { winnerId?: string | null }).winnerId?.trim();
  const winner = explicitWinner || (() => {
    try {
      return parseMatch(result).winner ?? '';
    } catch {
      return '';
    }
  })();

  const normalizedWinner = normalizePublicMatchName(winner);
  if (!normalizedWinner) return null;
  if (normalizedWinner === normalizePublicMatchName(result.playerA)) return 'a';
  if (normalizedWinner === normalizePublicMatchName(result.playerB)) return 'b';
  return null;
}

function formatScheduleStatusLabel(status: MatchScheduleStatus | undefined): string {
  if (status === 'confirmed') return 'Confirmado';
  if (status === 'rescheduled') return 'Reprogramado';
  if (status === 'postponed') return 'Postergado';
  if (status === 'suspended') return 'Suspendido';
  if (status === 'cancelled') return 'Cancelado';
  return 'Programación';
}

function scheduleStatusTone(status: MatchScheduleStatus | undefined): string {
  if (status === 'confirmed' || status === 'rescheduled') {
    return 'border-sky-500/35 bg-sky-50 text-sky-900 dark:border-sky-500/35 dark:bg-sky-950/35 dark:text-sky-100';
  }
  if (status === 'postponed') {
    return 'border-amber-500/35 bg-amber-50 text-amber-900 dark:border-amber-500/35 dark:bg-amber-950/35 dark:text-amber-100';
  }
  if (status === 'suspended') {
    return 'border-violet-500/35 bg-violet-50 text-violet-900 dark:border-violet-500/35 dark:bg-violet-950/35 dark:text-violet-100';
  }
  if (status === 'cancelled') {
    return 'border-slate-400/50 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
  }
  return 'border-gray-200 bg-gray-50 text-[#616f89] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300';
}

type SectionId = 'resumen' | 'fase-grupos' | 'partidos' | 'programacion' | 'eliminacion' | 'resultados' | 'reglamento';

const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode }[] = [
  { id: 'resumen', label: 'Resumen', icon: <Trophy className="w-4 h-4" /> },
  { id: 'fase-grupos', label: 'Fase de grupos', icon: <Users className="w-4 h-4" /> },
  { id: 'partidos', label: 'Partidos', icon: <ListChecks className="w-4 h-4" /> },
  { id: 'programacion', label: 'Programación', icon: <Calendar className="w-4 h-4" /> },
  { id: 'eliminacion', label: 'Eliminación', icon: <GitBranch className="w-4 h-4" /> },
  { id: 'resultados', label: 'Resultados', icon: <Award className="w-4 h-4" /> },
  { id: 'reglamento', label: 'Reglamento', icon: <FileText className="w-4 h-4" /> },
];

/** Puntos máximos por fase (para Resumen y Reglamento). Liga 3: eliminación; otros: DEFAULT. */
const PHASE_POINTS_DISPLAY = [
  { phase: 'Campeón', points: 500 },
  { phase: 'Finalista', points: 350 },
  { phase: 'Semifinal', points: 200 },
  { phase: 'Cuartos de final', points: 100 },
  { phase: 'Participación', points: 20 },
];

const CALENDAR_STRUCTURE = [
  { week: 'Semana 1', phase: 'Fecha 1' },
  { week: 'Semana 2', phase: 'Fecha 2' },
  { week: 'Semana 3', phase: 'Fecha 3' },
  { week: 'Semana 4', phase: 'Fecha 4' },
  { week: 'Semana 5', phase: 'Fecha 5' },
  { week: 'Semana 6', phase: 'Eliminación' },
  { week: 'Semana 7', phase: 'Final' },
];

interface TournamentDetailScreenProps {
  tournamentId: string | null;
  setScreen: (screen: string) => void;
}

type ResultadosFilter = 'todos' | 'fase-grupos' | 'eliminacion';

type EliminationRoundTab = '1' | '2' | '3';

export const TournamentDetailScreen: React.FC<TournamentDetailScreenProps> = ({ tournamentId, setScreen }) => {
  const [section, setSection] = useState<SectionId>('resumen');
  const [resultadosFilter, setResultadosFilter] = useState<ResultadosFilter>('todos');
  const [eliminationRoundTab, setEliminationRoundTab] = useState<EliminationRoundTab>('1');
  const [programacionFilter, setProgramacionFilter] = useState<'all' | MatchScheduleStatus>('all');
  const [partidosFilter, setPartidosFilter] = useState<string>('');
  const club = useClubData();
  const { rankingsByLeague, knockoutMerged, results } = useTennisLiveData();
  const schedules = useMatchSchedules();
  const dataSourceMode = getDataSourceMode();
  const tournament = useMemo(
    () => (tournamentId ? getTournamentById(tournamentId) : getTournamentById('t-novak')),
    [tournamentId, club],
  );
  const leagueNum = tournament ? (tournament.league ?? categoryToLeague(tournament.category)) : 1;
  const pubTheme = getLeaguePublicTournamentTheme(leagueNum);

  useEffect(() => {
    if (dataSourceMode !== 'api' || !tournament?.id) return;
    void hydrateTournamentPreclasificacionFromPublicApi(tournament.id).catch(() => {});
  }, [dataSourceMode, tournament?.id]);

  useEffect(() => {
    if (dataSourceMode !== 'api' || !tournament?.id) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await getPublicScheduleByTournamentId(tournament.id);
        if (cancelled || !data || typeof data !== 'object') return;
        const raw = (data as { schedules?: unknown }).schedules;
        if (!Array.isArray(raw)) return;
        const rows: MatchScheduleEntry[] = [];
        for (const r of raw) {
          const e = scheduleEntryFromApiRow(r as Record<string, unknown>);
          if (e) rows.push(e);
        }
        mergeMatchScheduleRows(rows);
      } catch {
        /* sin API o torneo no persistido en MySQL */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataSourceMode, tournament?.id]);

  useEffect(() => {
    if (dataSourceMode !== 'api' || !tournament?.id) return;
    const leagueNum = tournament.league ?? categoryToLeague(tournament.category);
    const tid = tournament.id;
    let cancelled = false;
    void (async () => {
      try {
        const data = await getPublicEliminationByTournamentId(tid, leagueNum);
        if (cancelled || !data || typeof data !== 'object') return;
        const raw = (data as { matches?: unknown }).matches;
        if (!Array.isArray(raw) || raw.length === 0) return;
        const mapped = (raw as Record<string, unknown>[]).map(mapPrismaMatchRowToClubMatch);
        mergePersistedMatches((all) => {
          const pref = `ko-${tid}-`;
          const withoutKo = all.filter((m) => !(m.tournamentId === tid && m.id.startsWith(pref)));
          return [...withoutKo, ...mapped];
        });
      } catch {
        /* sin KO público */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataSourceMode, tournament?.id]);
  const isNovakLeagueTournament = /^t-novak(?:-l[1-6])?$/.test(tournament?.id ?? '');
  const isLiga3 = tournament?.id === 't-novak-l3';
  const isMasters1000 = useMemo(
    () => !!tournament && effectiveTournamentCatalogType(tournament) === 'masters1000',
    [tournament],
  );
  const isPlaceholderTournament = tournament ? isTournamentPlaceholderDetail(tournament) && !isLiga3 : false;
  const visibleSections = useMemo(() => {
    if (!isNovakLeagueTournament) return SECTIONS;
    return [
      SECTIONS.find((item) => item.id === 'resumen')!,
      SECTIONS.find((item) => item.id === 'programacion')!,
      SECTIONS.find((item) => item.id === 'partidos')!,
      { ...SECTIONS.find((item) => item.id === 'fase-grupos')!, label: 'Tabla' },
      SECTIONS.find((item) => item.id === 'eliminacion')!,
      SECTIONS.find((item) => item.id === 'reglamento')!,
    ];
  }, [isNovakLeagueTournament]);

  useEffect(() => {
    if (!visibleSections.some((item) => item.id === section)) {
      setSection('resumen');
    }
  }, [section, visibleSections]);

  useEffect(() => {
    if (isNovakLeagueTournament) {
      setPartidosFilter('');
    }
  }, [isNovakLeagueTournament, tournament?.id]);

  const phasePointsRows = useMemo(
    () => (isMasters1000 ? PHASE_POINTS_DISPLAY.filter((r) => r.phase !== 'Cuartos de final') : PHASE_POINTS_DISPLAY),
    [isMasters1000],
  );

  useEffect(() => {
    setEliminationRoundTab(isMasters1000 ? '2' : '1');
  }, [isMasters1000, tournament?.id]);

  const snapshot = useMemo(() => {
    if (!tournament || !shouldUseEngineSnapshot(tournament)) return null;
    const meta = buildTournamentMetaForSnapshot(tournament);
    const template = getTemplateForTournament(tournament);
    if (!meta || !template) return null;
    const torneo = { grupos: getEffectiveGrupos(tournament, template) };
    const filtered = collectResultsForTournament(tournament.id, template, results);
    return computeTournamentSnapshot(meta, torneo, filtered);
  }, [tournament, results, club]);

  const groupTables = useMemo(() => {
    if (!tournament) return [];
    if (snapshot) return snapshotToGroupTables(snapshot, tournament);
    return getGroupTablesWithSetStats(tournament.id);
  }, [tournament, snapshot, club]);

  const tournamentSeedMap = useMemo(() => {
    if (!tournament) return new Map<string, number>();
    const league = tournament.league ?? categoryToLeague(tournament.category);
    const rows = rankingsByLeague.get(league) ?? [];
    const fromTables = [...new Set(groupTables.flatMap((g) => g.rows.map((r) => r.playerId)))] as string[];
    const participants =
      fromTables.length > 0 ? fromTables : getPlayersByFilters(tournament.category).map((p) => p.id);
    if (participants.length === 0) return new Map<string, number>();
    return buildOfficialTournamentSeedMap(tournament, participants, rows);
  }, [tournament, rankingsByLeague, groupTables]);

  const groupFixtures = useMemo(
    () => (tournament && !isPlaceholderTournament ? buildPublicGroupStageFixtures(tournament.id, results) : []),
    [tournament, results, isPlaceholderTournament],
  );
  const ballCarrierByMatchKey = useMemo(() => {
    if (!tournament) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const group of groupFixtures) {
      const groupKey = group.name.replace(/^Grupo\s+/i, '').trim();
      for (const fecha of group.fechas) {
        for (const match of fecha.matches) {
          const playerA = cleanPlayerName(match.playerA);
          const playerB = cleanPlayerName(match.playerB);
          const key = matchInputDedupeKey({
            tournamentId: tournament.id,
            group: groupKey,
            round: fecha.fecha,
            playerA,
            playerB,
          });
          map.set(key, match.ballsByA ? playerA : playerB);
        }
      }
    }
    return map;
  }, [groupFixtures, tournament]);

  const upcoming = useMemo(() => {
    if (!tournament) return [];
    const tid = tournament.id;
    if (tid === LIGA3_TOURNAMENT_ID) {
      const raw = getUpcomingMatchesForTournament(tid);
      return filterUpcomingStillPending(raw, results, tid);
    }
    if (isPlaceholderTournament) {
      const raw = getUpcomingMatchesForTournament(tid);
      return filterUpcomingStillPending(raw, results, tid);
    }
    const fromSchedule = buildUpcomingFromConfirmedSchedules(tid, schedules, club.players);
    const legacy = getUpcomingMatchesForTournament(tid);
    const merged = mergeUpcomingPreferSchedule(fromSchedule, legacy);
    return filterUpcomingStillPending(merged, results, tid);
  }, [tournament, isPlaceholderTournament, schedules, club.players, results]);

  const liga3GroupResultRows = useMemo(
    () => (tournament?.id === LIGA3_TOURNAMENT_ID ? mergeLiga3GroupResultsWithStore(results) : []),
    [tournament?.id, results],
  );
  const liga3ElimFromStore = useMemo(
    () =>
      tournament?.id === LIGA3_TOURNAMENT_ID ? listPublicTournamentResultRows(tournament.id, results).filter((r) => r.phase === 'Eliminación') : [],
    [tournament?.id, results],
  );
  const coverUrl = tournament?.coverImage ? getCoverImageUrl(tournament.coverImage) : '';

  const top5Ranking = useMemo(() => {
    if (!tournament) return [];
    if (snapshot && snapshot.globalStats.length > 0) {
      return snapshotToTournamentTopRanking(snapshot, tournament, 5);
    }
    return getTournamentTopRankingFromResults(tournament.id, club.players, club.tournaments, results, knockoutMerged, 5);
  }, [tournament, snapshot, club, results, knockoutMerged]);
  const bracketSourceId = isPlaceholderTournament ? EMPTY_BRACKET_TOURNAMENT_ID : tournament?.id ?? EMPTY_BRACKET_TOURNAMENT_ID;
  const bracketRounds = useMemo(
    () => (tournament ? getBracketRoundsForUI(bracketSourceId, tournamentSeedMap) : []),
    [tournament?.id, isPlaceholderTournament, club, results, tournamentSeedMap],
  );

  const calendarStructureRows = useMemo(() => buildTournamentCalendarRowsFromLigaDoc(tournament ?? null), [tournament]);

  const publicResultRows = useMemo(
    () => (tournament ? listPublicTournamentResultRows(tournament.id, results) : []),
    [tournament, results],
  );

  const publicMatchRows = useMemo(() => {
    if (!tournament || isPlaceholderTournament) return [];
    const scheduleByKey = new Map(
      schedules.filter((s) => s.tournamentId === tournament.id).map((s) => [s.dedupeKey, s] as const),
    );
    const resultByKey = new Map(
      results
        .filter((m) => m.tournamentId === tournament.id)
        .map((m) => [matchInputDedupeKey(m), m] as const),
    );

    const statusLabel = (scheduleStatus: MatchScheduleStatus | undefined) => {
      if (scheduleStatus === 'confirmed') return 'Programado';
      if (scheduleStatus === 'rescheduled') return 'Reprogramado';
      if (scheduleStatus === 'postponed') return 'Postergado';
      if (scheduleStatus === 'suspended') return 'Suspendido';
      if (scheduleStatus === 'cancelled') return 'Cancelado';
      return 'Pendiente';
    };

    return buildSchedulableMatches(tournament.id, club.players)
      .map((row, index) => {
        const schedule = scheduleByKey.get(row.dedupeKey);
        const result = resultByKey.get(row.dedupeKey);
        const score = result?.score?.trim() ?? '';
        const hasPlayedResult =
          result?.status === 'played' || result?.status === 'retired' || result?.status === 'walkover' || result?.status === 'suspended';

        let state = statusLabel(schedule?.scheduleStatus);
        let stateTone = 'border-amber-500/35 bg-amber-50 text-amber-900 dark:border-amber-500/35 dark:bg-amber-950/35 dark:text-amber-100';
        let detail = 'Sin horario confirmado';
        let scoreLine: string | null = null;

        if (hasPlayedResult) {
          if (result?.status === 'suspended') {
            state = 'Suspendido';
            detail = 'No cuenta como partido jugado';
            scoreLine = null;
            stateTone = 'border-violet-500/35 bg-violet-50 text-violet-900 dark:border-violet-500/35 dark:bg-violet-950/35 dark:text-violet-100';
          } else if (result?.status === 'walkover') {
            state = 'W.O.';
            detail = 'Victoria por walkover';
            scoreLine = score ? `${score} (W.O.)` : 'W.O.';
            stateTone = 'border-red-500/35 bg-red-50 text-red-900 dark:border-red-500/35 dark:bg-red-950/35 dark:text-red-100';
          } else {
            state = 'Jugado';
            detail = result?.date?.trim() ? `Jugado el ${result.date}` : 'Resultado cargado';
            scoreLine = score || 'Resultado cargado';
            stateTone = 'border-emerald-500/35 bg-emerald-50 text-emerald-900 dark:border-emerald-500/35 dark:bg-emerald-950/35 dark:text-emerald-100';
          }
        } else if (schedule) {
          const dateTime = [schedule.date?.trim(), schedule.time?.trim()].filter(Boolean).join(' · ');
          detail = dateTime || 'Fecha/hora por confirmar';
          if (schedule.scheduleStatus === 'confirmed' || schedule.scheduleStatus === 'rescheduled') {
            stateTone = 'border-sky-500/35 bg-sky-50 text-sky-900 dark:border-sky-500/35 dark:bg-sky-950/35 dark:text-sky-100';
          } else if (schedule.scheduleStatus === 'postponed') {
            stateTone = 'border-amber-500/35 bg-amber-50 text-amber-900 dark:border-amber-500/35 dark:bg-amber-950/35 dark:text-amber-100';
          } else if (schedule.scheduleStatus === 'suspended') {
            stateTone = 'border-violet-500/35 bg-violet-50 text-violet-900 dark:border-violet-500/35 dark:bg-violet-950/35 dark:text-violet-100';
          } else if (schedule.scheduleStatus === 'cancelled') {
            stateTone = 'border-slate-400/50 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
          }
        }

        return {
          key: row.dedupeKey,
          order: row.kind === 'fixture' ? (row.fixtureRound ?? 0) * 1000 + index : 100000 + index,
          filterKey: row.kind === 'fixture' ? `fecha-${row.fixtureRound ?? 0}` : `ko-${row.koStage ?? row.groupLabel}`,
          filterLabel: row.kind === 'fixture' ? row.fixtureRoundLabel : row.groupLabel,
          groupLabel: row.groupLabel,
          phase: row.kind === 'fixture' ? `${row.fixtureRoundLabel} · ${row.groupLabel}` : row.groupLabel,
          playerA: row.playerA,
          playerB: row.playerB,
          winnerSide: getPublicMatchWinnerSide(result),
          isProgrammed: !hasPlayedResult && (schedule?.scheduleStatus === 'confirmed' || schedule?.scheduleStatus === 'rescheduled'),
          state,
          stateTone,
          detail,
          scoreLine,
        };
      })
      .sort((a, b) => a.order - b.order);
  }, [tournament, isPlaceholderTournament, schedules, results, club.players]);

  const publicMatchFilters = useMemo(() => {
    const map = new Map<string, { key: string; label: string; order: number }>();
    for (const row of publicMatchRows) {
      const prev = map.get(row.filterKey);
      if (!prev || row.order < prev.order) {
        map.set(row.filterKey, { key: row.filterKey, label: row.filterLabel, order: row.order });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.order - b.order);
  }, [publicMatchRows]);

  useEffect(() => {
    if (publicMatchFilters.length === 0) {
      if (partidosFilter) setPartidosFilter('');
      return;
    }
    if (!publicMatchFilters.some((f) => f.key === partidosFilter)) {
      setPartidosFilter(publicMatchFilters[0]!.key);
    }
  }, [partidosFilter, publicMatchFilters]);

  const visiblePublicMatchRows = useMemo(() => {
    if (!partidosFilter) return publicMatchRows;
    return publicMatchRows.filter((row) => row.filterKey === partidosFilter);
  }, [partidosFilter, publicMatchRows]);

  const visiblePublicMatchGroups = useMemo(() => {
    const groups = new Map<string, { label: string; rows: typeof visiblePublicMatchRows }>();
    for (const row of visiblePublicMatchRows) {
      const key = row.groupLabel || 'Partidos';
      const group = groups.get(key);
      if (group) {
        group.rows.push(row);
      } else {
        groups.set(key, { label: key, rows: [row] });
      }
    }
    return Array.from(groups.values());
  }, [visiblePublicMatchRows]);

  const scheduledRows = useMemo(() => {
    if (!tournament || isPlaceholderTournament) return [];
    const scheduleByKey = new Map(
      schedules.filter((s) => s.tournamentId === tournament.id).map((s) => [s.dedupeKey, s] as const),
    );
    return buildSchedulableMatches(tournament.id, club.players)
      .map((row) => ({ row, schedule: scheduleByKey.get(row.dedupeKey), ballCarrier: ballCarrierByMatchKey.get(row.dedupeKey) }))
      .filter(
        (entry) =>
          entry.schedule &&
          (entry.schedule.scheduleStatus === 'confirmed' ||
            entry.schedule.scheduleStatus === 'rescheduled' ||
            entry.schedule.scheduleStatus === 'postponed' ||
            entry.schedule.scheduleStatus === 'suspended' ||
            entry.schedule.scheduleStatus === 'cancelled'),
      )
      .sort((a, b) => {
        const aDateTime = `${a.schedule?.date ?? ''} ${a.schedule?.time ?? ''}`.trim();
        const bDateTime = `${b.schedule?.date ?? ''} ${b.schedule?.time ?? ''}`.trim();
        return aDateTime.localeCompare(bDateTime);
      });
  }, [tournament, isPlaceholderTournament, schedules, club.players, ballCarrierByMatchKey]);

  const visibleScheduledRows = useMemo(() => {
    if (programacionFilter === 'all') return scheduledRows;
    return scheduledRows.filter((x) => x.schedule?.scheduleStatus === programacionFilter);
  }, [scheduledRows, programacionFilter]);

  const displayTournamentSeed = (playerId: string): number | undefined => {
    const fromMap = tournamentSeedMap.get(playerId);
    if (fromMap != null) return fromMap;
    if (isLiga3) return getLiga3Preclasificacion(playerId) ?? undefined;
    return undefined;
  };

  const formatLiga3ResultPlayerName = (name: string): string => {
    const p = getLiga3PlayerByName(name);
    if (!p) return name;
    const s = tournamentSeedMap.get(p.id) ?? getLiga3Preclasificacion(p.id);
    return s != null ? `${name} (${s})` : name;
  };

  if (!tournament) {
    return (
      <div className="flex flex-1 items-center justify-center py-20 px-4">
        <div className="text-center">
          <p className="text-[#616f89] dark:text-gray-400 mb-4">No se encontró el torneo.</p>
          <button
            onClick={() => setScreen('directory')}
            className={`${pubTheme.accentText} font-bold hover:underline`}
          >
            Volver a torneos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* 1) Hero — tournament cover image and name */}
      <section className="relative w-full min-h-[300px] md:min-h-[360px] flex flex-col justify-end overflow-hidden border-b border-gray-200/80 dark:border-gray-600/50 shadow-sport-card dark:shadow-sport-card-dark">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: coverUrl
              ? `linear-gradient(105deg, rgba(0,0,0,0.68) 0%, rgba(0,0,0,0.32) 48%, rgba(0,0,0,0.12) 100%), linear-gradient(to top, rgba(0,0,0,0.78) 0%, transparent 52%), url("${coverUrl}")`
              : pubTheme.heroGradientNoCover,
          }}
        />
        <div className="relative z-10 px-4 md:px-10 pb-10 pt-28 md:pt-32">
          <div className="max-w-4xl mx-auto">
            <span
              className={`inline-block text-white font-bold mb-2 ${
                isPlaceholderTournament
                  ? 'rounded-lg bg-white/15 backdrop-blur-sm border border-white/35 px-4 py-2 text-sm tracking-wide shadow-lg max-w-md'
                  : pubTheme.heroCategoryPill
              }`}
            >
              {isPlaceholderTournament ? 'Todas las categorías' : tournament.category}
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-white leading-[1.08] tracking-tight drop-shadow-lg">
              {tournament.name}
            </h1>
          </div>
        </div>
      </section>

      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-8 bg-transparent px-4 py-8 md:gap-10 md:px-8 md:py-10">
        {/* Section navigation — grilla simétrica en mobile; fila en desktop ancho */}
        <nav
          className={`grid grid-cols-2 gap-2 md:gap-2 ${
            isNovakLeagueTournament ? 'md:grid-cols-3 lg:grid-cols-6' : 'md:grid-cols-3 lg:grid-cols-7 lg:gap-2'
          }`}
          aria-label="Secciones del torneo"
        >
          {visibleSections.map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={`flex w-full min-h-[3.25rem] flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2.5 text-center text-xs font-semibold leading-tight transition-colors sm:text-sm md:min-h-[2.75rem] md:flex-row md:gap-2 md:px-3 md:py-2.5 md:text-sm ${
                section === id
                  ? `${pubTheme.accentSolid} border-transparent text-white shadow-sm ${pubTheme.accentSolidHover}`
                  : 'border-gray-200/90 bg-white text-[#616f89] hover:bg-gray-50 dark:border-gray-600/70 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700/90'
              }`}
            >
              <span className="shrink-0 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
              <span className="line-clamp-2 md:line-clamp-none">{label}</span>
            </button>
          ))}
        </nav>

        {/* Resumen */}
        {section === 'resumen' && (
          <>
            {isLiga3 && (
              <section className="app-glass-panel p-6 md:p-8 shadow-sport-card dark:shadow-sport-card-dark">
                <h2 className="text-xl font-bold text-[#111318] dark:text-white mb-2">Estado del torneo</h2>
                <p className={`text-lg font-semibold ${pubTheme.accentText}`}>{LIGA3_STATUS}</p>
              </section>
            )}

            {isMasters1000 && (
              <section className="app-glass-panel p-6 md:p-8 shadow-sport-card dark:shadow-sport-card-dark">
                <h2 className="text-xl font-bold text-[#111318] dark:text-white mb-2">Formato del torneo</h2>
                <p className="text-sm leading-relaxed text-[#616f89] dark:text-gray-300">
                  Masters 1000 · Top 8 del ranking · 2 grupos de 4 · semifinales y final
                </p>
              </section>
            )}

            {upcoming.length > 0 && (
              <section className="app-glass-panel p-6 md:p-8 shadow-sport-card dark:shadow-sport-card-dark">
                <h2 className="text-xl font-bold text-[#111318] dark:text-white mb-4">Próximo partido</h2>
                {(() => {
                  const m = upcoming[0];
                  return (
                    <div
                      className={`rounded-xl border-2 p-4 shadow-sport-card dark:shadow-sport-card-dark ${pubTheme.accentBorderSoft} ${pubTheme.accentBgSoft}`}
                    >
                      <p className="text-xs font-semibold text-[#616f89] dark:text-gray-400 uppercase tracking-wider mb-1">
                        {m.date} – {m.time}
                      </p>
                      {m.group && <p className={`text-xs font-medium mb-2 ${pubTheme.accentText}`}>{m.group}</p>}
                      <p className="text-sm font-medium text-[#111318] dark:text-white">
                        {m.ballsByPlayerA ? (
                          <><span className={`font-semibold ${pubTheme.accentText}`}>{m.playerA}</span>
                            {pelotaImgUrl && <img src={pelotaImgUrl} alt="" className="inline-block w-4 h-4 ml-0.5 align-middle object-contain" width={16} height={16} aria-hidden />}
                            {' vs '}{m.playerB}</>
                        ) : (
                          <>{m.playerA} vs <span className={`font-semibold ${pubTheme.accentText}`}>{m.playerB}</span>{pelotaImgUrl && <img src={pelotaImgUrl} alt="" className="inline-block w-4 h-4 ml-0.5 align-middle object-contain" width={16} height={16} aria-hidden />}</>
                        )}
                      </p>
                    </div>
                  );
                })()}
              </section>
            )}

            <section className="app-glass-panel p-6 md:p-8 shadow-sport-card dark:shadow-sport-card-dark">
              <h2 className="text-xl font-bold text-[#111318] dark:text-white mb-3">Puntos máximos del torneo</h2>
              <p className="text-sm text-[#616f89] dark:text-gray-400 mb-4">Puntos por fase (eliminación).</p>
              <div className="rounded-lg border border-gray-200/90 dark:border-gray-600/70 overflow-hidden max-w-sm">
                <table className="app-data-table w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold text-[#616f89] dark:text-gray-400">Fase</th>
                      <th className="px-3 py-2 text-right font-bold text-[#616f89] dark:text-gray-400">Puntos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f2f4] dark:divide-gray-700">
                    {phasePointsRows.map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-[#111318] dark:text-white">{row.phase}</td>
                        <td className={`px-3 py-2 text-right font-bold ${pubTheme.accentText}`}>{row.points} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="app-glass-panel max-md:overflow-visible overflow-visible shadow-sport-card dark:shadow-sport-card-dark">
              <h2 className="text-xl font-bold text-[#111318] dark:text-white p-6 pb-0">Top 5</h2>
              <div className="overflow-x-auto max-md:overflow-visible p-6">
                {isLiga3 ? (
                  <table className="app-data-table w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-gray-200/90 dark:border-gray-600/70">
                        <th className="pb-3 font-bold text-[#616f89] dark:text-gray-400 w-12">#</th>
                        <th className="pb-3 font-bold text-[#616f89] dark:text-gray-400">Jugador</th>
                        <th className="pb-3 font-bold text-[#616f89] dark:text-gray-400 text-center">PJ</th>
                        <th className="pb-3 font-bold text-[#616f89] dark:text-gray-400 text-right">Puntos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f2f4] dark:divide-gray-700">
                      {top5Ranking.map((row) => {
                        const pending = isRankingRowPending(row);
                        return (
                        <tr key={row.playerId} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="py-3 font-medium text-[#616f89] dark:text-gray-400">{uiFormatTableRank(row.position, pending)}</td>
                          <td className="py-3 font-medium text-[#111318] dark:text-white">{row.player.name}</td>
                          <td className="py-3 text-center text-[#616f89] dark:text-gray-400">{pending ? '—' : row.matchesPlayed}</td>
                          <td className={`py-3 text-right font-bold ${pubTheme.accentText}`}>{uiFormatPointsCell(row.points, pending)}</td>
                        </tr>
                      );
                      })}
                    </tbody>
                  </table>
                ) : isPlaceholderTournament ? (
                  <table className="app-data-table w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-gray-200/90 dark:border-gray-600/70">
                        <th className="pb-3 font-bold text-[#616f89] dark:text-gray-400 w-12">#</th>
                        <th className="pb-3 font-bold text-[#616f89] dark:text-gray-400">Jugador</th>
                        <th className="pb-3 font-bold text-[#616f89] dark:text-gray-400 text-right">PG</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f2f4] dark:divide-gray-700">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <tr key={n} className="text-[#616f89] dark:text-gray-400">
                          <td className="py-3 font-medium">{n}</td>
                          <td className="py-3 italic">No definido</td>
                          <td className="py-3 text-right">—</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="app-data-table w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-gray-200/90 dark:border-gray-600/70">
                        <th className="pb-3 font-bold text-[#616f89] dark:text-gray-400 w-12">#</th>
                        <th className="pb-3 font-bold text-[#616f89] dark:text-gray-400">Jugador</th>
                        <th className="pb-3 font-bold text-[#616f89] dark:text-gray-400 text-right">PG</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f2f4] dark:divide-gray-700">
                      {top5Ranking.map((row) => {
                        const pending = isRankingRowPending(row);
                        return (
                        <tr key={row.playerId} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="py-3 font-medium text-[#616f89] dark:text-gray-400">{uiFormatTableRank(row.position, pending)}</td>
                          <td className="py-3 font-medium text-[#111318] dark:text-white">{row.player.name}</td>
                          <td className={`py-3 text-right font-bold ${pubTheme.accentText}`}>{pending ? '—' : row.wins}</td>
                        </tr>
                      );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="px-6 pb-6">
                <button
                  type="button"
                  onClick={() => setSection('eliminacion')}
                  className={`rounded-lg text-white font-bold px-5 py-2.5 transition-colors ${pubTheme.accentSolid} ${pubTheme.accentSolidHover}`}
                >
                  Ver cuadro de eliminación
                </button>
              </div>
            </section>
          </>
        )}

        {/* Fase de grupos: tablas + fechas en 3 columnas (una por grupo) */}
        {section === 'fase-grupos' && (
          <>
            {isPlaceholderTournament ? (
              <section className="app-glass-panel border-dashed p-8 text-center shadow-sport-card dark:shadow-sport-card-dark">
                <h2 className="text-xl font-bold text-[#111318] dark:text-white mb-3">Fase de grupos</h2>
                <p className="text-[#616f89] dark:text-gray-400 text-base font-medium">
                  La fase de grupos no está definida aún.
                </p>
              </section>
            ) : (
            <section className="app-glass-panel p-6 md:p-8 shadow-sport-card dark:shadow-sport-card-dark overflow-visible">
              <h2 className="text-xl font-bold text-[#111318] dark:text-white mb-4">Fase de grupos</h2>
              {/* Mobile: misma estética que desktop (círculos, colores, filas) con menos columnas */}
              <div className="md:hidden flex flex-col gap-6 overflow-visible">
                {groupTables.map((group) => (
                  <div key={group.name} className="overflow-hidden rounded-lg border border-gray-200/90 dark:border-gray-600/70">
                    <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-2.5 border-b border-gray-200/90 dark:border-gray-600/70">
                      <h3 className="font-bold text-[#111318] dark:text-white text-sm">{group.name}</h3>
                    </div>
                    {/* Fila de encabezado como en desktop */}
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_2.75rem_2.75rem_3rem] items-center gap-x-2 px-3 py-2 border-b border-gray-200/90 dark:border-gray-600/70 bg-gray-50/80 dark:bg-gray-800/80 text-xs font-bold text-[#616f89] dark:text-gray-400 uppercase tracking-wider">
                      <span className="flex w-8 shrink-0 justify-center text-center">Pos</span>
                      <span className="min-w-0">Jugador</span>
                      <span className="w-[2.75rem] shrink-0 text-center tabular-nums">PG</span>
                      <span className="w-[2.75rem] shrink-0 text-center tabular-nums">PP</span>
                      <span className="w-12 shrink-0 text-center tabular-nums">±</span>
                    </div>
                    <div className="divide-y divide-[#f0f2f4] dark:divide-gray-700 overflow-visible">
                      {group.rows.map((row) => {
                        const setDiff = (row.setsWon ?? 0) - (row.setsLost ?? 0);
                        const playerLabel = getPlayerById(row.playerId)?.name ?? '—';
                        const seed = displayTournamentSeed(row.playerId);
                        const playerWithRanking = seed != null ? `${playerLabel} (${seed})` : playerLabel;
                        const gPending = isGroupRowStatsPending(isLiga3, row.PJ);
                        const mPending = isGroupMatchStatsPending(row.PJ);
                        const isQualified = isLiga3 && row.position <= 3;
                        const posCircleClass =
                          row.position <= 2
                            ? 'bg-green-500/20 dark:bg-green-500/30 text-green-700 dark:text-green-300 ring-2 ring-green-500/60 dark:ring-green-400/50'
                            : row.position <= 4
                              ? pubTheme.posMidTier
                              : 'bg-red-500/20 dark:bg-red-500/30 text-red-700 dark:text-red-300 ring-2 ring-red-500/60 dark:ring-red-400/50';
                        return (
                          <div
                            key={row.playerId}
                            className={`grid grid-cols-[auto_minmax(0,1fr)_2.75rem_2.75rem_3rem] items-center gap-x-2 px-3 py-2.5 min-w-0 ${
                              isQualified ? 'bg-slate-50/80 dark:bg-slate-800/50' : 'bg-white dark:bg-gray-900'
                            }`}
                          >
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-semibold text-sm shrink-0 ${posCircleClass}`}>
                              {uiFormatTableRank(row.position, gPending)}
                            </span>
                            <span className="min-w-0 truncate text-sm font-medium text-[#111318] dark:text-white">
                              {playerWithRanking}
                            </span>
                            <span className="w-[2.75rem] shrink-0 text-center text-sm font-medium tabular-nums text-[#616f89] dark:text-gray-400">
                              {gPending || mPending ? '—' : (row.PG ?? '—')}
                            </span>
                            <span className="w-[2.75rem] shrink-0 text-center text-sm font-medium tabular-nums text-[#616f89] dark:text-gray-400">
                              {gPending || mPending ? '—' : (row.PP ?? '—')}
                            </span>
                            <span
                              className={`w-12 shrink-0 text-center text-sm font-medium tabular-nums ${
                                gPending || mPending ? 'text-[#616f89] dark:text-gray-500' : 'text-[#616f89] dark:text-gray-400'
                              }`}
                            >
                              {gPending || mPending ? '—' : `${setDiff >= 0 ? '+' : ''}${setDiff}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: table unchanged */}
              <div className="hidden md:flex flex-col gap-8">
                {groupTables.map((group) => (
                  <div key={group.name} className="overflow-hidden rounded-lg border border-gray-200/90 dark:border-gray-600/70 pr-4">
                    <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-2 border-b border-gray-200/90 dark:border-gray-600/70">
                      <h3 className="font-bold text-[#111318] dark:text-white">{group.name}</h3>
                    </div>
                    <table className="app-data-table w-full min-w-0 table-fixed text-sm">
                      <colgroup>
                        <col className="w-14" />
                        <col />
                        {isLiga3 && <col className="w-12" />}
                        <col className="w-[2.75rem]" />
                        <col className="w-[2.75rem]" />
                        <col className="w-[2.75rem]" />
                        <col className="w-12" />
                        <col className="w-12" />
                        <col className="w-12" />
                        <col className="w-12" />
                      </colgroup>
                      <thead>
                        <tr className="border-b border-gray-200/90 dark:border-gray-600/70">
                          <th className="px-3 py-2.5 text-center font-bold text-[#616f89] dark:text-gray-400">Pos</th>
                          <th className="px-4 py-2.5 text-left font-bold text-[#616f89] dark:text-gray-400">Jugador</th>
                          {isLiga3 && <th className="px-3 py-2.5 text-center font-bold text-[#616f89] dark:text-gray-400">+/-</th>}
                          <th className="px-3 py-2.5 text-center font-bold text-[#616f89] dark:text-gray-400">PJ</th>
                          <th className="px-3 py-2.5 text-center font-bold text-[#616f89] dark:text-gray-400">PG</th>
                          <th className="px-3 py-2.5 text-center font-bold text-[#616f89] dark:text-gray-400">PP</th>
                          <th className="px-3 py-2.5 pr-5 text-center font-bold text-[#616f89] dark:text-gray-400 whitespace-nowrap">Sets +</th>
                          <th className="px-3 py-2.5 pr-5 text-center font-bold text-[#616f89] dark:text-gray-400 whitespace-nowrap">Sets −</th>
                          <th className="px-3 py-2.5 pr-5 text-center font-bold text-[#616f89] dark:text-gray-400 whitespace-nowrap">
                            gam+
                          </th>
                          <th className="px-3 py-2.5 pr-5 text-center font-bold text-[#616f89] dark:text-gray-400 whitespace-nowrap">
                            gam−
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f0f2f4] dark:divide-gray-700">
                        {group.rows.map((row) => {
                          const p = getPlayerById(row.playerId);
                          const playerLabel = p?.name ?? '—';
                          const seed = displayTournamentSeed(row.playerId);
                          const playerWithRanking = seed != null ? `${playerLabel} (${seed})` : playerLabel;
                          const gPending = isGroupRowStatsPending(isLiga3, row.PJ);
                          const mPending = isGroupMatchStatsPending(row.PJ);
                          const isQualified = isLiga3 && row.position <= 3;
                          const isEliminated = isLiga3 && row.position >= 4;
                          const changeCellClass = isEliminated
                            ? 'px-3 py-2.5 text-center text-[#94a3b8] dark:text-slate-500 bg-slate-100 dark:bg-slate-800/60'
                            : isLiga3
                              ? 'px-3 py-2.5 text-center font-medium tabular-nums'
                              : '';
                          const changeDisplay = row.positionChange != null && row.positionChange !== 0
                            ? (row.positionChange > 0 ? `+${row.positionChange}` : String(row.positionChange))
                            : '—';
                          const changeContentClass = 'inline-block w-7 text-center tabular-nums';
                          const posCircleClass =
                            row.position <= 2
                              ? 'bg-green-500/20 dark:bg-green-500/30 text-green-700 dark:text-green-300 ring-2 ring-green-500/60 dark:ring-green-400/50'
                              : row.position <= 4
                                ? pubTheme.posMidTier
                                : 'bg-red-500/20 dark:bg-red-500/30 text-red-700 dark:text-red-300 ring-2 ring-red-500/60 dark:ring-red-400/50';
                          return (
                            <tr
                              key={row.playerId}
                              className={
                                isQualified
                                  ? 'hover:bg-gray-50 dark:hover:bg-gray-800/30 bg-slate-50/80 dark:bg-slate-800/50'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'
                              }
                            >
                              <td className="px-3 py-2.5 text-center align-middle">
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-semibold text-sm ${posCircleClass}`}>
                                  {uiFormatTableRank(row.position, gPending)}
                                </span>
                              </td>
                              <td className="min-w-0 overflow-hidden px-4 py-2.5 align-middle font-medium text-[#111318] dark:text-white">
                                <span className="block truncate" title={playerWithRanking}>
                                  {playerWithRanking}
                                </span>
                              </td>
                              {isLiga3 && (
                                <td className={`${changeCellClass} text-[#616f89] dark:text-gray-400 align-middle`}>
                                  <span className={changeContentClass}>{changeDisplay}</span>
                                </td>
                              )}
                              <td className="px-3 py-2.5 text-center text-[#616f89] dark:text-gray-400 tabular-nums align-middle">{gPending ? '—' : row.PJ}</td>
                              <td className="px-3 py-2.5 text-center text-[#616f89] dark:text-gray-400 tabular-nums align-middle">{gPending || mPending ? '—' : (row.PG ?? '—')}</td>
                              <td className="px-3 py-2.5 text-center text-[#616f89] dark:text-gray-400 tabular-nums align-middle">{gPending || mPending ? '—' : (row.PP ?? '—')}</td>
                              <td className="px-3 py-2.5 text-center text-[#616f89] dark:text-gray-400 tabular-nums align-middle">{gPending || mPending ? '—' : row.setsWon}</td>
                              <td className="px-3 py-2.5 pr-5 text-center text-[#616f89] dark:text-gray-400 tabular-nums align-middle">{gPending || mPending ? '—' : row.setsLost}</td>
                              <td className="px-3 py-2.5 text-center text-[#616f89] dark:text-gray-400 tabular-nums align-middle">{gPending || mPending ? '—' : row.gamesWon}</td>
                              <td className="px-3 py-2.5 pr-5 text-center text-[#616f89] dark:text-gray-400 tabular-nums align-middle">{gPending || mPending ? '—' : row.gamesLost}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </section>
            )}
            {!isPlaceholderTournament && groupFixtures.length > 0 && (
              <section className="app-glass-panel p-6 md:p-8 shadow-sport-card dark:shadow-sport-card-dark">
                <h2 className="text-xl font-bold text-[#111318] dark:text-white mb-4">Fechas por grupo</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {groupFixtures.map((group) => (
                    <div key={group.name} className="rounded-lg border border-gray-200/90 dark:border-gray-600/70 bg-gray-50 dark:bg-gray-800/50 overflow-hidden">
                      <div className="px-3 py-2 border-b border-gray-200/90 dark:border-gray-600/70">
                        <h3 className="font-bold text-[#111318] dark:text-white text-sm">{group.name}</h3>
                      </div>
                      <div className="p-3 space-y-3">
                        {group.fechas.map((f) => (
                          <div key={`${group.name}-f-${f.fecha}`} className="rounded border border-gray-200/90 bg-white/25 p-2 dark:border-gray-600/70 dark:bg-white/[0.06]">
                            <p className="text-xs font-bold text-[#616f89] dark:text-gray-400 uppercase tracking-wider mb-1.5">Fecha {f.fecha}</p>
                            <ul className="space-y-1 text-sm text-[#111318] dark:text-white">
                              {f.matches.map((match, i) => (
                                <li key={i} className="space-y-0.5">
                                  <div>
                                    {match.ballsByA ? (
                                      <><span className={`font-medium ${pubTheme.accentText}`}>{match.playerA}</span>{' '}
                                        <span className={`text-xs font-semibold ${pubTheme.accentText}`}>(P)</span> vs {match.playerB}</>
                                    ) : (
                                      <>{match.playerA} vs <span className={`font-medium ${pubTheme.accentText}`}>{match.playerB}</span>{' '}
                                        <span className={`text-xs font-semibold ${pubTheme.accentText}`}>(P)</span></>
                                    )}
                                  </div>
                                  <p className="text-[11px] font-semibold tabular-nums text-[#616f89] dark:text-gray-500">
                                    {match.resultSummary != null && match.resultSummary !== ''
                                      ? match.resultSummary
                                      : 'Pendiente'}
                                  </p>
                                </li>
                              ))}
                              {f.libre && (
                                <li className="text-[#616f89] dark:text-gray-400 text-xs pt-0.5">Libre: {f.libre}</li>
                              )}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {isLiga3 && (
              <section className="app-glass-panel p-6 md:p-8 shadow-sport-card dark:shadow-sport-card-dark">
                <h2 className="text-xl font-bold text-[#111318] dark:text-white mb-4">Clasificación a Play Off</h2>
                <p className="text-sm text-[#616f89] dark:text-gray-300 whitespace-pre-line leading-relaxed">
                  {LIGA3_PLAYOFF_RULES}
                </p>
              </section>
            )}
          </>
        )}

        {section === 'programacion' && (
          <section className="app-glass-panel p-6 md:p-8 shadow-sport-card dark:shadow-sport-card-dark overflow-visible">
            <h2 className="text-xl font-bold text-[#111318] dark:text-white mb-2 md:mb-4">Programación</h2>
            <p className="mb-4 text-sm leading-relaxed text-[#616f89] dark:text-gray-400">
              Agenda real del torneo: horarios confirmados, reprogramaciones, postergaciones y cancelaciones. La pelota indica quién lleva las pelotas.
            </p>
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#616f89] dark:text-gray-500 md:hidden">
              Filtrar por estado
            </p>
            <div
              className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 md:mb-6"
              role="group"
              aria-label="Filtrar programación por estado"
            >
              <button
                type="button"
                onClick={() => setProgramacionFilter('all')}
                className={`flex min-h-[2.75rem] w-full items-center justify-center rounded-lg border px-2 py-2 text-center text-xs font-semibold leading-snug transition-colors sm:text-sm ${
                  programacionFilter === 'all'
                    ? `${pubTheme.accentSolid} border-transparent text-white shadow-sm ${pubTheme.accentSolidHover}`
                    : 'border-gray-200/90 bg-gray-50 text-[#616f89] hover:bg-gray-100 dark:border-gray-600/70 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Todos
              </button>
              {(['confirmed', 'rescheduled', 'postponed', 'suspended', 'cancelled'] as MatchScheduleStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setProgramacionFilter(st)}
                  className={`flex min-h-[2.75rem] w-full items-center justify-center rounded-lg border px-2 py-2 text-center text-xs font-semibold leading-snug transition-colors sm:text-sm ${
                    programacionFilter === st
                      ? `${pubTheme.accentSolid} border-transparent text-white shadow-sm ${pubTheme.accentSolidHover}`
                      : 'border-gray-200/90 bg-gray-50 text-[#616f89] hover:bg-gray-100 dark:border-gray-600/70 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {st === 'confirmed'
                    ? 'Confirmados'
                    : st === 'rescheduled'
                      ? 'Reprogramados'
                      : st === 'postponed'
                        ? 'Postergados'
                        : st === 'suspended'
                          ? 'Suspendidos'
                          : 'Cancelados'}
                </button>
              ))}
            </div>

            {visibleScheduledRows.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {visibleScheduledRows.map(({ row, schedule, ballCarrier }) => (
                  <article
                    key={row.dedupeKey}
                    className="rounded-xl border border-gray-200/90 bg-gray-50 p-4 dark:border-gray-600/70 dark:bg-gray-800/50"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <p className="min-w-0 text-xs font-bold uppercase tracking-wide text-[#616f89] dark:text-gray-400">
                        {row.groupLabel} · {row.fixtureRoundLabel}
                      </p>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${scheduleStatusTone(schedule?.scheduleStatus)}`}>
                        {formatScheduleStatusLabel(schedule?.scheduleStatus)}
                      </span>
                    </div>
                    <p className="text-base font-bold leading-snug text-[#111318] dark:text-white">
                      {row.playerA} <span className="text-[#616f89] dark:text-gray-400">vs</span> {row.playerB}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <p className={`inline-flex items-center rounded-full border border-gray-200/90 bg-white px-2.5 py-1 text-xs font-black tabular-nums dark:border-gray-600/70 dark:bg-gray-900/60 ${pubTheme.accentText}`}>
                        {schedule?.date ?? 'Sin fecha'} · {schedule?.time ?? 'Sin hora'}
                      </p>
                    </div>
                    {ballCarrier ? (
                      <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-gray-200/90 bg-white px-2.5 py-1 text-xs font-bold text-[#616f89] dark:border-gray-600/70 dark:bg-gray-900/60 dark:text-gray-300">
                        {pelotaImgUrl ? (
                          <img src={pelotaImgUrl} alt="" className="h-4 w-4 object-contain" width={16} height={16} aria-hidden />
                        ) : (
                          <span aria-hidden>●</span>
                        )}
                        Lleva pelotas: <span className="text-[#111318] dark:text-white">{ballCarrier}</span>
                      </p>
                    ) : null}
                    {schedule?.note ? <p className="mt-2 text-xs text-[#111318] dark:text-gray-200">{schedule.note}</p> : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#616f89] dark:text-gray-400">
                Aún no hay partidos programados para este torneo.
              </p>
            )}
          </section>
        )}

        {section === 'partidos' && (
          <section className="app-glass-panel p-6 md:p-8 shadow-sport-card dark:shadow-sport-card-dark overflow-visible">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-[#111318] dark:text-white">Partidos</h2>
              <p className="mt-1 text-sm leading-relaxed text-[#616f89] dark:text-gray-400">
                Fixture completo del torneo: pendientes, programados y jugados en un solo lugar.
              </p>
            </div>

            {publicMatchRows.length > 0 ? (
              <>
                <div className="mb-5 md:hidden">
                  <label htmlFor="public-partidos-mobile-select" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-[#616f89] dark:text-gray-500">
                    Ver etapa
                  </label>
                  <div className="relative">
                    <select
                      id="public-partidos-mobile-select"
                      value={partidosFilter}
                      onChange={(e) => setPartidosFilter(e.target.value)}
                      className="min-h-12 w-full appearance-none rounded-xl border border-gray-200/90 bg-gray-50 px-4 py-3 pr-10 text-sm font-bold text-[#111318] shadow-sm dark:border-gray-600/70 dark:bg-gray-800 dark:text-white"
                      aria-label="Seleccionar fecha o etapa"
                    >
                      {publicMatchFilters.map((filter) => (
                        <option key={filter.key} value={filter.key}>
                          {filter.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-[#616f89] dark:text-gray-400" aria-hidden>
                      ▼
                    </span>
                  </div>
                </div>

                <div className="mb-5 hidden flex-wrap gap-2 md:flex" role="tablist" aria-label="Filtrar partidos por fecha o etapa">
                  {publicMatchFilters.map((filter) => {
                    const active = partidosFilter === filter.key;
                    return (
                      <button
                        key={filter.key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setPartidosFilter(filter.key)}
                        className={`min-h-[2.5rem] rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
                          active
                            ? `${pubTheme.accentSolid} border-transparent text-white shadow-sm ${pubTheme.accentSolidHover}`
                            : 'border-gray-200/90 bg-gray-50 text-[#616f89] hover:bg-gray-100 dark:border-gray-600/70 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>

                {visiblePublicMatchGroups.length > 0 ? (
                  <div className="space-y-5">
                    {visiblePublicMatchGroups.map((group) => (
                      <div key={group.label} className="rounded-2xl border border-gray-200/80 bg-white/45 p-3 dark:border-gray-700/70 dark:bg-gray-900/20">
                      <div className="mb-3 flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${pubTheme.accentSolid}`} aria-hidden />
                        <h3 className="text-xs font-black uppercase tracking-[0.18em] text-[#616f89] dark:text-gray-400">
                          {group.label}
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {group.rows.map((m) => (
                          <article
                            key={m.key}
                            className="rounded-xl border border-gray-200/90 bg-gray-50 p-4 dark:border-gray-600/70 dark:bg-gray-800/50"
                          >
                            <div className="mb-3 flex items-start justify-between gap-3">
                              <p className="min-w-0 text-xs font-bold uppercase tracking-wide text-[#616f89] dark:text-gray-400">
                                {m.phase}
                              </p>
                              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${m.stateTone}`}>
                                {m.state}
                              </span>
                            </div>
                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-3">
                              <p className="min-w-0 text-base font-bold leading-snug text-[#111318] dark:text-white">
                                <span className={m.winnerSide === 'a' ? `underline decoration-2 underline-offset-4 decoration-current ${pubTheme.accentText}` : ''}>
                                  {m.playerA}
                                </span>{' '}
                                <span className="font-semibold text-[#616f89] dark:text-gray-400">vs</span>{' '}
                                <span className={m.winnerSide === 'b' ? `underline decoration-2 underline-offset-4 decoration-current ${pubTheme.accentText}` : ''}>
                                  {m.playerB}
                                </span>
                              </p>
                              {m.scoreLine ? (
                                <p className={`shrink-0 text-sm font-black tabular-nums md:text-right ${pubTheme.accentText}`}>{m.scoreLine}</p>
                              ) : null}
                            </div>
                            <p className="mt-2 text-sm font-medium leading-snug text-[#616f89] dark:text-gray-400">{m.detail}</p>
                          </article>
                        ))}
                      </div>
                    </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-gray-200/90 bg-gray-50 p-4 text-sm text-[#616f89] dark:border-gray-600/70 dark:bg-gray-800/50 dark:text-gray-400">
                    Todavía no hay partidos programados. Podés elegir una fecha para ver el fixture completo.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-[#616f89] dark:text-gray-400">
                Todavía no hay fixture disponible para este torneo.
              </p>
            )}
          </section>
        )}

        {/* Eliminación */}
        {section === 'eliminacion' && (
          <section className="app-glass-panel p-6 md:p-8 shadow-sport-card dark:shadow-sport-card-dark overflow-visible">
            <h2 className="text-xl font-bold text-[#111318] dark:text-white mb-6">Eliminación</h2>
            {/* Mobile: tabs + match cards, no bracket */}
            <div className="md:hidden flex flex-col gap-4 overflow-visible">
              <div
                className={`grid gap-2 ${isMasters1000 ? 'grid-cols-2' : 'grid-cols-3'}`}
                role="tablist"
                aria-label="Ronda de eliminación"
              >
                {(isMasters1000 ? (['2', '3'] as const) : (['1', '2', '3'] as const)).map((round) => (
                  <button
                    key={round}
                    type="button"
                    onClick={() => setEliminationRoundTab(round)}
                    className={`min-h-[2.75rem] w-full rounded-lg border px-2 py-2.5 text-center text-sm font-semibold transition-colors ${
                      eliminationRoundTab === round
                        ? pubTheme.elimTabActive
                        : 'border-slate-300/80 bg-slate-100 text-[#616f89] hover:bg-slate-200 dark:border-slate-600/70 dark:bg-[#1e293b]/90 dark:text-slate-400 dark:hover:bg-[#273549]'
                    }`}
                  >
                    {round === '1' ? 'Cuartos' : round === '2' ? (isMasters1000 ? 'Semifinales' : 'Semifinal') : 'Final'}
                  </button>
                ))}
              </div>
              <div className={pubTheme.elimMobileShell}>
                {(() => {
                  const bracketMatches = getBracketMatchesForLibrary(bracketSourceId, tournamentSeedMap);
                  const roundMatches = bracketMatches.filter((m) => m.tournamentRoundText === eliminationRoundTab);
                  return roundMatches.map((match) => {
                    const [top, bottom] = match.participants;
                    const topWon = top?.isWinner === true;
                    const bottomWon = bottom?.isWinner === true;
                    const topName = top?.name ?? 'TBD';
                    const bottomName = bottom?.name ?? 'TBD';
                    const topSeed = top?.ranking != null ? ` (${top.ranking})` : '';
                    const bottomSeed = bottom?.ranking != null ? ` (${bottom.ranking})` : '';
                    const result = top?.resultText || bottom?.resultText || '–';
                    return (
                      <div
                        key={String(match.id)}
                        className={pubTheme.elimMobileCard}
                      >
                        <p
                          className={`text-sm font-semibold ${topWon ? pubTheme.elimWinnerName : 'text-[#111318] dark:text-white'}`}
                        >
                          {topName}
                          {topSeed}
                        </p>
                        <p className={`py-1 text-xs ${pubTheme.elimVsMuted}`}>vs</p>
                        <p
                          className={`text-sm font-semibold ${bottomWon ? pubTheme.elimWinnerName : 'text-[#111318] dark:text-white'}`}
                        >
                          {bottomName}
                          {bottomSeed}
                        </p>
                        <p className={pubTheme.elimResult}>
                          Resultado: {result}
                        </p>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
            {/* Desktop: custom bracket */}
            <div className="hidden md:block min-w-0 w-full">
              <TournamentBracket rounds={bracketRounds} publicTheme={pubTheme} />
            </div>
          </section>
        )}

        {/* Resultados: todos los partidos jugados con filtro */}
        {section === 'resultados' && (
          <section className="app-glass-panel p-6 md:p-8 shadow-sport-card dark:shadow-sport-card-dark overflow-visible">
            <h2 className="text-xl font-bold text-[#111318] dark:text-white mb-4">Resultados</h2>
            {isLiga3 ? (
              <>
                <div
                  className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3"
                  role="group"
                  aria-label="Filtrar resultados"
                >
                  {(['todos', 'fase-grupos', 'eliminacion'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setResultadosFilter(f)}
                      className={`flex min-h-[2.75rem] w-full items-center justify-center rounded-lg border px-2 py-2 text-center text-sm font-semibold leading-snug transition-colors ${
                        resultadosFilter === f
                          ? `${pubTheme.accentSolid} border-transparent text-white shadow-sm ${pubTheme.accentSolidHover}`
                          : 'border-gray-200/90 bg-gray-50 text-[#616f89] hover:bg-gray-100 dark:border-gray-600/70 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                    >
                      {f === 'todos' ? 'Todos' : f === 'fase-grupos' ? 'Fase de grupos' : 'Eliminación'}
                    </button>
                  ))}
                </div>
                {/* Mobile: ATP-style match cards — date only, no time/court, scores right-aligned */}
                <div className="md:hidden flex flex-col gap-3 overflow-visible">
                  {(() => {
                    const groupRows = resultadosFilter !== 'eliminacion' ? liga3GroupResultRows : [];
                    const elimEntries =
                      resultadosFilter !== 'fase-grupos'
                        ? liga3ElimFromStore.map((e, i) => ({
                            key: e.key ?? `e-${i}`,
                            date: e.date,
                            playerA: e.playerA,
                            playerB: e.playerB,
                            result: e.result,
                            phase: e.phase,
                          }))
                        : [];
                    const groupCards = groupRows.map((m, i) => ({ key: `g-${i}`, date: m.date, playerA: m.playerA, playerB: m.playerB, result: m.score, phase: m.groupName }));
                    const elimCards = elimEntries;
                    const list = resultadosFilter === 'todos' ? [...groupCards, ...elimCards] : resultadosFilter === 'fase-grupos' ? groupCards : elimCards;
                    const parseScore = (s: string): { a: number[]; b: number[] } => {
                      const t = (s ?? '').trim();
                      if (!t || t === '—' || t === 'Pendiente' || t === 'W.O.' || t === 'Suspendido') return { a: [], b: [] };
                      const sets = t.split(',').map((x) => x.trim().split('-').map(Number));
                      const a = sets.map(([x]) => x).filter((n) => !Number.isNaN(n));
                      const b = sets.map(([, y]) => y).filter((n) => !Number.isNaN(n));
                      return { a, b };
                    };
                    const setsWonByA = (setA: number[], setB: number[]) =>
                      setA.filter((v, i) => v > (setB[i] ?? 0)).length;
                    return list.map((item) => {
                      const { a: setA, b: setB } = parseScore(item.result);
                      const aSets = setsWonByA(setA, setB);
                      const bSets = setsWonByA(setB, setA);
                      const aWon = setA.length > 0 && aSets > bSets;
                      const bWon = setB.length > 0 && bSets > aSets;
                      return (
                        <div key={item.key} className="rounded-xl border border-gray-200/90 dark:border-gray-600/70 bg-gray-50 dark:bg-gray-800/50 p-4 overflow-visible relative">
                          <span className="absolute top-3 right-3 text-xs font-medium text-[#616f89] dark:text-gray-400">{item.date}</span>
                          <div className="flex flex-col gap-1.5 pr-20">
                            <div className="flex items-center justify-between gap-2 min-w-0">
                              <span className={`text-sm truncate ${aWon ? `font-bold ${pubTheme.accentTextWinner}` : 'text-[#111318] dark:text-white'}`}>{formatLiga3ResultPlayerName(item.playerA)}</span>
                              <span className="flex gap-2 tabular-nums text-sm shrink-0">
                                {setA.length ? setA.map((n, i) => <span key={i} className={aWon ? `font-bold ${pubTheme.accentTextWinner}` : ''}>{n}</span>) : '–'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 min-w-0">
                              <span className={`text-sm truncate ${bWon ? `font-bold ${pubTheme.accentTextWinner}` : 'text-[#111318] dark:text-white'}`}>{formatLiga3ResultPlayerName(item.playerB)}</span>
                              <span className="flex gap-2 tabular-nums text-sm shrink-0">
                                {setB.length ? setB.map((n, i) => <span key={i} className={bWon ? `font-bold ${pubTheme.accentTextWinner}` : ''}>{n}</span>) : '–'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
                {/* Desktop: table unchanged */}
                <div className="hidden md:block overflow-visible">
                  <div className="overflow-x-auto">
                  <table className="app-data-table w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200/90 dark:border-gray-600/70">
                        <th className="px-4 py-2 text-left font-bold text-[#616f89] dark:text-gray-400">Fecha</th>
                        <th className="px-4 py-2 text-left font-bold text-[#616f89] dark:text-gray-400">Hora</th>
                        <th className="px-4 py-2 text-left font-bold text-[#616f89] dark:text-gray-400">Fase</th>
                        <th className="px-4 py-2 text-left font-bold text-[#616f89] dark:text-gray-400">Partido</th>
                        <th className="px-4 py-2 text-center font-bold text-[#616f89] dark:text-gray-400">Resultado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f2f4] dark:divide-gray-700">
                      {resultadosFilter === 'fase-grupos' &&
                        liga3GroupResultRows.map((m, i) => (
                          <tr key={`g-${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                            <td className="px-4 py-2 text-[#616f89] dark:text-gray-400">{m.date}</td>
                            <td className="px-4 py-2 text-[#616f89] dark:text-gray-400">{m.time}</td>
                            <td className="px-4 py-2 font-medium text-[#111318] dark:text-white">{m.groupName}</td>
                            <td className="px-4 py-2 text-[#111318] dark:text-white">{formatLiga3ResultPlayerName(m.playerA)} vs {formatLiga3ResultPlayerName(m.playerB)}</td>
                            <td className={`px-4 py-2 text-center font-bold ${pubTheme.accentText}`}>{m.score}</td>
                          </tr>
                        ))}
                      {resultadosFilter === 'eliminacion' &&
                        liga3ElimFromStore.map((e) => (
                          <tr key={e.key} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                            <td className="px-4 py-2 text-[#616f89] dark:text-gray-400">{e.date}</td>
                            <td className="px-4 py-2 text-[#616f89] dark:text-gray-400">{e.time}</td>
                            <td className="px-4 py-2 font-medium text-[#111318] dark:text-white">{e.phase}</td>
                            <td className="px-4 py-2 text-[#111318] dark:text-white">{formatLiga3ResultPlayerName(e.playerA)} vs {formatLiga3ResultPlayerName(e.playerB)}</td>
                            <td className={`px-4 py-2 text-center font-bold ${pubTheme.accentText}`}>{e.result}</td>
                          </tr>
                        ))}
                      {resultadosFilter === 'todos' &&
                        (() => {
                          const groupRows = liga3GroupResultRows.map((m) => ({ date: m.date, time: m.time, phase: m.groupName, playerA: m.playerA, playerB: m.playerB, result: m.score }));
                          const elimRows = liga3ElimFromStore;
                          return (
                            <>
                              {groupRows.map((r, i) => (
                                <tr key={`t-g-${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                  <td className="px-4 py-2 text-[#616f89] dark:text-gray-400">{r.date}</td>
                                  <td className="px-4 py-2 text-[#616f89] dark:text-gray-400">{r.time}</td>
                                  <td className="px-4 py-2 font-medium text-[#111318] dark:text-white">{r.phase}</td>
                                  <td className="px-4 py-2 text-[#111318] dark:text-white">{formatLiga3ResultPlayerName(r.playerA)} vs {formatLiga3ResultPlayerName(r.playerB)}</td>
                                  <td className={`px-4 py-2 text-center font-bold ${pubTheme.accentText}`}>{r.result}</td>
                                </tr>
                              ))}
                              {elimRows.map((e) => (
                                <tr key={`t-${e.key}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                  <td className="px-4 py-2 text-[#616f89] dark:text-gray-400">{e.date}</td>
                                  <td className="px-4 py-2 text-[#616f89] dark:text-gray-400">{e.time}</td>
                                  <td className="px-4 py-2 font-medium text-[#111318] dark:text-white">{e.phase}</td>
                                  <td className="px-4 py-2 text-[#111318] dark:text-white">{formatLiga3ResultPlayerName(e.playerA)} vs {formatLiga3ResultPlayerName(e.playerB)}</td>
                                  <td className={`px-4 py-2 text-center font-bold ${pubTheme.accentText}`}>{e.result}</td>
                                </tr>
                              ))}
                            </>
                          );
                        })()}
                    </tbody>
                  </table>
                </div>
                </div>
              </>
            ) : isPlaceholderTournament ? (
              <p className="text-sm text-[#616f89] dark:text-gray-400">
                Todavía no hay resultados disponibles.
              </p>
            ) : publicResultRows.length > 0 ? (
              <>
                <div className="flex flex-col gap-3 md:hidden">
                  {publicResultRows.map((r) => (
                    <article
                      key={r.key}
                      className="rounded-xl border border-gray-200/90 bg-gray-50 p-3 dark:border-gray-600/70 dark:bg-gray-800/50"
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-[#616f89] dark:text-gray-500">
                            {r.date}
                          </p>
                          <p className="mt-0.5 text-xs font-semibold text-[#616f89] dark:text-gray-400">{r.phase}</p>
                        </div>
                        <span className={`shrink-0 rounded-md bg-white px-2 py-1 text-sm font-black tabular-nums shadow-sm dark:bg-gray-900 ${pubTheme.accentText}`}>
                          {r.result}
                        </span>
                      </div>
                      <p className="text-sm font-semibold leading-snug text-[#111318] dark:text-white">
                        {r.playerA} <span className="font-normal text-[#616f89] dark:text-gray-400">vs</span> {r.playerB}
                      </p>
                    </article>
                  ))}
                </div>
                <div className="hidden rounded-lg border border-gray-200/90 dark:border-gray-600/70 md:block">
                  <table className="app-data-table w-full table-fixed text-sm">
                    <colgroup>
                      <col className="w-[7.5rem]" />
                      <col className="w-[8rem]" />
                      <col />
                      <col className="w-[7rem]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-gray-200/90 dark:border-gray-600/70">
                        <th className="px-4 py-2 text-left font-bold text-[#616f89] dark:text-gray-400">Fecha</th>
                        <th className="px-4 py-2 text-left font-bold text-[#616f89] dark:text-gray-400">Fase</th>
                        <th className="px-4 py-2 text-left font-bold text-[#616f89] dark:text-gray-400">Partido</th>
                        <th className="px-4 py-2 text-center font-bold text-[#616f89] dark:text-gray-400">Resultado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f2f4] dark:divide-gray-700">
                      {publicResultRows.map((r) => (
                        <tr key={r.key} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="px-4 py-2 text-[#616f89] dark:text-gray-400">{r.date}</td>
                          <td className="px-4 py-2 font-medium text-[#111318] dark:text-white">{r.phase}</td>
                          <td className="px-4 py-2 text-[#111318] dark:text-white">
                            {r.playerA} <span className="text-[#616f89]">vs</span> {r.playerB}
                          </td>
                          <td className={`px-4 py-2 text-center font-bold ${pubTheme.accentText}`}>{r.result}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-sm text-[#616f89] dark:text-gray-400">
                Aún no hay resultados cargados para este torneo. Cuando el club registre marcadores, aparecerán aquí y
                en las tablas de la fase de grupos.
              </p>
            )}
          </section>
        )}

        {/* Reglamento: reglas, puntos por fase, calendario; sin resultados */}
        {section === 'reglamento' && (
          <section className="app-glass-panel p-6 md:p-8 shadow-sport-card dark:shadow-sport-card-dark">
            <div className="flex flex-wrap items-center gap-6 text-[#616f89] dark:text-gray-400 text-sm mb-4">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-5 h-5 shrink-0" />
                {formatTournamentDate(tournament)}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-5 h-5 shrink-0" />
                {tournament.location}
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#111318] dark:text-white mb-2">Reglamento</h2>
            <ul className="list-disc list-inside space-y-1 text-[#616f89] dark:text-gray-300 text-sm mb-4">
              {DEFAULT_TOURNAMENT_RULES.map((rule, i) => (
                <li key={i}>{rule}</li>
              ))}
            </ul>
            <p className="text-sm font-medium text-[#111318] dark:text-white bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-200/90 dark:border-gray-600/70 mb-4">
              {pelotaImgUrl && (
                <img src={pelotaImgUrl} alt="" className="inline-block w-5 h-5 mr-1.5 align-middle object-contain" aria-hidden />
              )}
              {BALL_RULE_TEXT}
            </p>
            <div className="rounded-xl border-2 border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-500 p-4 mb-4">
              <p className="flex items-center gap-2 font-bold text-red-800 dark:text-red-300 mb-1">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                {LATE_ARRIVAL_RULE_TITLE}
              </p>
              <p className="text-sm text-red-700 dark:text-red-200">{LATE_ARRIVAL_RULE_TEXT}</p>
            </div>
            <h3 className="text-sm font-bold text-[#111318] dark:text-white uppercase tracking-wider mb-2">Sistema de puntos (por fase)</h3>
            <p className="text-sm text-[#616f89] dark:text-gray-400 mb-2">Los puntos se otorgan por fase alcanzada en la eliminación, no por partido.</p>
            <div className="rounded-lg border border-gray-200/90 dark:border-gray-600/70 overflow-hidden max-w-sm mb-6">
              <table className="app-data-table w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold text-[#616f89] dark:text-gray-400">Fase</th>
                    <th className="px-3 py-2 text-right font-bold text-[#616f89] dark:text-gray-400">Puntos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f2f4] dark:divide-gray-700">
                  {PHASE_POINTS_DISPLAY.map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-[#111318] dark:text-white">{row.phase}</td>
                      <td className={`px-3 py-2 text-right font-bold ${pubTheme.accentText}`}>{row.points} pts</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3 className="text-sm font-bold text-[#111318] dark:text-white uppercase tracking-wider mb-2">Estructura del calendario</h3>
            <div className="rounded-lg border border-gray-200/90 dark:border-gray-600/70 overflow-hidden max-w-sm">
              <table className="app-data-table w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold text-[#616f89] dark:text-gray-400">Semana</th>
                    <th className="px-3 py-2 text-right font-bold text-[#616f89] dark:text-gray-400">Fase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f2f4] dark:divide-gray-700">
                  {(calendarStructureRows.length > 0 ? calendarStructureRows : CALENDAR_STRUCTURE).map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-[#111318] dark:text-white">{row.week}</td>
                      <td className="px-3 py-2 text-right text-[#616f89] dark:text-gray-400">{row.phase}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {isLiga3 && (
              <>
                <h3 className="text-sm font-bold text-[#111318] dark:text-white uppercase tracking-wider mt-6 mb-2">Explicación de clasificación</h3>
                <p className="text-sm text-[#616f89] dark:text-gray-300">{LIGA3_CLASSIFICATION_RULES}</p>
              </>
            )}
          </section>
        )}

        <div className="flex justify-center pb-8">
          <button
            onClick={() => setScreen('directory')}
            className={`${pubTheme.accentText} font-bold hover:underline`}
          >
            ← Volver a torneos
          </button>
        </div>
      </div>
    </div>
  );
};

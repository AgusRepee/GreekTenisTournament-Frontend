import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, HelpCircle, ListChecks, Trophy } from 'lucide-react';
import { useClubData } from '@/lib/clubDataStore';
import { categoryToLeague, getTournamentById } from '@/lib/mockData';
import {
  buildFixtureCatalog,
  buildFixtureCatalogEntriesForTournament,
  type FixtureCatalogEntry,
} from '@/lib/tennis/buildFixtureCatalog';
import { compareFixtureGroups, sortFixtureEntriesByGroupThenRound } from '@/lib/tennis/fixtureResultsOrdering';
import { buildKnockoutAdminEntries, type KnockoutAdminEntry, type KnockoutStage } from '@/lib/tennis/adminKnockoutCatalog';
import { matchInputDedupeKey } from '@/lib/tennis/matchDedupe';
import { useResults } from '@/lib/tennis/resultsStore';
import { commitAdminMatchResult } from '@/lib/tennis/adminMatchResultPipeline';
import { getMatchScheduleByKey } from '@/lib/tennis/matchScheduleStore';
import { SCHEDULE_REQUIRED_FOR_PLAYED_MESSAGE } from '@/lib/tennis/matchScheduleForResultGuard';
import type { MatchInput } from '@/types/tennisResults';
import {
  buildScoreStringIfValid,
  cloneGrid,
  EMPTY_GRID,
  parseScoreStringToCells,
  type ScoreCells,
} from '@/lib/tennis/adminScoreValidation';
import { inferWinnerName } from '@/lib/tennis/adminResultScore';
import { LABEL_PLAYED } from '@/lib/tennis/matchDisplayState';
import {
  groupMatchRankingPointsForCatalog,
  effectiveTournamentCatalogType,
} from '@/lib/tennis/rankingPointsGreek500';
import { AdminMatchScoreGrid } from './AdminMatchScoreGrid';
import { AdminConfirmDialog } from './AdminConfirmDialog';

type WizardPendingConfirm =
  | { kind: 'replace_played' }
  | { kind: 'walkover'; winner: 'a' | 'b' }
  | { kind: 'suspended' };

export type AdminFlowStage = 'grupos' | 'interzonal' | 'ko_quarter' | 'ko_semi' | 'ko_final';

const inputBase =
  'w-full rounded-md admin-input-editable dark:bg-gray-900 text-[#111318] dark:text-white outline-none transition-all px-3 py-2.5 text-sm disabled:opacity-55 disabled:cursor-not-allowed';

const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold border shadow-sm transition-opacity admin-theme-btn';

function isCompletedSuccess(m: MatchInput): boolean {
  return (
    (m.status === 'played' && !!m.score?.trim()) ||
    m.status === 'walkover' ||
    m.status === 'retired'
  );
}

function isSuspendedResult(m: MatchInput): boolean {
  return m.status === 'suspended';
}

/** Estado visual de fila (leyenda: amarillo / verde / rojo / violeta). */
type RowVisual = 'pending' | 'played' | 'walkover' | 'suspended';

function rowVisualState(r: MatchInput | undefined): RowVisual {
  if (!r) return 'pending';
  if (isSuspendedResult(r)) return 'suspended';
  if (r.status === 'walkover' || r.status === 'retired') return 'walkover';
  if (r.status === 'played' && r.score?.trim()) return 'played';
  return 'pending';
}

function tournamentLabel(tournamentId: string, tournaments: { id: string; name: string }[]): string {
  return tournaments.find((t) => t.id === tournamentId)?.name ?? tournamentId;
}

export type AdminMatchRow =
  | { kind: 'fixture'; entry: FixtureCatalogEntry }
  | { kind: 'ko'; entry: KnockoutAdminEntry };

function rowDedupeKey(row: AdminMatchRow): string {
  return row.kind === 'fixture' ? row.entry.dedupeKey : row.entry.dedupeKey;
}

function wizardGroupRankingPreview(
  row: AdminMatchRow,
  stored: MatchInput | undefined,
): { winnerPts: number; loserPts: number } | null {
  if (row.kind !== 'fixture') return null;
  if (row.entry.group === 'Interzonal') return null;
  const catalog = effectiveTournamentCatalogType(getTournamentById(row.entry.tournamentId));
  const gm = groupMatchRankingPointsForCatalog(catalog);
  if (stored?.status === 'walkover') return { winnerPts: gm.walkoverWin, loserPts: gm.walkoverLoss };
  return { winnerPts: gm.win, loserPts: gm.loss };
}

function stageLabel(s: AdminFlowStage, masters: boolean): string {
  switch (s) {
    case 'grupos':
      return 'Grupos';
    case 'interzonal':
      return 'Interzonal';
    case 'ko_quarter':
      return 'Cuartos';
    case 'ko_semi':
      return masters ? 'Semifinales' : 'Semifinal';
    case 'ko_final':
      return 'Final';
  }
}

function koStageFromFlow(s: AdminFlowStage): KnockoutStage | null {
  if (s === 'ko_quarter') return 'quarter';
  if (s === 'ko_semi') return 'semi';
  if (s === 'ko_final') return 'final';
  return null;
}

type WizardProps = {
  onTournamentThemeChange?: (tournamentId: string | null) => void;
};

export function AdminResultWizard({ onTournamentThemeChange }: WizardProps) {
  const navigate = useNavigate();
  const results = useResults();
  const { tournaments, players } = useClubData();

  const [tournamentId, setTournamentId] = useState('');
  const [flowStage, setFlowStage] = useState<'' | AdminFlowStage>('');
  /** Solo fechas grupos / interzonal: primera del listado por defecto. */
  const [filterRound, setFilterRound] = useState<number | null>(null);

  const selectedTournament = useMemo(
    () => (tournamentId.trim() ? getTournamentById(tournamentId.trim()) : undefined),
    [tournamentId, tournaments],
  );

  const leagueNumForCommit = useMemo(() => {
    const t = selectedTournament;
    return t ? (t.league ?? categoryToLeague(t.category)) : 1;
  }, [selectedTournament]);

  const isMasters1000 = useMemo(
    () => selectedTournament != null && effectiveTournamentCatalogType(selectedTournament) === 'masters1000',
    [selectedTournament],
  );

  /** Misma fuente que `AdminResultsVisualPanel`: Masters = RR 2×4 desde plantel; Greek500 = fixture doc (+ interzonal). */
  const fixtureCatalogEntries = useMemo(() => {
    if (!tournamentId.trim()) return [];
    return sortFixtureEntriesByGroupThenRound(
      buildFixtureCatalogEntriesForTournament(selectedTournament, players),
    );
  }, [tournamentId, selectedTournament, players]);

  const resultsByKey = useMemo(() => {
    const m = new Map<string, MatchInput>();
    for (const r of results) {
      m.set(matchInputDedupeKey(r), r);
    }
    return m;
  }, [results]);

  const [selectedRow, setSelectedRow] = useState<AdminMatchRow | null>(null);
  const [cells, setCells] = useState<ScoreCells>(EMPTY_GRID);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<WizardPendingConfirm | null>(null);
  const [scheduleGateDedupeKey, setScheduleGateDedupeKey] = useState<string | null>(null);

  useEffect(() => {
    onTournamentThemeChange?.(tournamentId.trim() ? tournamentId : null);
  }, [tournamentId, onTournamentThemeChange]);

  const tournamentIdsInCatalog = useMemo(() => {
    const fromCatalog = new Set(buildFixtureCatalog().map((c) => c.tournamentId));
    const clubIds = new Set(tournaments.map((t) => t.id));
    const merged = [...fromCatalog].filter((id) => clubIds.has(id)).sort((a, b) => a.localeCompare(b));
    return merged.length > 0 ? merged : Array.from(fromCatalog).sort((a, b) => a.localeCompare(b));
  }, [tournaments]);

  const koRowsForTournament = useMemo(() => {
    if (!tournamentId) return [];
    return buildKnockoutAdminEntries(tournamentId, players);
  }, [tournamentId, players]);

  const fixtureRowsForStage = useMemo((): AdminMatchRow[] => {
    if (!tournamentId || !flowStage || flowStage === 'ko_quarter' || flowStage === 'ko_semi' || flowStage === 'ko_final') {
      return [];
    }
    const stage = flowStage === 'grupos' ? 'group' : 'interzonal';
    const filtered = fixtureCatalogEntries.filter((row) => {
      if (row.stage !== stage) return false;
      if (filterRound != null && row.round !== filterRound) return false;
      return true;
    });
    return filtered.map((entry): AdminMatchRow => ({ kind: 'fixture', entry }));
  }, [fixtureCatalogEntries, tournamentId, flowStage, filterRound]);

  const koRowsFiltered = useMemo((): AdminMatchRow[] => {
    if (!tournamentId || !flowStage) return [];
    const ks = koStageFromFlow(flowStage);
    if (!ks) return [];
    return koRowsForTournament
      .filter((e) => e.koStage === ks)
      .map((entry): AdminMatchRow => ({ kind: 'ko', entry }));
  }, [tournamentId, flowStage, koRowsForTournament]);

  const roundOptions = useMemo(() => {
    if (!tournamentId || (flowStage !== 'grupos' && flowStage !== 'interzonal')) return [];
    const want = flowStage === 'grupos' ? 'group' : 'interzonal';
    const nums = new Set<number>();
    for (const row of fixtureCatalogEntries) {
      if (row.stage !== want) continue;
      nums.add(row.round);
    }
    return Array.from(nums).sort((a, b) => a - b);
  }, [fixtureCatalogEntries, tournamentId, flowStage]);

  /** Si el torneo pasa a Masters, interzonal/cuartos no aplican. */
  useEffect(() => {
    if (!isMasters1000) return;
    if (flowStage === 'interzonal' || flowStage === 'ko_quarter') {
      setFlowStage('');
    }
  }, [isMasters1000, flowStage]);

  useEffect(() => {
    if (flowStage !== 'grupos' && flowStage !== 'interzonal') {
      setFilterRound(null);
      return;
    }
    if (roundOptions.length === 0) {
      setFilterRound(null);
      return;
    }
    setFilterRound((prev) => (prev != null && roundOptions.includes(prev) ? prev : roundOptions[0]!));
  }, [flowStage, roundOptions]);

  useEffect(() => {
    setSelectedRow(null);
    setCells(EMPTY_GRID);
    setSubmitError(null);
    setSavedFlash(null);
  }, [tournamentId, flowStage, filterRound]);

  const groupedFixtureRows = useMemo(() => {
    const rows = fixtureRowsForStage;
    const byGroup = new Map<string, Map<number, AdminMatchRow[]>>();
    for (const r of rows) {
      if (r.kind !== 'fixture') continue;
      const round = r.entry.round;
      const gk = r.entry.group;
      if (!byGroup.has(gk)) byGroup.set(gk, new Map());
      const rm = byGroup.get(gk)!;
      if (!rm.has(round)) rm.set(round, []);
      rm.get(round)!.push(r);
    }
    return byGroup;
  }, [fixtureRowsForStage]);

  const loadCellsForRow = useCallback(
    (row: AdminMatchRow) => {
      const key = rowDedupeKey(row);
      const existing = resultsByKey.get(key);
      if (existing && isSuspendedResult(existing)) {
        setCells(cloneGrid(EMPTY_GRID));
        return;
      }
      if (existing?.score && isCompletedSuccess(existing)) {
        const parsed = parseScoreStringToCells(existing.score);
        setCells(parsed ? cloneGrid(parsed) : cloneGrid(EMPTY_GRID));
        return;
      }
      setCells(cloneGrid(EMPTY_GRID));
    },
    [resultsByKey],
  );

  const selectRow = useCallback(
    (row: AdminMatchRow) => {
      setSelectedRow(row);
      setSubmitError(null);
      setSavedFlash(null);
      loadCellsForRow(row);
    },
    [loadCellsForRow],
  );

  const canSubmit = useMemo(() => {
    if (!selectedRow) return false;
    const built = buildScoreStringIfValid(cells);
    return built.ok === true;
  }, [selectedRow, cells]);

  const commitSavePlayed = useCallback(() => {
    setSubmitError(null);
    setSavedFlash(null);
    if (!selectedRow) {
      setSubmitError('Seleccioná un partido.');
      return;
    }
    const built = buildScoreStringIfValid(cells);
    if (built.ok === false) {
      setSubmitError(built.reason || 'Completá un marcador válido.');
      return;
    }
    const score = built.value;
    const e = selectedRow.entry;
    const key = rowDedupeKey(selectedRow);
    const scheduleEntry = getMatchScheduleByKey(key);
    const next: MatchInput = {
      matchId: selectedRow.kind === 'ko' ? selectedRow.entry.matchId : undefined,
      tournamentId: e.tournamentId,
      group: e.group,
      round: e.round,
      playerA: e.playerA,
      playerB: e.playerB,
      score,
      status: 'played',
      date: new Date().toISOString().slice(0, 10),
    };
    const r = commitAdminMatchResult(selectedRow, next, players, { leagueNum: leagueNumForCommit, scheduleEntry });
    if (r.ok === false) {
      if (r.errors.some((msg) => msg === SCHEDULE_REQUIRED_FOR_PLAYED_MESSAGE)) {
        setScheduleGateDedupeKey(key);
        return;
      }
      setSubmitError(r.errors.join(' '));
      return;
    }
    const winner = inferWinnerName(e.playerA, e.playerB, score);
    setSavedFlash(winner ? `Guardado. Ganador: ${winner}.` : 'Guardado.');
    window.setTimeout(() => setSavedFlash(null), 5000);
  }, [selectedRow, cells, players, leagueNumForCommit]);

  const onSave = () => {
    setSubmitError(null);
    setSavedFlash(null);
    if (!selectedRow) {
      setSubmitError('Seleccioná un partido.');
      return;
    }
    const key = rowDedupeKey(selectedRow);
    const prev = resultsByKey.get(key);
    if (prev && isCompletedSuccess(prev)) {
      setPendingConfirm({ kind: 'replace_played' });
      return;
    }
    commitSavePlayed();
  };

  const commitWalkover = useCallback(
    (winner: 'a' | 'b') => {
      if (!selectedRow) return;
      const e = selectedRow.entry;
      const woScore = winner === 'a' ? '6-0 6-0' : '0-6 0-6';
      const next: MatchInput = {
        matchId: selectedRow.kind === 'ko' ? selectedRow.entry.matchId : undefined,
        tournamentId: e.tournamentId,
        group: e.group,
        round: e.round,
        playerA: e.playerA,
        playerB: e.playerB,
        score: woScore,
        status: 'walkover',
        date: new Date().toISOString().slice(0, 10),
      };
      const r = commitAdminMatchResult(selectedRow, next, players, { leagueNum: leagueNumForCommit });
      if (r.ok === false) {
        setSubmitError(r.errors.join(' '));
        return;
      }
      setSavedFlash('Walkover guardado.');
      window.setTimeout(() => setSavedFlash(null), 4000);
    },
    [selectedRow, players, leagueNumForCommit],
  );

  const applyWalkover = (winner: 'a' | 'b') => {
    if (!selectedRow) return;
    setPendingConfirm({ kind: 'walkover', winner });
  };

  const commitSuspended = useCallback(() => {
    if (!selectedRow) return;
    const e = selectedRow.entry;
    const next: MatchInput = {
      matchId: selectedRow.kind === 'ko' ? selectedRow.entry.matchId : undefined,
      tournamentId: e.tournamentId,
      group: e.group,
      round: e.round,
      playerA: e.playerA,
      playerB: e.playerB,
      score: '',
      status: 'suspended',
      date: new Date().toISOString().slice(0, 10),
    };
    const r = commitAdminMatchResult(selectedRow, next, players, { leagueNum: leagueNumForCommit });
    if (r.ok === false) {
      setSubmitError(r.errors.join(' '));
      return;
    }
    setCells(cloneGrid(EMPTY_GRID));
    setSavedFlash('Partido marcado como suspendido.');
    window.setTimeout(() => setSavedFlash(null), 4000);
  }, [selectedRow, players, leagueNumForCommit]);

  const applySuspended = () => {
    if (!selectedRow) return;
    setPendingConfirm({ kind: 'suspended' });
  };

  const cardStateClass = (key: string, sel: boolean) => {
    const st = rowVisualState(resultsByKey.get(key));
    if (sel) return 'border-blue-500 ring-2 ring-blue-400/40 bg-blue-50/50 dark:bg-blue-950/25';
    if (st === 'suspended') return 'border-violet-500/55 bg-violet-50/50 dark:bg-violet-950/30 hover:border-violet-500/85';
    if (st === 'walkover') return 'border-red-500/55 bg-red-50/55 dark:bg-red-950/30 hover:border-red-500/85';
    if (st === 'played') return 'border-emerald-500/50 bg-emerald-50/40 dark:bg-emerald-950/25 hover:border-emerald-500/80';
    return 'border-amber-400/55 bg-amber-50/35 dark:bg-amber-950/20 hover:border-amber-500/80';
  };

  const rowStatusLabel = (key: string) => {
    const st = rowVisualState(resultsByKey.get(key));
    if (st === 'played') return LABEL_PLAYED;
    if (st === 'walkover') return 'W.O.';
    if (st === 'suspended') return 'Suspendido';
    return 'Pendiente';
  };

  const cardSurface =
    'admin-theme-card app-glass-panel overflow-hidden rounded-xl shadow-sport-card dark:shadow-sport-card-dark';

  const confirmDialogProps = useMemo(() => {
    if (!pendingConfirm) return null;
    if (pendingConfirm.kind === 'replace_played') {
      return {
        title: 'Reemplazar resultado',
        description:
          'Este partido ya tiene resultado cargado. ¿Querés reemplazarlo por el nuevo marcador que completaste en la grilla?',
        confirmLabel: 'Reemplazar',
        variant: 'default' as const,
      };
    }
    if (pendingConfirm.kind === 'walkover') {
      const e = selectedRow?.entry;
      const name = e ? (pendingConfirm.winner === 'a' ? e.playerA : e.playerB) : 'el jugador elegido';
      return {
        title: 'Registrar walkover',
        description: `¿Registrar walkover a favor de ${name}?`,
        confirmLabel: 'Registrar W.O.',
        variant: 'danger' as const,
      };
    }
    return {
      title: 'Suspender partido',
      description:
        '¿Marcar este partido como suspendido? No contará en tablas hasta que lo reemplaces por un resultado válido.',
      confirmLabel: 'Suspender',
      variant: 'danger' as const,
    };
  }, [pendingConfirm, selectedRow]);

  const stepDone = (n: number) => {
    if (n === 1) return !!tournamentId;
    if (n === 2) return !!flowStage;
    if (n === 3) {
      if (!flowStage) return false;
      if (flowStage === 'grupos' || flowStage === 'interzonal') return filterRound != null;
      return true;
    }
    return !!selectedRow;
  };

  const wizardHelp =
    'Solo partidos del fixture. Pendiente: amarillo · Cargado: verde · W.O.: rojo · Suspendido: violeta. La selección activa se resalta en azul.';

  return (
    <div className="space-y-8">
      <section className="bg-[#f0f2f6] dark:bg-gray-800/90 rounded-xl p-4 md:p-6 border border-gray-200/90 dark:border-gray-600/60 shadow-sport-card dark:shadow-sport-card-dark">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-start gap-3 min-w-0">
            <ListChecks className="w-5 h-5 admin-theme-icon shrink-0 mt-0.5" aria-hidden />
            <div>
              <h3 className="font-bold text-base admin-theme-section-title">Resultados</h3>
              <p className="text-xs text-[#616f89] dark:text-gray-500 mt-0.5">Carga por pasos · solo fixture oficial</p>
            </div>
          </div>
          <span
            className="inline-flex items-center justify-center rounded-full border border-gray-300/80 dark:border-gray-600 p-1.5 text-[#616f89] dark:text-gray-400 shrink-0"
            title={wizardHelp}
          >
            <HelpCircle className="w-4 h-4" aria-hidden />
            <span className="sr-only">{wizardHelp}</span>
          </span>
        </div>

        <ol className="flex flex-wrap gap-y-2 gap-x-1 md:gap-x-2 mb-8 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-[#616f89] dark:text-gray-500">
          {[
            { n: 1, label: 'Paso 1: Elegir torneo' },
            { n: 2, label: 'Paso 2: Elegir etapa' },
            { n: 3, label: 'Paso 3: Seleccionar partido' },
            { n: 4, label: 'Paso 4: Cargar resultado' },
          ].map((s) => (
            <li key={s.n} className="inline-flex items-center gap-1 sm:gap-1.5 max-w-full">
              <span
                className={`inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full px-2 shrink-0 ${
                  stepDone(s.n) ? 'admin-theme-step-on' : 'bg-gray-200 dark:bg-gray-700 text-[#616f89]'
                }`}
              >
                {s.n}
              </span>
              <span className={`hidden sm:inline ${stepDone(s.n) ? 'text-[#111318] dark:text-white' : ''}`}>{s.label}</span>
              <span className={`sm:hidden truncate max-w-[4.5rem] ${stepDone(s.n) ? 'text-[#111318] dark:text-white' : ''}`}>
                {s.n === 1 ? 'Torneo' : s.n === 2 ? 'Etapa' : s.n === 3 ? 'Partido' : 'Marcador'}
              </span>
              {s.n < 4 ? <ChevronRight className="w-3 h-3 text-[#616f89] opacity-60 hidden sm:inline shrink-0" aria-hidden /> : null}
            </li>
          ))}
        </ol>

        <div className="space-y-8">
          <div>
            <h4 className="text-sm md:text-base font-bold text-[#111318] dark:text-white mb-3 pb-2 border-b border-gray-200/90 dark:border-gray-600">
              Paso 1: Elegir torneo
            </h4>
            <label className="sr-only" htmlFor="admin-wizard-tournament">
              Torneo
            </label>
            <select
              id="admin-wizard-tournament"
              className={inputBase}
              value={tournamentId}
              onChange={(e) => {
                setTournamentId(e.target.value);
                setFlowStage('');
              }}
            >
              <option value="">— Seleccionar torneo —</option>
              {tournamentIdsInCatalog.map((id) => (
                <option key={id} value={id}>
                  {tournamentLabel(id, tournaments)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <h4 className="text-sm md:text-base font-bold text-[#111318] dark:text-white mb-3 pb-2 border-b border-gray-200/90 dark:border-gray-600">
              Paso 2: Elegir etapa
            </h4>
            <div className="grid gap-6 md:grid-cols-2 md:items-end">
              <div>
                <label className="sr-only" htmlFor="admin-wizard-stage">
                  Etapa
                </label>
                <select
                  id="admin-wizard-stage"
                  className={inputBase}
                  disabled={!tournamentId}
                  value={flowStage}
                  onChange={(e) => setFlowStage((e.target.value || '') as '' | AdminFlowStage)}
                >
                  <option value="">— Seleccionar etapa —</option>
                  <option value="grupos">Grupos</option>
                  {!isMasters1000 ? <option value="interzonal">Interzonal</option> : null}
                  {!isMasters1000 ? <option value="ko_quarter">Cuartos</option> : null}
                  <option value="ko_semi">{isMasters1000 ? 'Semifinales' : 'Semifinal'}</option>
                  <option value="ko_final">Final</option>
                </select>
              </div>
              {(flowStage === 'grupos' || flowStage === 'interzonal') && tournamentId ? (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#616f89] dark:text-gray-500 mb-1" htmlFor="admin-wizard-fecha">
                    Fecha del fixture
                  </label>
                  <select
                    id="admin-wizard-fecha"
                    className={inputBase}
                    value={filterRound ?? ''}
                    onChange={(e) => setFilterRound(e.target.value ? Number(e.target.value) : null)}
                  >
                    {roundOptions.map((n) => (
                      <option key={n} value={n}>
                        Fecha {n}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
            {isMasters1000 ? (
              <p className="mt-3 text-[11px] leading-relaxed text-[#616f89] dark:text-gray-500">
                Master Finals: fase de grupos en formato todos contra todos (2 grupos de 4); eliminatoria desde{' '}
                <strong className="font-semibold text-[#111318] dark:text-gray-300">semifinales</strong> (sin interzonal ni
                cuartos).
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-8">
          <section className={cardSurface}>
            <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-b border-gray-200/90 dark:border-gray-600/70 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 admin-theme-icon shrink-0" aria-hidden />
                <h4 className="font-bold text-[#111318] dark:text-white text-sm md:text-base">Paso 3: Seleccionar partido</h4>
              </div>
              {tournamentId && flowStage ? (
                <p
                  className="text-xs font-medium text-[#616f89] dark:text-gray-500 sm:ml-auto sm:text-right truncate"
                  title={`${tournamentLabel(tournamentId, tournaments)} · ${stageLabel(flowStage, isMasters1000)}`}
                >
                  {tournamentLabel(tournamentId, tournaments)} · {stageLabel(flowStage, isMasters1000)}
                  {filterRound != null && (flowStage === 'grupos' || flowStage === 'interzonal') ? ` · Fecha ${filterRound}` : ''}
                </p>
              ) : null}
            </div>
            <div className="p-4 md:p-6">
              {!tournamentId || !flowStage ? (
                <p className="text-sm text-[#616f89] dark:text-gray-500">Elegí torneo y etapa para ver los partidos.</p>
              ) : flowStage === 'grupos' || flowStage === 'interzonal' ? (
                filterRound == null ? (
                  <p className="text-sm text-amber-800 dark:text-amber-300">No hay fechas en el fixture para esta selección.</p>
                ) : (
                  <div className="space-y-10">
                    {Array.from(groupedFixtureRows.entries())
                      .sort(([ga], [gb]) => compareFixtureGroups(ga, gb))
                      .map(([groupKey, roundMap]) => (
                        <div key={groupKey} className="space-y-6">
                          <h5 className="text-xs font-bold uppercase tracking-[0.14em] text-[#616f89] dark:text-gray-500 border-b border-gray-200 dark:border-gray-700 pb-2">
                            {flowStage === 'interzonal' ? 'Interzonal' : `Grupo ${groupKey}`}
                          </h5>
                          {Array.from(roundMap.entries())
                            .sort(([ra], [rb]) => ra - rb)
                            .map(([round, groupRows]) => (
                              <div key={`${groupKey}-fecha-${round}`} className="space-y-4">
                                <h6 className="text-sm font-bold text-[#111318] dark:text-white">Fecha {round}</h6>
                                <ul className="space-y-4">
                                  {groupRows.map((row) => {
                                    const key = rowDedupeKey(row);
                                    const sel = selectedRow && rowDedupeKey(selectedRow) === key;
                                    return (
                                      <li key={key}>
                                        <button
                                          type="button"
                                          onClick={() => selectRow(row)}
                                          className={`w-full text-left rounded-xl border px-4 py-4 transition-all shadow-sm ${cardStateClass(key, !!sel)}`}
                                        >
                                          <span className="font-semibold text-[#111318] dark:text-white block">
                                            {row.entry.playerA}{' '}
                                            <span className="text-[#616f89] dark:text-gray-500 font-normal">vs</span>{' '}
                                            {row.entry.playerB}
                                          </span>
                                          <span className="text-[11px] text-[#616f89] dark:text-gray-500 mt-1 block">{rowStatusLabel(key)}</span>
                                        </button>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            ))}
                        </div>
                      ))}
                    {groupedFixtureRows.size === 0 ? (
                      <p className="text-sm text-[#616f89] dark:text-gray-500">No hay partidos para esta fecha.</p>
                    ) : null}
                  </div>
                )
              ) : (
                <ul className="space-y-4">
                  {koRowsFiltered.length === 0 ? (
                    <p className="text-sm text-[#616f89] dark:text-gray-500">
                      No hay partidos de {stageLabel(flowStage, isMasters1000)} en este torneo (o aún no están en datos).
                    </p>
                  ) : (
                    koRowsFiltered.map((row) => {
                      const key = rowDedupeKey(row);
                      const sel = selectedRow && rowDedupeKey(selectedRow) === key;
                      return (
                        <li key={key}>
                          <button
                            type="button"
                            onClick={() => selectRow(row)}
                            className={`w-full text-left rounded-xl border px-4 py-4 transition-all shadow-sm ${cardStateClass(key, !!sel)}`}
                          >
                            <span className="font-semibold text-[#111318] dark:text-white block">
                              {row.kind === 'ko' ? row.entry.playerA : ''}{' '}
                              <span className="text-[#616f89] dark:text-gray-500 font-normal">vs</span>{' '}
                              {row.kind === 'ko' ? row.entry.playerB : ''}
                            </span>
                            <span className="text-[11px] text-[#616f89] dark:text-gray-500 mt-1 block">
                              {row.kind === 'ko' ? row.entry.roundLabel : ''} · {rowStatusLabel(key)}
                            </span>
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              )}
            </div>
          </section>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <section className={cardSurface}>
            <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-b border-gray-200/90 dark:border-gray-600/70">
              <h4 className="font-bold text-[#111318] dark:text-white text-sm md:text-base">Paso 4: Cargar resultado</h4>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              {!selectedRow ? (
                <p className="text-sm text-[#616f89] dark:text-gray-500">Tocá un partido para cargar o editar el marcador.</p>
              ) : (
                <>
                  <div
                    className="admin-readonly-panel rounded-lg px-3 py-2.5 text-sm"
                    title="Solo lectura: partido elegido. El marcador editable está abajo."
                  >
                    <p className="font-semibold text-[#111318] dark:text-white">
                      {selectedRow.entry.playerA} <span className="text-[#616f89] font-normal">vs</span> {selectedRow.entry.playerB}
                    </p>
                    <p className="text-[11px] text-[#616f89] dark:text-gray-500 mt-1">
                      Fila superior = <span className="font-mono text-[#111318]/80 dark:text-gray-300">{selectedRow.entry.playerA}</span> ·
                      Inferior = <span className="font-mono text-[#111318]/80 dark:text-gray-300">{selectedRow.entry.playerB}</span>
                    </p>
                  </div>

                  <AdminMatchScoreGrid
                    playerA={selectedRow.entry.playerA}
                    playerB={selectedRow.entry.playerB}
                    cells={cells}
                    rankingPointsPreview={wizardGroupRankingPreview(
                      selectedRow,
                      resultsByKey.get(rowDedupeKey(selectedRow)),
                    )}
                    onChange={(next) => {
                      setCells(cloneGrid(next));
                      setSubmitError(null);
                    }}
                  />

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex rounded-md px-3 py-2 text-xs font-bold border border-red-400/70 bg-red-50/90 dark:bg-red-950/35 text-red-900 dark:text-red-100 hover:bg-red-100 dark:hover:bg-red-950/55"
                      onClick={() => applyWalkover('a')}
                    >
                      W.O. → {selectedRow.entry.playerA.slice(0, 18)}
                      {selectedRow.entry.playerA.length > 18 ? '…' : ''}
                    </button>
                    <button
                      type="button"
                      className="inline-flex rounded-md px-3 py-2 text-xs font-bold border border-red-400/70 bg-red-50/90 dark:bg-red-950/35 text-red-900 dark:text-red-100 hover:bg-red-100 dark:hover:bg-red-950/55"
                      onClick={() => applyWalkover('b')}
                    >
                      W.O. → {selectedRow.entry.playerB.slice(0, 18)}
                      {selectedRow.entry.playerB.length > 18 ? '…' : ''}
                    </button>
                    <button
                      type="button"
                      className="inline-flex rounded-md px-3 py-2 text-xs font-bold border border-rose-400/60 text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/60"
                      onClick={applySuspended}
                    >
                      Suspender partido
                    </button>
                  </div>

                  {submitError ? (
                    <p
                      className="text-sm text-red-600 dark:text-red-400 rounded-md border border-red-500/40 bg-red-50 dark:bg-red-950/40 px-3 py-2"
                      role="alert"
                    >
                      {submitError}
                    </p>
                  ) : null}
                  {savedFlash ? (
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 rounded-md border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">
                      {savedFlash}
                    </p>
                  ) : null}

                  <button type="button" className={btnPrimary} disabled={!canSubmit} onClick={onSave}>
                    Guardar resultado
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      {confirmDialogProps ? (
        <AdminConfirmDialog
          open={!!pendingConfirm}
          title={confirmDialogProps.title}
          description={confirmDialogProps.description}
          confirmLabel={confirmDialogProps.confirmLabel}
          variant={confirmDialogProps.variant}
          onClose={() => setPendingConfirm(null)}
          onConfirm={() => {
            if (!pendingConfirm) return false;
            switch (pendingConfirm.kind) {
              case 'replace_played':
                commitSavePlayed();
                return true;
              case 'walkover':
                commitWalkover(pendingConfirm.winner);
                return true;
              case 'suspended':
                commitSuspended();
                return true;
            }
          }}
        />
      ) : null}

      <AdminConfirmDialog
        open={scheduleGateDedupeKey != null}
        title="Fecha requerida"
        description={
          <p className="text-sm leading-relaxed text-[#616f89] dark:text-gray-400">{SCHEDULE_REQUIRED_FOR_PLAYED_MESSAGE}</p>
        }
        confirmLabel="Programar ahora"
        cancelLabel="Cancelar"
        onClose={() => setScheduleGateDedupeKey(null)}
        onConfirm={() => {
          const k = scheduleGateDedupeKey;
          const tid = tournamentId.trim();
          setScheduleGateDedupeKey(null);
          if (k && tid) {
            navigate(`/admin/torneos/${encodeURIComponent(tid)}?programar=${encodeURIComponent(k)}`);
          }
          return true;
        }}
      />
    </div>
  );
}

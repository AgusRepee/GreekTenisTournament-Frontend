import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Lock, RefreshCw, Layers, Unlock, X } from 'lucide-react';
import { useClubData } from '@/lib/clubDataStore';
import { getTournamentById } from '@/lib/mockData';
import { buildFixtureCatalogEntriesForTournament, type FixtureCatalogEntry } from '@/lib/tennis/buildFixtureCatalog';
import { compareFixtureGroups, sortFixtureEntriesByGroupThenRound } from '@/lib/tennis/fixtureResultsOrdering';
import { buildKnockoutAdminEntries, type KnockoutAdminEntry } from '@/lib/tennis/adminKnockoutCatalog';
import { matchInputDedupeKey } from '@/lib/tennis/matchDedupe';
import { useResults } from '@/lib/tennis/resultsStore';
import type { MatchInput } from '@/types/tennisResults';
import type { GroupTableWithSets, Player } from '@/lib/mockData';
import { parseMatch } from '@/lib/tennis/matchStatsEngine';
import {
  appendResultChangeEntry,
  hadPersistedViewableOutcome,
  inferHistoryAction,
  matchWinnerDisplayLabel,
} from '@/lib/tennis/resultsChangeHistory';
import { recalculateTournament } from '@/lib/tennis/recalculateTournament';
import {
  appendAdminAuditEntry,
  appendMatchResultAudit,
  auditActionLabel,
} from '@/lib/admin/tournamentAuditLog';
import {
  commitAdminMatchResult,
  validateAdminMatchResult,
  type EditableAdminRow,
} from '@/lib/tennis/adminMatchResultPipeline';
import {
  buildScoreStringIfValid,
  cloneGrid,
  EMPTY_GRID,
  parseScoreStringToCells,
  type ScoreCells,
} from '@/lib/tennis/adminScoreValidation';
import { AdminMatchScoreGrid } from '../AdminMatchScoreGrid';
import { matchPresentationPrimaryBadge, resolveAdminMatchPresentation } from '@/lib/tennis/matchDisplayState';
import { AdminConfirmDialog } from '../AdminConfirmDialog';
import { useOptionalAdminTournamentSeed } from '../AdminTournamentSeedContext';
import {
  clearMatchDraftSessionForTournament,
  loadMatchDraftCellsForTournament,
  saveMatchDraftCellsForTournament,
} from '@/lib/tennis/adminResultDraftsSession';
import {
  hasGroupFixtureStoredValidationErrors,
  isGroupPhaseCompleteForEliminationSetup,
  summarizeGroupFixtureOutcomes,
} from '@/lib/tennis/adminGroupPhaseCompletion';
import { buildEliminationProposalFromGroupTables, type ClassifiedPlayerChip } from '@/lib/tennis/eliminationBracketProposal';
import { AdminGanadorBadge, hasSavedViewableOutcome, winnerSideFromStoredStrict } from './AdminMatchOutcomeVisual';
import {
  KO_MATCH_PENDING_PLAYERS_MESSAGE,
  isKnockoutMatchPlayableNames,
} from '@/lib/tennis/adminPendingWorkload';
import type { MatchScheduleEntry } from '@/lib/tennis/matchScheduleStore';
import { useMatchSchedules } from '@/lib/tennis/matchScheduleStore';
import {
  matchScheduleHasDateTimeForPlayedResult,
  SCHEDULE_REQUIRED_FOR_PLAYED_MESSAGE,
} from '@/lib/tennis/matchScheduleForResultGuard';
import {
  groupMatchRankingPointsForCatalog,
  effectiveTournamentCatalogType,
} from '@/lib/tennis/rankingPointsGreek500';
import type { TournamentCatalogType } from '@/types/tournamentCatalog';

const btnPrimary =
  'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border px-4 py-2.5 text-sm font-bold shadow-sm transition-opacity admin-theme-btn md:min-h-0 md:px-3 md:py-2 md:text-xs';
const btnSecondary =
  'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-gray-300 px-4 py-2.5 text-sm font-bold text-[#111318] transition-colors dark:border-gray-600 dark:bg-gray-800 dark:text-white admin-theme-btn-secondary md:min-h-0 md:px-3 md:py-2 md:text-xs';
/** W.O.: área táctil cómoda en mobile; compacto desde `md`. */
const btnWoSm =
  'inline-flex min-h-10 max-w-full flex-1 basis-[calc(50%-0.25rem)] items-center justify-center whitespace-normal break-words rounded-md border border-gray-300/90 bg-white px-2.5 text-center text-xs font-bold leading-snug text-[#111318] shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700/80 md:h-8 md:min-h-0 md:max-w-[9rem] md:flex-none md:basis-auto md:text-[11px]';
const btnToolbarIcon =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-gray-300/90 bg-white text-[#616f89] hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 md:h-8 md:w-8';
/** Cierre oficial de fase de grupos (más peso visual que Guardar todo). */
const btnConfirmGroupStage =
  'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-emerald-600 bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 hover:border-emerald-700 disabled:pointer-events-none disabled:opacity-45 dark:border-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500 md:min-h-0 md:px-3 md:py-2 md:text-xs';

/** Mismo ritmo visual que tabs de fecha; área táctil amplia en mobile. */
const resultadoStatusTabBase =
  'flex min-h-[3rem] shrink-0 snap-start flex-col items-center justify-center border-b-[3px] border-solid border-t-0 border-x-0 min-w-[6.5rem] px-4 pb-3 pt-2.5 text-sm font-bold transition-colors whitespace-nowrap md:min-h-[52px]';
const resultadoStatusTabClass = (active: boolean) =>
  `${resultadoStatusTabBase} ${active ? 'admin-tour-section-tab-active' : 'admin-tour-section-tab-inactive text-[#616f89] dark:text-gray-400'}`;

const RECALC_FAIL_MSG =
  'No se pudo recalcular. Revisá partidos incompletos o datos inconsistentes.';
const RECALC_OK_MSG = 'Torneo recalculado correctamente.';
const SCHEDULE_REQUIRED_FOR_PLAYED_DESC = (
  <p className="text-sm leading-relaxed text-[#616f89] dark:text-gray-400">{SCHEDULE_REQUIRED_FOR_PLAYED_MESSAGE}</p>
);
type EditableRow = { kind: 'fixture'; entry: FixtureCatalogEntry } | { kind: 'ko'; entry: KnockoutAdminEntry };

function rowDedupeKey(row: EditableRow): string {
  return row.kind === 'fixture' ? row.entry.dedupeKey : row.entry.dedupeKey;
}

function rowPlayers(row: EditableRow): { a: string; b: string } {
  return { a: row.entry.playerA, b: row.entry.playerB };
}

function rowMeta(row: EditableRow): { groupLabel: string; fechaLabel: string; subLabel: string } {
  if (row.kind === 'fixture') {
    const g = row.entry.group === 'Interzonal' ? 'Interzonal' : `Grupo ${row.entry.group}`;
    return { groupLabel: g, fechaLabel: `Fecha ${row.entry.round}`, subLabel: `${g} · Fecha ${row.entry.round}` };
  }
  return {
    groupLabel: row.entry.roundLabel,
    fechaLabel: 'Eliminación',
    subLabel: row.entry.roundLabel,
  };
}

function groupRankingPointsPreviewForRow(
  row: EditableRow,
  stored: MatchInput | undefined,
  catalog: TournamentCatalogType,
): { winnerPts: number; loserPts: number } | null {
  if (row.kind !== 'fixture') return null;
  if (row.entry.group === 'Interzonal') return null;
  const gm = groupMatchRankingPointsForCatalog(catalog);
  if (stored?.status === 'walkover') return { winnerPts: gm.walkoverWin, loserPts: gm.walkoverLoss };
  return { winnerPts: gm.win, loserPts: gm.loss };
}

/** Línea de solo lectura alineada al estilo corto de Fechas (`es-ES`). */
function formatPlayedWhenLine(stored: MatchInput | undefined, schedule: MatchScheduleEntry | undefined): string {
  const rawDate = stored?.date?.trim() || schedule?.date?.trim();
  if (!rawDate) return 'Fecha no registrada';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? new Date(`${rawDate}T12:00:00`) : new Date(rawDate);
  if (!Number.isFinite(d.getTime())) return `Jugado el ${rawDate}`;
  const dateStr = d.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const clean = dateStr.replace(/\.$/, '').replace(/\s+/g, ' ');
  const timeRaw = schedule?.time?.trim();
  if (timeRaw) return `Jugado el ${clean} · ${timeRaw} hs`;
  return `Jugado el ${clean}`;
}

function auditGroupLabel(row: EditableRow): string | undefined {
  if (row.kind === 'fixture') return row.entry.group;
  const r = row.entry.roundLabel?.trim();
  return r || undefined;
}

function isCompletedSuccess(m: MatchInput): boolean {
  return (m.status === 'played' && !!m.score?.trim()) || m.status === 'walkover' || m.status === 'retired';
}

function isSuspendedResult(m: MatchInput): boolean {
  return m.status === 'suspended';
}

function cellsFromStored(stored: MatchInput | undefined): ScoreCells {
  if (stored && isSuspendedResult(stored)) return cloneGrid(EMPTY_GRID);
  if (stored?.status === 'walkover' || stored?.status === 'retired') return cloneGrid(EMPTY_GRID);
  if (stored?.score && isCompletedSuccess(stored)) {
    const p = parseScoreStringToCells(stored.score);
    return p ? cloneGrid(p) : cloneGrid(EMPTY_GRID);
  }
  return cloneGrid(EMPTY_GRID);
}

function walkoverWinnerName(stored: MatchInput): string {
  const letter = (stored.score ?? 'A').toUpperCase();
  return letter === 'B' ? stored.playerB : stored.playerA;
}

function hasAnyScoreCell(cells: ScoreCells): boolean {
  for (let i = 0; i < 3; i++) {
    if (cells.a[i]?.trim() || cells.b[i]?.trim()) return true;
  }
  return false;
}

function storedResultFingerprint(m: MatchInput | undefined): string {
  if (!m) return '';
  if (m.status === 'suspended') return 'status:suspended';
  if (m.status === 'walkover' || m.status === 'retired') {
    return `status:${m.status}|score:${(m.score ?? 'A').toUpperCase()}`;
  }
  return `status:played|score:${m.score?.trim() ?? ''}`;
}

function draftFingerprint(cells: ScoreCells): string {
  const built = buildScoreStringIfValid(cells);
  if (built.ok) return `played:${built.value}`;
  if (hasAnyScoreCell(cells)) return 'incomplete:dirty';
  return '';
}

function cellsDirtyVsStored(key: string, cells: ScoreCells, resultsByKey: Map<string, MatchInput>): boolean {
  const stored = resultsByKey.get(key);
  return draftFingerprint(cells) !== storedResultFingerprint(stored);
}

/** Borrador local por partido (clave estable = dedupeKey). No escribe servidor hasta Guardar. */
export type AdminMatchResultDraftLocal = {
  cells: ScoreCells;
  status: 'draft';
  updatedAt: number;
};

function flattenMatchDraftCells(m: Record<string, AdminMatchResultDraftLocal>): Record<string, ScoreCells> {
  const o: Record<string, ScoreCells> = {};
  for (const key of Object.keys(m)) {
    o[key] = m[key]!.cells;
  }
  return o;
}

type Props = {
  tournamentId: string;
  /** Liga 1–6 para recálculo / refresco del club. */
  leagueNum: number;
  /** Plantilla con fase de grupos (confirmación oficial solo aplica si es true). */
  templateHasGrupos?: boolean;
  /** Tablas actuales para vista previa en el modal de confirmación. */
  groupTables?: GroupTableWithSets[];
  /** `confirmed` = fase de grupos cerrada en admin (bloquea edición de fixture hasta desbloquear). */
  groupStageStatus?: 'confirmed';
  /** Persistir cierre o reapertura; el caller debe refrescar el catálogo del club. */
  onGroupStageStatusChange?: (next: 'confirmed' | 'open') => void;
  /** Torneo finalizado/archivado: sin persistir ni W.O. */
  readOnly?: boolean;
  onTournamentThemeChange?: (tournamentId: string | null) => void;
  /** true si hay borradores de marcador sin guardar en el servidor de resultados */
  onDirtyChange?: (dirty: boolean) => void;
  /** Al incrementar (p. ej. desde «Descartar cambios» global), se limpian borradores locales. */
  draftResetSignal?: number;
  /** Expone guardado masivo para el modal global de cambios sin guardar. */
  onRegisterBulkSave?: (fn: (() => Promise<boolean>) | null) => void;
  /** Desde Resumen u otra vista: expandir esta clave para cargar. */
  focusDedupeKey?: string | null;
  onConsumedFocusDedupeKey?: () => void;
  /** Abrir Fechas con el modal de programación para esta clave (desde validación de agenda). */
  onRequestProgramarPartido?: (dedupeKey: string) => void;
};

function asAdminRow(row: EditableRow): EditableAdminRow {
  return row as EditableAdminRow;
}

function buildNextPlayedMatchInput(row: EditableRow, score: string): MatchInput {
  const e = row.entry;
  return {
    matchId: row.kind === 'ko' ? row.entry.matchId : undefined,
    tournamentId: e.tournamentId,
    group: e.group,
    round: e.round,
    playerA: e.playerA,
    playerB: e.playerB,
    score,
    status: 'played',
    date: new Date().toISOString().slice(0, 10),
  };
}

/** Línea de resumen tipo “Nombre A def. Nombre B — 6-4, 6-3” para el modal “Guardar todo”. */
function formatBulkSaveSummaryLine(row: EditableRow, next: MatchInput): string {
  const { a, b } = rowPlayers(row);
  try {
    const pm = parseMatch(next);
    const loser = pm.winner === pm.playerA ? pm.playerB : pm.playerA;
    const tail = pm.isWalkover ? 'W.O.' : pm.isRetired ? `${(next.score ?? '').trim()} (ret.)` : (next.score ?? '').trim();
    return `${pm.winner} def. ${loser} — ${tail}`;
  } catch {
    return `${a} vs ${b} — ${(next.score ?? '').trim()}`;
  }
}

type BulkSaveValidItem = {
  key: string;
  row: EditableRow;
  next: MatchInput;
  line: string;
};

type BulkSaveInvalidItem = {
  key: string;
  matchLabel: string;
  reason: string;
};

function computeBulkSavePartition(
  dirtyKeys: string[],
  draftCells: Record<string, ScoreCells>,
  resultsByKey: Map<string, MatchInput>,
  rowsByKey: Map<string, EditableRow>,
  players: Player[],
  scheduleByKey: Map<string, MatchScheduleEntry>,
): { valid: BulkSaveValidItem[]; invalid: BulkSaveInvalidItem[] } {
  const valid: BulkSaveValidItem[] = [];
  const invalid: BulkSaveInvalidItem[] = [];
  for (const key of dirtyKeys) {
    const row = rowsByKey.get(key);
    if (!row) {
      invalid.push({ key, matchLabel: key, reason: 'Partido no encontrado en el fixture.' });
      continue;
    }
    const { a, b } = rowPlayers(row);
    const matchLabel = `${a} vs ${b}`;
    if (row.kind === 'ko' && !isKnockoutMatchPlayableNames(a, b)) {
      invalid.push({ key, matchLabel, reason: KO_MATCH_PENDING_PLAYERS_MESSAGE });
      continue;
    }
    const cells = draftCells[key] ?? cellsFromStored(resultsByKey.get(key));
    const built = buildScoreStringIfValid(cells);
    if (built.ok === false) {
      invalid.push({
        key,
        matchLabel,
        reason: built.reason || 'Completá un marcador válido.',
      });
      continue;
    }
    const next = buildNextPlayedMatchInput(row, built.value);
    const errs = validateAdminMatchResult(asAdminRow(row), next, players, {
      enforcePlayedSchedule: true,
      scheduleEntry: scheduleByKey.get(key),
    });
    if (errs.length > 0) {
      invalid.push({ key, matchLabel, reason: errs.join(' ') });
      continue;
    }
    valid.push({
      key,
      row,
      next,
      line: formatBulkSaveSummaryLine(row, next),
    });
  }
  return { valid, invalid };
}

function SaveAllConfirmBody({
  validLines,
  invalidItems,
  blockingMessage,
}: {
  validLines: string[];
  invalidItems: BulkSaveInvalidItem[];
  blockingMessage?: string | null;
}) {
  return (
    <div className="space-y-3 text-sm text-[#616f89] dark:text-gray-400">
      <p className="font-medium text-[#111318] dark:text-gray-200">Vas a guardar estos resultados:</p>
      <ul className="max-h-52 list-disc space-y-1 overflow-auto rounded-lg border border-gray-200/90 px-4 py-3 dark:border-gray-600">
        {validLines.map((line, i) => (
          <li key={`${i}-${line.slice(0, 80)}`} className="pl-1 text-[#111318] dark:text-gray-200">
            {line}
          </li>
        ))}
      </ul>
      <p className="text-xs leading-relaxed">
        Solo se guardan los ítems de la lista. Los partidos no válidos se omiten hasta que corrijas el marcador o el lugar
        en el cuadro.
      </p>
      {invalidItems.length > 0 ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-50/90 px-3 py-2 dark:border-amber-600/50 dark:bg-amber-950/35">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-950 dark:text-amber-100">No se guardarán</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-amber-950/95 dark:text-amber-100/95">
            {invalidItems.map((it) => (
              <li key={it.key}>
                <span className="font-medium">{it.matchLabel}:</span> {it.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {blockingMessage ? (
        <p
          className="rounded-lg border border-red-400/70 bg-red-50 px-3 py-2 text-sm font-medium text-red-900 dark:border-red-700 dark:bg-red-950/45 dark:text-red-100"
          role="alert"
        >
          {blockingMessage}
        </p>
      ) : null}
    </div>
  );
}

function StandingsPreviewTable({ title, rows }: { title: string; rows: ClassifiedPlayerChip[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="rounded-lg border border-gray-200/90 bg-white/90 dark:border-gray-600 dark:bg-gray-900/50">
      <p className="border-b border-gray-200/80 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#616f89] dark:border-gray-700 dark:text-gray-400">
        {title}
      </p>
      <div className="max-h-44 overflow-auto">
        <table className="w-full text-left text-[11px] text-[#111318] dark:text-gray-100">
          <thead className="sticky top-0 bg-gray-50/95 text-[10px] font-bold uppercase text-[#616f89] dark:bg-gray-800/95 dark:text-gray-400">
            <tr>
              <th className="px-2 py-1.5">Jugador</th>
              <th className="px-2 py-1.5">Grupo</th>
              <th className="px-2 py-1.5">Pos.</th>
              <th className="px-2 py-1.5">PG·PP</th>
              <th className="px-2 py-1.5">Sets</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={`${r.playerId}-${idx}-${r.origin.label}`} className="border-t border-gray-100 dark:border-gray-700/80">
                <td className="px-2 py-1.5 font-medium">{r.displayName}</td>
                <td className="px-2 py-1.5">{r.groupLabel}</td>
                <td className="px-2 py-1.5 tabular-nums">{r.position}</td>
                <td className="px-2 py-1.5 tabular-nums">
                  {r.pg}-{r.pp}
                </td>
                <td className="px-2 py-1.5 tabular-nums">
                  {r.setsWon}-{r.setsLost}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConfirmGroupResultsModalBody({
  outcomeSummary,
  proposal,
  isMasters1000,
}: {
  outcomeSummary: ReturnType<typeof summarizeGroupFixtureOutcomes>;
  proposal: ReturnType<typeof buildEliminationProposalFromGroupTables>;
  isMasters1000: boolean;
}) {
  return (
    <div className="max-h-[min(70vh,520px)] space-y-4 overflow-y-auto pr-1 text-sm text-[#616f89] dark:text-gray-400">
      <p className="leading-relaxed text-[#111318] dark:text-gray-200">
        {isMasters1000 ? (
          <>
            Vas a confirmar los resultados cargados. Los 2 mejores de cada grupo clasificarán a semifinales; el resto queda
            eliminado en esta fase.
          </>
        ) : (
          <>
            Vas a confirmar los resultados cargados. Con esta información se calcularán los clasificados, repechajes y eliminados
            para armar la fase de eliminación.
          </>
        )}
      </p>
      <div className="rounded-lg border border-gray-200/90 bg-[#f8f9fb] px-3 py-2.5 text-xs dark:border-gray-600 dark:bg-gray-800/60">
        <p className="font-bold text-[#111318] dark:text-gray-100">Resumen</p>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          <li>
            <span className="text-[#616f89] dark:text-gray-400">Partidos jugados:</span>{' '}
            <strong className="text-[#111318] dark:text-white">{outcomeSummary.played}</strong>
          </li>
          <li>
            <span className="text-[#616f89] dark:text-gray-400">Partidos W.O. / ret.:</span>{' '}
            <strong className="text-[#111318] dark:text-white">{outcomeSummary.walkover}</strong>
          </li>
          <li>
            <span className="text-[#616f89] dark:text-gray-400">Partidos suspendidos:</span>{' '}
            <strong className="text-[#111318] dark:text-white">{outcomeSummary.suspended}</strong>
          </li>
          <li>
            <span className="text-[#616f89] dark:text-gray-400">Grupos:</span>{' '}
            <strong className="text-[#111318] dark:text-white">{outcomeSummary.groupCount}</strong>
          </li>
          <li>
            <span className="text-[#616f89] dark:text-gray-400">
              {isMasters1000 ? 'Clasificados a semifinales:' : 'Clasificados directos:'}
            </span>{' '}
            <strong className="text-[#111318] dark:text-white">{proposal.direct.length}</strong>
          </li>
          {!isMasters1000 ? (
            <li>
              <span className="text-[#616f89] dark:text-gray-400">Repechaje / terceros:</span>{' '}
              <strong className="text-[#111318] dark:text-white">{proposal.repechaje.length}</strong>
            </li>
          ) : null}
          <li className={isMasters1000 ? '' : 'sm:col-span-2'}>
            <span className="text-[#616f89] dark:text-gray-400">Eliminados:</span>{' '}
            <strong className="text-[#111318] dark:text-white">{proposal.eliminated.length}</strong>
          </li>
        </ul>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[#616f89] dark:text-gray-500">Clasificación previa</p>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <StandingsPreviewTable title={isMasters1000 ? 'Clasificados a semifinales' : 'Clasificados directos'} rows={proposal.direct} />
          {!isMasters1000 ? <StandingsPreviewTable title="Repechaje / terceros" rows={proposal.repechaje} /> : null}
          <StandingsPreviewTable title="Eliminados" rows={proposal.eliminated} />
        </div>
      </div>
      <div className="rounded-lg border border-amber-500/45 bg-amber-50/90 px-3 py-2.5 text-xs text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/35 dark:text-amber-100">
        <p className="font-bold">Advertencia</p>
        <p className="mt-1 leading-relaxed">
          Después de confirmar, la fase de grupos quedará bloqueada para evitar cambios accidentales. Si necesitás modificar
          un resultado, deberás desbloquear la fase con confirmación.
        </p>
      </div>
    </div>
  );
}

export function AdminResultsVisualPanel({
  tournamentId,
  leagueNum,
  templateHasGrupos = false,
  groupTables = [],
  groupStageStatus,
  onGroupStageStatusChange,
  readOnly = false,
  onTournamentThemeChange,
  onDirtyChange,
  draftResetSignal = 0,
  onRegisterBulkSave,
  focusDedupeKey,
  onConsumedFocusDedupeKey,
  onRequestProgramarPartido,
}: Props) {
  const results = useResults();
  const { players } = useClubData();
  const matchSchedules = useMatchSchedules();
  const seedFmt = useOptionalAdminTournamentSeed();

  const isMasters1000 = useMemo(
    () => effectiveTournamentCatalogType(getTournamentById(tournamentId)) === 'masters1000',
    [tournamentId],
  );

  const resultsByKey = useMemo(() => {
    const m = new Map<string, MatchInput>();
    for (const r of results) {
      m.set(matchInputDedupeKey(r), r);
    }
    return m;
  }, [results]);

  const lockGroupFixtureResults = groupStageStatus === 'confirmed';

  useEffect(() => {
    onTournamentThemeChange?.(tournamentId.trim() ? tournamentId : null);
  }, [tournamentId, onTournamentThemeChange]);

  useEffect(() => {
    if (draftResetSignal <= 0) return;
    clearMatchDraftSessionForTournament(tournamentId);
    setMatchDraftByKey({});
    setExpanded({});
    setResultEditingByKey({});
    setSaveAllOpen(false);
    setSubmitErr(null);
  }, [draftResetSignal, tournamentId]);

  const fixtureRows = useMemo((): EditableRow[] => {
    const t = getTournamentById(tournamentId);
    const entries = sortFixtureEntriesByGroupThenRound(buildFixtureCatalogEntriesForTournament(t, players));
    return entries.map((entry): EditableRow => ({ kind: 'fixture', entry }));
  }, [tournamentId, players]);

  const koRows = useMemo((): EditableRow[] => {
    return buildKnockoutAdminEntries(tournamentId, players).map((entry): EditableRow => ({ kind: 'ko', entry }));
  }, [tournamentId, players]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  /** true = inputs habilitados; partidos sin resultado abren siempre en edición. */
  const [resultEditingByKey, setResultEditingByKey] = useState<Record<string, boolean>>({});
  const [matchDraftByKey, setMatchDraftByKey] = useState<Record<string, AdminMatchResultDraftLocal>>({});
  const [submitErr, setSubmitErr] = useState<{ key: string; message: string } | null>(null);
  const [toast, setToast] = useState<{ text: string; variant: 'success' | 'error' } | null>(null);
  const [saveAllOpen, setSaveAllOpen] = useState(false);
  const [saveAllModalError, setSaveAllModalError] = useState<string | null>(null);
  const [recalcOpen, setRecalcOpen] = useState(false);
  const [editConfirmKey, setEditConfirmKey] = useState<string | null>(null);
  const [walkoverConfirm, setWalkoverConfirm] = useState<{ row: EditableRow; conceding: 'a' | 'b' } | null>(null);
  const [suspendConfirmRow, setSuspendConfirmRow] = useState<EditableRow | null>(null);
  const [saveConfirmRow, setSaveConfirmRow] = useState<EditableRow | null>(null);
  const [scheduleRequiredModalKey, setScheduleRequiredModalKey] = useState<string | null>(null);
  const [confirmGroupStageOpen, setConfirmGroupStageOpen] = useState(false);
  const [unlockGroupStageOpen, setUnlockGroupStageOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'played'>('pending');
  const [groupFilter, setGroupFilter] = useState<string>('all');

  /** Hidratar borradores de sesión (misma clave dedupe que fixture/KO del torneo). */
  useEffect(() => {
    const from = loadMatchDraftCellsForTournament(tournamentId);
    const keys = new Set<string>();
    for (const r of fixtureRows) keys.add(rowDedupeKey(r));
    for (const r of koRows) keys.add(rowDedupeKey(r));
    const entries = Object.entries(from).filter(([k]) => keys.has(k));
    if (entries.length === 0) return;
    setMatchDraftByKey((prev) => {
      const merged = { ...prev };
      const now = Date.now();
      for (const [k, cells] of entries) {
        if (merged[k]) continue;
        merged[k] = { cells: cloneGrid(cells), status: 'draft', updatedAt: now };
      }
      return merged;
    });
  }, [tournamentId, fixtureRows, koRows]);

  useEffect(() => {
    if (Object.keys(matchDraftByKey).length === 0) return;
    const flat: Record<string, ScoreCells> = {};
    for (const k of Object.keys(matchDraftByKey)) {
      const draft = matchDraftByKey[k];
      if (!draft) continue;
      flat[k] = draft.cells;
    }
    const t = window.setTimeout(() => saveMatchDraftCellsForTournament(tournamentId, flat), 400);
    return () => {
      window.clearTimeout(t);
      /** Persistir de inmediato al desmontar o antes del siguiente tick (evita perder borrador si el debounce no corrió). */
      saveMatchDraftCellsForTournament(tournamentId, flat);
    };
  }, [tournamentId, matchDraftByKey]);

  const groupedFixture = useMemo(() => {
    const byGroup = new Map<string, Map<number, EditableRow[]>>();
    for (const r of fixtureRows) {
      if (r.kind !== 'fixture') continue;
      const round = r.entry.round;
      const gk = r.entry.group;
      if (!byGroup.has(gk)) byGroup.set(gk, new Map());
      const rm = byGroup.get(gk)!;
      if (!rm.has(round)) rm.set(round, []);
      rm.get(round)!.push(r);
    }
    return byGroup;
  }, [fixtureRows]);

  const groupFilterOptions = useMemo(() => {
    return Array.from(groupedFixture.keys()).sort(compareFixtureGroups);
  }, [groupedFixture]);

  useEffect(() => {
    if (groupFilter === 'all') return;
    if (!groupFilterOptions.includes(groupFilter)) setGroupFilter('all');
  }, [groupFilter, groupFilterOptions]);

  const koByStage = useMemo(() => {
    const order: KnockoutAdminEntry['koStage'][] = isMasters1000
      ? ['semi', 'final']
      : ['repechaje', 'octavos', 'quarter', 'semi', 'final'];
    const m = new Map<KnockoutAdminEntry['koStage'], EditableRow[]>();
    for (const s of order) {
      m.set(s, []);
    }
    for (const r of koRows) {
      if (r.kind !== 'ko') continue;
      m.get(r.entry.koStage)?.push(r);
    }
    return m;
  }, [koRows, isMasters1000]);

  const koStageTitle = (s: KnockoutAdminEntry['koStage']) => {
    if (s === 'repechaje') return 'Repechaje';
    if (s === 'octavos') return 'Octavos de final';
    if (s === 'quarter') return 'Cuartos de final';
    if (s === 'semi') return 'Semifinales';
    return 'Final';
  };

  const draftCellsFlattened = useMemo(() => flattenMatchDraftCells(matchDraftByKey), [matchDraftByKey]);
  const draftCellsRef = useRef<Record<string, ScoreCells>>({});
  draftCellsRef.current = draftCellsFlattened;

  const rowsByDedupeKey = useMemo(() => {
    const m = new Map<string, EditableRow>();
    for (const r of fixtureRows) m.set(rowDedupeKey(r), r);
    for (const r of koRows) m.set(rowDedupeKey(r), r);
    return m;
  }, [fixtureRows, koRows]);

  const scheduleByKeyForTournament = useMemo(() => {
    const m = new Map<string, MatchScheduleEntry>();
    for (const s of matchSchedules) {
      if (s.tournamentId === tournamentId) m.set(s.dedupeKey, s);
    }
    return m;
  }, [matchSchedules, tournamentId]);

  const ensureDraft = useCallback(
    (row: EditableRow) => {
      const k = rowDedupeKey(row);
      setMatchDraftByKey((prev) => {
        if (prev[k]) return prev;
        const stored = resultsByKey.get(k);
        return {
          ...prev,
          [k]: { cells: cellsFromStored(stored), status: 'draft', updatedAt: Date.now() },
        };
      });
    },
    [resultsByKey],
  );

  const openRowForCargar = useCallback(
    (key: string) => {
      if (readOnly) return;
      const row = rowsByDedupeKey.get(key);
      if (!row) return;
      setSubmitErr(null);
      setExpanded((prev) => ({ ...prev, [key]: true }));
      if (lockGroupFixtureResults && row.kind === 'fixture') {
        setResultEditingByKey((prev) => ({ ...prev, [key]: false }));
      } else {
        ensureDraft(row);
        setResultEditingByKey((prev) => ({ ...prev, [key]: true }));
      }
      window.requestAnimationFrame(() => {
        document.getElementById(`admin-result-card-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    },
    [readOnly, rowsByDedupeKey, ensureDraft, lockGroupFixtureResults],
  );

  useEffect(() => {
    const k = focusDedupeKey?.trim();
    if (!k || readOnly) return;
    openRowForCargar(k);
    queueMicrotask(() => {
      onConsumedFocusDedupeKey?.();
    });
  }, [focusDedupeKey, readOnly, openRowForCargar, onConsumedFocusDedupeKey]);

  const toggleExpanded = (row: EditableRow) => {
    const k = rowDedupeKey(row);
    const fixtureLocked = lockGroupFixtureResults && row.kind === 'fixture';
    setSubmitErr(null);
    const willOpen = !expanded[k];
    if (willOpen) {
      const stored = resultsByKey.get(k);
      if (!hasSavedViewableOutcome(stored)) {
        if (fixtureLocked) {
          setResultEditingByKey((m) => ({ ...m, [k]: false }));
        } else {
          ensureDraft(row);
          setResultEditingByKey((m) => ({ ...m, [k]: true }));
        }
      } else {
        setResultEditingByKey((m) => ({ ...m, [k]: false }));
        setMatchDraftByKey((d) => {
          if (!(k in d)) return d;
          const { [k]: _, ...rest } = d;
          return rest;
        });
      }
    } else {
      setResultEditingByKey((m) => ({ ...m, [k]: false }));
      /* Mantener borrador en memoria al cerrar el desplegable. */
    }
    setExpanded((e) => ({ ...e, [k]: willOpen }));
  };

  const openEditConfirm = (row: EditableRow) => {
    if (readOnly) return;
    if (lockGroupFixtureResults && row.kind === 'fixture') {
      setToast({
        text: 'La fase de grupos está confirmada. Desbloqueala desde el aviso superior para editar estos resultados.',
        variant: 'error',
      });
      window.setTimeout(() => setToast(null), 5500);
      return;
    }
    setEditConfirmKey(rowDedupeKey(row));
    setSubmitErr(null);
  };

  const confirmStartEditRow = () => {
    const k = editConfirmKey;
    if (!k) return;
    const row = rowsByDedupeKey.get(k);
    setEditConfirmKey(null);
    if (!row || readOnly) return;
    ensureDraft(row);
    setResultEditingByKey((m) => ({ ...m, [k]: true }));
    setSubmitErr(null);
  };

  const setCellsForKey = (key: string, next: ScoreCells) => {
    if (readOnly) return;
    const rowForKey = rowsByDedupeKey.get(key);
    if (lockGroupFixtureResults && rowForKey?.kind === 'fixture') return;
    setMatchDraftByKey((d) => ({
      ...d,
      [key]: { cells: cloneGrid(next), status: 'draft', updatedAt: Date.now() },
    }));
    setSubmitErr((e) => (e?.key === key ? null : e));
  };

  const dirtyKeys = useMemo(() => {
    const keys: string[] = [];
    for (const k of Object.keys(matchDraftByKey)) {
      if (cellsDirtyVsStored(k, matchDraftByKey[k]!.cells, resultsByKey)) keys.push(k);
    }
    return keys;
  }, [matchDraftByKey, resultsByKey]);

  const hasDirty = dirtyKeys.length > 0;

  const bulkPartition = useMemo(
    () =>
      computeBulkSavePartition(
        dirtyKeys,
        draftCellsFlattened,
        resultsByKey,
        rowsByDedupeKey,
        players,
        scheduleByKeyForTournament,
      ),
    [dirtyKeys, draftCellsFlattened, resultsByKey, rowsByDedupeKey, players, scheduleByKeyForTournament],
  );

  const hasBulkSaveableDraft = bulkPartition.valid.length > 0;

  const canConfirmGroupResults = useMemo(() => {
    if (!templateHasGrupos || readOnly) return false;
    if (groupStageStatus === 'confirmed') return false;
    if (!isGroupPhaseCompleteForEliminationSetup(tournamentId, results, players, resultsByKey)) return false;
    if (hasDirty) return false;
    if (bulkPartition.invalid.length > 0) return false;
    if (hasGroupFixtureStoredValidationErrors(tournamentId, resultsByKey, players, scheduleByKeyForTournament))
      return false;
    return true;
  }, [
    templateHasGrupos,
    readOnly,
    groupStageStatus,
    tournamentId,
    results,
    players,
    resultsByKey,
    hasDirty,
    bulkPartition.invalid.length,
    scheduleByKeyForTournament,
  ]);

  const groupOutcomeSummaryModal = useMemo(
    () => summarizeGroupFixtureOutcomes(tournamentId, results),
    [tournamentId, results],
  );

  const eliminationPreviewModal = useMemo(
    () => buildEliminationProposalFromGroupTables(groupTables, tournamentId),
    [groupTables, tournamentId],
  );

  const rowMatchesStatusFilter = useCallback(
    (row: EditableRow): boolean => {
      const stored = resultsByKey.get(rowDedupeKey(row));
      const loaded = hasSavedViewableOutcome(stored);
      return statusFilter === 'played' ? loaded : !loaded;
    },
    [statusFilter, resultsByKey],
  );

  useEffect(() => {
    setStatusFilter('pending');
  }, [tournamentId]);

  useEffect(() => {
    onDirtyChange?.(hasDirty);
  }, [hasDirty, onDirtyChange]);

  const logHistory = useCallback(
    (args: { key: string; row: EditableRow; prev?: MatchInput; next: MatchInput }) => {
      const e = args.row.entry;
      const had = hadPersistedViewableOutcome(args.prev);
      const action = inferHistoryAction(had, args.next.status);
      appendResultChangeEntry({
        tournamentId: e.tournamentId,
        matchKey: args.key,
        playerA: e.playerA,
        playerB: e.playerB,
        prevScore: args.prev?.score,
        prevStatus: args.prev?.status,
        newScore: args.next.score,
        newStatus: args.next.status,
        action,
        prevWinnerLabel: matchWinnerDisplayLabel(args.prev),
        newWinnerLabel: matchWinnerDisplayLabel(args.next),
        user: 'admin local',
      });
      const tn = getTournamentById(e.tournamentId)?.name?.trim() || e.tournamentId;
      appendMatchResultAudit({
        tournamentId: e.tournamentId,
        tournamentName: tn,
        league: leagueNum,
        group: auditGroupLabel(args.row),
        playerA: e.playerA,
        playerB: e.playerB,
        prev: args.prev,
        next: args.next,
      });
    },
    [leagueNum],
  );

  const persistRow = useCallback(
    (
      row: EditableRow,
      cells: ScoreCells,
      opts?: {
        skipRecalculate?: boolean;
        errorKey?: string;
      },
    ): boolean => {
      if (readOnly) return false;
      if (lockGroupFixtureResults && row.kind === 'fixture') return false;
      const key = opts?.errorKey ?? rowDedupeKey(row);
      const prev = resultsByKey.get(key);
      const built = buildScoreStringIfValid(cells);
      if (built.ok === false) {
        setSubmitErr({ key, message: built.reason || 'Completá un marcador válido.' });
        return false;
      }
      const next = buildNextPlayedMatchInput(row, built.value);
      const preVal = validateAdminMatchResult(asAdminRow(row), next, players, {
        enforcePlayedSchedule: true,
        scheduleEntry: scheduleByKeyForTournament.get(key),
      });
      if (preVal.some((msg) => msg === SCHEDULE_REQUIRED_FOR_PLAYED_MESSAGE)) {
        setScheduleRequiredModalKey(key);
        return false;
      }
      if (preVal.length > 0) {
        setSubmitErr({ key, message: preVal.join(' ') });
        return false;
      }
      const committed = commitAdminMatchResult(asAdminRow(row), next, players, {
        leagueNum,
        runRecalculate: !opts?.skipRecalculate,
        scheduleEntry: scheduleByKeyForTournament.get(key),
      });
      if (committed.ok === false) {
        setSubmitErr({ key, message: committed.errors.join(' ') });
        return false;
      }
      logHistory({
        key,
        row,
        prev,
        next,
      });
      setSubmitErr(null);
      return true;
    },
    [readOnly, lockGroupFixtureResults, resultsByKey, leagueNum, logHistory, players, scheduleByKeyForTournament],
  );

  const flushSaveOne = useCallback(
    (row: EditableRow): boolean => {
      if (readOnly) return false;
      if (lockGroupFixtureResults && row.kind === 'fixture') return false;
      const key = rowDedupeKey(row);
      const cells = matchDraftByKey[key]?.cells ?? cellsFromStored(resultsByKey.get(key));
      const wasPersisted = hadPersistedViewableOutcome(resultsByKey.get(key));
      const ok = persistRow(row, cells, { errorKey: key });
      if (ok) {
        setMatchDraftByKey((d) => {
          const { [key]: _, ...rest } = d;
          return rest;
        });
        setResultEditingByKey((m) => ({ ...m, [key]: false }));
        setToast({
          text: wasPersisted
            ? 'Cambios guardados. Tablas, clasificación, ranking y perfiles actualizados con el nuevo marcador.'
            : 'Resultado guardado. Torneo recalculado correctamente.',
          variant: 'success',
        });
        window.setTimeout(() => setToast(null), 4500);
      }
      return ok;
    },
    [readOnly, lockGroupFixtureResults, matchDraftByKey, resultsByKey, persistRow],
  );

  /** Guardado masivo sin diálogos extra (modal global ya confirmó). */
  const flushSaveAllSilent = useCallback(async (): Promise<boolean> => {
    if (readOnly) return true;
    const dc = draftCellsRef.current;
    const keys = Object.keys(dc).filter((k) => cellsDirtyVsStored(k, dc[k]!, resultsByKey));
    if (keys.length === 0) return true;
    const { valid, invalid } = computeBulkSavePartition(
      keys,
      dc,
      resultsByKey,
      rowsByDedupeKey,
      players,
      scheduleByKeyForTournament,
    );
    if (valid.length === 0) {
      const first = invalid[0];
      if (first) setSubmitErr({ key: first.key, message: first.reason });
      return false;
    }
    const savedKeys: string[] = [];
    for (const item of valid) {
      const cells = dc[item.key] ?? cellsFromStored(resultsByKey.get(item.key));
      const built = buildScoreStringIfValid(cells);
      if (built.ok === false) continue;
      const next = buildNextPlayedMatchInput(item.row, built.value);
      const r = commitAdminMatchResult(asAdminRow(item.row), next, players, {
        leagueNum,
        runRecalculate: false,
        scheduleEntry: scheduleByKeyForTournament.get(item.key),
      });
      if (r.ok === false) {
        setSubmitErr({ key: item.key, message: r.errors.join(' ') });
        break;
      }
      logHistory({
        key: item.key,
        row: item.row,
        prev: resultsByKey.get(item.key),
        next,
      });
      savedKeys.push(item.key);
    }
    if (savedKeys.length === 0) return false;
    setMatchDraftByKey((d) => {
      const nextDraft = { ...d };
      for (const k of savedKeys) delete nextDraft[k];
      return nextDraft;
    });
    setResultEditingByKey((m) => {
      const nextEditing = { ...m };
      for (const k of savedKeys) delete nextEditing[k];
      return nextEditing;
    });
    setSaveAllModalError(null);
    const rec = recalculateTournament({ tournamentId, league: leagueNum });
    if (!rec.ok) {
      setToast({ text: RECALC_FAIL_MSG, variant: 'error' });
      window.setTimeout(() => setToast(null), 6500);
      return false;
    }
    const skipped = keys.length - savedKeys.length;
    setToast({
      text:
        skipped > 0
          ? `Se guardaron ${savedKeys.length} resultado(s); ${skipped} quedaron con error o incompletos. ${RECALC_OK_MSG}`
          : `Se guardaron ${savedKeys.length} resultado(s). ${RECALC_OK_MSG}`,
      variant: 'success',
    });
    window.setTimeout(() => setToast(null), 4500);
    return true;
  }, [
    readOnly,
    rowsByDedupeKey,
    resultsByKey,
    tournamentId,
    leagueNum,
    players,
    logHistory,
    scheduleByKeyForTournament,
  ]);

  useEffect(() => {
    if (!onRegisterBulkSave) return;
    if (readOnly) {
      onRegisterBulkSave(null);
      return () => onRegisterBulkSave(null);
    }
    onRegisterBulkSave(() => flushSaveAllSilent());
    return () => onRegisterBulkSave(null);
  }, [readOnly, onRegisterBulkSave, flushSaveAllSilent]);

  /** Walkover del jugador indicado: victoria del rival con marcador 6-0 6-0 (o 0-6 0-6 según lado). */
  const commitWalkoverForPlayer = (row: EditableRow, conceding: 'a' | 'b') => {
    if (readOnly) return;
    if (lockGroupFixtureResults && row.kind === 'fixture') return;
    const e = row.entry;
    const key = rowDedupeKey(row);
    const prev = resultsByKey.get(key);
    const woScore = conceding === 'a' ? '0-6 0-6' : '6-0 6-0';
    const next: MatchInput = {
      matchId: row.kind === 'ko' ? row.entry.matchId : undefined,
      tournamentId: e.tournamentId,
      group: e.group,
      round: e.round,
      playerA: e.playerA,
      playerB: e.playerB,
      score: woScore,
      status: 'walkover',
      date: new Date().toISOString().slice(0, 10),
    };
    const errs = validateAdminMatchResult(asAdminRow(row), next, players);
    if (errs.length > 0) {
      setSubmitErr({ key, message: errs.join(' ') });
      return;
    }
    const r = commitAdminMatchResult(asAdminRow(row), next, players, { leagueNum });
    if (r.ok === false) {
      setSubmitErr({ key, message: r.errors.join(' ') });
      return;
    }
    logHistory({ key, row, prev, next });
    setMatchDraftByKey((d) => {
      const { [key]: _, ...rest } = d;
      return rest;
    });
    setResultEditingByKey((m) => ({ ...m, [key]: false }));
    setSubmitErr(null);
    setToast({ text: `Walkover guardado. ${RECALC_OK_MSG}`, variant: 'success' });
    window.setTimeout(() => setToast(null), 3500);
  };

  const commitSuspendedForRow = (row: EditableRow) => {
    if (readOnly) return;
    if (lockGroupFixtureResults && row.kind === 'fixture') return;
    const e = row.entry;
    const key = rowDedupeKey(row);
    const prev = resultsByKey.get(key);
    const next: MatchInput = {
      matchId: row.kind === 'ko' ? row.entry.matchId : undefined,
      tournamentId: e.tournamentId,
      group: e.group,
      round: e.round,
      playerA: e.playerA,
      playerB: e.playerB,
      score: '',
      status: 'suspended',
      date: new Date().toISOString().slice(0, 10),
    };
    const errs = validateAdminMatchResult(asAdminRow(row), next, players);
    if (errs.length > 0) {
      setSubmitErr({ key, message: errs.join(' ') });
      return;
    }
    const r = commitAdminMatchResult(asAdminRow(row), next, players, { leagueNum });
    if (r.ok === false) {
      setSubmitErr({ key, message: r.errors.join(' ') });
      return;
    }
    logHistory({ key, row, prev, next });
    setMatchDraftByKey((d) => {
      const { [key]: _, ...rest } = d;
      return rest;
    });
    setResultEditingByKey((m) => ({ ...m, [key]: false }));
    setSubmitErr(null);
    setToast({ text: `Marcado como suspendido. ${RECALC_OK_MSG}`, variant: 'success' });
    window.setTimeout(() => setToast(null), 3500);
  };

  const requestWalkoverForPlayer = (row: EditableRow, conceding: 'a' | 'b') => {
    if (readOnly) return;
    if (lockGroupFixtureResults && row.kind === 'fixture') return;
    setWalkoverConfirm({ row, conceding });
    setSubmitErr(null);
  };

  const requestSuspended = (row: EditableRow) => {
    if (readOnly) return;
    if (lockGroupFixtureResults && row.kind === 'fixture') return;
    setSuspendConfirmRow(row);
    setSubmitErr(null);
  };

  const requestFlushSaveOne = (row: EditableRow) => {
    if (readOnly) return;
    if (lockGroupFixtureResults && row.kind === 'fixture') return;
    const key = rowDedupeKey(row);
    const stored = resultsByKey.get(key);
    if (hadPersistedViewableOutcome(stored)) {
      setSaveConfirmRow(row);
      setSubmitErr(null);
      return;
    }
    flushSaveOne(row);
  };

  const cancelCard = (row: EditableRow) => {
    const k = rowDedupeKey(row);
    setMatchDraftByKey((d) => {
      const { [k]: _, ...rest } = d;
      return rest;
    });
    setExpanded((e) => ({ ...e, [k]: false }));
    setResultEditingByKey((m) => ({ ...m, [k]: false }));
    setSubmitErr(null);
  };

  /** En partidos ya guardados: sale de edición sin cerrar el acordeón. Pendientes: cierra y descarta. */
  const cancelRowEdit = (row: EditableRow) => {
    const k = rowDedupeKey(row);
    const stored = resultsByKey.get(k);
    if (hasSavedViewableOutcome(stored)) {
      setMatchDraftByKey((d) => {
        if (!(k in d)) return d;
        const { [k]: _, ...rest } = d;
        return rest;
      });
      setResultEditingByKey((m) => ({ ...m, [k]: false }));
      setSubmitErr((e) => (e?.key === k ? null : e));
      return;
    }
    cancelCard(row);
  };

  const saveAllDirty = (): boolean => {
    if (readOnly) return false;
    setSaveAllModalError(null);
    const keys = Object.keys(matchDraftByKey).filter((k) =>
      cellsDirtyVsStored(k, matchDraftByKey[k]!.cells, resultsByKey),
    );
    const { valid, invalid } = computeBulkSavePartition(
      keys,
      draftCellsFlattened,
      resultsByKey,
      rowsByDedupeKey,
      players,
      scheduleByKeyForTournament,
    );
    if (valid.length === 0) {
      const first = invalid[0];
      const msg = first?.reason ?? 'No hay resultados válidos para guardar.';
      setSaveAllModalError(msg);
      if (first) setSubmitErr({ key: first.key, message: first.reason });
      return false;
    }
    const savedKeys: string[] = [];
    for (const item of valid) {
      const cells =
        matchDraftByKey[item.key]?.cells ?? cellsFromStored(resultsByKey.get(item.key));
      const built = buildScoreStringIfValid(cells);
      if (built.ok === false) continue;
      const next = buildNextPlayedMatchInput(item.row, built.value);
      const r = commitAdminMatchResult(asAdminRow(item.row), next, players, {
        leagueNum,
        runRecalculate: false,
        scheduleEntry: scheduleByKeyForTournament.get(item.key),
      });
      if (r.ok === false) {
        const msg = r.errors.join(' ');
        setSubmitErr({ key: item.key, message: msg });
        setSaveAllModalError(msg);
        break;
      }
      logHistory({
        key: item.key,
        row: item.row,
        prev: resultsByKey.get(item.key),
        next,
      });
      savedKeys.push(item.key);
    }
    if (savedKeys.length === 0) return false;
    setMatchDraftByKey((d) => {
      const next = { ...d };
      for (const k of savedKeys) delete next[k];
      return next;
    });
    setResultEditingByKey((m) => {
      const next = { ...m };
      for (const k of savedKeys) delete next[k];
      return next;
    });
    const rec = recalculateTournament({ tournamentId, league: leagueNum });
    if (!rec.ok) {
      setToast({ text: RECALC_FAIL_MSG, variant: 'error' });
      window.setTimeout(() => setToast(null), 6500);
      return true;
    }
    const skippedInvalid = invalid.length;
    const skippedCommit = valid.length - savedKeys.length;
    const extra =
      skippedInvalid > 0 || skippedCommit > 0
        ? ` Quedaron ${skippedInvalid + skippedCommit} partido(s) sin guardar (revisá los avisos).`
        : '';
    setToast({
      text: `Se guardaron ${savedKeys.length} resultado(s).${extra} ${RECALC_OK_MSG}`,
      variant: 'success',
    });
    window.setTimeout(() => setToast(null), 5000);
    return true;
  };

  const renderMatchCard = (row: EditableRow) => {
    const key = rowDedupeKey(row);
    const rowReadOnly = readOnly || (lockGroupFixtureResults && row.kind === 'fixture');
    const { a, b } = rowPlayers(row);
    const aDisp = seedFmt?.formatMatchSide(a) ?? a;
    const bDisp = seedFmt?.formatMatchSide(b) ?? b;
    const meta = rowMeta(row);
    const stored = resultsByKey.get(key);
    const rankingCatalog = effectiveTournamentCatalogType(getTournamentById(tournamentId));
    const isOpen = !!expanded[key];
    const hasView = hasSavedViewableOutcome(stored);
    const isEditing = !hasView || Boolean(resultEditingByKey[key]);
    const isFirstTimeLoad = !hasView;
    const cells = matchDraftByKey[key]?.cells ?? cellsFromStored(stored);
    const draftDirty = cellsDirtyVsStored(key, cells, resultsByKey);
    const pres = resolveAdminMatchPresentation(stored, draftDirty);
    const badge = matchPresentationPrimaryBadge(pres);
    const winSide = winnerSideFromStoredStrict(stored);
    const saveCheck = buildScoreStringIfValid(cells);
    const koSlotsBlocked = row.kind === 'ko' && !isKnockoutMatchPlayableNames(a, b);
    const canSaveScore = !rowReadOnly && isEditing && saveCheck.ok && !koSlotsBlocked;
    const headerNeutral = !hasView || !winSide || (isOpen && isEditing);
    /** Misma rejilla para pendientes y jugados; el badge GANADOR ocupa ancho reservado aunque no haya ganador visible. */
    const playerHeaderTone = (side: 'a' | 'b') => {
      const base =
        'flex min-h-[2.75rem] w-full min-w-0 flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold leading-snug text-[#111318] dark:text-white sm:w-auto';
      if (headerNeutral) {
        return `${base} border-gray-200/90 bg-[#f8f9fb] dark:border-gray-600 dark:bg-gray-800/90`;
      }
      if (winSide === side) return `${base} admin-match-player-winner font-bold`;
      return `${base} admin-match-player-loser font-medium text-[#616f89] dark:text-gray-400`;
    };
    const cardAccent = isOpen && isEditing && !rowReadOnly;
    const showHeaderDraftHint = !hasView && draftDirty;
    const gridLocked = rowReadOnly || (hasView && !isEditing);
    const highlightSavedOutcome = Boolean(
      hasView &&
        !isEditing &&
        stored &&
        ((stored.status === 'played' && !!stored.score?.trim()) ||
          stored.status === 'walkover' ||
          stored.status === 'retired'),
    );
    const persistedWinnerSideForGrid = highlightSavedOutcome && stored ? winnerSideFromStoredStrict(stored) : null;

    return (
      <div
        key={key}
        id={`admin-result-card-${key}`}
        className={`overflow-hidden rounded-xl border bg-white/80 transition-shadow dark:bg-gray-900/60 ${
          cardAccent ? 'admin-result-card-editing shadow-md' : 'border-gray-200/90 shadow-sm dark:border-gray-600/70'
        }`}
      >
        <button
          type="button"
          onClick={() => toggleExpanded(row)}
          className="grid w-full grid-cols-1 gap-3 px-3 py-3 text-left transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/50 sm:min-h-[4.25rem] sm:grid-cols-[minmax(0,1fr)_auto_minmax(8.5rem,auto)] sm:items-center sm:gap-x-4 sm:px-4"
        >
          <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
            <div className={playerHeaderTone('a')}>
              <span className="min-w-0 flex-1 break-words text-left">{aDisp}</span>
              <span className="flex w-[5rem] shrink-0 justify-end self-center sm:w-[5.25rem]" aria-hidden={headerNeutral || winSide !== 'a'}>
                {!headerNeutral && winSide === 'a' ? <AdminGanadorBadge /> : null}
              </span>
            </div>
            <span className="shrink-0 self-center text-center text-xs font-bold uppercase tracking-wider text-[#616f89] dark:text-gray-500 sm:leading-none">
              vs
            </span>
            <div className={playerHeaderTone('b')}>
              <span className="min-w-0 flex-1 break-words text-left">{bDisp}</span>
              <span className="flex w-[5rem] shrink-0 justify-end self-center sm:w-[5.25rem]" aria-hidden={headerNeutral || winSide !== 'b'}>
                {!headerNeutral && winSide === 'b' ? <AdminGanadorBadge /> : null}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-self-end">
            <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-gray-200/90 bg-white px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-[#616f89] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
              <Layers className="h-3.5 w-3.5" aria-hidden />
              {meta.groupLabel}
            </span>
            <span
              className={`inline-flex h-8 shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide ${badge.pillTailClasses}`}
            >
              {badge.label}
            </span>
          </div>
          <div className="flex min-h-[2.75rem] items-center justify-end gap-3 sm:min-h-0">
            {showHeaderDraftHint ? (
              <span className="min-w-[6.5rem] max-w-[220px] truncate text-right text-xs font-semibold text-sky-800 dark:text-sky-100">
                Borrador sin guardar
              </span>
            ) : (
              <span className="min-w-[6.5rem] shrink-0" aria-hidden />
            )}
            {isOpen ? <ChevronDown className="h-5 w-5 shrink-0 text-[#616f89]" aria-hidden /> : <ChevronRight className="h-5 w-5 shrink-0 text-[#616f89]" aria-hidden />}
          </div>
        </button>

        {isOpen ? (
          <div className="border-t border-gray-200/80 bg-gray-50/40 px-3 py-3 dark:border-gray-700 dark:bg-gray-950/35 sm:px-4">
            {koSlotsBlocked ? (
              <p
                className="rounded-lg border border-amber-500/40 bg-amber-50/95 px-3 py-3 text-sm font-medium text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/35 dark:text-amber-100"
                role="alert"
              >
                {KO_MATCH_PENDING_PLAYERS_MESSAGE}
              </p>
            ) : (
              <>
                {stored?.status === 'walkover' && isEditing ? (
                  <p className="mb-2 text-xs text-rose-900 dark:text-rose-100/90">
                    W.O. · gana <strong>{walkoverWinnerName(stored)}</strong>. Marcador abajo lo reemplaza.
                  </p>
                ) : null}
                {stored && (stored.status === 'walkover' || stored.status === 'retired') && !isEditing ? (
                  <p className="mb-2 text-xs text-rose-900 dark:text-rose-100/90">
                    W.O. · gana <strong>{walkoverWinnerName(stored)}</strong>
                  </p>
                ) : null}
                <div className="rounded-xl border border-gray-200/90 bg-white/95 p-4 shadow-sm dark:border-gray-600 dark:bg-gray-900/60">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    {gridLocked && hasView ? (
                      <span className="text-sm font-semibold text-[#111318] dark:text-gray-100">
                        {formatPlayedWhenLine(stored, scheduleByKeyForTournament.get(key))}
                      </span>
                    ) : (
                      <>
                        <span className="text-[11px] font-bold uppercase tracking-wide text-[#616f89] dark:text-gray-400">
                          Carga de resultado
                        </span>
                        <span
                          className={`inline-flex h-8 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide ${badge.pillTailClasses}`}
                        >
                          {badge.label}
                        </span>
                      </>
                    )}
                  </div>
                  <AdminMatchScoreGrid
                    playerA={aDisp}
                    playerB={bDisp}
                    cells={cells}
                    locked={gridLocked}
                    highlightSavedOutcome={highlightSavedOutcome}
                    persistedWinnerSide={persistedWinnerSideForGrid}
                    readOnlyPresentation={gridLocked}
                    rankingPointsPreview={groupRankingPointsPreviewForRow(row, stored, rankingCatalog)}
                    onChange={(next) => {
                      if (!rowReadOnly && !gridLocked) setCellsForKey(key, next);
                    }}
                  />
                </div>

                <div className="mt-3 flex flex-col gap-3 border-t border-gray-200/70 pt-3 dark:border-gray-700/60 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-2">
                  {!gridLocked ? (
                    <div className="flex min-w-0 flex-1 flex-wrap items-stretch gap-2 md:items-center md:gap-1.5">
                      <button
                        type="button"
                        className={btnWoSm}
                        disabled={rowReadOnly}
                        onClick={() => requestWalkoverForPlayer(row, 'a')}
                        title={`W.O. ${aDisp}: gana el rival`}
                      >
                        W.O. {aDisp}
                      </button>
                      <button
                        type="button"
                        className={btnWoSm}
                        disabled={rowReadOnly}
                        onClick={() => requestWalkoverForPlayer(row, 'b')}
                        title={`W.O. ${bDisp}: gana el rival`}
                      >
                        W.O. {bDisp}
                      </button>
                      <button
                        type="button"
                        className={`${btnSecondary} min-h-10 flex-1 md:h-8 md:min-h-0 md:flex-none md:py-0 md:text-[11px]`}
                        disabled={rowReadOnly}
                        onClick={() => requestSuspended(row)}
                      >
                        Suspender
                      </button>
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1" aria-hidden />
                  )}
                  <div className="flex shrink-0 items-center justify-end gap-2 md:gap-1.5">
                    {!rowReadOnly && !gridLocked ? (
                      <button
                        type="button"
                        className={btnPrimary}
                        disabled={!canSaveScore}
                        onClick={() => requestFlushSaveOne(row)}
                      >
                        {isFirstTimeLoad ? 'Guardar' : 'Guardar cambios'}
                      </button>
                    ) : null}
                    {!rowReadOnly && gridLocked && hasView ? (
                      <button type="button" className={btnPrimary} onClick={() => openEditConfirm(row)}>
                        Editar resultado
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={btnToolbarIcon}
                      onClick={() => {
                        if (hasView && !isEditing) toggleExpanded(row);
                        else cancelRowEdit(row);
                      }}
                      aria-label={hasView && !isEditing ? 'Cerrar' : hasView ? 'Cancelar edición' : 'Cerrar'}
                      title={hasView && !isEditing ? 'Cerrar' : hasView ? 'Cancelar edición' : 'Cerrar'}
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
              </>
            )}
            {submitErr && submitErr.key === key ? (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
                {submitErr.message}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-gray-200/90 pb-3 dark:border-gray-700 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-x-4">
        <div className="min-w-0 space-y-1">
          <h3 className="text-lg font-bold text-[#111318] dark:text-white">Resultados</h3>
          {templateHasGrupos && !readOnly && !lockGroupFixtureResults ? (
            <p className="max-w-xl text-xs leading-relaxed text-[#616f89] dark:text-gray-400">
              Para confirmar resultados, todos los partidos deben estar cargados y sin borradores.
            </p>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            className={`${btnPrimary} ${!hasBulkSaveableDraft || readOnly ? 'pointer-events-none opacity-50' : ''} w-full justify-center sm:w-auto`}
            disabled={readOnly || !hasBulkSaveableDraft}
            onClick={() => {
              setSaveAllModalError(null);
              setSaveAllOpen(true);
            }}
          >
            Guardar todo
          </button>
          <button
            type="button"
            className={`${btnSecondary} w-full justify-center sm:w-auto`}
            disabled={readOnly}
            onClick={() => setRecalcOpen(true)}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Recalcular torneo
          </button>
          {templateHasGrupos && !readOnly ? (
            lockGroupFixtureResults ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/45 bg-emerald-500/10 px-2.5 py-2 text-[11px] font-bold text-emerald-950 dark:border-emerald-600/50 dark:bg-emerald-950/35 dark:text-emerald-100">
                  <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Grupos confirmados
                </span>
                <button
                  type="button"
                  className={`${btnSecondary} w-full justify-center gap-1.5 sm:w-auto`}
                  onClick={() => setUnlockGroupStageOpen(true)}
                >
                  <Unlock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Desbloquear grupos
                </button>
              </>
            ) : (
              <button
                type="button"
                className={`${btnConfirmGroupStage} w-full justify-center sm:w-auto`}
                disabled={!canConfirmGroupResults}
                title={
                  canConfirmGroupResults
                    ? undefined
                    : 'Completá todos los partidos de grupos, guardá borradores y corregí errores de validación.'
                }
                onClick={() => setConfirmGroupStageOpen(true)}
              >
                Confirmar resultados
              </button>
            )
          ) : null}
        </div>
      </div>

      {templateHasGrupos && !readOnly && lockGroupFixtureResults ? (
        <div className="rounded-xl border border-sky-500/40 bg-sky-50/90 px-3 py-2.5 text-sm text-sky-950 dark:border-sky-600/45 dark:bg-sky-950/35 dark:text-sky-100">
          <p className="font-bold text-[#111318] dark:text-white">Fase de grupos confirmada</p>
          <p className="mt-1 text-xs leading-relaxed text-sky-950/95 dark:text-sky-100/90">
            Los partidos de fixture quedaron bloqueados para evitar cambios accidentales. La eliminación se carga más abajo
            con el mismo editor. Si necesitás corregir un resultado de grupos, usá «Desbloquear grupos» arriba.
          </p>
        </div>
      ) : null}

      <div className="snap-x snap-proximity overflow-x-auto scroll-pl-3 scroll-pr-4 border-b border-gray-300/80 dark:border-gray-600 [-webkit-overflow-scrolling:touch]">
        <div className="flex min-h-[52px] flex-nowrap items-end gap-2 pb-px md:flex-wrap md:gap-1.5" role="tablist" aria-label="Estado de partidos">
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === 'pending'}
            className={resultadoStatusTabClass(statusFilter === 'pending')}
            onClick={() => setStatusFilter('pending')}
          >
            Pendientes
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === 'played'}
            className={resultadoStatusTabClass(statusFilter === 'played')}
            onClick={() => setStatusFilter('played')}
          >
            Jugados
          </button>
        </div>
      </div>

      {groupFilterOptions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setGroupFilter('all')}
            className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
              groupFilter === 'all'
                ? 'admin-theme-btn'
                : 'border-gray-200/90 bg-white text-[#616f89] hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900/70 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            Todos
          </button>
          {groupFilterOptions.map((groupKey) => {
            const label = groupKey === 'Interzonal' ? 'Interzonal' : `Grupo ${groupKey}`;
            const active = groupFilter === groupKey;
            return (
              <button
                key={groupKey}
                type="button"
                onClick={() => setGroupFilter(groupKey)}
                className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                  active
                    ? 'admin-theme-btn'
                    : 'border-gray-200/90 bg-white text-[#616f89] hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900/70 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : null}

      {toast ? (
        <p
          className={
            toast.variant === 'error'
              ? 'rounded-lg border border-red-500/45 bg-red-50 px-3 py-2 text-sm font-medium text-red-900 dark:bg-red-950/40 dark:text-red-100'
              : 'rounded-lg border border-emerald-500/40 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
          }
          role={toast.variant === 'error' ? 'alert' : 'status'}
        >
          {toast.text}
        </p>
      ) : null}

      <div className="space-y-8">
        <section className="space-y-2">
          {groupedFixture.size === 0 ? (
            <p className="text-sm text-[#616f89] dark:text-gray-400">No hay partidos de fixture para este torneo.</p>
          ) : (
            Array.from(groupedFixture.entries())
              .filter(([groupKey]) => groupFilter === 'all' || groupFilter === groupKey)
              .sort(([ga], [gb]) => compareFixtureGroups(ga, gb))
              .map(([groupKey, roundMap]) => (
                <div key={groupKey} className="space-y-6">
                  <div className="flex items-center gap-2 border-b border-gray-200/90 pb-2 dark:border-gray-700">
                    <h5 className="text-base font-bold text-[#111318] dark:text-white">
                      {groupKey === 'Interzonal' ? 'Interzonal' : `Grupo ${groupKey}`}
                    </h5>
                  </div>
                  {Array.from(roundMap.entries())
                    .sort(([ra], [rb]) => ra - rb)
                    .map(([round, list]) => {
                      const filteredList = list.filter((r) => rowMatchesStatusFilter(r));
                      if (filteredList.length === 0) return null;
                      return (
                        <div key={`${groupKey}-fecha-${round}`} className="space-y-3">
                          <p className="text-sm font-bold text-[#111318] dark:text-gray-200">Fecha {round}</p>
                          <div className="flex flex-col gap-4">{filteredList.map((r) => renderMatchCard(r))}</div>
                        </div>
                      );
                    })}
                </div>
              ))
          )}
        </section>

        {koRows.length > 0 ? (
          <section className="space-y-5">
            <div className="flex items-center gap-2 border-b border-gray-200/90 pb-2 dark:border-gray-700">
              <Layers className="h-5 w-5 shrink-0 text-[rgba(var(--color-torneo-rgb)/1)] opacity-95" aria-hidden />
              <h4 className="text-base font-bold text-[#111318] dark:text-white">Eliminación</h4>
            </div>
            <p className="text-xs leading-relaxed text-[#616f89] dark:text-gray-500">
              {isMasters1000 ? (
                <>
                  Misma carga que en grupos: marcador, W.O. o suspendido. Al guardar, el ganador avanza en el cuadro (semifinales →
                  final) y se recalcula el torneo.
                </>
              ) : (
                <>
                  Misma carga que en grupos: marcador, W.O. o suspendido. Al guardar, el ganador avanza en el cuadro (cuartos →
                  semis → final) y se recalcula el torneo.
                </>
              )}
            </p>
            {(isMasters1000 ? (['semi', 'final'] as const) : (['repechaje', 'octavos', 'quarter', 'semi', 'final'] as const)).map((stage) => {
              const list = koByStage.get(stage) ?? [];
              if (list.length === 0) return null;
              return (
                <div key={stage} className="space-y-3">
                  <p className="text-sm font-bold text-[#111318] dark:text-gray-200">{koStageTitle(stage)}</p>
                  <div className="flex flex-col gap-4">{list.map((r) => renderMatchCard(r))}</div>
                </div>
              );
            })}
          </section>
        ) : null}
      </div>

      <AdminConfirmDialog
        open={editConfirmKey != null}
        title="Editar resultado cargado"
        description={
          <p className="text-sm leading-relaxed text-[#616f89] dark:text-gray-400">
            Este resultado ya estaba cargado. Modificarlo puede cambiar la tabla, ranking, clasificación y perfiles.
            ¿Querés continuar?
          </p>
        }
        confirmLabel="Editar resultado"
        cancelLabel="Cancelar"
        onClose={() => setEditConfirmKey(null)}
        onConfirm={() => {
          confirmStartEditRow();
          return true;
        }}
      />

      <AdminConfirmDialog
        open={walkoverConfirm != null}
        title="Registrar walkover (W.O.)"
        variant="danger"
        description={
          <p className="text-sm leading-relaxed text-[#616f89] dark:text-gray-400">
            {walkoverConfirm
              ? `¿Confirmás walkover de ${
                  seedFmt?.formatMatchSide(
                    walkoverConfirm.conceding === 'a'
                      ? walkoverConfirm.row.entry.playerA
                      : walkoverConfirm.row.entry.playerB,
                  ) ??
                  (walkoverConfirm.conceding === 'a'
                    ? walkoverConfirm.row.entry.playerA
                    : walkoverConfirm.row.entry.playerB)
                }? Gana el rival.`
              : ''}
          </p>
        }
        confirmLabel="Confirmar W.O."
        cancelLabel="Cancelar"
        onClose={() => setWalkoverConfirm(null)}
        onConfirm={() => {
          if (!walkoverConfirm) return true;
          const { row, conceding } = walkoverConfirm;
          setWalkoverConfirm(null);
          commitWalkoverForPlayer(row, conceding);
          return true;
        }}
      />

      <AdminConfirmDialog
        open={suspendConfirmRow != null}
        title="Suspender partido"
        description={
          <p className="text-sm leading-relaxed text-[#616f89] dark:text-gray-400">
            ¿Querés marcar este partido como suspendido?
          </p>
        }
        confirmLabel="Confirmar suspensión"
        cancelLabel="Cancelar"
        onClose={() => setSuspendConfirmRow(null)}
        onConfirm={() => {
          if (!suspendConfirmRow) return true;
          const row = suspendConfirmRow;
          setSuspendConfirmRow(null);
          commitSuspendedForRow(row);
          return true;
        }}
      />

      <AdminConfirmDialog
        open={scheduleRequiredModalKey != null}
        title="Fecha requerida"
        description={SCHEDULE_REQUIRED_FOR_PLAYED_DESC}
        confirmLabel="Programar ahora"
        cancelLabel="Cancelar"
        onClose={() => setScheduleRequiredModalKey(null)}
        onConfirm={() => {
          const k = scheduleRequiredModalKey;
          setScheduleRequiredModalKey(null);
          if (k) onRequestProgramarPartido?.(k);
          return true;
        }}
      />

      <AdminConfirmDialog
        open={saveConfirmRow != null}
        title="Guardar cambios"
        description={
          <p className="text-sm leading-relaxed text-[#616f89] dark:text-gray-400">
            Vas a reemplazar el resultado ya cargado. La tabla, ranking y clasificación se actualizarán con el nuevo
            marcador. ¿Confirmás?
          </p>
        }
        confirmLabel="Confirmar guardado"
        cancelLabel="Cancelar"
        onClose={() => setSaveConfirmRow(null)}
        onConfirm={() => {
          if (!saveConfirmRow) return true;
          const row = saveConfirmRow;
          setSaveConfirmRow(null);
          flushSaveOne(row);
          return true;
        }}
      />

      <AdminConfirmDialog
        open={confirmGroupStageOpen}
        panelClassName="max-w-3xl"
        title="Confirmar resultados de fase de grupos"
        description={
          <ConfirmGroupResultsModalBody
            outcomeSummary={groupOutcomeSummaryModal}
            proposal={eliminationPreviewModal}
            isMasters1000={isMasters1000}
          />
        }
        confirmLabel="Confirmar resultados"
        cancelLabel="Cancelar"
        onClose={() => setConfirmGroupStageOpen(false)}
        onConfirm={() => {
          if (!onGroupStageStatusChange) {
            setConfirmGroupStageOpen(false);
            return true;
          }
          onGroupStageStatusChange('confirmed');
          const rec = recalculateTournament({ tournamentId, league: leagueNum });
          const tn = getTournamentById(tournamentId)?.name?.trim() || tournamentId;
          appendAdminAuditEntry({
            action: 'grupos_resultados_confirmados',
            actionLabel: auditActionLabel('grupos_resultados_confirmados'),
            tournamentId,
            tournamentName: tn,
            league: leagueNum,
            detail: isMasters1000
              ? `Cierre oficial de grupos. Fixture: ${groupOutcomeSummaryModal.played} jugados, ${groupOutcomeSummaryModal.walkover} W.O./ret., ${groupOutcomeSummaryModal.suspended} suspendidos, ${groupOutcomeSummaryModal.groupCount} grupos. Clasificación Masters: ${eliminationPreviewModal.direct.length} a semifinales, ${eliminationPreviewModal.eliminated.length} eliminados. Recálculo: ${rec.ok ? 'ok' : 'falló'}.`
              : `Cierre oficial de grupos. Fixture: ${groupOutcomeSummaryModal.played} jugados, ${groupOutcomeSummaryModal.walkover} W.O./ret., ${groupOutcomeSummaryModal.suspended} suspendidos, ${groupOutcomeSummaryModal.groupCount} grupos. Clasificación: ${eliminationPreviewModal.direct.length} directos, ${eliminationPreviewModal.repechaje.length} repechaje, ${eliminationPreviewModal.eliminated.length} eliminados. Recálculo: ${rec.ok ? 'ok' : 'falló'}.`,
          });
          setToast({
            text: rec.ok
              ? isMasters1000
                ? 'Fase de grupos confirmada. Tablas actualizadas; ya podés armar las semifinales en Eliminación.'
                : 'Fase de grupos confirmada. Tablas y clasificación actualizadas; ya podés armar la eliminación.'
              : 'Fase de grupos confirmada, pero el recálculo falló. Revisá consistencia de datos.',
            variant: rec.ok ? 'success' : 'error',
          });
          window.setTimeout(() => setToast(null), rec.ok ? 5200 : 6500);
          return true;
        }}
      />

      <AdminConfirmDialog
        open={unlockGroupStageOpen}
        variant="danger"
        title="Desbloquear fase de grupos"
        description={
          <p className="text-sm leading-relaxed text-[#616f89] dark:text-gray-400">
            Vas a permitir de nuevo editar los resultados de la fase de grupos. Si ya armaste la eliminación, revisá el cuadro
            si cambiás un marcador de grupos y volvé a recalcular el torneo.
          </p>
        }
        confirmLabel="Desbloquear grupos"
        cancelLabel="Cancelar"
        onClose={() => setUnlockGroupStageOpen(false)}
        onConfirm={() => {
          if (!onGroupStageStatusChange) {
            setUnlockGroupStageOpen(false);
            return true;
          }
          onGroupStageStatusChange('open');
          const tn = getTournamentById(tournamentId)?.name?.trim() || tournamentId;
          appendAdminAuditEntry({
            action: 'grupos_fase_desbloqueada',
            actionLabel: auditActionLabel('grupos_fase_desbloqueada'),
            tournamentId,
            tournamentName: tn,
            league: leagueNum,
            detail: 'Se habilitó de nuevo la edición de resultados de fixture de grupos.',
          });
          setToast({
            text: 'Fase de grupos desbloqueada. Podés editar los resultados de fixture.',
            variant: 'success',
          });
          window.setTimeout(() => setToast(null), 4500);
          return true;
        }}
      />

      <AdminConfirmDialog
        open={saveAllOpen}
        panelClassName="max-w-xl"
        title="Confirmar guardado masivo"
        description={
          <SaveAllConfirmBody
            validLines={bulkPartition.valid.map((v) => v.line)}
            invalidItems={bulkPartition.invalid}
            blockingMessage={saveAllModalError}
          />
        }
        confirmLabel="Confirmar guardado"
        cancelLabel="Cancelar"
        variant="default"
        onClose={() => setSaveAllOpen(false)}
        onConfirm={() => saveAllDirty()}
      />

      <AdminConfirmDialog
        open={recalcOpen}
        title="Recalcular torneo"
        description={
          <p className="text-sm text-[#616f89] dark:text-gray-400">
            Esto recalculará tablas, clasificación, ranking, perfiles y datos públicos con los resultados guardados.
            ¿Querés continuar?
          </p>
        }
        confirmLabel="Recalcular torneo"
        cancelLabel="Cancelar"
        onClose={() => setRecalcOpen(false)}
        onConfirm={() => {
          const rec = recalculateTournament({ tournamentId, league: leagueNum });
          setRecalcOpen(false);
          if (rec.ok) {
            appendAdminAuditEntry({
              action: 'tabla_recalculada_manual',
              actionLabel: auditActionLabel('tabla_recalculada_manual'),
              tournamentId,
              tournamentName: getTournamentById(tournamentId)?.name?.trim() || tournamentId,
              league: leagueNum,
              detail: 'Recálculo manual desde Resultados (motor central + refresco de datos derivados).',
            });
            setToast({ text: RECALC_OK_MSG, variant: 'success' });
            window.setTimeout(() => setToast(null), 4500);
          } else {
            setToast({ text: RECALC_FAIL_MSG, variant: 'error' });
            window.setTimeout(() => setToast(null), 6500);
          }
        }}
      />
    </div>
  );
}

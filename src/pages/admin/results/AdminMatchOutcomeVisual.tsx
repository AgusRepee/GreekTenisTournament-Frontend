import type { MatchInput } from '@/types/tennisResults';
import { isColumnScoreValid, parseScoreStringToCells, type ScoreCells } from '@/lib/tennis/adminScoreValidation';
import { parseMatchScore } from '@/lib/tennis/matchStatsEngine';

const SET_LABELS = ['Set 1', 'Set 2', 'ST'] as const;

const cellReadonly =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-md border text-center text-sm font-bold tabular-nums sm:h-12 sm:w-12 sm:text-base';

export function AdminGanadorBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex w-fit max-w-full shrink-0 items-center rounded-md bg-[color:var(--color-torneo)] px-2 py-0.5 text-[9px] font-black uppercase leading-tight tracking-wider text-white shadow-sm sm:text-[10px] ${className}`}
    >
      GANADOR
    </span>
  );
}

function winnerForColumn(cells: ScoreCells, col: 0 | 1 | 2): 'a' | 'b' | null {
  if (!isColumnScoreValid(cells, col)) return null;
  const sa = Number(cells.a[col]?.trim() ?? '');
  const sb = Number(cells.b[col]?.trim() ?? '');
  if (sa === sb) return null;
  return sa > sb ? 'a' : 'b';
}

function VisualSetCells({ cells, row }: { cells: ScoreCells; row: 'a' | 'b' }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {([0, 1, 2] as const).map((i) => {
        const v = (row === 'a' ? cells.a[i] : cells.b[i])?.trim() ?? '';
        const colWin = winnerForColumn(cells, i);
        const wonHere = colWin === row;
        const lostHere = colWin != null && colWin !== row && v !== '';
        const tone = !v
          ? 'border-gray-200/80 bg-gray-100/60 text-gray-400 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-500'
          : wonHere
            ? 'admin-match-player-winner text-[#111318] dark:text-white'
            : lostHere
              ? 'admin-match-player-loser text-[#616f89] dark:text-gray-400'
              : 'border-gray-200/90 bg-white text-[#111318] dark:border-gray-600 dark:bg-gray-900 dark:text-white';
        return (
          <div key={i} className={`${cellReadonly} ${tone}`} aria-label={`${SET_LABELS[i]}: ${v || '—'}`}>
            {v || '—'}
          </div>
        );
      })}
    </div>
  );
}

export type OutcomeVisualVariant = 'played' | 'walkover' | 'suspendido';

/** Hay resultado persistido para mostrar en modo lectura (incluye suspendido). */
export function hasSavedViewableOutcome(stored: MatchInput | undefined): boolean {
  if (!stored) return false;
  if (stored.status === 'suspended') return true;
  return (
    (stored.status === 'played' && Boolean(stored.score?.trim())) ||
    stored.status === 'walkover' ||
    stored.status === 'retired'
  );
}

export function outcomeVisualVariant(stored: MatchInput): OutcomeVisualVariant {
  if (stored.status === 'suspended') return 'suspendido';
  if (stored.status === 'walkover' || stored.status === 'retired') return 'walkover';
  return 'played';
}

/** Lado ganador guardado (marcador completo o W.O.). */
export function winnerSideFromStoredStrict(stored: MatchInput | undefined): 'a' | 'b' | null {
  if (!stored) return null;
  if (stored.status === 'suspended') return null;
  if (stored.status === 'walkover' || stored.status === 'retired') {
    return (stored.score ?? 'A').toUpperCase() === 'B' ? 'b' : 'a';
  }
  if (stored.status !== 'played' || !stored.score?.trim()) return null;
  try {
    return parseMatchScore(stored.score).winner === 'A' ? 'a' : 'b';
  } catch {
    return null;
  }
}

function playerBoxBase(winner: boolean, neutral: boolean) {
  const base =
    'flex min-h-[3rem] min-w-0 flex-1 flex-col gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold sm:flex-row sm:items-center sm:justify-between';
  if (neutral) return `${base} admin-match-player-loser text-[#111318] dark:text-gray-200`;
  if (winner) return `${base} admin-match-player-winner text-[#111318] dark:text-white`;
  return `${base} admin-match-player-loser font-medium text-[#616f89] dark:text-gray-400`;
}

type Props = {
  playerA: string;
  playerB: string;
  stored: MatchInput;
  /** Si existe, se usa para el tablero; si no, se parsea desde stored.score */
  cells?: ScoreCells | null;
  /** Etiqueta de estado arriba a la derecha del bloque de marcador (ej. JUGADO, CARGADO) */
  statusRightLabel: string;
  /** Clases extra del contenedor */
  className?: string;
  /** Ajuste visual para Fechas: compacta solo la tarjeta de jugado. */
  playedCompact?: boolean;
};

/**
 * Bloque solo lectura: jugadores (con GANADOR), columnas de sets a la derecha, estado.
 * Misma semántica visual en Fechas y Resultados.
 */
export function AdminMatchOutcomeVisual({
  playerA,
  playerB,
  stored,
  cells: cellsProp,
  statusRightLabel,
  className = '',
  playedCompact = false,
}: Props) {
  const variant = outcomeVisualVariant(stored);
  const win = winnerSideFromStoredStrict(stored);

  const cells =
    cellsProp ??
    (variant === 'played' && stored.score?.trim() ? parseScoreStringToCells(stored.score) : null);

  let shortSummary = '';
  if (variant === 'played' && cells) {
    try {
      const p = parseMatchScore(stored.score ?? '');
      shortSummary = `Resultado: ${p.setsWonA}-${p.setsWonB}`;
    } catch {
      shortSummary = '';
    }
  }

  if (variant === 'suspendido') {
    return (
      <div className={`flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-between sm:gap-4 ${className}`}>
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-[55%]">
          <div className={playerBoxBase(false, true)}>
            <span className="truncate" title={playerA}>
              {playerA}
            </span>
          </div>
          <div className={playerBoxBase(false, true)}>
            <span className="truncate" title={playerB}>
              {playerB}
            </span>
          </div>
          <p className="text-xs font-medium text-violet-800 dark:text-violet-200">Partido suspendido (sin ganador).</p>
        </div>
        <div className="flex flex-col items-end gap-2 sm:justify-between">
          <span className="inline-flex rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-violet-950 dark:text-violet-100">
            {statusRightLabel}
          </span>
          <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 px-4 py-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">Marcador</p>
            <p className="text-sm font-black text-violet-900 dark:text-violet-100">—</p>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'walkover') {
    const wa = win === 'a';
    const wb = win === 'b';
    const concedingName = win === 'a' ? playerB : win === 'b' ? playerA : '';
    return (
      <div className={`flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-between sm:gap-4 ${className}`}>
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-[55%]">
          <div className={playerBoxBase(wa, false)}>
            <span className="min-w-0 truncate" title={playerA}>
              {playerA}
            </span>
            {wa ? <AdminGanadorBadge /> : null}
          </div>
          <div className={playerBoxBase(wb, false)}>
            <span className="min-w-0 truncate" title={playerB}>
              {playerB}
            </span>
            {wb ? <AdminGanadorBadge /> : null}
          </div>
          {concedingName ? (
            <p className="text-[11px] font-medium text-rose-800/95 dark:text-rose-200/90">
              <span className="font-bold">{concedingName}</span> no se presentó (W.O.).
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2 sm:justify-between">
          <span className="inline-flex rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-rose-950 dark:text-rose-100">
            {statusRightLabel}
          </span>
          <div className="flex h-[5.5rem] min-w-[6.5rem] flex-col items-center justify-center rounded-lg border-2 border-rose-400/50 bg-rose-50/90 px-4 dark:border-rose-700/50 dark:bg-rose-950/35 sm:h-24">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-200">Marcador</p>
            <p className="text-lg font-black text-rose-950 dark:text-rose-50">W.O.</p>
          </div>
        </div>
      </div>
    );
  }

  /* played */
  const validCells = cells ?? { a: ['', '', ''], b: ['', '', ''] };
  if (playedCompact) {
    const compactCellClass =
      'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-center text-xs font-bold tabular-nums sm:h-9 sm:w-9 sm:text-sm';
    const compactSetRow = (row: 'a' | 'b') => (
      <div className="flex items-center gap-1.5">
        {([0, 1, 2] as const).map((i) => {
          const v = (row === 'a' ? validCells.a[i] : validCells.b[i])?.trim() ?? '';
          const colWin = winnerForColumn(validCells, i);
          const wonHere = colWin === row;
          const lostHere = colWin != null && colWin !== row && v !== '';
          const tone = !v
            ? 'border-gray-200/80 bg-gray-100/60 text-gray-400 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-500'
            : wonHere
              ? 'admin-match-player-winner text-[#111318] dark:text-white'
              : lostHere
                ? 'admin-match-player-loser text-[#616f89] dark:text-gray-400'
                : 'border-gray-200/90 bg-white text-[#111318] dark:border-gray-600 dark:bg-gray-900 dark:text-white';
          return (
            <div key={`${row}-${i}`} className={`${compactCellClass} ${tone}`} aria-label={`${SET_LABELS[i]}: ${v || '—'}`}>
              {v || '—'}
            </div>
          );
        })}
      </div>
    );
    return (
      <div className={`flex items-start justify-between gap-3 ${className}`}>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="admin-result-pill-complete inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide">
              {statusRightLabel}
            </span>
            {shortSummary ? (
              <span className="text-[10px] font-semibold tabular-nums text-[#616f89] dark:text-gray-400">{shortSummary}</span>
            ) : null}
          </div>
          <div className="flex min-h-[2.25rem] items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 admin-match-player-winner text-[#111318] dark:text-white">
            <span className="min-w-0 truncate text-sm font-semibold" title={playerA}>
              {playerA}
            </span>
            {win === 'a' ? <AdminGanadorBadge className="shrink-0" /> : null}
          </div>
          <div className="flex min-h-[2.25rem] items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 admin-match-player-loser font-medium text-[#616f89] dark:text-gray-400">
            <span className="min-w-0 truncate text-sm font-semibold" title={playerB}>
              {playerB}
            </span>
            {win === 'b' ? <AdminGanadorBadge className="shrink-0" /> : null}
          </div>
        </div>
        <div className="admin-readonly-panel shrink-0 rounded-md p-1.5 sm:p-2">
          <div className="mb-1 flex justify-end gap-1.5">
            {SET_LABELS.map((lab) => (
              <span
                key={lab}
                className="flex h-4 w-8 items-center justify-center text-center text-[8px] font-bold uppercase leading-none text-[#616f89] dark:text-gray-500 sm:w-9 sm:text-[9px]"
              >
                {lab}
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-end">{compactSetRow('a')}</div>
            <div className="flex justify-end">{compactSetRow('b')}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 ${className}`}>
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-[52%]">
        <div className={playerBoxBase(win === 'a', false)}>
          <span className="min-w-0 truncate" title={playerA}>
            {playerA}
          </span>
          {win === 'a' ? <AdminGanadorBadge /> : null}
        </div>
        <div className={playerBoxBase(win === 'b', false)}>
          <span className="min-w-0 truncate" title={playerB}>
            {playerB}
          </span>
          {win === 'b' ? <AdminGanadorBadge /> : null}
        </div>
        {shortSummary ? (
          <p className="text-xs font-semibold tabular-nums text-[#616f89] dark:text-gray-400">{shortSummary}</p>
        ) : null}
      </div>
      <div className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:w-auto sm:max-w-[48%] sm:items-end">
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <span className="admin-result-pill-complete inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide">
            {statusRightLabel}
          </span>
        </div>
        <div className="admin-readonly-panel w-full max-w-md rounded-lg p-2 sm:p-3">
          <div className="mb-2 flex justify-end gap-2">
            {SET_LABELS.map((lab) => (
              <span
                key={lab}
                className="flex h-5 w-11 shrink-0 items-center justify-center text-center text-[9px] font-bold uppercase leading-tight text-[#616f89] dark:text-gray-500 sm:w-12 sm:text-[10px]"
              >
                {lab}
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-end">
              <VisualSetCells cells={validCells} row="a" />
            </div>
            <div className="flex justify-end">
              <VisualSetCells cells={validCells} row="b" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

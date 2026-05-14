import {
  buildScoreStringIfValid,
  cloneGrid,
  columnErrorForCells,
  isColumnScoreValid,
  type ScoreCells,
} from '@/lib/tennis/adminScoreValidation';

/** Solo dígitos; sets 1–2: un carácter (0–9, validación 0–7 en motor); ST: hasta 2 dígitos. */
export function normalizeSetCellInput(col: 0 | 1 | 2, raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (col === 2) return d.slice(0, 2);
  return d.slice(0, 1);
}

function winnerRowForSet(cells: ScoreCells, col: 0 | 1 | 2): 'a' | 'b' | null {
  if (!isColumnScoreValid(cells, col)) return null;
  const sa = cells.a[col]?.trim() ?? '';
  const sb = cells.b[col]?.trim() ?? '';
  const na = Number(sa);
  const nb = Number(sb);
  if (na === nb) return null;
  return na > nb ? 'a' : 'b';
}

function matchWinnerFromCells(cells: ScoreCells): 'a' | 'b' | null {
  let wonA = 0;
  let wonB = 0;
  for (const i of [0, 1, 2] as const) {
    const w = winnerRowForSet(cells, i);
    if (w === 'a') wonA++;
    else if (w === 'b') wonB++;
  }
  if (wonA >= 2) return 'a';
  if (wonB >= 2) return 'b';
  return null;
}

const ROW_WINNER =
  'border shadow-inner bg-[rgba(var(--color-torneo-rgb)/0.1)] border-[rgba(var(--color-torneo-rgb)/0.42)] dark:bg-[rgba(var(--color-torneo-rgb)/0.14)]';
const CELL_SET_WON =
  'bg-[rgba(var(--color-torneo-rgb)/0.22)] border-[rgba(var(--color-torneo-rgb)/0.55)] text-[#111318] dark:text-white';
/** Set ganado por el perdedor del partido: visible pero con menos peso que los sets del ganador del match. */
const CELL_SET_WON_LOSER_ROW =
  'bg-[rgba(var(--color-torneo-rgb)/0.09)] border-[rgba(var(--color-torneo-rgb)/0.38)] text-[#111318] dark:text-gray-100 ring-1 ring-[rgba(var(--color-torneo-rgb)/0.12)]';
const CELL_SET_LOST = 'bg-slate-200/95 dark:bg-slate-700/90 border-slate-400 dark:border-slate-500 text-[#111318] dark:text-slate-100';
const CELL_NEUTRAL =
  'border-gray-200/90 dark:border-gray-600 bg-[#f4f6fa] dark:bg-gray-800 text-[#111318] dark:text-white';
const CELL_INVALID = 'ring-2 ring-red-500 border-red-500';

function GanadorBadge() {
  return (
    <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-md bg-[color:var(--color-torneo)] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm sm:text-xs">
      GANADOR
    </span>
  );
}

function RankingPtsWin({ points }: { points: number }) {
  return (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-md border border-[rgba(var(--color-torneo-rgb)/0.38)] bg-[rgba(var(--color-torneo-rgb)/0.1)] px-2 py-0.5 text-[10px] font-bold tabular-nums text-[color:var(--color-torneo)] sm:text-xs dark:text-white">
      +{points} pts
    </span>
  );
}

function RankingPtsLoss({ points }: { points: number }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-md border border-slate-400/80 dark:border-slate-600 bg-slate-100/90 dark:bg-slate-800/80 px-2 py-0.5 text-[10px] sm:text-xs font-semibold tabular-nums text-[#5c6578] dark:text-gray-400 whitespace-nowrap">
      +{points} pts
    </span>
  );
}

const cellShell =
  'admin-score-cell h-12 w-12 rounded-md border py-0 px-0.5 text-center text-base font-semibold tabular-nums focus:outline-none transition-colors sm:h-[3.25rem] sm:w-[3.25rem] sm:text-lg';
/** Solo lectura: flex centra el número; `<input>`: `leading` = altura del recuadro (evita dígitos arriba). */
const cellAlignPresentation = 'flex items-center justify-center';
const cellAlignInput = 'leading-[3rem] sm:leading-[3.25rem]';

export interface AdminMatchScoreGridProps {
  playerA: string;
  playerB: string;
  cells: ScoreCells;
  onChange: (next: ScoreCells) => void;
  locked?: boolean;
  /** Con `locked`: mismo relieve que la carga editable (ganador, sets ganados). */
  highlightSavedOutcome?: boolean;
  /** W.O. / retiro sin celdas numéricas: ganador desde persistido. */
  persistedWinnerSide?: 'a' | 'b' | null;
  /** Con `locked`: muestra celdas de solo lectura (no inputs). */
  readOnlyPresentation?: boolean;
  /**
   * Puntos ranking por este partido (solo fase grupos / Greek 500).
   * `null`: no mostrar badges (p. ej. eliminatoria KO o interzonal).
   */
  rankingPointsPreview?: { winnerPts: number; loserPts: number } | null;
}

/**
 * Entrada estructurada por sets (máx. 3 columnas). Sets 1–2: un dígito típico 0–7; ST: super tie-break.
 */
export function AdminMatchScoreGrid({
  playerA,
  playerB,
  cells,
  onChange,
  locked = false,
  highlightSavedOutcome = false,
  persistedWinnerSide = null,
  readOnlyPresentation = false,
  rankingPointsPreview = null,
}: AdminMatchScoreGridProps) {
  const presentationOnly = !!(locked && readOnlyPresentation);

  const setCell = (row: 'a' | 'b', idx: 0 | 1 | 2, raw: string) => {
    if (locked) return;
    const n = normalizeSetCellInput(idx, raw);
    const next = cloneGrid(cells);
    next[row][idx] = n;
    onChange(next);
  };

  const inferredWinner = matchWinnerFromCells(cells);
  const matchWinner = highlightSavedOutcome ? (persistedWinnerSide ?? inferredWinner) : inferredWinner;

  /** Relieve tipo “carga”: solo si editable o modo lectura con resultado destacado */
  const showWinnerChrome = !locked || highlightSavedOutcome;
  const showRichCells = !locked || highlightSavedOutcome;

  const setLabels = ['Set 1', 'Set 2', 'ST'] as const;
  const nameCol = 'min-w-0 flex-1 flex flex-row flex-wrap items-center gap-2';

  const colErr = ([0, 1, 2] as const).map((i) => columnErrorForCells(cells, i));
  const firstErr = colErr.find((e) => e != null && e !== '');
  const hasAnyCell = [0, 1, 2].some((i) => (cells.a[i]?.trim() ?? '') !== '' || (cells.b[i]?.trim() ?? '') !== '');
  const matchBuilt = buildScoreStringIfValid(cells);
  const matchLevelErr =
    !locked && !presentationOnly && hasAnyCell && !firstErr && matchBuilt.ok === false ? matchBuilt.reason : null;

  const renderInputs = (row: 'a' | 'b') =>
    ([0, 1, 2] as const).map((i) => {
      const win = winnerRowForSet(cells, i);
      const isWin = row === 'a' ? win === 'a' : win === 'b';
      const invalidCol = colErr[i] != null && colErr[i] !== '';
      const sa = cells.a[i]?.trim() ?? '';
      const sb = cells.b[i]?.trim() ?? '';
      const hasAny = sa !== '' || sb !== '';
      const wonSetStyle =
        highlightSavedOutcome && matchWinner != null
          ? row === matchWinner
            ? `${cellShell} ${CELL_SET_WON} shadow-sm`
            : `${cellShell} ${CELL_SET_WON_LOSER_ROW}`
          : `${cellShell} ${CELL_SET_WON} shadow-sm`;
      const cls = !showRichCells
        ? `${cellShell} border-gray-300/90 dark:border-gray-600 bg-gray-200/90 dark:bg-gray-700/80 text-[#111318] dark:text-gray-200 cursor-not-allowed`
        : invalidCol && hasAny
          ? `${cellShell} ${CELL_INVALID} bg-white dark:bg-gray-900`
          : isWin
            ? wonSetStyle
            : win != null && !isWin
              ? `${cellShell} ${CELL_SET_LOST}`
              : `${cellShell} ${CELL_NEUTRAL}`;
      const alignedCls = `${cls} ${presentationOnly ? cellAlignPresentation : cellAlignInput}`;
      const val = row === 'a' ? cells.a[i] : cells.b[i];
      const label = `${row === 'a' ? playerA : playerB}, ${setLabels[i]}`;
      if (presentationOnly) {
        return (
          <div key={`${row}-${i}`} className={alignedCls} role="img" aria-label={`${label}: ${val || '—'}`}>
            {val || ''}
          </div>
        );
      }
      return (
        <input
          key={`${row}-${i}`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          disabled={locked}
          className={alignedCls}
          value={val}
          onChange={(e) => setCell(row, i, e.target.value)}
          maxLength={i === 2 ? 2 : 1}
          aria-invalid={!locked && invalidCol}
          aria-label={label}
        />
      );
    });

  const scoreBlock = 'flex shrink-0 gap-2 items-center';

  return (
    <div
      className={`flex flex-col gap-2 w-full min-w-0 ${locked && !highlightSavedOutcome ? 'rounded-lg bg-gray-50/90 dark:bg-gray-900/45 p-2 sm:p-3 border border-gray-200/80 dark:border-gray-600/50' : ''}`}
    >
      <div className="flex w-full items-end justify-between gap-4">
        <div className="min-w-0 flex-1" aria-hidden />
        <div className={`${scoreBlock}`}>
          {([0, 1, 2] as const).map((i) => (
            <span
              key={`lab-${i}`}
              className="w-12 text-center text-[11px] font-semibold text-[#616f89] dark:text-gray-500 leading-tight sm:w-[3.25rem] sm:text-xs"
            >
              {setLabels[i]}
            </span>
          ))}
        </div>
      </div>

      <div
        className={`flex w-full items-center justify-between gap-4 rounded-xl px-1 py-2 sm:px-2 transition-colors ${
          matchWinner === 'a' && showWinnerChrome ? ROW_WINNER : ''
        }`}
      >
        <div className={nameCol}>
          <span className="min-w-0 flex-1 basis-0 break-words font-semibold leading-snug text-sm text-[#111318] dark:text-white" title={playerA}>
            {playerA}
          </span>
          {matchWinner === 'a' && showWinnerChrome ? (
            <>
              <GanadorBadge />
              {rankingPointsPreview ? <RankingPtsWin points={rankingPointsPreview.winnerPts} /> : null}
            </>
          ) : null}
          {matchWinner === 'b' && showWinnerChrome && rankingPointsPreview ? (
            <RankingPtsLoss points={rankingPointsPreview.loserPts} />
          ) : null}
        </div>
        <div className={scoreBlock}>{renderInputs('a')}</div>
      </div>

      <div
        className={`flex w-full items-center justify-between gap-4 rounded-xl px-1 py-2 sm:px-2 transition-colors ${
          matchWinner === 'b' && showWinnerChrome ? ROW_WINNER : ''
        }`}
      >
        <div className={nameCol}>
          <span className="min-w-0 flex-1 basis-0 break-words font-semibold leading-snug text-sm text-[#111318] dark:text-white" title={playerB}>
            {playerB}
          </span>
          {matchWinner === 'b' && showWinnerChrome ? (
            <>
              <GanadorBadge />
              {rankingPointsPreview ? <RankingPtsWin points={rankingPointsPreview.winnerPts} /> : null}
            </>
          ) : null}
          {matchWinner === 'a' && showWinnerChrome && rankingPointsPreview ? (
            <RankingPtsLoss points={rankingPointsPreview.loserPts} />
          ) : null}
        </div>
        <div className={scoreBlock}>{renderInputs('b')}</div>
      </div>

      {!locked && !presentationOnly && (firstErr || matchLevelErr) ? (
        <p className="text-xs font-medium text-red-600 dark:text-red-400 text-right sm:text-left" role="alert">
          {firstErr ?? matchLevelErr}
        </p>
      ) : null}
    </div>
  );
}

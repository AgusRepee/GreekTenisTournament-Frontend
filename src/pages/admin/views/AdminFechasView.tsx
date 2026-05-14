import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar } from 'lucide-react';
import type { Player } from '@/lib/mockData';
import { getTournamentById } from '@/lib/mockData';
import { useClubData } from '@/lib/clubDataStore';
import { effectiveTournamentCatalogType } from '@/lib/tennis/rankingPointsGreek500';
import { buildKnockoutAdminEntries, type KnockoutStage } from '@/lib/tennis/adminKnockoutCatalog';
import { cleanPlayerName, matchInputDedupeKey } from '@/lib/tennis/matchDedupe';
import { formatVsDisplay, parseLibre, parseVsLine } from '@/lib/tennis/fixtureLineParse';
import type { LigaNumKey } from '@/lib/tennis/loadLigasFromDocs';
import type { LigaTemplate, MatchInput } from '@/types/tennisResults';
import { parseScoreStringToCells } from '@/lib/tennis/adminScoreValidation';
import {
  matchPresentationBadgeLabel,
  matchPresentationPrimaryBadge,
  type MatchDisplayPhase,
} from '@/lib/tennis/matchDisplayState';
import { getAdminMatchUiStatus } from '../adminMatchUi';
import { AdminGanadorBadge, winnerSideFromStoredStrict } from '../results/AdminMatchOutcomeVisual';
import { buildSchedulableMatches } from '@/lib/tennis/schedulableMatchCatalog';
import {
  type MatchScheduleEntry,
  type MatchScheduleStatus,
  useMatchSchedules,
  upsertMatchSchedule,
  confirmMatchSchedules,
} from '@/lib/tennis/matchScheduleStore';
import {
  matchScheduleHasDateTimeForPlayedResult,
  normalPlayedMatchRequiresSchedule,
} from '@/lib/tennis/matchScheduleForResultGuard';
import { appendAdminAuditEntry, auditActionLabel } from '@/lib/admin/tournamentAuditLog';
import { useOptionalAdminTournamentSeed } from '../AdminTournamentSeedContext';
import { AdminGlobalModal } from '../AdminGlobalModal';

type Props = {
  tournamentId: string;
  ligaNum: LigaNumKey;
  fechasList: LigaTemplate['fechas'];
  resultsByKey: Map<string, MatchInput>;
  players: Player[];
  /** Fase de grupos confirmada en admin (mensajes vacíos en solapas KO). */
  groupStageOfficiallyConfirmed?: boolean;
  readOnly?: boolean;
  onScheduleConfirmPendingCount?: (count: number) => void;
  /** Desde Resultados: abrir modal de programación y ubicar la fecha correcta. */
  focusScheduleDedupeKey?: string | null;
  onConsumedFocusScheduleDedupeKey?: () => void;
};

type Row = {
  key: string;
  line: string;
  group: string;
  status: MatchDisplayPhase;
  left: string;
  right: string;
};

type AgendaModalMode = 'active' | 'clear' | 'postponed' | 'cancelled' | 'suspended';

type ModalState = {
  dedupeKey: string;
  date: string;
  time: string;
  note: string;
  agendaMode: AgendaModalMode;
} | null;

type ConfirmDatesModal = { keys: string[] } | null;

function formatScheduleDateShort(isoDate: string): string {
  const t = isoDate.trim();
  const d = /^\d{4}-\d{2}-\d{2}$/.test(t) ? new Date(`${t}T12:00:00`) : new Date(t);
  if (!Number.isFinite(d.getTime())) return t || '—';
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

function normalizeText(value: string): string | undefined {
  const v = value.trim();
  return v.length > 0 ? v : undefined;
}

function ballCarrierFromFixtureLine(line: string): string | undefined {
  const vs = parseVsLine(line);
  if (!vs) return undefined;
  if (/\(P\)/i.test(vs.rawLeft)) return cleanPlayerName(vs.rawLeft);
  if (/\(P\)/i.test(vs.rawRight)) return cleanPlayerName(vs.rawRight);
  return undefined;
}

function fechasBadge(phase: MatchDisplayPhase): { label: string; dot: string; pillClass?: string } {
  const b = matchPresentationPrimaryBadge({ phase, showEditedChip: false });
  return { label: b.label, dot: b.dotClass, pillClass: b.pillTailClasses };
}

function hasStoredOutcome(stored: MatchInput | undefined, status: MatchDisplayPhase): boolean {
  if (!stored) return false;
  if (stored.status === 'suspended') return true;
  return status !== 'pending';
}

function statusLabelFechas(phase: MatchDisplayPhase): string {
  return matchPresentationBadgeLabel({ phase, showEditedChip: false });
}

function setValues(stored: MatchInput | undefined): { a: [string, string, string]; b: [string, string, string] } {
  if (!stored?.score?.trim() || stored.status !== 'played') {
    return { a: ['-', '-', '-'], b: ['-', '-', '-'] };
  }
  const parsed = parseScoreStringToCells(stored.score.trim());
  if (!parsed) return { a: ['-', '-', '-'], b: ['-', '-', '-'] };
  return {
    a: [parsed.a[0] || '-', parsed.a[1] || '-', parsed.a[2] || '-'],
    b: [parsed.b[0] || '-', parsed.b[1] || '-', parsed.b[2] || '-'],
  };
}

function buildRowsForFecha(
  tournamentId: string,
  fecha: LigaTemplate['fechas'][number],
  num: number,
  resultsByKey: Map<string, MatchInput>,
): Row[] {
  const rows: Row[] = [];
  if (fecha.grupos) {
    for (const [gk, rawLines] of Object.entries(fecha.grupos)) {
      for (const line of rawLines as string[]) {
        const libre = parseLibre(line);
        if (libre) {
          rows.push({
            key: `libre-${num}-${gk}-${line}`,
            line,
            group: gk,
            status: 'pending',
            left: 'Libre',
            right: libre,
          });
          continue;
        }
        const vs = parseVsLine(line);
        if (!vs) {
          rows.push({
            key: `raw-${num}-${line}`,
            line,
            group: gk,
            status: 'pending',
            left: formatVsDisplay(line),
            right: '',
          });
          continue;
        }
        const dedupe = matchInputDedupeKey({
          tournamentId,
          group: gk,
          round: num,
          playerA: cleanPlayerName(vs.a),
          playerB: cleanPlayerName(vs.b),
        });
        const stored = resultsByKey.get(dedupe);
        rows.push({
          key: dedupe,
          line,
          group: gk,
          status: getAdminMatchUiStatus(stored),
          left: cleanPlayerName(vs.rawLeft),
          right: cleanPlayerName(vs.rawRight),
        });
      }
    }
  }
  if (Array.isArray(fecha.partidos)) {
    for (const line of fecha.partidos) {
      const vs = parseVsLine(line);
      if (!vs) {
        rows.push({
          key: `iz-raw-${num}-${line}`,
          line,
          group: 'Interzonal',
          status: 'pending',
          left: formatVsDisplay(line),
          right: '',
        });
        continue;
      }
      const dedupe = matchInputDedupeKey({
        tournamentId,
        group: 'Interzonal',
        round: num,
        playerA: cleanPlayerName(vs.a),
        playerB: cleanPlayerName(vs.b),
      });
      const stored = resultsByKey.get(dedupe);
      rows.push({
        key: dedupe,
        line,
        group: 'Interzonal',
        status: getAdminMatchUiStatus(stored),
        left: cleanPlayerName(vs.rawLeft),
        right: cleanPlayerName(vs.rawRight),
      });
    }
  }
  return rows;
}

function isScheduleableRowKey(key: string): boolean {
  return !key.startsWith('libre-') && !key.startsWith('raw-') && !key.startsWith('iz-raw-');
}

function koTabLabel(stage: KnockoutStage, _isMasters1000: boolean): string {
  if (stage === 'repechaje') return 'Repechaje';
  if (stage === 'octavos') return 'Octavos';
  if (stage === 'quarter') return 'Cuartos';
  if (stage === 'semi') return 'Semifinales';
  return 'Final';
}

const MSG_ELIM_NOT_CONFIRMED = 'No hay partidos todavía. No se terminó la fase de grupos.';
const MSG_PHASE_EMPTY = 'Todavía no hay partidos cargados para esta fase.';
const MSG_NO_REPECHAJE = 'No hay partidos de repechaje para esta liga.';

function koTabEmptyMessage(
  stage: KnockoutStage,
  anyKoMatches: boolean,
  groupStageConfirmed: boolean,
): string {
  if (!groupStageConfirmed) return MSG_ELIM_NOT_CONFIRMED;
  if (!anyKoMatches) {
    return MSG_PHASE_EMPTY;
  }
  if (stage === 'repechaje') return MSG_NO_REPECHAJE;
  return MSG_PHASE_EMPTY;
}

type ScheduleBlockVisual = 'empty' | 'pending' | 'published' | 'warn';

function scheduleBlockPresentation(sched: MatchScheduleEntry | undefined): {
  visual: ScheduleBlockVisual;
  line1: string;
  line2?: string;
  hint?: string;
} {
  if (!sched || sched.scheduleStatus === 'unscheduled') {
    return { visual: 'empty', line1: 'Sin programar' };
  }
  if (sched.scheduleStatus === 'postponed') {
    const slot = sched.date?.trim() && sched.time?.trim();
    return {
      visual: 'warn',
      line1: 'Postergado',
      line2: slot ? `${formatScheduleDateShort(sched.date!)} · ${sched.time}` : undefined,
    };
  }
  if (sched.scheduleStatus === 'cancelled') {
    return { visual: 'warn', line1: 'Cancelado' };
  }
  if (sched.scheduleStatus === 'suspended') {
    return { visual: 'warn', line1: 'Suspendido (agenda)' };
  }
  const hasSlot = !!(sched.date?.trim() && sched.time?.trim());
  if (sched.scheduleStatus === 'scheduled') {
    if (!hasSlot) return { visual: 'empty', line1: 'Sin programar' };
    return {
      visual: 'pending',
      line1: `${formatScheduleDateShort(sched.date!)} · ${sched.time}`,
      hint: 'Pendiente de confirmar',
    };
  }
  if ((sched.scheduleStatus === 'confirmed' || sched.scheduleStatus === 'rescheduled') && hasSlot) {
    return {
      visual: 'published',
      line1: `${formatScheduleDateShort(sched.date!)} · ${sched.time}`,
    };
  }
  return { visual: 'empty', line1: 'Sin programar' };
}

function scheduleBlockClass(visual: ScheduleBlockVisual): string {
  const base =
    'flex min-h-[5.75rem] w-full flex-col justify-center gap-1.5 rounded-xl border-2 px-3.5 py-3 text-left shadow-md ring-1 ring-black/[0.03] transition-colors dark:ring-white/[0.06]';
  if (visual === 'empty') {
    return `${base} border-dashed border-gray-400/70 bg-gradient-to-br from-[#eef1f6] to-[#e2e6ee] text-[#374151] dark:border-gray-500 dark:from-gray-800 dark:to-gray-900/90 dark:text-gray-100`;
  }
  if (visual === 'pending') {
    return `${base} border-amber-500/55 bg-amber-50/95 text-amber-950 shadow-amber-900/10 dark:border-amber-500/50 dark:bg-amber-950/40 dark:text-amber-50`;
  }
  if (visual === 'warn') {
    return `${base} border-amber-600/45 bg-amber-50/85 text-amber-950 dark:border-amber-600/50 dark:bg-amber-950/35 dark:text-amber-50`;
  }
  return `${base} border-[rgba(var(--color-torneo-rgb)/0.45)] bg-[rgba(var(--color-torneo-rgb)/0.16)] text-[#111318] shadow-[rgba(var(--color-torneo-rgb)/0.12)] dark:text-white`;
}

function FechasMatchArticle({
  r,
  resultsByKey,
  schedule,
  readOnly,
  showSchedule,
  onOpenSchedule,
}: {
  r: Row;
  resultsByKey: Map<string, MatchInput>;
  schedule?: MatchScheduleEntry;
  readOnly: boolean;
  showSchedule: boolean;
  onOpenSchedule: (dedupeKey: string) => void;
}) {
  const seedFmt = useOptionalAdminTournamentSeed();
  const leftDisp = seedFmt?.formatMatchSide(r.left) ?? r.left;
  const rightDisp = seedFmt?.formatMatchSide(r.right) ?? r.right;
  const badge = fechasBadge(r.status);
  const isLibre = r.left === 'Libre' || !r.right;
  const stored = !isLibre ? resultsByKey.get(r.key) : undefined;
  const showLoaded = Boolean(!isLibre && hasStoredOutcome(stored, r.status) && stored);
  const winner = winnerSideFromStoredStrict(stored);
  const sets = setValues(stored);
  const setWinnerSide = (idx: number): 'a' | 'b' | null => {
    const va = sets.a[idx];
    const vb = sets.b[idx];
    if (!va || !vb || va === '-' || vb === '-') return null;
    const na = Number(va);
    const nb = Number(vb);
    if (!Number.isFinite(na) || !Number.isFinite(nb) || na === nb) return null;
    return na > nb ? 'a' : 'b';
  };
  const playerRowClass = (side: 'a' | 'b') => {
    if (!showLoaded || r.status !== 'played') {
      return 'border-gray-200/90 bg-[#f4f6fa] text-[#111318] dark:border-gray-600 dark:bg-gray-800/80 dark:text-white';
    }
    return winner === side
      ? 'border-[rgba(var(--color-torneo-rgb)/0.65)] bg-white text-[#111318] shadow-sm ring-2 ring-[rgba(var(--color-torneo-rgb)/0.22)] dark:border-[rgba(var(--color-torneo-rgb)/0.55)] dark:bg-gray-900 dark:text-white'
      : 'admin-match-player-loser border-gray-200/90 text-[#616f89] dark:border-gray-600 dark:text-gray-400';
  };
  const pillBase =
    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-wide';
  const pillIdle =
    'border-gray-200/90 bg-white text-[#616f89] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300';
  const pillClassName = badge.pillClass ? `${pillBase} ${badge.pillClass}` : `${pillBase} ${pillIdle}`;

  const scheduleOutcomeMismatch =
    Boolean(stored) &&
    normalPlayedMatchRequiresSchedule(stored!) &&
    !matchScheduleHasDateTimeForPlayedResult(schedule);
  const schedPres =
    !isLibre && showSchedule
      ? scheduleOutcomeMismatch
        ? {
            visual: 'warn' as const,
            line1: 'Fecha requerida',
            line2: 'Resultado cargado sin fecha',
          }
        : scheduleBlockPresentation(schedule)
      : null;
  const schedClass = schedPres ? scheduleBlockClass(schedPres.visual) : '';

  return (
    <article className="rounded-lg border border-gray-200/90 bg-white/90 px-3 py-2.5 dark:border-gray-600/70 dark:bg-gray-950/40 md:px-3.5 md:py-3">
      {isLibre ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-gray-300/80 bg-gray-50/70 px-3 py-2 dark:border-gray-600 dark:bg-gray-900/35">
          <p className="text-sm font-medium text-[#616f89] dark:text-gray-400">
            Libre:{' '}
            <span className="font-semibold text-[#111318] dark:text-gray-200">
              {seedFmt?.formatMatchSide(r.right || r.line) ?? (r.right || r.line)}
            </span>
          </p>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#9ca3b7] dark:text-gray-500">Sin partido</span>
        </div>
      ) : (
        <div className="flex w-full flex-col gap-3 md:flex-row md:items-stretch md:gap-3">
          <div className="flex min-h-[5.75rem] min-w-0 flex-col justify-center gap-2 md:min-w-0 md:flex-1 md:basis-0">
            <div
              className={`flex min-h-[2.65rem] flex-1 items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm font-semibold leading-snug ${playerRowClass('a')}`}
            >
              <span className="min-w-0 flex-1 break-words text-left">{leftDisp}</span>
              {winner === 'a' ? <AdminGanadorBadge className="shrink-0 self-center" /> : null}
            </div>
            <div
              className={`flex min-h-[2.65rem] flex-1 items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm font-semibold leading-snug ${playerRowClass('b')}`}
            >
              <span className="min-w-0 flex-1 break-words text-left">{rightDisp}</span>
              {winner === 'b' ? <AdminGanadorBadge className="shrink-0 self-center" /> : null}
            </div>
          </div>
          <div className="flex min-h-[5.75rem] w-full shrink-0 items-center justify-center md:basis-[17%] md:w-[17%] md:min-w-[7.5rem] md:max-w-[9.5rem] md:self-stretch md:flex-none">
            <div className="grid shrink-0 grid-cols-3 gap-x-2 gap-y-2">
              {sets.a.map((v, idx) => (
                <span
                  key={`${r.key}-a-${idx}`}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 text-sm font-bold tabular-nums md:h-11 md:w-11 md:text-[15px] ${
                    setWinnerSide(idx) === 'a'
                      ? 'border-[rgba(var(--color-torneo-rgb)/0.55)] bg-[rgba(var(--color-torneo-rgb)/0.12)] text-[#111318] dark:bg-[rgba(var(--color-torneo-rgb)/0.18)] dark:text-white'
                      : setWinnerSide(idx) === 'b'
                        ? 'border-gray-200/90 bg-[#f4f6fa] text-[#616f89] dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-400'
                        : 'border-gray-200/90 bg-[#f8f9fb] text-[#111318] dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                  }`}
                >
                  {v}
                </span>
              ))}
              {sets.b.map((v, idx) => (
                <span
                  key={`${r.key}-b-${idx}`}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 text-sm font-bold tabular-nums md:h-11 md:w-11 md:text-[15px] ${
                    setWinnerSide(idx) === 'b'
                      ? 'border-[rgba(var(--color-torneo-rgb)/0.55)] bg-[rgba(var(--color-torneo-rgb)/0.12)] text-[#111318] dark:bg-[rgba(var(--color-torneo-rgb)/0.18)] dark:text-white'
                      : setWinnerSide(idx) === 'a'
                        ? 'border-gray-200/90 bg-[#f4f6fa] text-[#616f89] dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-400'
                        : 'border-gray-200/90 bg-[#f8f9fb] text-[#111318] dark:border-gray-600 dark:bg-gray-900 dark:text-white'
                  }`}
                >
                  {v}
                </span>
              ))}
            </div>
          </div>
          {schedPres ? (
            <div className="flex min-w-0 items-stretch md:min-w-[11rem] md:max-w-[26%] md:basis-[24%] md:flex-none md:shrink">
              <button
                type="button"
                disabled={readOnly}
                onClick={() => !readOnly && onOpenSchedule(r.key)}
                className={`flex w-full min-w-0 ${readOnly ? 'cursor-default opacity-90' : 'cursor-pointer hover:brightness-[1.02] active:brightness-[0.98]'}`}
                aria-label="Programación del partido"
              >
                <span className={`${schedClass} w-full`}>
                  {schedPres.visual === 'empty' ? (
                    <>
                      <span className="text-base font-extrabold leading-snug tracking-tight text-[#111318] dark:text-white md:text-[17px]">
                        {schedPres.line1}
                      </span>
                      <span className="text-xs font-semibold leading-snug text-[#616f89] dark:text-gray-400 md:text-sm">
                        Tocá para programar
                      </span>
                    </>
                  ) : schedPres.visual === 'warn' ? (
                    <>
                      <span className="text-base font-bold leading-tight text-[#111318] dark:text-white md:text-[17px]">
                        {schedPres.line1}
                      </span>
                      {schedPres.line2 ? (
                        <span className="text-sm font-semibold leading-snug text-[#374151] dark:text-gray-200 md:text-[15px]">
                          {schedPres.line2}
                        </span>
                      ) : null}
                    </>
                  ) : schedPres.visual === 'pending' ? (
                    <>
                      {schedPres.hint ? (
                        <span className="text-xs font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200 md:text-[11px]">
                          {schedPres.hint}
                        </span>
                      ) : null}
                      <span className="text-base font-bold leading-snug text-[#111318] dark:text-white md:text-[17px]">
                        {schedPres.line1}
                      </span>
                      {schedPres.line2 ? (
                        <span className="text-sm font-semibold text-[#374151] dark:text-gray-300 md:text-[15px]">{schedPres.line2}</span>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <span className="text-base font-bold leading-snug text-[#111318] dark:text-white md:text-[17px]">
                        {schedPres.line1}
                      </span>
                      {schedPres.line2 ? (
                        <span className="text-sm font-semibold text-[#374151] dark:text-gray-300 md:text-[15px]">{schedPres.line2}</span>
                      ) : null}
                    </>
                  )}
                </span>
              </button>
            </div>
          ) : null}
          <div className="flex w-full shrink-0 items-center justify-end md:ml-auto md:w-auto md:self-stretch md:pl-3">
            <span className={pillClassName}>
              <span className={`h-2 w-2 shrink-0 rounded-full ${badge.dot}`} aria-hidden />
              {statusLabelFechas(r.status)}
            </span>
          </div>
        </div>
      )}
    </article>
  );
}

const fechaTabBase =
  'flex min-h-[3rem] shrink-0 snap-start flex-col items-center justify-center border-b-[3px] border-solid border-t-0 border-x-0 min-w-[5.25rem] px-3 pb-2.5 pt-2 text-sm font-bold transition-colors whitespace-nowrap md:min-h-[44px] md:min-w-[4.25rem] md:px-2.5';

const fechaTabClass = (active: boolean) =>
  `${fechaTabBase} ${
    active
      ? 'admin-tour-section-tab-active'
      : 'admin-tour-section-tab-inactive text-[#616f89] dark:text-gray-400'
  }`;

export function AdminFechasView({
  tournamentId,
  ligaNum,
  fechasList,
  resultsByKey,
  players,
  groupStageOfficiallyConfirmed = false,
  readOnly = false,
  onScheduleConfirmPendingCount,
  focusScheduleDedupeKey,
  onConsumedFocusScheduleDedupeKey,
}: Props) {
  const [tabIdx, setTabIdx] = useState(0);
  const [modal, setModal] = useState<ModalState>(null);
  const [confirmDatesModal, setConfirmDatesModal] = useState<ConfirmDatesModal>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const { tournaments: clubTournaments } = useClubData();
  const seedFmt = useOptionalAdminTournamentSeed();
  const isMasters1000 = useMemo(() => {
    const t = getTournamentById(tournamentId);
    return t != null && effectiveTournamentCatalogType(t) === 'masters1000';
  }, [tournamentId, clubTournaments]);

  const schedules = useMatchSchedules();

  const scheduleByKey = useMemo(() => {
    const map = new Map<string, MatchScheduleEntry>();
    for (const s of schedules) {
      if (s.tournamentId !== tournamentId) continue;
      map.set(s.dedupeKey, s);
    }
    return map;
  }, [schedules, tournamentId]);

  const schedulableByKey = useMemo(() => {
    const rows = buildSchedulableMatches(tournamentId, players);
    return new Map(rows.map((row) => [row.dedupeKey, row]));
  }, [tournamentId, players]);

  const confirmableKeys = useMemo(() => {
    return schedules
      .filter(
        (s) =>
          s.tournamentId === tournamentId &&
          s.scheduleStatus === 'scheduled' &&
          !!s.date?.trim() &&
          !!s.time?.trim(),
      )
      .map((s) => s.dedupeKey);
  }, [schedules, tournamentId]);

  useEffect(() => {
    onScheduleConfirmPendingCount?.(confirmableKeys.length);
  }, [confirmableKeys.length, onScheduleConfirmPendingCount]);

  const sorted = useMemo(() => [...fechasList].sort((a, b) => Number(a.numero) - Number(b.numero)), [fechasList]);

  const ballCarrierByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const fecha of sorted) {
      const round = Number(fecha.numero);
      if (fecha.grupos) {
        for (const [gk, rawLines] of Object.entries(fecha.grupos)) {
          for (const line of rawLines as string[]) {
            const carrier = ballCarrierFromFixtureLine(line);
            const vs = parseVsLine(line);
            if (!carrier || !vs) continue;
            const dedupeKey = matchInputDedupeKey({
              tournamentId,
              group: gk,
              round,
              playerA: cleanPlayerName(vs.a),
              playerB: cleanPlayerName(vs.b),
            });
            map.set(dedupeKey, carrier);
          }
        }
      }
      if (Array.isArray(fecha.partidos)) {
        for (const line of fecha.partidos) {
          const carrier = ballCarrierFromFixtureLine(line);
          const vs = parseVsLine(line);
          if (!carrier || !vs) continue;
          const dedupeKey = matchInputDedupeKey({
            tournamentId,
            group: 'Interzonal',
            round,
            playerA: cleanPlayerName(vs.a),
            playerB: cleanPlayerName(vs.b),
          });
          map.set(dedupeKey, carrier);
        }
      }
    }
    return map;
  }, [sorted, tournamentId]);

  const koEntries = useMemo(() => buildKnockoutAdminEntries(tournamentId, players), [tournamentId, players]);

  const anyKoMatches = koEntries.length > 0;

  /** Solapas KO: Masters 1000 solo semifinales y final; resto incluye repechaje / 4tos cuando aplica. */
  const koTabStages = useMemo((): KnockoutStage[] => {
    if (isMasters1000) {
      return ['semi', 'final'];
    }
    const hasOctavos = koEntries.some((e) => e.koStage === 'octavos');
    const tail: KnockoutStage[] = ['quarter', 'semi', 'final'];
    if (hasOctavos) return ['repechaje', 'octavos', ...tail];
    return ['repechaje', ...tail];
  }, [koEntries, isMasters1000]);

  useEffect(() => {
    setTabIdx(0);
  }, [tournamentId, ligaNum]);

  const koByStage = useMemo(() => {
    const order: KnockoutStage[] = isMasters1000
      ? ['semi', 'final']
      : ['repechaje', 'octavos', 'quarter', 'semi', 'final'];
    const m = new Map<KnockoutStage, Row[]>();
    for (const s of order) {
      m.set(s, []);
    }
    for (const e of koEntries) {
      const stored = resultsByKey.get(e.dedupeKey);
      const row: Row = {
        key: e.dedupeKey,
        line: '',
        group: '',
        status: getAdminMatchUiStatus(stored),
        left: e.playerA,
        right: e.playerB,
      };
      const list = m.get(e.koStage);
      if (list) list.push(row);
    }
    return m;
  }, [koEntries, resultsByKey, isMasters1000]);

  const fechaTabSlots = sorted.length;
  const koTabCount = koTabStages.length;
  const totalTabs = fechaTabSlots + koTabCount;

  const safeIdx =
    totalTabs > 0 ? Math.min(Math.max(0, tabIdx), Math.max(0, totalTabs - 1)) : Math.max(0, tabIdx);

  const isGroupTab = fechaTabSlots > 0 && safeIdx < fechaTabSlots;
  const isKoTab = safeIdx >= fechaTabSlots && koTabCount > 0;
  const activeKoStage: KnockoutStage | undefined = isKoTab ? koTabStages[safeIdx - fechaTabSlots] : undefined;

  const fecha = isGroupTab && sorted.length > 0 ? sorted[Math.min(safeIdx, fechaTabSlots - 1)] : null;

  const num = fecha ? Number(fecha.numero) : 0;

  const rows = useMemo(() => {
    if (!fecha || !isGroupTab) return [];
    return buildRowsForFecha(tournamentId, fecha, num, resultsByKey);
  }, [tournamentId, fecha, num, resultsByKey, isGroupTab]);

  const koRowsActive = useMemo(() => {
    if (!activeKoStage) return [];
    return koByStage.get(activeKoStage) ?? [];
  }, [activeKoStage, koByStage]);

  const byGroup = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const r of rows) {
      if (!m.has(r.group)) m.set(r.group, []);
      m.get(r.group)!.push(r);
    }
    return m;
  }, [rows]);

  const groupKeys = useMemo(
    () => (Array.from(byGroup.keys()) as string[]).sort((a, b) => a.localeCompare(b, 'es')),
    [byGroup],
  );

  const openModal = useCallback((rowKey: string) => {
    if (!isScheduleableRowKey(rowKey)) return;
    const stored = scheduleByKey.get(rowKey);
    let agendaMode: AgendaModalMode = 'active';
    if (stored?.scheduleStatus === 'postponed') agendaMode = 'postponed';
    else if (stored?.scheduleStatus === 'cancelled') agendaMode = 'cancelled';
    else if (stored?.scheduleStatus === 'suspended') agendaMode = 'suspended';
    else if (!stored || stored.scheduleStatus === 'unscheduled') agendaMode = 'active';

    setModal({
      dedupeKey: rowKey,
      date: stored?.date ?? '',
      time: stored?.time ?? '',
      note: stored?.note ?? '',
      agendaMode,
    });
    setSaveMsg(null);
  }, [scheduleByKey]);

  useEffect(() => {
    const key = focusScheduleDedupeKey?.trim();
    if (!key) return;
    const meta = schedulableByKey.get(key);
    if (meta?.kind === 'ko' && meta.koStage) {
      const ki = koTabStages.indexOf(meta.koStage);
      if (ki >= 0) setTabIdx(fechaTabSlots + ki);
    } else if (meta?.fixtureRound != null) {
      const idx = sorted.findIndex((f) => Number(f.numero) === meta.fixtureRound);
      if (idx >= 0) setTabIdx(idx);
    }
    openModal(key);
    queueMicrotask(() => {
      onConsumedFocusScheduleDedupeKey?.();
    });
  }, [
    focusScheduleDedupeKey,
    schedulableByKey,
    sorted,
    koTabStages,
    fechaTabSlots,
    openModal,
    onConsumedFocusScheduleDedupeKey,
  ]);

  const closeModal = () => setModal(null);

  const saveSchedule = () => {
    if (!modal) return;
    const date = normalizeText(modal.date);
    const time = normalizeText(modal.time);
    const note = normalizeText(modal.note);
    const prev = scheduleByKey.get(modal.dedupeKey);

    if (modal.agendaMode === 'clear') {
      upsertMatchSchedule({
        dedupeKey: modal.dedupeKey,
        tournamentId,
        leagueNum: ligaNum,
        scheduleStatus: 'unscheduled',
        date: undefined,
        time: undefined,
        venue: undefined,
        note,
        confirmedAt: undefined,
      });
      setModal(null);
      return;
    }

    const terminal: MatchScheduleStatus =
      modal.agendaMode === 'postponed'
        ? 'postponed'
        : modal.agendaMode === 'cancelled'
          ? 'cancelled'
          : modal.agendaMode === 'suspended'
            ? 'suspended'
            : 'scheduled';

    if (terminal === 'scheduled') {
      if (!date || !time) {
        setSaveMsg('Para programar, completá fecha y hora.');
        return;
      }
      const wasPublished = prev?.scheduleStatus === 'confirmed' || prev?.scheduleStatus === 'rescheduled';
      const keepSignal = wasPublished && prev?.confirmedAt != null ? prev.confirmedAt : undefined;
      upsertMatchSchedule({
        dedupeKey: modal.dedupeKey,
        tournamentId,
        leagueNum: ligaNum,
        scheduleStatus: 'scheduled',
        date,
        time,
        venue: undefined,
        note,
        confirmedAt: keepSignal,
      });
    } else {
      upsertMatchSchedule({
        dedupeKey: modal.dedupeKey,
        tournamentId,
        leagueNum: ligaNum,
        scheduleStatus: terminal,
        date,
        time,
        venue: undefined,
        note,
        confirmedAt: undefined,
      });
    }
    setModal(null);
  };

  const confirmDates = () => {
    if (!confirmDatesModal || confirmDatesModal.keys.length === 0) return;
    const tn = getTournamentById(tournamentId)?.name?.trim() || tournamentId;
    const keys = [...confirmDatesModal.keys];
    confirmMatchSchedules(tournamentId, keys);
    for (const key of keys) {
      const rowMeta = schedulableByKey.get(key);
      const prev = scheduleByKey.get(key);
      if (!prev) continue;
      const label = rowMeta
        ? seedFmt?.formatVs(rowMeta.playerA, rowMeta.playerB) ?? `${rowMeta.playerA} vs ${rowMeta.playerB}`
        : key;
      const willBeRescheduled = prev.confirmedAt != null;
      appendAdminAuditEntry({
        action: willBeRescheduled ? 'programacion_reprogramada' : 'programacion_confirmada',
        actionLabel: auditActionLabel(willBeRescheduled ? 'programacion_reprogramada' : 'programacion_confirmada'),
        tournamentId,
        tournamentName: tn,
        league: ligaNum,
        playersInvolved: label,
        detail: `${willBeRescheduled ? 'Reprogramación' : 'Confirmación'}: ${label} (${prev.date ?? 'sin fecha'} ${prev.time ?? ''}).`,
      });
    }
    setConfirmDatesModal(null);
  };

  const modalBallCarrier = modal ? ballCarrierByKey.get(modal.dedupeKey) : undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-gray-200/90 pb-2 dark:border-gray-700 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Calendar className="h-5 w-5 shrink-0 admin-theme-icon" aria-hidden />
          <h2 className="text-lg font-bold text-[#111318] dark:text-white md:text-xl">Fechas</h2>
        </div>
        {!readOnly ? (
          <button
            type="button"
            onClick={() => setConfirmDatesModal({ keys: confirmableKeys })}
            className="min-h-11 w-full shrink-0 rounded-lg border admin-theme-btn px-4 py-2.5 text-sm font-bold shadow-sm disabled:opacity-50 sm:w-auto sm:rounded-md sm:px-3 sm:py-2 sm:text-xs"
            disabled={confirmableKeys.length === 0}
          >
            Confirmar programación{confirmableKeys.length ? ` (${confirmableKeys.length})` : ''}
          </button>
        ) : null}
      </div>

      <div className="md:hidden">
        <label htmlFor="admin-fechas-mobile-select" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-[#616f89] dark:text-gray-500">
          Ver fecha
        </label>
        <div className="relative">
          <select
            id="admin-fechas-mobile-select"
            value={safeIdx}
            onChange={(e) => setTabIdx(Number(e.target.value))}
            className="admin-input-editable min-h-12 w-full appearance-none rounded-xl border px-4 py-3 pr-10 text-sm font-bold text-[#111318] shadow-sm dark:bg-gray-900 dark:text-white"
            aria-label="Seleccionar fecha o etapa"
          >
            {sorted.map((f, i) => (
              <option key={f.numero ?? i} value={i}>
                Fecha {Number(f.numero)}
              </option>
            ))}
            {koTabStages.map((stage, j) => {
              const idx = fechaTabSlots + j;
              return (
                <option key={stage} value={idx}>
                  {koTabLabel(stage, isMasters1000)}
                </option>
              );
            })}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-[#616f89] dark:text-gray-400" aria-hidden>
            ▼
          </span>
        </div>
      </div>

      <div className="hidden snap-x snap-proximity overflow-x-auto overflow-y-hidden scroll-smooth scroll-pl-3 scroll-pr-4 border-b border-gray-300/80 [-webkit-overflow-scrolling:touch] dark:border-gray-600 md:block">
        <div
          className="flex min-h-[44px] min-w-min flex-nowrap items-end gap-2 pb-px md:gap-1"
          role="tablist"
          aria-label="Fechas de grupos y eliminación"
        >
          {sorted.map((f, i) => {
            const n = Number(f.numero);
            const active = isGroupTab && i === safeIdx;
            return (
              <button
                key={f.numero ?? i}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTabIdx(i)}
                className={fechaTabClass(active)}
              >
                Fecha {n}
              </button>
            );
          })}
          {koTabStages.map((stage, j) => {
            const idx = fechaTabSlots + j;
            const active = safeIdx === idx;
            return (
              <button
                key={stage}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTabIdx(idx)}
                className={fechaTabClass(active)}
              >
                {koTabLabel(stage, isMasters1000)}
              </button>
            );
          })}
        </div>
      </div>

      {isKoTab && activeKoStage ? (
        koRowsActive.length > 0 ? (
          <div className="rounded-xl border-2 border-gray-300/90 bg-gray-50/50 p-3 shadow-sm dark:border-gray-600 dark:bg-gray-900/35 dark:shadow-none md:p-4">
            <div className="flex flex-col gap-2">
              {koRowsActive.map((matchRow) => (
                <Fragment key={matchRow.key}>
                  <FechasMatchArticle
                    r={matchRow}
                    resultsByKey={resultsByKey}
                    schedule={scheduleByKey.get(matchRow.key)}
                    readOnly={readOnly}
                    showSchedule={isScheduleableRowKey(matchRow.key)}
                    onOpenSchedule={openModal}
                  />
                </Fragment>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300/90 bg-gray-50/40 px-4 py-10 text-center dark:border-gray-600 dark:bg-gray-900/25">
            <p className="text-sm text-[#616f89] dark:text-gray-400">
              {koTabEmptyMessage(activeKoStage, anyKoMatches, groupStageOfficiallyConfirmed)}
            </p>
          </div>
        )
      ) : fecha ? (
        <>
          {fecha.tipo === 'interzonal' ? (
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">Interzonal</p>
          ) : null}

          <div className="flex flex-col gap-6">
            {groupKeys.map((gk) => {
              const list = byGroup.get(gk)!;
              const groupTitle = gk === 'Interzonal' ? 'Interzonal' : `Grupo ${gk}`;
              return (
                <section
                  key={`${num}-${gk}`}
                  className="rounded-xl border-2 border-gray-300/90 bg-gray-50/50 p-3 shadow-sm dark:border-gray-600 dark:bg-gray-900/35 dark:shadow-none md:p-4"
                >
                  <h3 className="mb-3 border-b border-gray-300/70 pb-2 text-sm font-bold uppercase tracking-wide text-[#111318] dark:border-gray-600 dark:text-white">
                    {groupTitle}
                  </h3>
                  <div className="flex flex-col gap-2">
                    {list.map((matchRow) => (
                      <Fragment key={matchRow.key}>
                        <FechasMatchArticle
                          r={matchRow}
                          resultsByKey={resultsByKey}
                          schedule={isScheduleableRowKey(matchRow.key) ? scheduleByKey.get(matchRow.key) : undefined}
                          readOnly={readOnly}
                          showSchedule={isScheduleableRowKey(matchRow.key)}
                          onOpenSchedule={openModal}
                        />
                      </Fragment>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      ) : (
        <p className="text-sm text-[#616f89] dark:text-gray-400">Seleccioná una pestaña para ver los partidos.</p>
      )}

      {modal ? (
        <AdminGlobalModal open={modal != null} onClose={closeModal} labelledBy="admin-fechas-programacion-title" panelClassName="max-w-lg">
          <h3 id="admin-fechas-programacion-title" className="text-base font-bold text-[#111318] dark:text-white">
            Programación
          </h3>
          <p className="mt-1 text-xs text-[#616f89] dark:text-gray-400">
            Los cambios de fecha u hora no se publican hasta que confirmes con el botón general.
          </p>
          {modalBallCarrier ? (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-gray-200/90 bg-gray-50 px-3 py-1.5 text-xs font-bold text-[#616f89] dark:border-gray-600/70 dark:bg-gray-900 dark:text-gray-300">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[rgba(var(--color-torneo-rgb)/0.18)] text-[10px] text-[rgb(var(--color-torneo-rgb))]" aria-hidden>
                ●
              </span>
              Lleva pelotas: <span className="text-[#111318] dark:text-white">{modalBallCarrier}</span>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-semibold text-[#616f89] dark:text-gray-400">
              Fecha
              <input
                type="date"
                value={modal.date}
                onChange={(e) => setModal((prev) => (prev ? { ...prev, date: e.target.value } : prev))}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
              />
            </label>
            <label className="space-y-1 text-xs font-semibold text-[#616f89] dark:text-gray-400">
              Hora
              <input
                type="time"
                value={modal.time}
                onChange={(e) => setModal((prev) => (prev ? { ...prev, time: e.target.value } : prev))}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
              />
            </label>
            <label className="space-y-1 text-xs font-semibold text-[#616f89] dark:text-gray-400 sm:col-span-2">
              Estado de agenda
              <select
                value={modal.agendaMode}
                onChange={(e) => setModal((prev) => (prev ? { ...prev, agendaMode: e.target.value as AgendaModalMode } : prev))}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
              >
                <option value="active">Agenda activa (fecha y hora)</option>
                <option value="postponed">Postergado</option>
                <option value="suspended">Suspendido (agenda)</option>
                <option value="cancelled">Cancelado (agenda)</option>
                <option value="clear">Sin programar (limpiar)</option>
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold text-[#616f89] dark:text-gray-400 sm:col-span-2">
              Observación (opcional)
              <textarea
                value={modal.note}
                onChange={(e) => setModal((prev) => (prev ? { ...prev, note: e.target.value } : prev))}
                rows={3}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
              />
            </label>
          </div>

          {saveMsg ? <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">{saveMsg}</p> : null}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold dark:border-gray-600"
            >
              Cancelar
            </button>
            <button type="button" onClick={saveSchedule} className="rounded-md border admin-theme-btn px-3 py-2 text-sm font-bold">
              Guardar
            </button>
          </div>
        </AdminGlobalModal>
      ) : null}

      {confirmDatesModal ? (
        <AdminGlobalModal
          open={confirmDatesModal != null}
          onClose={() => setConfirmDatesModal(null)}
          labelledBy="admin-fechas-confirmar-programacion-title"
          panelClassName="max-w-2xl"
        >
          <h3 id="admin-fechas-confirmar-programacion-title" className="text-base font-bold text-[#111318] dark:text-white">
            Confirmar programación
          </h3>
          <p className="mt-1 text-xs text-[#616f89] dark:text-gray-400">Publicá estos horarios en el sitio (próximos partidos y agenda).</p>
          <div className="mt-3 max-h-[50vh] overflow-auto rounded-md border border-gray-200 dark:border-gray-600">
            {confirmDatesModal.keys.map((key) => {
              const rowMeta = schedulableByKey.get(key);
              const s = scheduleByKey.get(key);
              if (!s) return null;
              return (
                <div key={key} className="border-b border-gray-200 px-3 py-2 text-sm last:border-b-0 dark:border-gray-700">
                  <p className="font-semibold text-[#111318] dark:text-white">
                    {rowMeta
                      ? seedFmt?.formatVs(rowMeta.playerA, rowMeta.playerB) ?? `${rowMeta.playerA} vs ${rowMeta.playerB}`
                      : key}
                  </p>
                  <p className="text-xs text-[#616f89] dark:text-gray-400">
                    Liga {ligaNum}
                    {rowMeta ? ` · ${rowMeta.groupLabel} · ${rowMeta.fixtureRoundLabel}` : ''} · {s.date ?? 'sin fecha'}{' '}
                    {s.time ?? ''}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmDatesModal(null)}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold dark:border-gray-600"
            >
              Cancelar
            </button>
            <button type="button" onClick={confirmDates} className="rounded-md border admin-theme-btn px-3 py-2 text-sm font-bold">
              Confirmar programación
            </button>
          </div>
        </AdminGlobalModal>
      ) : null}
    </div>
  );
}

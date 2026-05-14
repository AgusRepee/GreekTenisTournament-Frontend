import type { Player, UpcomingMatchDisplay } from '@/lib/mockData';
import type { MatchScheduleEntry } from '@/lib/tennis/matchScheduleStore';
import { cleanPlayerName } from '@/lib/tennis/matchDedupe';
import { buildSchedulableMatches } from '@/lib/tennis/schedulableMatchCatalog';

const VISIBLE_STATUSES: MatchScheduleEntry['scheduleStatus'][] = [
  'confirmed',
  'rescheduled',
  'postponed',
  'suspended',
];

function formatScheduleDateShort(isoDate: string): string {
  const t = isoDate.trim();
  const d = /^\d{4}-\d{2}-\d{2}$/.test(t) ? new Date(`${t}T12:00:00`) : new Date(t);
  if (!Number.isFinite(d.getTime())) return t || '—';
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

function groupCaption(row: ReturnType<typeof buildSchedulableMatches>[number]): string | undefined {
  if (row.kind === 'ko') return row.groupLabel;
  if (row.groupKey === 'Interzonal') return 'Interzonal';
  return `Grupo ${row.groupLabel}`;
}

/**
 * Próximos partidos desde la agenda del admin (`matchScheduleStore`), misma semántica que la pestaña Programación pública.
 * Solo entradas con fecha y estado publicable.
 */
export function buildUpcomingFromConfirmedSchedules(
  tournamentId: string,
  schedules: MatchScheduleEntry[],
  players: Player[],
): UpcomingMatchDisplay[] {
  const schedRows = buildSchedulableMatches(tournamentId, players);
  const byKey = new Map(schedRows.map((r) => [r.dedupeKey, r]));
  const scheduleByKey = new Map(schedules.filter((s) => s.tournamentId === tournamentId).map((s) => [s.dedupeKey, s] as const));

  const picks: UpcomingMatchDisplay[] = [];
  let idx = 0;
  for (const s of schedules) {
    if (s.tournamentId !== tournamentId) continue;
    if (!VISIBLE_STATUSES.includes(s.scheduleStatus)) continue;
    if (!s.date?.trim()) continue;
    const row = byKey.get(s.dedupeKey);
    if (!row) continue;
    picks.push({
      id: s.dedupeKey,
      date: formatScheduleDateShort(s.date),
      time: s.time?.trim() || '—',
      playerA: row.playerA,
      playerB: row.playerB,
      round: row.fixtureRoundLabel,
      group: groupCaption(row),
      ballsByPlayerA: idx % 2 === 0,
    });
    idx += 1;
  }

  picks.sort((a, b) => {
    const ka = scheduleByKey.get(a.id);
    const kb = scheduleByKey.get(b.id);
    const ta = `${ka?.date ?? ''} ${ka?.time ?? ''}`.trim();
    const tb = `${kb?.date ?? ''} ${kb?.time ?? ''}`.trim();
    return ta.localeCompare(tb);
  });

  return picks;
}

function pairNorm(u: UpcomingMatchDisplay): string {
  const a = cleanPlayerName(u.playerA).toLowerCase();
  const b = cleanPlayerName(u.playerB).toLowerCase();
  return a <= b ? `${a}|${b}` : `${b}|${a}`;
}

/** Evita duplicar en “Próximo partido” la misma pareja que ya viene de la agenda confirmada. */
export function mergeUpcomingPreferSchedule(
  fromSchedule: UpcomingMatchDisplay[],
  legacy: UpcomingMatchDisplay[],
): UpcomingMatchDisplay[] {
  const scheduledPairs = new Set(fromSchedule.map(pairNorm));
  const rest = legacy.filter((u) => !scheduledPairs.has(pairNorm(u)));
  return [...fromSchedule, ...rest];
}

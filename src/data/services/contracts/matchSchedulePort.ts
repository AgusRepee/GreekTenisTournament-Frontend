export type MatchScheduleStatus =
  | 'unscheduled'
  | 'scheduled'
  | 'confirmed'
  | 'rescheduled'
  | 'postponed'
  | 'cancelled'
  | 'suspended';

export interface MatchScheduleEntry {
  dedupeKey: string;
  tournamentId: string;
  leagueNum: number;
  scheduleStatus: MatchScheduleStatus;
  date?: string;
  time?: string;
  venue?: string;
  note?: string;
  confirmedAt?: number;
  updatedAt: number;
}

const VALID: MatchScheduleStatus[] = [
  'unscheduled',
  'scheduled',
  'confirmed',
  'rescheduled',
  'postponed',
  'cancelled',
  'suspended',
];

export function sanitizeMatchScheduleEntry(raw: unknown): MatchScheduleEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<MatchScheduleEntry> & { updatedAt?: unknown };
  if (!r.dedupeKey || !r.tournamentId || typeof r.leagueNum !== 'number') return null;
  const status = (r.scheduleStatus ?? 'unscheduled') as MatchScheduleStatus;
  if (!VALID.includes(status)) return null;
  let updatedAt = typeof r.updatedAt === 'number' ? r.updatedAt : Date.now();
  if (r.updatedAt && typeof (r.updatedAt as Date).getTime === 'function') {
    try {
      updatedAt = (r.updatedAt as Date).getTime();
    } catch {
      updatedAt = Date.now();
    }
  }
  return {
    dedupeKey: String(r.dedupeKey),
    tournamentId: String(r.tournamentId),
    leagueNum: r.leagueNum,
    scheduleStatus: status,
    date: typeof r.date === 'string' ? r.date : undefined,
    time: typeof r.time === 'string' ? r.time : undefined,
    venue: typeof r.venue === 'string' ? r.venue : undefined,
    note: typeof r.note === 'string' ? r.note : undefined,
    confirmedAt: typeof r.confirmedAt === 'number' ? r.confirmedAt : undefined,
    updatedAt,
  };
}

function parseUpdatedAtMs(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const t = Date.parse(v);
    if (Number.isFinite(t)) return t;
  }
  if (v != null && typeof (v as { getTime?: () => number }).getTime === 'function') {
    try {
      return (v as Date).getTime();
    } catch {
      /* noop */
    }
  }
  return Date.now();
}

export function scheduleEntryFromApiRow(row: Record<string, unknown>): MatchScheduleEntry | null {
  const leagueNumRaw = row.leagueNum;
  const leagueNum =
    typeof leagueNumRaw === 'number' ? leagueNumRaw : typeof leagueNumRaw === 'string' ? Number(leagueNumRaw) : NaN;
  if (!Number.isFinite(leagueNum)) return null;
  const u = parseUpdatedAtMs(row.updatedAt);
  return sanitizeMatchScheduleEntry({ ...row, leagueNum, updatedAt: u });
}

/**
 * Programación de partidos (fixture por `dedupeKey`).
 * Local: localStorage; API: MySQL (`TournamentScheduleEntry`).
 */
export interface MatchSchedulePort {
  getAllSchedules(): MatchScheduleEntry[];
  getSchedulesByTournament(tournamentId: string): MatchScheduleEntry[];
  getScheduleByDedupeKey(dedupeKey: string): MatchScheduleEntry | undefined;
  upsertSchedule(input: Omit<MatchScheduleEntry, 'updatedAt'> & { updatedAt?: number }): void;
  removeSchedule(dedupeKey: string): void;
  /** Marca como confirmados los partidos en `scheduled` / `rescheduled` con fecha y hora (local: por clave; API: batch). */
  confirmSchedules(tournamentId: string, dedupeKeys: string[]): void;
  /** Cambia fecha/hora/lugar y fuerza estado `rescheduled`. */
  rescheduleMatch(
    dedupeKey: string,
    patch: Partial<Pick<MatchScheduleEntry, 'date' | 'time' | 'venue' | 'note'>> & {
      tournamentId: string;
      leagueNum: number;
    },
  ): void;
  postponeMatch(dedupeKey: string, patch?: { note?: string; venue?: string }): void;
  cancelSchedule(dedupeKey: string): void;
  /** Incorpora filas del GET público o de otro origen remoto (sin borrar otras claves). */
  mergeSchedules(rows: MatchScheduleEntry[]): void;
  subscribe(callback: () => void): () => void;
  getSnapshot(): MatchScheduleEntry[];
  getServerSnapshot(): MatchScheduleEntry[];
}

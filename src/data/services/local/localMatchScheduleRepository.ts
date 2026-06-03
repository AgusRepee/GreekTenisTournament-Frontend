import { MATCH_SCHEDULE_STORAGE_KEY } from '@/data/types/persistenceKeys';
import type { MatchScheduleEntry, MatchSchedulePort } from '../contracts/matchSchedulePort';
import { sanitizeMatchScheduleEntry } from '../contracts/matchSchedulePort';
import { DEFAULT_LIGA4_ND_SCHEDULES } from '@/lib/tennis/liga4Nd2026Data';
import { DEFAULT_LIGA5_ND_SCHEDULES } from '@/lib/tennis/liga5Nd2026Data';
import { DEFAULT_LIGA6_ND_SCHEDULES } from '@/lib/tennis/liga6Nd2026Data';
import { DEFAULT_RAFA_LIGA2_SCHEDULES } from '@/lib/tennis/rafaNadalLiga2Nd2026Data';
import { DEFAULT_RAFA_LIGA3_SCHEDULES } from '@/lib/tennis/rafaNadalLiga3Nd2026Data';
import { DEFAULT_RAFA_LIGA4_SCHEDULES } from '@/lib/tennis/rafaNadalLiga4Nd2026Data';
import { DEFAULT_RAFA_LIGA5_SCHEDULES } from '@/lib/tennis/rafaNadalLiga5Nd2026Data';
import { DEFAULT_RAFA_LIGA6_SCHEDULES } from '@/lib/tennis/rafaNadalLiga6Nd2026Data';
import { DEFAULT_RAFAEL_LIGA1_SCHEDULES } from '@/lib/tennis/rafaelNadalLiga1Nd2026Data';
import { DEFAULT_NOVAK_LIGA1_SCHEDULES } from '@/lib/tennis/novakLiga1Nd2026Data';
import { DEFAULT_NOVAK_LIGA3_SCHEDULES } from '@/lib/tennis/novakLiga3Nd2026Data';

const EMPTY: MatchScheduleEntry[] = Object.freeze([]) as unknown as MatchScheduleEntry[];
const NOVAK_LIGA1_SCHEDULE_SEED_KEY = 'greek-tennis-schedule-seed-novak-l1-2026-v2';
const NOVAK_LIGA3_SCHEDULE_SEED_KEY = 'greek-tennis-schedule-seed-novak-l3-2026-v1';
const LIGA4_ND_SCHEDULE_SEED_KEY = 'greek-tennis-schedule-seed-liga4-nd-2026-v1';
const LIGA5_ND_SCHEDULE_SEED_KEY = 'greek-tennis-schedule-seed-liga5-nd-2026-v1';
const LIGA6_ND_SCHEDULE_SEED_KEY = 'greek-tennis-schedule-seed-liga6-nd-2026-v1';
const RAFA_LIGA2_SCHEDULE_SEED_KEY = 'greek-tennis-schedule-seed-rafa-l2-rn-2026-v1';
const RAFA_LIGA3_SCHEDULE_SEED_KEY = 'greek-tennis-schedule-seed-rafa-l3-rn-2026-v1';
const RAFA_LIGA4_SCHEDULE_SEED_KEY = 'greek-tennis-schedule-seed-rafa-l4-rn-2026-v1';
const RAFA_LIGA5_SCHEDULE_SEED_KEY = 'greek-tennis-schedule-seed-rafa-l5-v1';
const RAFA_LIGA6_SCHEDULE_SEED_KEY = 'greek-tennis-schedule-seed-rafa-l6-rn-2026-v1';
const RAFAEL_LIGA1_SCHEDULE_SEED_KEY = 'greek-tennis-schedule-seed-rafael-l1-rn-2026-v1';
const DEFAULT_SCHEDULE_SEEDS = [
  ...DEFAULT_NOVAK_LIGA1_SCHEDULES,
  ...DEFAULT_NOVAK_LIGA3_SCHEDULES,
  ...DEFAULT_LIGA4_ND_SCHEDULES,
  ...DEFAULT_LIGA5_ND_SCHEDULES,
  ...DEFAULT_LIGA6_ND_SCHEDULES,
  ...DEFAULT_RAFAEL_LIGA1_SCHEDULES,
  ...DEFAULT_RAFA_LIGA2_SCHEDULES,
  ...DEFAULT_RAFA_LIGA3_SCHEDULES,
  ...DEFAULT_RAFA_LIGA4_SCHEDULES,
  ...DEFAULT_RAFA_LIGA5_SCHEDULES,
  ...DEFAULT_RAFA_LIGA6_SCHEDULES,
];

export function createLocalMatchScheduleRepository(): MatchSchedulePort {
  const listeners = new Set<() => void>();
  let byKey: Record<string, MatchScheduleEntry> = {};
  let cached: MatchScheduleEntry[] = [];

  function rebuild(): void {
    cached = Object.values(byKey);
  }

  function emit(): void {
    listeners.forEach((l) => l());
  }

  function persist(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(MATCH_SCHEDULE_STORAGE_KEY, JSON.stringify(cached));
    } catch {
      /* quota */
    }
  }

  function load(): void {
    if (typeof localStorage === 'undefined') {
      byKey = Object.fromEntries(DEFAULT_SCHEDULE_SEEDS.map((s) => [s.dedupeKey, s]));
      rebuild();
      return;
    }
    try {
      const raw = localStorage.getItem(MATCH_SCHEDULE_STORAGE_KEY);
      const arr = raw ? (JSON.parse(raw) as unknown[]) : [];
      const next: Record<string, MatchScheduleEntry> = {};
      if (Array.isArray(arr)) {
        for (const item of arr) {
          const parsed = sanitizeMatchScheduleEntry(item);
          if (!parsed) continue;
          next[parsed.dedupeKey] = parsed;
        }
      }
      byKey = next;
      if (localStorage.getItem(NOVAK_LIGA1_SCHEDULE_SEED_KEY) !== '1') {
        for (const schedule of DEFAULT_NOVAK_LIGA1_SCHEDULES) {
          if (byKey[schedule.dedupeKey]) continue;
          byKey[schedule.dedupeKey] = schedule;
        }
        rebuild();
        localStorage.setItem(NOVAK_LIGA1_SCHEDULE_SEED_KEY, '1');
        persist();
      }
      if (localStorage.getItem(NOVAK_LIGA3_SCHEDULE_SEED_KEY) !== '1') {
        for (const schedule of DEFAULT_NOVAK_LIGA3_SCHEDULES) {
          if (byKey[schedule.dedupeKey]) continue;
          byKey[schedule.dedupeKey] = schedule;
        }
        rebuild();
        localStorage.setItem(NOVAK_LIGA3_SCHEDULE_SEED_KEY, '1');
        persist();
      }
      if (localStorage.getItem(LIGA4_ND_SCHEDULE_SEED_KEY) !== '1') {
        for (const schedule of DEFAULT_LIGA4_ND_SCHEDULES) {
          if (byKey[schedule.dedupeKey]) continue;
          byKey[schedule.dedupeKey] = schedule;
        }
        rebuild();
        localStorage.setItem(LIGA4_ND_SCHEDULE_SEED_KEY, '1');
        persist();
      }
      if (localStorage.getItem(LIGA5_ND_SCHEDULE_SEED_KEY) !== '1') {
        for (const schedule of DEFAULT_LIGA5_ND_SCHEDULES) {
          if (byKey[schedule.dedupeKey]) continue;
          byKey[schedule.dedupeKey] = schedule;
        }
        rebuild();
        localStorage.setItem(LIGA5_ND_SCHEDULE_SEED_KEY, '1');
        persist();
      }
      if (localStorage.getItem(LIGA6_ND_SCHEDULE_SEED_KEY) !== '1') {
        for (const schedule of DEFAULT_LIGA6_ND_SCHEDULES) {
          if (byKey[schedule.dedupeKey]) continue;
          byKey[schedule.dedupeKey] = schedule;
        }
        rebuild();
        localStorage.setItem(LIGA6_ND_SCHEDULE_SEED_KEY, '1');
        persist();
      }
      if (localStorage.getItem(RAFAEL_LIGA1_SCHEDULE_SEED_KEY) !== '1') {
        for (const schedule of DEFAULT_RAFAEL_LIGA1_SCHEDULES) {
          if (byKey[schedule.dedupeKey]) continue;
          byKey[schedule.dedupeKey] = schedule;
        }
        rebuild();
        localStorage.setItem(RAFAEL_LIGA1_SCHEDULE_SEED_KEY, '1');
        persist();
      }
      if (localStorage.getItem(RAFA_LIGA2_SCHEDULE_SEED_KEY) !== '1') {
        for (const schedule of DEFAULT_RAFA_LIGA2_SCHEDULES) {
          if (byKey[schedule.dedupeKey]) continue;
          byKey[schedule.dedupeKey] = schedule;
        }
        rebuild();
        localStorage.setItem(RAFA_LIGA2_SCHEDULE_SEED_KEY, '1');
        persist();
      }
      if (localStorage.getItem(RAFA_LIGA3_SCHEDULE_SEED_KEY) !== '1') {
        for (const schedule of DEFAULT_RAFA_LIGA3_SCHEDULES) {
          if (byKey[schedule.dedupeKey]) continue;
          byKey[schedule.dedupeKey] = schedule;
        }
        rebuild();
        localStorage.setItem(RAFA_LIGA3_SCHEDULE_SEED_KEY, '1');
        persist();
      }
      if (localStorage.getItem(RAFA_LIGA4_SCHEDULE_SEED_KEY) !== '1') {
        for (const schedule of DEFAULT_RAFA_LIGA4_SCHEDULES) {
          if (byKey[schedule.dedupeKey]) continue;
          byKey[schedule.dedupeKey] = schedule;
        }
        rebuild();
        localStorage.setItem(RAFA_LIGA4_SCHEDULE_SEED_KEY, '1');
        persist();
      }
      if (localStorage.getItem(RAFA_LIGA5_SCHEDULE_SEED_KEY) !== '1') {
        for (const schedule of DEFAULT_RAFA_LIGA5_SCHEDULES) {
          if (byKey[schedule.dedupeKey]) continue;
          byKey[schedule.dedupeKey] = schedule;
        }
        rebuild();
        localStorage.setItem(RAFA_LIGA5_SCHEDULE_SEED_KEY, '1');
        persist();
      }
      if (localStorage.getItem(RAFA_LIGA6_SCHEDULE_SEED_KEY) !== '1') {
        for (const schedule of DEFAULT_RAFA_LIGA6_SCHEDULES) {
          if (byKey[schedule.dedupeKey]) continue;
          byKey[schedule.dedupeKey] = schedule;
        }
        rebuild();
        localStorage.setItem(RAFA_LIGA6_SCHEDULE_SEED_KEY, '1');
        persist();
      }
    } catch {
      byKey = {};
    }
    rebuild();
  }

  load();

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e: StorageEvent) => {
      if (e.key !== MATCH_SCHEDULE_STORAGE_KEY) return;
      load();
      emit();
    });
  }

  function upsertScheduleInternal(input: Omit<MatchScheduleEntry, 'updatedAt'> & { updatedAt?: number }): void {
    const next: MatchScheduleEntry = {
      ...input,
      updatedAt: input.updatedAt ?? Date.now(),
    };
    byKey = { ...byKey, [next.dedupeKey]: next };
    rebuild();
    persist();
    emit();
  }

  return {
    getAllSchedules(): MatchScheduleEntry[] {
      return cached;
    },
    getSchedulesByTournament(tournamentId: string): MatchScheduleEntry[] {
      return cached.filter((s) => s.tournamentId === tournamentId);
    },
    getScheduleByDedupeKey(dedupeKey: string): MatchScheduleEntry | undefined {
      return byKey[dedupeKey];
    },
    upsertSchedule: upsertScheduleInternal,
    removeSchedule(dedupeKey: string): void {
      if (!byKey[dedupeKey]) return;
      const { [dedupeKey]: _drop, ...rest } = byKey;
      byKey = rest;
      rebuild();
      persist();
      emit();
    },
    confirmSchedules(tournamentId: string, dedupeKeys: string[]): void {
      const now = Date.now();
      let changed = false;
      const next = { ...byKey };
      for (const key of dedupeKeys) {
        const prev = next[key];
        if (!prev || prev.tournamentId !== tournamentId) continue;
        if (prev.scheduleStatus !== 'scheduled') continue;
        if (!prev.date?.trim() || !prev.time?.trim()) continue;
        const hadPublicConfirmation = prev.confirmedAt != null;
        const nextStatus = hadPublicConfirmation ? 'rescheduled' : 'confirmed';
        next[key] = { ...prev, scheduleStatus: nextStatus, confirmedAt: now, updatedAt: now };
        changed = true;
      }
      if (!changed) return;
      byKey = next;
      rebuild();
      persist();
      emit();
    },
    rescheduleMatch(dedupeKey, patch): void {
      const prev = byKey[dedupeKey];
      if (!prev) {
        upsertScheduleInternal({
          dedupeKey,
          tournamentId: patch.tournamentId,
          leagueNum: patch.leagueNum,
          scheduleStatus: 'rescheduled',
          date: patch.date,
          time: patch.time,
          venue: patch.venue,
          note: patch.note,
        });
        return;
      }
      upsertScheduleInternal({
        ...prev,
        ...patch,
        dedupeKey,
        tournamentId: patch.tournamentId,
        leagueNum: patch.leagueNum,
        scheduleStatus: 'rescheduled',
      });
    },
    postponeMatch(dedupeKey, patch): void {
      const prev = byKey[dedupeKey];
      if (!prev) return;
      upsertScheduleInternal({
        ...prev,
        scheduleStatus: 'postponed',
        note: patch?.note ?? prev.note,
        venue: patch?.venue ?? prev.venue,
      });
    },
    cancelSchedule(dedupeKey: string): void {
      const prev = byKey[dedupeKey];
      if (!prev) return;
      upsertScheduleInternal({ ...prev, scheduleStatus: 'cancelled' });
    },
    mergeSchedules(rows: MatchScheduleEntry[]): void {
      if (rows.length === 0) return;
      const next = { ...byKey };
      for (const r of rows) {
        next[r.dedupeKey] = { ...r, updatedAt: r.updatedAt ?? Date.now() };
      }
      byKey = next;
      rebuild();
      persist();
      emit();
    },
    subscribe(callback: () => void): () => void {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    getSnapshot(): MatchScheduleEntry[] {
      return cached;
    },
    getServerSnapshot(): MatchScheduleEntry[] {
      return EMPTY;
    },
  };
}

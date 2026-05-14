import { MATCH_SCHEDULE_STORAGE_KEY } from '@/data/types/persistenceKeys';
import type { MatchScheduleEntry, MatchSchedulePort } from '../contracts/matchSchedulePort';
import { sanitizeMatchScheduleEntry } from '../contracts/matchSchedulePort';
import { DEFAULT_NOVAK_LIGA1_SCHEDULES } from '@/lib/tennis/novakLiga1DefaultResults';

const EMPTY: MatchScheduleEntry[] = Object.freeze([]) as unknown as MatchScheduleEntry[];
const NOVAK_LIGA1_SCHEDULE_SEED_KEY = 'greek-tennis-schedule-seed-novak-l1-2026-v1';

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
      byKey = Object.fromEntries(DEFAULT_NOVAK_LIGA1_SCHEDULES.map((s) => [s.dedupeKey, s]));
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

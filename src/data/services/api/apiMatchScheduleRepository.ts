import type { MatchScheduleEntry, MatchSchedulePort } from '../contracts/matchSchedulePort';
import { scheduleEntryFromApiRow } from '../contracts/matchSchedulePort';
import {
  cancelMatchSchedule,
  confirmTournamentSchedules,
  deleteAdminMatchSchedule,
  getAdminSchedules,
  postponeMatchSchedule,
  postMatchSchedule,
  putMatchSchedule,
} from '@/lib/api/apiClient';

const EMPTY_SERVER: MatchScheduleEntry[] = Object.freeze([]) as unknown as MatchScheduleEntry[];

function buildUpsertPayload(entry: MatchScheduleEntry): Record<string, unknown> {
  return {
    tournamentId: entry.tournamentId,
    leagueNum: entry.leagueNum,
    scheduleStatus: entry.scheduleStatus,
    date: entry.date ?? null,
    time: entry.time ?? null,
    venue: entry.venue ?? null,
    note: entry.note ?? null,
    confirmedAt: entry.confirmedAt ?? null,
  };
}

export function createApiMatchScheduleRepository(): MatchSchedulePort {
  const listeners = new Set<() => void>();
  let byKey: Record<string, MatchScheduleEntry> = {};
  let cachedList: MatchScheduleEntry[] = [];

  function rebuildList(): void {
    cachedList = Object.values(byKey);
  }

  function emit(): void {
    listeners.forEach((l) => l());
  }

  function applyRows(rows: Record<string, unknown>[]): void {
    const next: Record<string, MatchScheduleEntry> = {};
    for (const raw of rows) {
      const e = scheduleEntryFromApiRow(raw);
      if (!e) continue;
      next[e.dedupeKey] = e;
    }
    byKey = next;
    rebuildList();
    emit();
  }

  async function reloadFromServer(): Promise<void> {
    try {
      const rows = await getAdminSchedules();
      if (!Array.isArray(rows)) {
        console.warn('[apiMatchSchedule] respuesta inesperada, se esperaba array');
        return;
      }
      applyRows(rows as Record<string, unknown>[]);
    } catch (e) {
      console.warn('[apiMatchSchedule] no se pudo cargar desde API (¿JWT admin?)', e);
    }
  }

  void reloadFromServer();

  return {
    getAllSchedules(): MatchScheduleEntry[] {
      return cachedList;
    },
    getSchedulesByTournament(tournamentId: string): MatchScheduleEntry[] {
      return cachedList.filter((s) => s.tournamentId === tournamentId);
    },
    getScheduleByDedupeKey(dedupeKey: string): MatchScheduleEntry | undefined {
      return byKey[dedupeKey];
    },
    upsertSchedule(input: Omit<MatchScheduleEntry, 'updatedAt'> & { updatedAt?: number }): void {
      const next: MatchScheduleEntry = {
        ...input,
        updatedAt: input.updatedAt ?? Date.now(),
      };
      byKey = { ...byKey, [next.dedupeKey]: next };
      rebuildList();
      emit();

      const payload = buildUpsertPayload(next);
      void (async () => {
        try {
          await postMatchSchedule(next.dedupeKey, payload);
          await reloadFromServer();
        } catch (e) {
          console.error('[apiMatchSchedule] upsert falló, re-sincronizando', e);
          await reloadFromServer();
        }
      })();
    },
    removeSchedule(dedupeKey: string): void {
      if (byKey[dedupeKey] === undefined) return;
      const { [dedupeKey]: _, ...rest } = byKey;
      byKey = rest;
      rebuildList();
      emit();
      void (async () => {
        try {
          await deleteAdminMatchSchedule(dedupeKey);
          await reloadFromServer();
        } catch (e) {
          console.error('[apiMatchSchedule] delete falló, re-sincronizando', e);
          await reloadFromServer();
        }
      })();
    },
    confirmSchedules(tournamentId: string, dedupeKeys: string[]): void {
      void (async () => {
        try {
          await confirmTournamentSchedules(tournamentId, { keys: dedupeKeys });
          await reloadFromServer();
        } catch (e) {
          console.error('[apiMatchSchedule] confirm falló, re-sincronizando', e);
          await reloadFromServer();
        }
      })();
      const now = Date.now();
      const next = { ...byKey };
      for (const key of dedupeKeys) {
        const prev = next[key];
        if (!prev || prev.tournamentId !== tournamentId) continue;
        if (prev.scheduleStatus !== 'scheduled') continue;
        if (!prev.date?.trim() || !prev.time?.trim()) continue;
        const hadPublicConfirmation = prev.confirmedAt != null;
        const nextStatus = hadPublicConfirmation ? 'rescheduled' : 'confirmed';
        next[key] = { ...prev, scheduleStatus: nextStatus, confirmedAt: now, updatedAt: now };
      }
      byKey = next;
      rebuildList();
      emit();
    },
    rescheduleMatch(dedupeKey, patch): void {
      const prev = byKey[dedupeKey];
      const merged: MatchScheduleEntry = {
        ...(prev ?? {
          dedupeKey,
          tournamentId: patch.tournamentId,
          leagueNum: patch.leagueNum,
          scheduleStatus: 'rescheduled' as const,
          updatedAt: Date.now(),
        }),
        ...patch,
        dedupeKey,
        tournamentId: patch.tournamentId,
        leagueNum: patch.leagueNum,
        scheduleStatus: 'rescheduled',
        updatedAt: Date.now(),
      };
      byKey = { ...byKey, [dedupeKey]: merged };
      rebuildList();
      emit();
      void (async () => {
        try {
          await putMatchSchedule(dedupeKey, buildUpsertPayload(merged));
          await reloadFromServer();
        } catch (e) {
          console.error('[apiMatchSchedule] reschedule falló, re-sincronizando', e);
          await reloadFromServer();
        }
      })();
    },
    postponeMatch(dedupeKey, patch): void {
      const prev = byKey[dedupeKey];
      if (!prev) return;
      const merged: MatchScheduleEntry = {
        ...prev,
        scheduleStatus: 'postponed',
        note: patch?.note ?? prev.note,
        venue: patch?.venue ?? prev.venue,
        updatedAt: Date.now(),
      };
      byKey = { ...byKey, [dedupeKey]: merged };
      rebuildList();
      emit();
      void (async () => {
        try {
          await postponeMatchSchedule(dedupeKey, patch ?? {});
          await reloadFromServer();
        } catch (e) {
          console.error('[apiMatchSchedule] postpone falló, re-sincronizando', e);
          await reloadFromServer();
        }
      })();
    },
    cancelSchedule(dedupeKey: string): void {
      const prev = byKey[dedupeKey];
      if (!prev) return;
      const merged: MatchScheduleEntry = { ...prev, scheduleStatus: 'cancelled', updatedAt: Date.now() };
      byKey = { ...byKey, [dedupeKey]: merged };
      rebuildList();
      emit();
      void (async () => {
        try {
          await cancelMatchSchedule(dedupeKey);
          await reloadFromServer();
        } catch (e) {
          console.error('[apiMatchSchedule] cancel falló, re-sincronizando', e);
          await reloadFromServer();
        }
      })();
    },
    mergeSchedules(rows: MatchScheduleEntry[]): void {
      if (rows.length === 0) return;
      const next = { ...byKey };
      for (const r of rows) {
        next[r.dedupeKey] = { ...r, updatedAt: r.updatedAt ?? Date.now() };
      }
      byKey = next;
      rebuildList();
      emit();
    },
    subscribe(callback: () => void): () => void {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    getSnapshot(): MatchScheduleEntry[] {
      return cachedList;
    },
    getServerSnapshot(): MatchScheduleEntry[] {
      return EMPTY_SERVER;
    },
  };
}

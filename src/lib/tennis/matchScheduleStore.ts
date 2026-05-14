import { useSyncExternalStore } from 'react';
import type { MatchScheduleEntry, MatchScheduleStatus } from '@/data/services/contracts/matchSchedulePort';
import { getMatchSchedulePort } from '@/data/services/registry';

export type { MatchScheduleEntry, MatchScheduleStatus };

export function useMatchSchedules(): MatchScheduleEntry[] {
  const port = getMatchSchedulePort();
  return useSyncExternalStore(port.subscribe.bind(port), port.getSnapshot.bind(port), port.getServerSnapshot.bind(port));
}

export function upsertMatchSchedule(input: Omit<MatchScheduleEntry, 'updatedAt'> & { updatedAt?: number }): void {
  getMatchSchedulePort().upsertSchedule(input);
}

export function removeMatchSchedule(dedupeKey: string): void {
  getMatchSchedulePort().removeSchedule(dedupeKey);
}

export function getMatchSchedules(): MatchScheduleEntry[] {
  return getMatchSchedulePort().getAllSchedules();
}

export function getMatchScheduleByKey(dedupeKey: string): MatchScheduleEntry | undefined {
  return getMatchSchedulePort().getScheduleByDedupeKey(dedupeKey);
}

export function subscribeMatchSchedules(callback: () => void): () => void {
  return getMatchSchedulePort().subscribe(callback);
}

export function getMatchSchedulesSnapshot(): MatchScheduleEntry[] {
  return getMatchSchedulePort().getSnapshot();
}

export function getMatchSchedulesServerSnapshot(): MatchScheduleEntry[] {
  return getMatchSchedulePort().getServerSnapshot();
}

/** Confirmación batch (API: un POST; local: mismo criterio que la vista admin). */
export function confirmMatchSchedules(tournamentId: string, dedupeKeys: string[]): void {
  getMatchSchedulePort().confirmSchedules(tournamentId, dedupeKeys);
}

export function rescheduleMatchSchedule(
  dedupeKey: string,
  patch: Partial<Pick<MatchScheduleEntry, 'date' | 'time' | 'venue' | 'note'>> & {
    tournamentId: string;
    leagueNum: number;
  },
): void {
  getMatchSchedulePort().rescheduleMatch(dedupeKey, patch);
}

export function postponeMatchScheduleByKey(dedupeKey: string, patch?: { note?: string; venue?: string }): void {
  getMatchSchedulePort().postponeMatch(dedupeKey, patch);
}

export function cancelMatchScheduleByKey(dedupeKey: string): void {
  getMatchSchedulePort().cancelSchedule(dedupeKey);
}

/** Hidrata caché desde `GET /api/public/tournaments/:slug/schedule` (`schedules`). */
export function mergeMatchScheduleRows(rows: MatchScheduleEntry[]): void {
  getMatchSchedulePort().mergeSchedules(rows);
}

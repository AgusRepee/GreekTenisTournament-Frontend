import { useSyncExternalStore } from 'react';
import { getMatchResultsPort } from '../services/registry';
import type { MatchInput } from '../types';

/** Resultados reactivos para standings en tiempo real. */
export function useResults(): MatchInput[] {
  const port = getMatchResultsPort();
  return useSyncExternalStore(port.subscribe, port.getSnapshot, port.getServerSnapshot);
}

export function upsertResult(result: MatchInput): void {
  getMatchResultsPort().upsert(result);
}

export function removeResultByDedupeKey(dedupeKey: string): void {
  getMatchResultsPort().removeByDedupeKey(dedupeKey);
}

/** @deprecated Usá upsertResult (evita duplicados). */
export function addResult(result: MatchInput): void {
  upsertResult(result);
}

export function getResults(): MatchInput[] {
  return getMatchResultsPort().getAll();
}

export function getResultByMatchId(matchId: string): MatchInput | undefined {
  return getMatchResultsPort().getByMatchId(matchId);
}

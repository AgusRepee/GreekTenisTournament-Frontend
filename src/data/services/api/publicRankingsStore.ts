/**
 * Caché en memoria del ranking público (`GET /api/public/rankings`).
 * Una sola petición compartida: evita perder datos si un hook se desmonta antes del fetch
 * (acceso directo por URL, Strict Mode, cambio rápido de pantalla).
 */

import type { LeagueNum } from '@/lib/mockData';
import type { CalculatedRankingRow } from '@/lib/tennis/tournamentRanking';
import { fetchApiRankingsByLeague } from './apiRankingRepository';

export type PublicRankingsState = {
  map: Map<LeagueNum, CalculatedRankingRow[]> | null;
  fetchDone: boolean;
  loadedFromApi: boolean;
};

const listeners = new Set<() => void>();

export const INITIAL_PUBLIC_RANKINGS_STATE: PublicRankingsState = Object.freeze({
  map: null,
  fetchDone: false,
  loadedFromApi: false,
});

let state: PublicRankingsState = { ...INITIAL_PUBLIC_RANKINGS_STATE };

let inflight: Promise<void> | null = null;

function emit(): void {
  listeners.forEach((l) => l());
}

function setState(next: PublicRankingsState): void {
  state = next;
  emit();
}

export function getPublicRankingsState(): PublicRankingsState {
  return state;
}

export function subscribePublicRankings(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

/** Inicia la carga si aún no hay datos ni petición en curso. Idempotente. */
export function ensurePublicRankingsLoaded(): void {
  if (state.map !== null || inflight) return;

  inflight = (async () => {
    try {
      const m = await fetchApiRankingsByLeague();
      setState({ map: m, fetchDone: true, loadedFromApi: true });
    } catch (e) {
      console.warn('[publicRankingsStore] no se pudo cargar ranking público', e);
      setState({ map: null, fetchDone: true, loadedFromApi: false });
    } finally {
      inflight = null;
    }
  })();
}

/** Solo tests: reiniciar caché. */
export function resetPublicRankingsStoreForTests(): void {
  inflight = null;
  state = { map: null, fetchDone: false, loadedFromApi: false };
  emit();
}

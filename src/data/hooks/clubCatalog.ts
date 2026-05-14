import { useSyncExternalStore } from 'react';
import { getClubCatalogPort } from '../services/registry';
import type { ClubDataSnapshot } from '../types';

/** Referencia estable para `getServerSnapshot` (nunca instanciar `{}` en línea). */
const EMPTY_CLUB_SNAPSHOT: ClubDataSnapshot = Object.freeze({
  players: [],
  tournaments: [],
  matches: [],
}) as ClubDataSnapshot;

export function getClubSnapshot(): ClubDataSnapshot {
  return getClubCatalogPort().getSnapshot();
}

export function subscribeClubData(onStoreChange: () => void): () => void {
  return getClubCatalogPort().subscribe(onStoreChange);
}

/** Tras mutar datos persistidos (admin), recargar el snapshot del catálogo. */
export function refreshClubDataFromStorage(): void {
  getClubCatalogPort().refresh();
}

export function useClubData(): ClubDataSnapshot {
  const port = getClubCatalogPort();
  return useSyncExternalStore(port.subscribe, port.getSnapshot, () => EMPTY_CLUB_SNAPSHOT);
}

export function useClubPlayers() {
  return useClubData().players;
}

export function useClubTournaments() {
  return useClubData().tournaments;
}

export function useClubMatches() {
  return useClubData().matches;
}

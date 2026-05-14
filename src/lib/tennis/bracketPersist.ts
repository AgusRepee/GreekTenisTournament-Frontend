import { refreshClubDataFromStorage } from '@/lib/clubDataStore';
import { getData, saveData, PERSISTENCE_KEYS } from '@/lib/localPersistence';
import type { Match } from '@/lib/mockData';

/** Actualiza partidos persistidos (KO) y refresca el catálogo del club. */
export function mergePersistedMatches(mutate: (list: Match[]) => Match[]): void {
  const raw = getData<unknown>(PERSISTENCE_KEYS.partidos);
  const list = Array.isArray(raw) ? [...(raw as Match[])] : [];
  const next = mutate(list);
  saveData(PERSISTENCE_KEYS.partidos, next);
  refreshClubDataFromStorage();
}

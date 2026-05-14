import type { Match, Player, Tournament } from '@/lib/mockData';
import { buildClubDataDefaults } from '@/lib/clubDataDefaults';
import { getTorneos } from '@/lib/dataService';
import { getData } from '@/lib/localPersistence';
import { PERSISTENCE_KEYS } from '@/data/types/persistenceKeys';
import type { ClubDataSnapshot } from '@/data/types';
import type { ClubCatalogPort } from '../contracts/clubCatalogPort';

function mergeById<T extends { id: string }>(base: T[], overrides: T[]): T[] {
  const map = new Map<string, T>();
  for (const b of base) map.set(b.id, b);
  for (const o of overrides) map.set(o.id, o);
  return Array.from(map.values());
}

function normalizePersistedArray<T>(key: string): T[] {
  const raw = getData<unknown>(key);
  return Array.isArray(raw) ? (raw as T[]) : [];
}

/** No persistir campos derivados (JSON viejo puede traerlos). */
function stripPlayerDerived(p: Player): Player {
  const q = p as Record<string, unknown>;
  const { points: _pt, stats: _st, titles: _ti, runnerUps: _ru, bestGlobalPosition: _bg, ...rest } = q;
  return rest as Player;
}

function stripTournamentDerived(t: Tournament): Tournament {
  const q = t as Record<string, unknown>;
  const { winnerId: _w, finalistId: _f, matchCount: _m, ...rest } = q;
  return rest as Tournament;
}

function rebuildSnapshot(): ClubDataSnapshot {
  const { defaultPlayers, defaultTournaments } = buildClubDataDefaults();
  const merged: ClubDataSnapshot = {
    players: mergeById(defaultPlayers, normalizePersistedArray<Player>(PERSISTENCE_KEYS.jugadores)).map(stripPlayerDerived),
    tournaments: mergeById(defaultTournaments, getTorneos()).map(stripTournamentDerived),
    matches: mergeById([], normalizePersistedArray<Match>(PERSISTENCE_KEYS.partidos)),
  };
  return merged;
}

/**
 * Catálogo del club vía localStorage (merge con seed).
 * Sustituir por un adaptador que implemente {@link ClubCatalogPort}.
 */
export function createLocalClubCatalogRepository(): ClubCatalogPort {
  const listeners = new Set<() => void>();
  let snapshot: ClubDataSnapshot = rebuildSnapshot();

  return {
    getSnapshot(): ClubDataSnapshot {
      return snapshot;
    },
    subscribe(onStoreChange: () => void): () => void {
      listeners.add(onStoreChange);
      return () => listeners.delete(onStoreChange);
    },
    refresh(): void {
      snapshot = rebuildSnapshot();
      listeners.forEach((l) => l());
    },
  };
}

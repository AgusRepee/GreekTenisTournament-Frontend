import type { MatchInput } from '@/data/types';
import { MATCH_RESULTS_STORAGE_KEY } from '@/data/types/persistenceKeys';
import type { MatchResultsPort } from '../contracts/matchResultsPort';
import { matchInputDedupeKey } from '@/lib/tennis/matchDedupe';
import { DEFAULT_NOVAK_LIGA1_RESULTS } from '@/lib/tennis/novakLiga1DefaultResults';

/** Misma referencia en cada `getServerSnapshot` (evita bucle con useSyncExternalStore). */
const EMPTY_MATCH_RESULTS: MatchInput[] = Object.freeze([]) as unknown as MatchInput[];
const NOVAK_LIGA1_RESULTS_SEED_KEY = 'greek-tennis-results-seed-novak-l1-2026-v1';

function normalizeSeedName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function semanticResultKey(m: MatchInput): string {
  const players = [normalizeSeedName(m.playerA), normalizeSeedName(m.playerB)].sort().join('|');
  return `${m.tournamentId}|${m.group ?? ''}|${m.round ?? 0}|${players}`;
}

/**
 * Persistencia local de resultados (localStorage).
 * Sustituir por un adaptador HTTP que implemente {@link MatchResultsPort}.
 */
export function createLocalMatchResultsRepository(): MatchResultsPort {
  const listeners = new Set<() => void>();
  let resultsByMatchId: Record<string, MatchInput> = {};
  let cachedList: MatchInput[] = [];

  function rebuildList(): void {
    cachedList = Object.values(resultsByMatchId);
  }

  function emit(): void {
    listeners.forEach((l) => l());
  }

  function persist(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(MATCH_RESULTS_STORAGE_KEY, JSON.stringify(Object.values(resultsByMatchId)));
    } catch {
      /* quota */
    }
  }

  function loadFromStorage(): void {
    if (typeof localStorage === 'undefined') {
      resultsByMatchId = Object.fromEntries(DEFAULT_NOVAK_LIGA1_RESULTS.map((m) => [matchInputDedupeKey(m), { ...m, matchId: matchInputDedupeKey(m) }]));
      rebuildList();
      return;
    }
    try {
      const raw = localStorage.getItem(MATCH_RESULTS_STORAGE_KEY);
      const arr = raw ? (JSON.parse(raw) as MatchInput[]) : [];
      if (!Array.isArray(arr)) {
        resultsByMatchId = {};
      } else {
        const next: Record<string, MatchInput> = {};
        for (const m of arr) {
          const id = matchInputDedupeKey(m);
          next[id] = { ...m, matchId: id };
        }
        resultsByMatchId = next;
      }
      if (localStorage.getItem(NOVAK_LIGA1_RESULTS_SEED_KEY) !== '1') {
        const existingSemantic = new Set(Object.values(resultsByMatchId).map(semanticResultKey));
        for (const m of DEFAULT_NOVAK_LIGA1_RESULTS) {
          if (existingSemantic.has(semanticResultKey(m))) continue;
          const id = matchInputDedupeKey(m);
          resultsByMatchId[id] = { ...m, matchId: id };
        }
        rebuildList();
        localStorage.setItem(NOVAK_LIGA1_RESULTS_SEED_KEY, '1');
        persist();
      }
    } catch {
      resultsByMatchId = {};
    }
    rebuildList();
  }

  loadFromStorage();

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e: StorageEvent) => {
      if (e.key !== MATCH_RESULTS_STORAGE_KEY) return;
      loadFromStorage();
      emit();
    });
  }

  return {
    getAll(): MatchInput[] {
      return cachedList;
    },
    getByMatchId(matchId: string): MatchInput | undefined {
      return resultsByMatchId[matchId];
    },
    upsert(result: MatchInput): void {
      const id = matchInputDedupeKey(result);
      resultsByMatchId = {
        ...resultsByMatchId,
        [id]: { ...result, matchId: id },
      };
      rebuildList();
      persist();
      emit();
    },
    removeByDedupeKey(dedupeKey: string): void {
      if (resultsByMatchId[dedupeKey] === undefined) return;
      const { [dedupeKey]: _, ...rest } = resultsByMatchId;
      resultsByMatchId = rest;
      rebuildList();
      persist();
      emit();
    },
    subscribe(callback: () => void): () => void {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    getSnapshot(): MatchInput[] {
      return cachedList;
    },
    getServerSnapshot(): MatchInput[] {
      return EMPTY_MATCH_RESULTS;
    },
  };
}

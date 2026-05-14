import type { MatchInput } from '@/data/types';
import type { MatchResultsPort } from '../contracts/matchResultsPort';
import { matchInputDedupeKey } from '@/lib/tennis/matchDedupe';
import {
  deleteAdminMatchResultByDedupeKey,
  getAdminMatchResults,
  postMatchResult,
} from '@/lib/api/apiClient';

const EMPTY_SERVER: MatchInput[] = Object.freeze([]) as unknown as MatchInput[];

function playedAtToDateString(playedAt: unknown): string | undefined {
  if (playedAt == null) return undefined;
  if (typeof playedAt === 'string') {
    const s = playedAt.trim();
    if (!s) return undefined;
    return s.length >= 10 ? s.slice(0, 10) : s;
  }
  if (typeof playedAt === 'object' && playedAt !== null && 'toISOString' in playedAt) {
    try {
      return (playedAt as Date).toISOString().slice(0, 10);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function rowToMatchInput(row: Record<string, unknown>): MatchInput | null {
  const tournamentId = typeof row.tournamentId === 'string' ? row.tournamentId : '';
  const playerA = typeof row.playerA === 'string' ? row.playerA : '';
  const playerB = typeof row.playerB === 'string' ? row.playerB : '';
  const status = row.status as MatchInput['status'];
  if (!tournamentId || !playerA || !playerB) return null;
  const dedupeKey = typeof row.dedupeKey === 'string' ? row.dedupeKey : '';
  const group = typeof row.groupKey === 'string' ? row.groupKey : '';
  const roundNum = typeof row.roundNum === 'number' ? row.roundNum : 0;
  const score = row.score != null ? String(row.score) : '';
  const date = playedAtToDateString(row.playedAt);
  const m: MatchInput = {
    matchId: dedupeKey || undefined,
    tournamentId,
    group: group || undefined,
    round: roundNum,
    playerA,
    playerB,
    score,
    status: status ?? 'pending',
    date,
  };
  const id = matchInputDedupeKey(m);
  return { ...m, matchId: id };
}

/**
 * Persistencia de resultados vía API admin + MySQL.
 * Mantiene el contrato {@link MatchResultsPort} (síncrono para `useSyncExternalStore`;
 * las escrituras disparan `fetch` en segundo plano y re-sincronizan desde el servidor).
 */
export function createApiMatchResultsRepository(): MatchResultsPort {
  const listeners = new Set<() => void>();
  let resultsByMatchId: Record<string, MatchInput> = {};
  let cachedList: MatchInput[] = [];

  function rebuildList(): void {
    cachedList = Object.values(resultsByMatchId);
  }

  function emit(): void {
    listeners.forEach((l) => l());
  }

  function applyRows(rows: Record<string, unknown>[]): void {
    const next: Record<string, MatchInput> = {};
    for (const raw of rows) {
      const m = rowToMatchInput(raw);
      if (!m) continue;
      const id = matchInputDedupeKey(m);
      next[id] = { ...m, matchId: id };
    }
    resultsByMatchId = next;
    rebuildList();
    emit();
  }

  async function reloadFromServer(): Promise<void> {
    try {
      const rows = await getAdminMatchResults();
      if (!Array.isArray(rows)) {
        console.warn('[apiMatchResults] respuesta inesperada, se esperaba array');
        return;
      }
      applyRows(rows);
    } catch (e) {
      console.warn('[apiMatchResults] no se pudo cargar desde API', e);
    }
  }

  void reloadFromServer();

  return {
    getAll(): MatchInput[] {
      return cachedList;
    },
    getByMatchId(matchId: string): MatchInput | undefined {
      return resultsByMatchId[matchId];
    },
    upsert(result: MatchInput): void {
      const id = matchInputDedupeKey(result);
      const merged: MatchInput = { ...result, matchId: id };
      resultsByMatchId = { ...resultsByMatchId, [id]: merged };
      rebuildList();
      emit();

      const payload: Record<string, unknown> = {
        dedupeKey: id,
        tournamentId: merged.tournamentId,
        group: merged.group,
        round: merged.round,
        playerA: merged.playerA,
        playerB: merged.playerB,
        score: merged.score ?? '',
        status: merged.status,
        date: merged.date?.trim() || new Date().toISOString().slice(0, 10),
        matchId: merged.matchId,
      };

      void (async () => {
        try {
          await postMatchResult(id, payload);
          await reloadFromServer();
        } catch (e) {
          console.error('[apiMatchResults] upsert falló, re-sincronizando', e);
          await reloadFromServer();
        }
      })();
    },
    removeByDedupeKey(dedupeKey: string): void {
      if (resultsByMatchId[dedupeKey] === undefined) return;
      const { [dedupeKey]: _, ...rest } = resultsByMatchId;
      resultsByMatchId = rest;
      rebuildList();
      emit();
      void (async () => {
        try {
          await deleteAdminMatchResultByDedupeKey(dedupeKey);
          await reloadFromServer();
        } catch (e) {
          console.error('[apiMatchResults] delete falló, re-sincronizando', e);
          await reloadFromServer();
        }
      })();
    },
    subscribe(callback: () => void): () => void {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    getSnapshot(): MatchInput[] {
      return cachedList;
    },
    getServerSnapshot(): MatchInput[] {
      return EMPTY_SERVER;
    },
  };
}

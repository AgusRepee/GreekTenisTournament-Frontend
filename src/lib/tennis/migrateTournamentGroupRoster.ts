import type { MatchInput } from '@/types/tennisResults';
import { getPlayerById } from '@/lib/mockData';
import { cleanPlayerName, matchInputDedupeKey } from '@/lib/tennis/matchDedupe';
import { normalizePlayerName } from '@/lib/tennis/matchStatsEngine';
import { getResults, removeResultByDedupeKey, upsertResult } from '@/lib/tennis/resultsStore';

export function rosterIdToMatchPlayerNorm(rosterId: string): string {
  if (rosterId.startsWith('name:')) {
    return normalizePlayerName(rosterId.slice('name:'.length));
  }
  const p = getPlayerById(rosterId);
  return normalizePlayerName(cleanPlayerName(p?.name ?? rosterId));
}

/** Traslada partidos guardados de un jugador entre claves de grupo (`A`, `B`, …). */
export function migrateTournamentResultsForGroupChange(
  tournamentId: string,
  playerRosterId: string,
  fromGroup: string,
  toGroup: string,
): number {
  const fg = fromGroup.trim();
  const tg = toGroup.trim();
  if (!fg || !tg || fg === tg) return 0;

  const targetNorm = rosterIdToMatchPlayerNorm(playerRosterId);
  const all = getResults();
  const updates: { oldKey: string; next: MatchInput }[] = [];

  for (const m of all) {
    if (m.tournamentId !== tournamentId) continue;
    if ((m.group ?? '').trim() !== fg) continue;
    const pa = normalizePlayerName(cleanPlayerName(m.playerA));
    const pb = normalizePlayerName(cleanPlayerName(m.playerB));
    if (pa !== targetNorm && pb !== targetNorm) continue;
    const oldKey = matchInputDedupeKey(m);
    const next = { ...m, group: tg };
    const newKey = matchInputDedupeKey(next);
    if (oldKey !== newKey) {
      updates.push({ oldKey, next: { ...next, matchId: newKey } });
    }
  }

  for (const { oldKey, next } of updates) {
    removeResultByDedupeKey(oldKey);
    upsertResult(next);
  }
  return updates.length;
}

export function computeRosterGroupMoves(
  prev: Record<string, string[]>,
  next: Record<string, string[]>,
): { playerId: string; from: string; to: string }[] {
  const prevGroup = new Map<string, string>();
  for (const [g, ids] of Object.entries(prev)) {
    for (const id of ids) prevGroup.set(id, g);
  }
  const nextGroup = new Map<string, string>();
  for (const [g, ids] of Object.entries(next)) {
    for (const id of ids) nextGroup.set(id, g);
  }
  const moves: { playerId: string; from: string; to: string }[] = [];
  for (const [id, toG] of nextGroup) {
    const fromG = prevGroup.get(id);
    if (fromG && fromG !== toG) {
      moves.push({ playerId: id, from: fromG, to: toG });
    }
  }
  return moves;
}

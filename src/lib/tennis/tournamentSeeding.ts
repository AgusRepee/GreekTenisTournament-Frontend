/**
 * Cabeza de serie (seed) por torneo: orden según ranking de liga **antes** del torneo,
 * o snapshot oficial (`Tournament.preclasificacion`) cuando está fijado en admin.
 */

import type { Tournament, TournamentPreclasificacion } from '../mockData';
import type { CalculatedRankingRow } from './tournamentRanking';

export interface TournamentSeedEntry {
  playerId: string;
  seed: number;
}

function sortRankingRowsForSnapshot(rows: readonly CalculatedRankingRow[]): CalculatedRankingRow[] {
  return [...rows].sort((a, b) => {
    const pa = Number(a.position) || 9999;
    const pb = Number(b.position) || 9999;
    if (pa !== pb) return pa - pb;
    if ((b.points ?? 0) !== (a.points ?? 0)) return (b.points ?? 0) - (a.points ?? 0);
    return a.playerId.localeCompare(b.playerId);
  });
}

/** Crea snapshot persistible con el orden actual del ranking de liga (sin duplicados). */
export function createPreclasificacionFromLeagueRanking(
  leagueRanking: readonly CalculatedRankingRow[],
): TournamentPreclasificacion {
  const sorted = sortRankingRowsForSnapshot(leagueRanking);
  const seen = new Set<string>();
  const orderedPlayerIds: string[] = [];
  for (const r of sorted) {
    const id = r.playerId?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    orderedPlayerIds.push(id);
  }
  return {
    capturedAt: new Date().toISOString(),
    sourceLabel: 'Ranking de liga',
    orderedPlayerIds,
  };
}

/** Snapshot manual (p. ej. top 8 Masters) con etiqueta opcional. */
export function createPreclasificacionSnapshot(
  orderedPlayerIds: readonly string[],
  sourceLabel?: string,
): TournamentPreclasificacion {
  return {
    capturedAt: new Date().toISOString(),
    sourceLabel: sourceLabel ?? 'Ranking de liga',
    orderedPlayerIds: [...orderedPlayerIds],
  };
}

/**
 * Mapa seed → jugador para los participantes del torneo.
 * Si hay `preclasificacion`, los ids que aparecen en el snapshot entran primero (orden del snapshot);
 * el resto se ordena por ranking **vivo** como cola.
 */
export function buildOfficialTournamentSeedMap(
  tournament: Pick<Tournament, 'preclasificacion'>,
  participantIds: readonly string[],
  leagueRanking: readonly CalculatedRankingRow[],
): Map<string, number> {
  const snap = tournament.preclasificacion;
  if (!snap?.orderedPlayerIds?.length) {
    return tournamentSeedsToMap(calculateTournamentSeeds(participantIds, leagueRanking));
  }
  const want = new Set(participantIds);
  const used = new Set<string>();
  const entries: TournamentSeedEntry[] = [];
  let seed = 1;
  for (const id of snap.orderedPlayerIds) {
    if (!want.has(id) || used.has(id)) continue;
    used.add(id);
    entries.push({ playerId: id, seed: seed++ });
  }
  const rest = participantIds.filter((id) => !used.has(id));
  if (rest.length === 0) return tournamentSeedsToMap(entries);
  const tail = calculateTournamentSeeds(rest, leagueRanking);
  const offset = entries.length;
  for (const t of tail) {
    entries.push({ playerId: t.playerId, seed: offset + t.seed });
  }
  return tournamentSeedsToMap(entries);
}

function resolveParticipantIds(players: readonly string[] | readonly { id: string }[]): string[] {
  if (players.length === 0) return [];
  const first = players[0];
  if (typeof first === 'string') return [...(players as readonly string[])];
  return (players as readonly { id: string }[]).map((p) => p.id);
}

/**
 * Asigna seeds 1…N a los participantes del torneo según su posición en la tabla de la liga.
 * Quienes no aparecen en `leagueRanking` quedan al final (orden estables por id).
 */
export function calculateTournamentSeeds(
  players: readonly string[] | readonly { id: string }[],
  leagueRanking: readonly CalculatedRankingRow[],
): TournamentSeedEntry[] {
  const tournamentParticipants = resolveParticipantIds(players);
  const posById = new Map<string, number>();
  for (const row of leagueRanking) {
    posById.set(row.playerId, row.position);
  }
  const UNRANKED = 1_000_000;
  const enriched = tournamentParticipants.map((id) => ({
    id,
    rank: posById.get(id) ?? UNRANKED,
  }));
  enriched.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.id.localeCompare(b.id, 'es');
  });
  return enriched.map((e, i) => ({ playerId: e.id, seed: i + 1 }));
}

export function tournamentSeedsToMap(entries: readonly TournamentSeedEntry[]): Map<string, number> {
  return new Map(entries.map((e) => [e.playerId, e.seed]));
}

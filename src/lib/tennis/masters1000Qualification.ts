/**
 * Clasificación al Master Finals: top 8 del ranking de liga repartidos en 2 grupos (serpiente).
 */

import type { CalculatedRankingRow } from './tournamentRanking';

export const MASTERS_QUALIFIER_COUNT = 8;

/** Serpiente estándar: A = seeds 1,4,5,8 · B = 2,3,6,7 (orden del ranking de entrada). */
export function splitTopEightSnake(playerIds: string[]): { A: string[]; B: string[] } {
  const A: string[] = [];
  const B: string[] = [];
  for (let i = 0; i < Math.min(MASTERS_QUALIFIER_COUNT, playerIds.length); i++) {
    const id = playerIds[i]!;
    const m = i % 4;
    if (m === 0 || m === 3) A.push(id);
    else B.push(id);
  }
  return { A, B };
}

function sortRowsForMastersPick(rows: CalculatedRankingRow[]): CalculatedRankingRow[] {
  return [...rows].sort((a, b) => {
    const pa = Number(a.position) || 9999;
    const pb = Number(b.position) || 9999;
    if (pa !== pb) return pa - pb;
    if ((b.points ?? 0) !== (a.points ?? 0)) return (b.points ?? 0) - (a.points ?? 0);
    return a.playerId.localeCompare(b.playerId);
  });
}

export type MastersRosterProposal =
  | { ok: true; override: Record<string, string[]>; rankingOrderedTopEight: string[] }
  | { ok: false; message: string };

/** Toma filas ya filtradas por liga; ordena por posición/puntos y arma grupos A/B. */
export function proposeMastersGroupRosterFromRankingRows(rows: CalculatedRankingRow[]): MastersRosterProposal {
  const sorted = sortRowsForMastersPick(rows);
  const seen = new Set<string>();
  const uniqueOrdered: string[] = [];
  for (const r of sorted) {
    const id = r.playerId?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    uniqueOrdered.push(id);
    if (uniqueOrdered.length >= MASTERS_QUALIFIER_COUNT) break;
  }
  if (uniqueOrdered.length < MASTERS_QUALIFIER_COUNT) {
    return {
      ok: false,
      message: `Hay ${uniqueOrdered.length} jugador(es) con ranking en esta liga; hacen falta ${MASTERS_QUALIFIER_COUNT} para el Master Finals.`,
    };
  }
  const { A, B } = splitTopEightSnake(uniqueOrdered);
  return { ok: true, override: { A, B }, rankingOrderedTopEight: [...uniqueOrdered] };
}

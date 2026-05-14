/**
 * Snapshot serializable del torneo para futura UI (tablas + stats + partidos por grupo).
 */

import type { MatchInput, PlayerStats, TournamentMeta } from '../../types/tennisResults';
import {
  aggregatePlayerStats,
  computeGroupStandings,
  lastNMatches,
  type ExtendedStandingRow,
} from './matchStatsEngine';

export interface TournamentSnapshot {
  meta: TournamentMeta;
  groups: Record<
    string,
    {
      standings: ExtendedStandingRow[];
      matches: MatchInput[];
    }
  >;
  globalStats: PlayerStats[];
}

/**
 * Construye snapshot completo a partir de meta, plantilla (`docs/ligaN.json`) y partidos.
 * `ligaTemplate.grupos` define qué grupos aparecen; los partidos se filtran por `match.group`.
 */
export function computeTournamentSnapshot(
  meta: TournamentMeta,
  ligaTemplate: { grupos: Record<string, string[]> },
  results: MatchInput[],
): TournamentSnapshot {
  const groups: TournamentSnapshot['groups'] = {};
  const allMatches: MatchInput[] = [];

  for (const groupName of Object.keys(ligaTemplate.grupos)) {
    const groupMatches = results.filter((m) => m.group === groupName);
    allMatches.push(...groupMatches);
    const standings = computeGroupStandings(groupMatches);
    groups[groupName] = {
      standings,
      matches: groupMatches,
    };
  }

  const globalStats = aggregatePlayerStats(allMatches);

  return {
    meta,
    groups,
    globalStats,
  };
}

/**
 * Últimos N partidos de un jugador dentro del conjunto de partidos del snapshot.
 */
export function getPlayerRecentMatches(
  player: string,
  snapshot: TournamentSnapshot,
  n = 5,
) {
  const allMatches = Object.values(snapshot.groups).flatMap((g) => g.matches);
  return lastNMatches(player, allMatches, n);
}

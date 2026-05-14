/**
 * Puntos de torneo por **fase máxima alcanzada** (no por partido).
 */

import type { Match, Tournament, TournamentReachPointsTable } from '../../types/tournament';
import {
  domainMatchesToTournamentPhaseMatches,
  getPlayerReachedPhase,
  type PlayerReachedPhase,
} from './playerReachedPhase';

export const DEFAULT_TOURNAMENT_REACH_POINTS: TournamentReachPointsTable = {
  champion: 500,
  finalist: 350,
  semifinalist: 200,
  quarterfinalist: 100,
  group_stage: 50,
  repechage: 50,
};

function mergeReachPointsTable(rules: Tournament['rules']): TournamentReachPointsTable {
  return {
    ...DEFAULT_TOURNAMENT_REACH_POINTS,
    ...(rules.phaseReachPoints ?? {}),
  };
}

function pointsForPhase(phase: PlayerReachedPhase, table: TournamentReachPointsTable): number {
  switch (phase) {
    case 'champion':
      return table.champion;
    case 'finalist':
      return table.finalist;
    case 'semifinalist':
      return table.semifinalist;
    case 'quarterfinalist':
      return table.quarterfinalist;
    case 'group_stage':
      return table.group_stage;
    case 'repechage':
      return table.repechage;
    default:
      return 0;
  }
}

export interface CalculateTournamentPointsResult {
  points: number;
  phase: PlayerReachedPhase;
}

/**
 * Puntos del torneo para el jugador según la fase más lejana alcanzada (grupos + eliminatoria en `matches`).
 * `tournament.rules.phaseReachPoints` puede sobreescribir cifras parciales; por defecto 500/350/200/100/50.
 */
export function calculateTournamentPoints(
  playerId: string,
  tournament: Tournament,
  matches: ReadonlyArray<Match>,
): CalculateTournamentPointsResult {
  const scoped = matches.filter((m) => m.tournamentId === tournament.id);
  const phaseRows = domainMatchesToTournamentPhaseMatches(scoped);
  const phase = getPlayerReachedPhase(playerId, phaseRows);
  const table = mergeReachPointsTable(tournament.rules);
  const points = pointsForPhase(phase, table);
  return { points, phase };
}

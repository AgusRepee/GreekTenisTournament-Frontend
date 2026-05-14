/**
 * Ranking global derivado solo de torneos + partidos completados (puntos por fase alcanzada).
 */

import type { LeagueId, Match, Player, Tournament } from '../../types/tournament';
import { calculateTournamentPoints } from './tournamentPhasePoints';
import type { PlayerReachedPhase } from './playerReachedPhase';

export interface GlobalRankingEntry {
  playerId: string;
  playerName: string;
  league: LeagueId;
  totalPoints: number;
  tournamentsPlayed: number;
  tournamentsWon: number;
  /** Mejor fase alcanzada en un solo torneo (información / desempates futuros). */
  bestPhase: PlayerReachedPhase;
  /** Orden interno de `bestPhase` (mayor = mejor resultado histórico). */
  bestPhaseRank: number;
  position: number;
}

function phaseRank(phase: PlayerReachedPhase): number {
  const map: Record<PlayerReachedPhase, number> = {
    champion: 6,
    finalist: 5,
    semifinalist: 4,
    quarterfinalist: 3,
    repechage: 2,
    group_stage: 1,
    none: 0,
  };
  return map[phase];
}

/** Partido con resultado utilizable para ranking (no pendiente). */
export function isCompletedRankingMatch(m: Match): boolean {
  if (!m.completed) return false;
  if (m.winnerId) return true;
  return Boolean(m.result?.trim() && m.outcome && m.outcome !== 'pending');
}

export function playerParticipatedInTournament(
  playerId: string,
  tournamentId: string,
  matches: ReadonlyArray<Match>,
): boolean {
  return matches.some(
    (m) =>
      m.tournamentId === tournamentId &&
      isCompletedRankingMatch(m) &&
      (m.player1Id === playerId || m.player2Id === playerId),
  );
}

function capTournamentPoints(tournament: Tournament, points: number): number {
  const cap = tournament.maxPoints ?? tournament.rules.maxRankingPoints;
  if (cap == null || cap < 0) return points;
  return Math.min(points, cap);
}

/**
 * Ranking global: suma de puntos por fase (`calculateTournamentPoints`) en torneos donde el jugador
 * disputó al menos un partido completado; orden por puntos, torneos ganados (campeón), nombre.
 */
export function calculateGlobalRanking(
  players: ReadonlyArray<Player>,
  tournaments: ReadonlyArray<Tournament>,
  matches: ReadonlyArray<Match>,
): GlobalRankingEntry[] {
  const played = matches.filter(isCompletedRankingMatch);

  const rows: GlobalRankingEntry[] = players.map((p) => {
    let totalPoints = 0;
    let tournamentsPlayed = 0;
    let tournamentsWon = 0;
    let bestPhaseRank = 0;
    let bestPhase: PlayerReachedPhase = 'none';

    for (const t of tournaments) {
      if (!playerParticipatedInTournament(p.id, t.id, played)) continue;
      const { points, phase } = calculateTournamentPoints(p.id, t, played);
      const pts = capTournamentPoints(t, points);
      tournamentsPlayed += 1;
      totalPoints += pts;
      if (phase === 'champion') tournamentsWon += 1;
      const pr = phaseRank(phase);
      if (pr > bestPhaseRank) {
        bestPhaseRank = pr;
        bestPhase = phase;
      }
    }

    return {
      playerId: p.id,
      playerName: p.name,
      league: p.league,
      totalPoints,
      tournamentsPlayed,
      tournamentsWon,
      bestPhase,
      bestPhaseRank,
      position: 0,
    };
  });

  rows.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.tournamentsWon !== a.tournamentsWon) return b.tournamentsWon - a.tournamentsWon;
    return a.playerName.localeCompare(b.playerName, 'es');
  });

  return rows.map((r, i) => ({ ...r, position: i + 1 }));
}

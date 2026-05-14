import { describe, it, expect } from 'vitest';
import { calculatePlayerStats, type PlayerProfileStats } from '../calculatePlayerStats';
import type { Match, Tournament } from '../../mockData';
import type { Match as DomainMatch, Tournament as DomainTournament } from '../../../types/tournament';
import type { MatchInput } from '../../../types/tennisResults';

const players = [
  { id: 'p-ana', name: 'Ana G.', category: 'Primera' as const },
  { id: 'p-bea', name: 'Bea L.', category: 'Primera' as const },
];

const tournaments: Tournament[] = [
  {
    id: 't1',
    name: 'Torneo Test',
    category: 'Primera',
    status: 'finished',
    startDate: '2025-01-01',
    endDate: '2025-01-10',
    location: 'Club',
    league: 1,
  },
];

const knockoutFinal: Match[] = [
  {
    id: 'ko-f1',
    tournamentId: 't1',
    playerA: 'p-ana',
    playerB: 'p-bea',
    score: '6-4 6-3',
    winnerId: 'p-ana',
    round: 'Final',
  },
];

describe('calculatePlayerStats', () => {
  it('agrega PG/PP y sets desde MatchInput', () => {
    const matches: MatchInput[] = [
      {
        tournamentId: 't1',
        group: 'A',
        round: 1,
        playerA: 'Ana G.',
        playerB: 'Bea L.',
        score: '6-2 6-3',
        status: 'played',
      },
    ];
    const ana = calculatePlayerStats('p-ana', matches, tournaments, players, knockoutFinal);
    expect(ana.totalMatchesPlayed).toBe(1);
    expect(ana.totalWins).toBe(1);
    expect(ana.totalLosses).toBe(0);
    expect(ana.setsWon).toBe(2);
    expect(ana.setsLost).toBe(0);
    expect(ana.setDifference).toBe(2);
    expect(ana.tournamentsPlayed).toBe(1);
    expect(ana.tournamentsWon).toBe(1);
    expect(ana.currentLeague).toBe(1);
  });

  it('devuelve ceros si el jugador no está en el roster', () => {
    const s = calculatePlayerStats('missing', [], tournaments, players);
    expect(s.totalMatchesPlayed).toBe(0);
    expect(s.playerName).toBe('—');
  });
});

const dt = (id: string): DomainTournament => ({
  id,
  name: id,
  league: 3,
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  status: 'finished',
  rules: {},
  groups: [],
});

function dm(
  tid: string,
  id: string,
  stage: DomainMatch['stage'],
  p1: string,
  p2: string,
  winner: string,
  rn: number,
): DomainMatch {
  return {
    id,
    tournamentId: tid,
    stage,
    roundNumber: rn,
    player1Id: p1,
    player2Id: p2,
    winnerId: winner,
    completed: true,
    outcome: 'played',
    result: '6-0 6-0',
  };
}

describe('calculatePlayerStats (Match dominio)', () => {
  it('agrega PG/PP, sets, torneos y fases KO', () => {
    const tournaments: DomainTournament[] = [dt('t1')];
    const matches: DomainMatch[] = [
      dm('t1', 'g1', 'group', 'a', 'b', 'a', 1),
      dm('t1', 'sf1', 'semifinal', 'a', 'c', 'a', 2),
      dm('t1', 'f1', 'final', 'a', 'd', 'a', 3),
    ];
    const s = calculatePlayerStats('a', matches, tournaments) as PlayerProfileStats;
    expect(s.matchesPlayed).toBe(3);
    expect(s.wins).toBe(3);
    expect(s.losses).toBe(0);
    expect(s.tournamentsPlayed).toBe(1);
    expect(s.tournamentsWon).toBe(1);
    expect(s.finalsReached).toBe(1);
    expect(s.semifinalsReached).toBe(1);
    expect(s.bestRankingPosition).toBe(1);
  });
});

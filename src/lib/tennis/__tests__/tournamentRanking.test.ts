import { describe, it, expect } from 'vitest';
import {
  calculateClubLeagueGlobalRanking,
  calculateTournamentPoints,
  DEFAULT_TOURNAMENT_PHASE_POINTS,
} from '../tournamentRanking';
import type { Match, Tournament } from '../../mockData';
import type { MatchInput } from '../../../types/tennisResults';

const players = [
  { id: 'p1', name: 'Uno', category: 'Primera' as const },
  { id: 'p2', name: 'Dos', category: 'Primera' as const },
];

const tournament: Tournament = {
  id: 't-x',
  name: 'Test',
  category: 'Primera',
  status: 'finished',
  startDate: '2025-01-01',
  endDate: '2025-01-02',
  location: 'Club',
  league: 1,
};

describe('calculateTournamentPoints', () => {
  it('campeón por partido de final (KO)', () => {
    const ko: Match[] = [
      {
        id: 'f1',
        tournamentId: 't-x',
        playerA: 'p1',
        playerB: 'p2',
        score: '6-0 6-0',
        winnerId: 'p1',
        round: 'Final',
      },
    ];
    const r = calculateTournamentPoints('p1', tournament, { resultMatches: [], knockoutMatches: ko, players }, DEFAULT_TOURNAMENT_PHASE_POINTS);
    expect(r.phase).toBe('champion');
    expect(r.points).toBe(500);
  });

  it('finalista por partido de final', () => {
    const ko: Match[] = [
      {
        id: 'f1',
        tournamentId: 't-x',
        playerA: 'p1',
        playerB: 'p2',
        score: '6-4 6-3',
        winnerId: 'p2',
        round: 'Final',
      },
    ];
    const r = calculateTournamentPoints('p1', tournament, { resultMatches: [], knockoutMatches: ko, players }, DEFAULT_TOURNAMENT_PHASE_POINTS);
    expect(r.phase).toBe('finalist');
    expect(r.points).toBe(350);
  });

  it('participación en grupos sin KO', () => {
    const results: MatchInput[] = [
      {
        tournamentId: 't-x',
        group: 'A',
        round: 1,
        playerA: 'Uno',
        playerB: 'Dos',
        score: '6-0 6-0',
        status: 'played',
      },
    ];
    const r = calculateTournamentPoints('p2', tournament, { resultMatches: results, knockoutMatches: [], players }, DEFAULT_TOURNAMENT_PHASE_POINTS);
    expect(r.phase).toBe('group_participant');
    expect(r.points).toBe(25);
  });
});

describe('calculateClubLeagueGlobalRanking', () => {
  it('ordena por puntos de fase', () => {
    const t1: Tournament = { ...tournament, id: 't-a' };
    const ko: Match[] = [
      {
        id: 'f1',
        tournamentId: 't-a',
        playerA: 'p1',
        playerB: 'p2',
        score: '6-0 6-0',
        winnerId: 'p1',
        round: 'Final',
      },
    ];
    const rows = calculateClubLeagueGlobalRanking(players, [t1], [], ko, {
      league: 1,
      previous: null,
    });
    expect(rows[0]!.playerId).toBe('p1');
    expect(rows[0]!.points).toBe(500);
    expect(rows.find((r) => r.playerId === 'p2')!.points).toBe(350);
  });
});

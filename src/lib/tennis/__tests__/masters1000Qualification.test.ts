import { describe, expect, it } from 'vitest';
import { MASTERS_QUALIFIER_COUNT, proposeMastersGroupRosterFromRankingRows, splitTopEightSnake } from '../masters1000Qualification';
import type { CalculatedRankingRow } from '../tournamentRanking';

function row(pid: string, position: number, points = 0): CalculatedRankingRow {
  return {
    position,
    playerId: pid,
    league: 1,
    points,
    tournamentsPlayed: 0,
    matchesPlayedResults: 0,
    wins: 0,
    losses: 0,
    setsWon: 0,
    setsLost: 0,
    gamesWon: 0,
    gamesLost: 0,
    rankingPositionChange: null,
    pointsChange: null,
  };
}

describe('splitTopEightSnake', () => {
  it('reparte 1–8 en A={1,4,5,8} y B={2,3,6,7}', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
    expect(splitTopEightSnake(ids)).toEqual({
      A: ['p1', 'p4', 'p5', 'p8'],
      B: ['p2', 'p3', 'p6', 'p7'],
    });
  });
});

describe('proposeMastersGroupRosterFromRankingRows', () => {
  it('requiere 8 filas únicas', () => {
    const res = proposeMastersGroupRosterFromRankingRows([row('a', 1), row('b', 2)]);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/8/);
  });

  it('ordena por posición y arma override A/B', () => {
    const rows = [
      row('low', 9, 100),
      row('x1', 1, 50),
      row('x2', 2, 40),
      row('x3', 3, 30),
      row('x4', 4, 20),
      row('x5', 5, 10),
      row('x6', 6, 5),
      row('x7', 7, 3),
      row('x8', 8, 1),
    ];
    const res = proposeMastersGroupRosterFromRankingRows(rows);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.override.A).toHaveLength(MASTERS_QUALIFIER_COUNT / 2);
    expect(res.override.B).toHaveLength(MASTERS_QUALIFIER_COUNT / 2);
    expect(res.override.A[0]).toBe('x1');
    expect(res.override.B[0]).toBe('x2');
    expect(res.rankingOrderedTopEight).toEqual(['x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7', 'x8']);
  });
});

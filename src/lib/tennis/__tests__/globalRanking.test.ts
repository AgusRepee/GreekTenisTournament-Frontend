import { describe, it, expect } from 'vitest';
import type { Match, Player, Tournament } from '../../../types/tournament';
import { calculateGlobalRanking } from '../globalRanking';

const p = (id: string, name: string, league: 1 | 2 | 3 = 3): Player => ({
  id,
  name,
  league,
  active: true,
});

const t = (id: string): Tournament => ({
  id,
  name: id,
  league: 3,
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  status: 'finished',
  rules: {},
  groups: [],
});

function fin(tid: string, id: string, p1: string, p2: string, winner: string, rn = 1): Match {
  return {
    id,
    tournamentId: tid,
    stage: 'final',
    roundNumber: rn,
    player1Id: p1,
    player2Id: p2,
    winnerId: winner,
    completed: true,
    outcome: 'played',
  };
}

describe('calculateGlobalRanking', () => {
  it('suma puntos por torneo y ordena por puntos, torneos ganados y nombre', () => {
    const players = [p('a', 'Zoe'), p('b', 'Ben'), p('c', 'Cal')];
    const tournaments = [t('t1'), t('t2')];
    const matches: Match[] = [
      fin('t1', 't1f', 'a', 'c', 'a', 1),
      fin('t2', 't2f', 'b', 'a', 'b', 1),
    ];
    const rows = calculateGlobalRanking(players, tournaments, matches);
    expect(rows[0]!.playerId).toBe('a');
    expect(rows[0]!.totalPoints).toBe(850);
    expect(rows[0]!.tournamentsWon).toBe(1);
    expect(rows.find((r) => r.playerId === 'b')!.totalPoints).toBe(500);
    expect(rows.find((r) => r.playerId === 'b')!.tournamentsWon).toBe(1);
    expect(rows.find((r) => r.playerId === 'c')!.bestPhase).toBe('finalist');
  });

  it('empate en puntos y victorias: orden alfabético por nombre', () => {
    const tournaments = [t('t1'), t('t2')];
    const matches: Match[] = [
      fin('t1', 'm1', 'x', 'y', 'x', 1),
      fin('t2', 'm2', 'x', 'y', 'y', 1),
    ];
    const rows = calculateGlobalRanking([p('x', 'Bea'), p('y', 'Ana')], tournaments, matches);
    expect(rows[0]!.totalPoints).toBe(rows[1]!.totalPoints);
    expect(rows[0]!.tournamentsWon).toBe(rows[1]!.tournamentsWon);
    expect(rows[0]!.playerName).toBe('Ana');
    expect(rows[1]!.playerName).toBe('Bea');
  });

  it('jugador sin partidos: cero puntos', () => {
    const rows = calculateGlobalRanking([p('z', 'Solo')], [t('t1')], []);
    expect(rows[0]!.totalPoints).toBe(0);
    expect(rows[0]!.tournamentsPlayed).toBe(0);
  });
});

import { describe, it, expect } from 'vitest';
import { calculateGroupStandings, compareGroupStandingsOrder } from '../groupStandings';
import type { ExtendedStandingRow } from '../matchStatsEngine';

describe('calculateGroupStandings', () => {
  const players = ['Ana', 'Bea', 'Carla'];

  it('ordena por PG, luego diferencia de sets, luego sets ganados, luego nombre', () => {
    const matches = [
      {
        tournamentId: 't1',
        group: 'A',
        round: 1,
        playerA: 'Ana',
        playerB: 'Bea',
        score: '6-0 6-0',
        status: 'played' as const,
      },
      {
        tournamentId: 't1',
        group: 'A',
        round: 1,
        playerA: 'Ana',
        playerB: 'Carla',
        score: '6-4 4-6 6-2',
        status: 'played' as const,
      },
      {
        tournamentId: 't1',
        group: 'A',
        round: 1,
        playerA: 'Bea',
        playerB: 'Carla',
        score: '6-2 6-2',
        status: 'played' as const,
      },
    ];

    const table = calculateGroupStandings(matches, players);
    expect(table[0]!.player).toBe('Ana');
    expect(table[0]!.won).toBe(2);
    expect(table[1]!.won).toBe(1);
    expect(table[2]!.won).toBe(0);
  });

  it('desempata por sets ganados si PG y diff de sets empatan', () => {
    const a: ExtendedStandingRow = {
      player: 'A',
      played: 2,
      won: 1,
      lost: 1,
      setsWon: 2,
      setsLost: 2,
      gamesWon: 12,
      gamesLost: 12,
      setsDiff: 0,
      gamesDiff: 0,
      points: 0,
      position: 0,
    };
    const b: ExtendedStandingRow = {
      player: 'B',
      played: 2,
      won: 1,
      lost: 1,
      setsWon: 3,
      setsLost: 3,
      gamesWon: 20,
      gamesLost: 20,
      setsDiff: 0,
      gamesDiff: 0,
      points: 0,
      position: 0,
    };
    expect(compareGroupStandingsOrder(a, b)).toBeGreaterThan(0);
  });

  it('incluye jugadores sin partidos con ceros', () => {
    const matches = [
      {
        tournamentId: 't1',
        group: 'A',
        round: 1,
        playerA: 'Ana',
        playerB: 'Bea',
        score: '6-0 6-0',
        status: 'played' as const,
      },
    ];
    const table = calculateGroupStandings(matches, players);
    const carla = table.find((r) => r.player === 'Carla');
    expect(carla?.played).toBe(0);
    expect(carla?.won).toBe(0);
  });
});

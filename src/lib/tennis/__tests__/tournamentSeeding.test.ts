import { describe, expect, it } from 'vitest';
import {
  buildOfficialTournamentSeedMap,
  calculateTournamentSeeds,
  createPreclasificacionFromLeagueRanking,
  tournamentSeedsToMap,
} from '../tournamentSeeding';
import type { CalculatedRankingRow } from '../tournamentRanking';

function row(position: number, playerId: string): CalculatedRankingRow {
  return {
    position,
    playerId,
    league: 3,
    points: 100 - position,
    tournamentsPlayed: 1,
    matchesPlayedResults: 2,
    wins: 1,
    losses: 0,
    setsWon: 0,
    setsLost: 0,
    gamesWon: 0,
    gamesLost: 0,
    rankingPositionChange: null,
    pointsChange: null,
  };
}

describe('calculateTournamentSeeds', () => {
  it('orders participants by league table position', () => {
    const ranking = [row(1, 'p-a'), row(2, 'p-b'), row(3, 'p-c')];
    const out = calculateTournamentSeeds(['p-c', 'p-a', 'p-b'], ranking);
    expect(out.map((e) => [e.playerId, e.seed])).toEqual([
      ['p-a', 1],
      ['p-b', 2],
      ['p-c', 3],
    ]);
  });

  it('places players missing from ranking after ranked players', () => {
    const ranking = [row(1, 'p-a'), row(2, 'p-b')];
    const out = calculateTournamentSeeds(['p-z', 'p-a'], ranking);
    expect(out[0]).toEqual({ playerId: 'p-a', seed: 1 });
    expect(out[1]).toEqual({ playerId: 'p-z', seed: 2 });
  });

  it('accepts Player-shaped objects', () => {
    const ranking = [row(1, 'x'), row(2, 'y')];
    const out = calculateTournamentSeeds([{ id: 'y' }, { id: 'x' }], ranking);
    expect(out.map((e) => e.playerId)).toEqual(['x', 'y']);
  });

  it('tournamentSeedsToMap builds a lookup', () => {
    const m = tournamentSeedsToMap(calculateTournamentSeeds(['a', 'b'], [row(2, 'b'), row(1, 'a')]));
    expect(m.get('a')).toBe(1);
    expect(m.get('b')).toBe(2);
  });
});

describe('createPreclasificacionFromLeagueRanking', () => {
  it('deduplica y ordena por posición', () => {
    const snap = createPreclasificacionFromLeagueRanking([
      row(2, 'b'),
      row(1, 'a'),
      row(1, 'a'),
      row(3, 'c'),
    ]);
    expect(snap.orderedPlayerIds).toEqual(['a', 'b', 'c']);
    expect(snap.sourceLabel).toBe('Ranking de liga');
    expect(snap.capturedAt.length).toBeGreaterThan(10);
  });
});

describe('buildOfficialTournamentSeedMap', () => {
  it('sin snapshot coincide con ranking vivo', () => {
    const ranking = [row(1, 'p-a'), row(2, 'p-b'), row(3, 'p-c')];
    const m = buildOfficialTournamentSeedMap({}, ['p-c', 'p-a'], ranking);
    expect(m.get('p-a')).toBe(1);
    expect(m.get('p-c')).toBe(2);
  });

  it('con snapshot respeta orden congelado para participantes', () => {
    const ranking = [row(1, 'p-a'), row(2, 'p-b'), row(3, 'p-c')];
    const tournament = {
      preclasificacion: {
        capturedAt: '2026-01-01',
        orderedPlayerIds: ['p-c', 'p-b', 'p-a'],
      },
    };
    const m = buildOfficialTournamentSeedMap(tournament, ['p-a', 'p-c'], ranking);
    expect(m.get('p-c')).toBe(1);
    expect(m.get('p-a')).toBe(2);
  });

  it('participantes no listados en snapshot van al final por ranking vivo', () => {
    const ranking = [row(1, 'p-a'), row(2, 'p-b'), row(3, 'p-z')];
    const tournament = {
      preclasificacion: {
        capturedAt: '2026-01-01',
        orderedPlayerIds: ['p-a'],
      },
    };
    const m = buildOfficialTournamentSeedMap(tournament, ['p-z', 'p-a'], ranking);
    expect(m.get('p-a')).toBe(1);
    expect(m.get('p-z')).toBe(2);
  });
});

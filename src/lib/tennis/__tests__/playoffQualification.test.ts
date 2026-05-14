import { describe, it, expect } from 'vitest';
import type { GroupStandingEntry } from '../groupStandings';
import {
  buildPlayoffEntrySlots,
  computePlayoffQualification,
  countPlayedGroupMatches,
  expectedRoundRobinMatches,
  getQualifiedPlayers,
  isGroupStageComplete,
  pairWorstThirdsForRepechage,
  rankThirdPlacedPlayers,
  type ThirdPlaceRow,
} from '../playoffQualification';
import type { MatchInput } from '../../../types/tennisResults';

const tid = 't-playoff';

function rr3(
  group: string,
  a: string,
  b: string,
  c: string,
  /** winner of each pair: 'ab'|'ac'|'bc' values are who wins first named */
  wins: { ab: string; ac: string; bc: string },
): MatchInput[] {
  const mk = (pa: string, pb: string, winner: string, round: number): MatchInput => {
    const score = winner === pa ? '6-0 6-0' : '0-6 0-6';
    return { tournamentId: tid, group, round, playerA: pa, playerB: pb, score, status: 'played' };
  };
  return [
    mk(a, b, wins.ab, 1),
    mk(a, c, wins.ac, 2),
    mk(b, c, wins.bc, 3),
  ];
}

describe('expectedRoundRobinMatches / countPlayedGroupMatches', () => {
  it('round-robin de 3 = 3 partidos', () => {
    expect(expectedRoundRobinMatches(3)).toBe(3);
    expect(expectedRoundRobinMatches(4)).toBe(6);
  });

  it('cuenta partidos jugados por grupo', () => {
    const m = rr3('A', 'Ana', 'Bea', 'Carla', { ab: 'Ana', ac: 'Ana', bc: 'Bea' });
    expect(countPlayedGroupMatches(m, tid, 'A')).toBe(3);
  });

  it('isGroupStageComplete', () => {
    const m = rr3('A', 'Ana', 'Bea', 'Carla', { ab: 'Ana', ac: 'Ana', bc: 'Bea' });
    expect(isGroupStageComplete(m, tid, { name: 'A', players: ['Ana', 'Bea', 'Carla'] })).toBe(true);
  });
});

describe('computePlayoffQualification', () => {
  it('top 2 por grupo + mejores 2 terceros + repechaje de 2 peores terceros', () => {
    const groups = [
      { name: 'A', players: ['A1', 'A2', 'A3'] },
      { name: 'B', players: ['B1', 'B2', 'B3'] },
      { name: 'C', players: ['C1', 'C2', 'C3'] },
      { name: 'D', players: ['D1', 'D2', 'D3'] },
    ];
    const matches: MatchInput[] = [
      ...rr3('A', 'A1', 'A2', 'A3', { ab: 'A1', ac: 'A1', bc: 'A2' }),
      ...rr3('B', 'B1', 'B2', 'B3', { ab: 'B1', ac: 'B1', bc: 'B2' }),
      ...rr3('C', 'C1', 'C2', 'C3', { ab: 'C1', ac: 'C1', bc: 'C2' }),
      ...rr3('D', 'D1', 'D2', 'D3', { ab: 'D1', ac: 'D1', bc: 'D2' }),
    ];

    const r = computePlayoffQualification({
      tournamentId: tid,
      matches,
      groups,
      rules: {
        directQualifyingPositionsInGroup: 2,
        poolCrossGroupThirdPlaces: true,
        crossGroupThirdPlaceRank: 3,
        bestThirdPlacesAutoQualify: 2,
        worstThirdPlacesRepechageCount: 2,
        repechageWinnerPlayoffSlots: 1,
        rankGroupFirstPlacesForSeeding: true,
        remainingCrossGroupThirdsPolicy: 'none',
      },
    });

    expect(r.directQualified).toHaveLength(8);
    expect(r.bestThirdsQualified).toHaveLength(2);
    expect(r.repechagePairings).toHaveLength(1);
    expect(r.repechagePairings[0]!.playerA).toBeTruthy();
    expect(r.repechagePairings[0]!.playerB).toBeTruthy();
    expect(r.repechagePairings[0]!.playerA).not.toBe(r.repechagePairings[0]!.playerB);

    expect(r.thirdPlacesRanked.map((x) => x.player)).toContain('A3');
    expect(r.thirdPlacesRanked.map((x) => x.player)).toContain('B3');

    const slots = buildPlayoffEntrySlots(r);
    expect(slots.filter((s) => s.kind === 'player')).toHaveLength(10);
    expect(slots.filter((s) => s.kind === 'pending_repechage')).toHaveLength(1);

    expect(r.groupWinnersSeedingOrder.length).toBe(4);
    expect(r.groupWinnersSeedingOrder[0]!.standing.position).toBe(1);
  });

  it('top 3 por grupo: pool de terceros advertido y sin duplicar', () => {
    const groups = [{ name: 'A', players: ['A1', 'A2', 'A3'] }];
    const matches = rr3('A', 'A1', 'A2', 'A3', { ab: 'A1', ac: 'A1', bc: 'A2' });
    const r = computePlayoffQualification({
      tournamentId: tid,
      matches,
      groups,
      rules: {
        directQualifyingPositionsInGroup: 3,
        poolCrossGroupThirdPlaces: true,
        bestThirdPlacesAutoQualify: 0,
        worstThirdPlacesRepechageCount: 0,
      },
    });
    expect(r.directQualified).toHaveLength(3);
    expect(r.warnings.some((w) => w.includes('pool'))).toBe(true);
    expect(r.thirdPlacesRanked).toHaveLength(0);
  });
});

function standingRow(
  player: string,
  position: number,
  won: number,
  lost: number,
  setsWon: number,
  setsLost: number,
): GroupStandingEntry {
  return {
    player,
    position,
    played: won + lost,
    won,
    lost,
    setsWon,
    setsLost,
    setsDifference: setsWon - setsLost,
  };
}

function thirdPlace(
  groupName: string,
  player: string,
  won: number,
  lost: number,
  setsWon: number,
  setsLost: number,
): ThirdPlaceRow {
  return {
    player,
    groupName,
    standing: standingRow(player, 3, won, lost, setsWon, setsLost),
  };
}

describe('rankThirdPlacedPlayers', () => {
  it('vacío → []', () => {
    expect(rankThirdPlacedPlayers([])).toEqual([]);
  });

  it('1. partidos ganados', () => {
    const rows = [
      thirdPlace('B', 'Peor', 0, 2, 0, 4),
      thirdPlace('A', 'Mejor', 1, 1, 2, 2),
    ];
    expect(rankThirdPlacedPlayers(rows).map((r) => r.player)).toEqual(['Mejor', 'Peor']);
  });

  it('2. diferencia de sets (mismo PG)', () => {
    const rows = [
      thirdPlace('A', 'Peor', 0, 2, 0, 4),
      thirdPlace('B', 'Mejor', 0, 2, 2, 4),
    ];
    expect(rankThirdPlacedPlayers(rows).map((r) => r.player)).toEqual(['Mejor', 'Peor']);
  });

  it('3. sets ganados (mismo PG y diff)', () => {
    const rows = [
      thirdPlace('A', 'Peor', 0, 2, 1, 4),
      thirdPlace('B', 'Mejor', 0, 2, 2, 4),
    ];
    expect(rankThirdPlacedPlayers(rows).map((r) => r.player)).toEqual(['Mejor', 'Peor']);
  });

  it('4. nombre (es) si todo igual', () => {
    const rows = [
      thirdPlace('B', 'Bea', 0, 2, 1, 4),
      thirdPlace('A', 'Ana', 0, 2, 1, 4),
    ];
    expect(rankThirdPlacedPlayers(rows).map((r) => r.player)).toEqual(['Ana', 'Bea']);
  });

  it('no muta el array de entrada', () => {
    const rows = [thirdPlace('A', 'X', 0, 2, 0, 4), thirdPlace('B', 'Y', 1, 1, 2, 2)];
    const copy = [...rows];
    rankThirdPlacedPlayers(rows);
    expect(rows).toEqual(copy);
  });
});

describe('getQualifiedPlayers (from group standings)', () => {
  it('Novak: 3 grupos → 7 directos (1º+2º+mejor 3º) y 2 al repechaje (peores 3º)', () => {
    const input = [
      {
        groupName: 'A',
        rows: [
          standingRow('A1', 1, 2, 0, 4, 0),
          standingRow('A2', 2, 1, 1, 2, 2),
          standingRow('A3', 3, 0, 2, 2, 4),
        ],
      },
      {
        groupName: 'B',
        rows: [
          standingRow('B1', 1, 2, 0, 4, 0),
          standingRow('B2', 2, 1, 1, 2, 2),
          standingRow('B3', 3, 0, 2, 1, 4),
        ],
      },
      {
        groupName: 'C',
        rows: [
          standingRow('C1', 1, 2, 0, 4, 0),
          standingRow('C2', 2, 1, 1, 2, 2),
          standingRow('C3', 3, 0, 2, 0, 4),
        ],
      },
    ];

    const r = getQualifiedPlayers(input);

    expect(r.directQualified).toHaveLength(7);
    expect(r.repechagePlayers.map((p) => p.player).sort()).toEqual(['B3', 'C3'].sort());
    expect(r.directQualified.find((d) => d.reason === 'best_third_cross_group')!.player).toBe('A3');

    expect(r.firstPlaces.map((x) => x.player)).toEqual(['A1', 'B1', 'C1']);
    expect(r.secondPlaces.map((x) => x.player)).toEqual(['A2', 'B2', 'C2']);
    expect(r.thirdPlaces.map((x) => x.player).sort()).toEqual(['A3', 'B3', 'C3'].sort());
  });

  it('reordena filas si position no coincide con PG/diff (normalización)', () => {
    const input = [
      {
        groupName: 'X',
        rows: [
          standingRow('badPos', 1, 0, 2, 0, 4),
          standingRow('goodFirst', 3, 2, 0, 4, 0),
        ],
      },
    ];
    const r = getQualifiedPlayers(input);
    expect(r.firstPlaces[0]!.player).toBe('goodFirst');
    expect(r.thirdPlaces).toHaveLength(0);
  });
});

describe('pairWorstThirdsForRepechage', () => {
  it('empareja 4 filas en 2 partidos', () => {
    const rows = [
      { player: 'w0', groupName: 'A', standing: { player: 'w0', position: 1, played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0, setsDifference: 0 } },
      { player: 'w1', groupName: 'A', standing: { player: 'w1', position: 1, played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0, setsDifference: 0 } },
      { player: 'w2', groupName: 'A', standing: { player: 'w2', position: 1, played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0, setsDifference: 0 } },
      { player: 'w3', groupName: 'A', standing: { player: 'w3', position: 1, played: 0, won: 0, lost: 0, setsWon: 0, setsLost: 0, setsDifference: 0 } },
    ];
    const pairs = pairWorstThirdsForRepechage(rows);
    expect(pairs).toHaveLength(2);
  });
});

import { describe, it, expect } from 'vitest';
import type { GroupStandingEntry } from '../groupStandings';
import {
  applyRepechageResult,
  buildQuarterfinalPlayerPool,
  generateRepechage,
  generateRepechageMatches,
  getRepechageWinnerId,
} from '../repechageGeneration';
import type { ThirdPlaceRow } from '../playoffQualification';

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

describe('generateRepechage', () => {
  const tid = 't-novak';

  it('null si no hay suficientes terceros para repechaje', () => {
    expect(generateRepechage([thirdPlace('A', 'Only', 0, 2, 0, 4)], { tournamentId: tid })).toBeNull();
  });

  it('crea partido entre los dos peores terceros (3 grupos Novak)', () => {
    const ranking = [
      thirdPlace('A', 'A3', 0, 2, 2, 4),
      thirdPlace('B', 'B3', 0, 2, 1, 4),
      thirdPlace('C', 'C3', 0, 2, 0, 4),
    ];
    const m = generateRepechage(ranking, { tournamentId: tid });
    expect(m).not.toBeNull();
    expect(m!.stage).toBe('repechage');
    expect(m!.completed).toBe(false);
    expect([m!.player1Id, m!.player2Id].sort()).toEqual(['B3', 'C3'].sort());
  });

  it('generateRepechageMatches puede devolver más de un partido si el bloque tiene 4 jugadores', () => {
    const ranking = [
      thirdPlace('A', 'T1', 0, 2, 4, 0),
      thirdPlace('B', 'T2', 0, 2, 3, 0),
      thirdPlace('C', 'T3', 0, 2, 2, 0),
      thirdPlace('D', 'T4', 0, 2, 1, 0),
    ];
    const list = generateRepechageMatches(ranking, {
      tournamentId: tid,
      rules: {
        bestThirdPlacesAutoQualify: 0,
        worstThirdPlacesRepechageCount: 4,
      },
    });
    expect(list).toHaveLength(2);
    expect(list[0]!.id).toBe(`repechage-${tid}-1`);
  });
});

describe('applyRepechageResult / buildQuarterfinalPlayerPool', () => {
  it('determina ganador y lo incluye en el pool de cuartos', () => {
    const tid = 't-x';
    const raw = generateRepechage(
      [
        thirdPlace('A', 'A3', 0, 2, 2, 4),
        thirdPlace('B', 'B3', 0, 2, 1, 4),
        thirdPlace('C', 'C3', 0, 2, 0, 4),
      ],
      { tournamentId: tid },
    );
    expect(raw).not.toBeNull();
    const done = applyRepechageResult(raw!, { result: '6-0 6-0', outcome: 'played' });
    expect(done.winnerId).toBe(raw!.player1Id);
    expect(getRepechageWinnerId(done)).toBe(raw!.player1Id);

    const pool = buildQuarterfinalPlayerPool({
      directQualifiedPlayerIds: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
      repechageMatch: done,
    });
    expect(pool.readyPlayerIds).toHaveLength(8);
    expect(pool.readyPlayerIds).toContain(done.winnerId);
    expect(pool.awaitingRepechageWinner).toBe(false);
  });

  it('awaitingRepechageWinner si el repechaje sigue pendiente', () => {
    const m = generateRepechage(
      [
        thirdPlace('A', 'A3', 0, 2, 2, 4),
        thirdPlace('B', 'B3', 0, 2, 1, 4),
        thirdPlace('C', 'C3', 0, 2, 0, 4),
      ],
      { tournamentId: 't-y' },
    );
    expect(m).not.toBeNull();
    const pool = buildQuarterfinalPlayerPool({
      directQualifiedPlayerIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'],
      repechageMatch: m,
    });
    expect(pool.awaitingRepechageWinner).toBe(true);
    expect(pool.readyPlayerIds).toHaveLength(7);
  });
});

import { describe, it, expect } from 'vitest';
import type { GroupStandingEntry } from '../groupStandings';
import type { Match } from '../../../types/tournament';
import {
  ELIMINATION_SLOT_TBD,
  advanceBracket,
  computeEliminationSeedOrder8,
  generateEliminationMatches,
} from '../eliminationBracket';
import type { DirectQualifier, QualifiedPlayerStanding } from '../playoffQualification';

function row(
  player: string,
  pos: number,
  won: number,
  lost: number,
  sw: number,
  sl: number,
): GroupStandingEntry {
  return {
    player,
    position: pos,
    played: won + lost,
    won,
    lost,
    setsWon: sw,
    setsLost: sl,
    setsDifference: sw - sl,
  };
}

function q(group: string, player: string, standing: GroupStandingEntry): QualifiedPlayerStanding {
  return { player, groupName: group, standing };
}

describe('computeEliminationSeedOrder8 / generateEliminationMatches', () => {
  it('mejor 1º vs ganador repechaje en cuartos (1 vs 8); 4–7 de 2º + mejor 3º por ranking', () => {
    const firstPlaces = [
      q('A', 'A1', row('A1', 1, 2, 0, 4, 0)),
      q('B', 'B1', row('B1', 1, 2, 0, 4, 0)),
      q('C', 'C1', row('C1', 1, 2, 0, 4, 0)),
    ];
    const secondPlaces = [
      q('A', 'A2', row('A2', 2, 1, 1, 2, 2)),
      q('B', 'B2', row('B2', 2, 1, 1, 2, 2)),
      q('C', 'C2', row('C2', 2, 1, 1, 2, 2)),
    ];
    const thirdPlaces = [
      q('A', 'A3', row('A3', 3, 0, 2, 2, 4)),
      q('B', 'B3', row('B3', 3, 0, 2, 1, 4)),
      q('C', 'C3', row('C3', 3, 0, 2, 0, 4)),
    ];
    const directQualified: DirectQualifier[] = [
      { player: 'A1', groupName: 'A', reason: 'first_in_group' },
      { player: 'B1', groupName: 'B', reason: 'first_in_group' },
      { player: 'C1', groupName: 'C', reason: 'first_in_group' },
      { player: 'A2', groupName: 'A', reason: 'second_in_group' },
      { player: 'B2', groupName: 'B', reason: 'second_in_group' },
      { player: 'C2', groupName: 'C', reason: 'second_in_group' },
      { player: 'A3', groupName: 'A', reason: 'best_third_cross_group' },
    ];
    const repechageWinner = 'C3';

    const seeds = computeEliminationSeedOrder8({
      tournamentId: 't1',
      firstPlaces,
      secondPlaces,
      thirdPlaces,
      directQualified,
      repechageWinner,
    });

    expect(seeds[0]).toBe('A1');
    expect(seeds[7]).toBe('C3');
    /** 4–7: 2º y mejor 3º ordenados por tabla (PG, diff sets…). */
    expect(seeds.slice(3, 7)).toEqual(['A2', 'B2', 'C2', 'A3']);

    const bracket = generateEliminationMatches({
      tournamentId: 't1',
      firstPlaces,
      secondPlaces,
      thirdPlaces,
      directQualified,
      repechageWinner,
    });

    expect(bracket.quarterfinals).toHaveLength(4);
    expect(bracket.quarterfinals[0]).toMatchObject({
      stage: 'quarterfinal',
      player1Id: 'A1',
      player2Id: 'C3',
    });
    expect(bracket.semifinals).toHaveLength(2);
    expect(bracket.semifinals[0]!.player1Id).toBe(ELIMINATION_SLOT_TBD);
    expect(bracket.final.player1Id).toBe(ELIMINATION_SLOT_TBD);
  });

  it('sin repechaje: cabeza 8 es placeholder', () => {
    const firstPlaces = [
      q('A', 'P1', row('P1', 1, 2, 0, 4, 0)),
      q('B', 'P2', row('P2', 1, 2, 0, 4, 0)),
      q('C', 'P3', row('P3', 1, 2, 0, 4, 0)),
    ];
    const secondPlaces = [
      q('A', 'P4', row('P4', 2, 1, 1, 2, 2)),
      q('B', 'P5', row('P5', 2, 1, 1, 2, 2)),
      q('C', 'P6', row('P6', 2, 1, 1, 2, 2)),
    ];
    const thirdPlaces = [q('A', 'P7', row('P7', 3, 0, 2, 2, 4))];
    const directQualified: DirectQualifier[] = [
      { player: 'P1', groupName: 'A', reason: 'first_in_group' },
      { player: 'P2', groupName: 'B', reason: 'first_in_group' },
      { player: 'P3', groupName: 'C', reason: 'first_in_group' },
      { player: 'P4', groupName: 'A', reason: 'second_in_group' },
      { player: 'P5', groupName: 'B', reason: 'second_in_group' },
      { player: 'P6', groupName: 'C', reason: 'second_in_group' },
      { player: 'P7', groupName: 'A', reason: 'best_third_cross_group' },
    ];

    const seeds = computeEliminationSeedOrder8({
      tournamentId: 't2',
      firstPlaces,
      secondPlaces,
      thirdPlaces,
      directQualified,
      repechageWinner: null,
    });
    expect(seeds[7]).toBe(ELIMINATION_SLOT_TBD);
  });
});

describe('advanceBracket', () => {
  function flatBracket(br: ReturnType<typeof generateEliminationMatches>, tid: string): Match[] {
    return [...br.quarterfinals, ...br.semifinals, br.final].map((m) => ({ ...m, tournamentId: tid }));
  }

  it('propaga QF → SF → final y fija campeón en championIdByTournament', () => {
    const tid = 't-br';
    const br = generateEliminationMatches({
      tournamentId: tid,
      firstPlaces: [
        q('A', 'S1', row('S1', 1, 2, 0, 4, 0)),
        q('B', 'S2', row('S2', 1, 2, 0, 4, 0)),
        q('C', 'S3', row('S3', 1, 2, 0, 4, 0)),
      ],
      secondPlaces: [
        q('A', 'S4', row('S4', 2, 1, 1, 2, 2)),
        q('B', 'S5', row('S5', 2, 1, 1, 2, 2)),
        q('C', 'S6', row('S6', 2, 1, 1, 2, 2)),
      ],
      thirdPlaces: [q('A', 'S7', row('S7', 3, 0, 2, 2, 4))],
      directQualified: [
        { player: 'S1', groupName: 'A', reason: 'first_in_group' },
        { player: 'S2', groupName: 'B', reason: 'first_in_group' },
        { player: 'S3', groupName: 'C', reason: 'first_in_group' },
        { player: 'S4', groupName: 'A', reason: 'second_in_group' },
        { player: 'S5', groupName: 'B', reason: 'second_in_group' },
        { player: 'S6', groupName: 'C', reason: 'second_in_group' },
        { player: 'S7', groupName: 'A', reason: 'best_third_cross_group' },
      ],
      repechageWinner: 'S8',
    });
    let ms = flatBracket(br, tid);

    ms = ms.map((m) =>
      m.stage === 'quarterfinal'
        ? { ...m, result: '6-0 6-0', outcome: 'played' as const, completed: true }
        : m,
    );
    let r = advanceBracket(ms);
    const sf = r.matches.filter((x) => x.stage === 'semifinal').sort((a, b) => (a.roundNumber ?? 0) - (b.roundNumber ?? 0));
    expect(sf[0]!.player1Id).not.toBe(ELIMINATION_SLOT_TBD);
    expect(sf[0]!.player2Id).not.toBe(ELIMINATION_SLOT_TBD);

    ms = r.matches.map((m) =>
      m.stage === 'semifinal' ? { ...m, result: '6-0 6-0', outcome: 'played' as const, completed: true } : m,
    );
    r = advanceBracket(ms);
    const fin = r.matches.find((m) => m.stage === 'final')!;
    expect(fin.player1Id).not.toBe(ELIMINATION_SLOT_TBD);
    expect(fin.player2Id).not.toBe(ELIMINATION_SLOT_TBD);

    ms = r.matches.map((m) =>
      m.stage === 'final' ? { ...m, result: '6-0 6-0', outcome: 'played' as const, completed: true } : m,
    );
    r = advanceBracket(ms);
    expect(r.championIdByTournament[tid]).toBe(fin.player1Id);
  });

  it('solo cuartos resueltos: semis recibe ganador y A confirmar en el otro hueco', () => {
    const tid = 't-partial';
    const br = generateEliminationMatches({
      tournamentId: tid,
      firstPlaces: [
        q('A', 'A1', row('A1', 1, 2, 0, 4, 0)),
        q('B', 'B1', row('B1', 1, 2, 0, 4, 0)),
        q('C', 'C1', row('C1', 1, 2, 0, 4, 0)),
      ],
      secondPlaces: [
        q('A', 'A2', row('A2', 2, 1, 1, 2, 2)),
        q('B', 'B2', row('B2', 2, 1, 1, 2, 2)),
        q('C', 'C2', row('C2', 2, 1, 1, 2, 2)),
      ],
      thirdPlaces: [
        q('A', 'A3', row('A3', 3, 0, 2, 2, 4)),
        q('B', 'B3', row('B3', 3, 0, 2, 1, 4)),
        q('C', 'C3', row('C3', 3, 0, 2, 0, 4)),
      ],
      directQualified: [
        { player: 'A1', groupName: 'A', reason: 'first_in_group' },
        { player: 'B1', groupName: 'B', reason: 'first_in_group' },
        { player: 'C1', groupName: 'C', reason: 'first_in_group' },
        { player: 'A2', groupName: 'A', reason: 'second_in_group' },
        { player: 'B2', groupName: 'B', reason: 'second_in_group' },
        { player: 'C2', groupName: 'C', reason: 'second_in_group' },
        { player: 'A3', groupName: 'A', reason: 'best_third_cross_group' },
      ],
      repechageWinner: 'C3',
    });
    const base = flatBracket(br, tid);
    const onlyQf1 = base.map((m) => {
      if (m.stage === 'quarterfinal' && m.roundNumber === 1) {
        return { ...m, result: '6-0 6-0', outcome: 'played' as const, completed: true };
      }
      return m;
    });

    const r = advanceBracket(onlyQf1);
    const sf1 = r.matches.find((m) => m.stage === 'semifinal' && m.roundNumber === 5)!;
    expect(sf1.player1Id).toBe('A1');
    expect(sf1.player2Id).toBe(ELIMINATION_SLOT_TBD);
  });
});

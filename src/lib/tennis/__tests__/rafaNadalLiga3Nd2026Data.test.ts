import { describe, expect, it } from 'vitest';
import {
  RAFA_LIGA3_BYE_BY_GROUP_ROUND,
  RAFA_LIGA3_FIXTURES,
  RAFA_LIGA3_GROUPS,
  RAFA_LIGA3_TOURNAMENT_ID,
  buildRafaLiga3GroupStageFixtures,
} from '../rafaNadalLiga3Nd2026Data';
import { matchInputDedupeKey } from '../matchDedupe';

const EXPECTED_GROUPS = {
  A: ['Santi Mat.', 'Casadio M.', 'Vito C.', 'Aguirre W.', 'Del Valle G.'],
  B: ['Fernandez B.', 'Santi Mar.', 'Ferreres G.', 'Bocchicchio F.', 'Bernardini G.'],
  C: ['Figueroa M.', 'Rusel S.', 'Marin G.', 'Pusterla P.', 'Bianco D.'],
};

describe('Rafael Nadal Liga 3', () => {
  it('usa el torneo Rafael Nadal Liga 3 con grupos correctos', () => {
    expect(RAFA_LIGA3_TOURNAMENT_ID).toBe('t-rafa-nadal-l3');
    expect(RAFA_LIGA3_GROUPS).toEqual(EXPECTED_GROUPS);
    expect(Object.values(RAFA_LIGA3_GROUPS).every((players) => players.length === 5)).toBe(true);
  });

  it('ubica Bernardini G. en Liga 3 y no incluye Vera F.', () => {
    const roster = Object.values(RAFA_LIGA3_GROUPS).flat();
    expect(roster).toContain('Bernardini G.');
    expect(roster).not.toContain('Vera F.');
    expect(RAFA_LIGA3_GROUPS.B).toContain('Bernardini G.');
  });

  it('mantiene nombres exactos sin variantes ambiguas', () => {
    const roster = Object.values(RAFA_LIGA3_GROUPS).flat();
    expect(roster).toContain('Pusterla P.');
    expect(roster).not.toContain('Pusterlas P.');
    expect(roster).toContain('Santi Mat.');
    expect(roster).toContain('Santi Mar.');
    expect(RAFA_LIGA3_GROUPS.A).toContain('Santi Mat.');
    expect(RAFA_LIGA3_GROUPS.A).not.toContain('Santi Mar.');
    expect(RAFA_LIGA3_GROUPS.B).toContain('Santi Mar.');
    expect(RAFA_LIGA3_GROUPS.B).not.toContain('Santi Mat.');
  });

  it('tiene 30 partidos programados sin resultados', () => {
    expect(RAFA_LIGA3_FIXTURES).toHaveLength(30);
  });

  it('cada jugador juega 4 partidos y queda libre una sola fecha', () => {
    const allPlayers = Object.values(RAFA_LIGA3_GROUPS).flat();
    const matchCount = new Map<string, number>();
    const byeCount = new Map<string, number>();

    for (const name of allPlayers) {
      matchCount.set(name, 0);
      byeCount.set(name, 0);
    }

    for (const m of RAFA_LIGA3_FIXTURES) {
      matchCount.set(m.playerA, (matchCount.get(m.playerA) ?? 0) + 1);
      matchCount.set(m.playerB, (matchCount.get(m.playerB) ?? 0) + 1);
    }

    for (const [gk, byRound] of Object.entries(RAFA_LIGA3_BYE_BY_GROUP_ROUND)) {
      const groupPlayers = RAFA_LIGA3_GROUPS[gk as keyof typeof RAFA_LIGA3_GROUPS];
      for (const player of Object.values(byRound)) {
        byeCount.set(player, (byeCount.get(player) ?? 0) + 1);
      }
      for (const p of groupPlayers) {
        expect(Object.values(byRound).filter((n) => n === p)).toHaveLength(1);
      }
    }

    for (const name of allPlayers) {
      expect(matchCount.get(name)).toBe(4);
      expect(byeCount.get(name)).toBe(1);
    }
  });

  it('no tiene partidos duplicados', () => {
    const keys = new Set<string>();
    for (const m of RAFA_LIGA3_FIXTURES) {
      const key = matchInputDedupeKey({
        tournamentId: RAFA_LIGA3_TOURNAMENT_ID,
        group: m.group,
        round: m.round,
        playerA: m.playerA,
        playerB: m.playerB,
      });
      expect(keys.has(key)).toBe(false);
      keys.add(key);
    }
  });

  it('fixture publico marca pelotas segun el jugador con P', () => {
    const groups = buildRafaLiga3GroupStageFixtures();
    expect(groups).toHaveLength(3);

    for (const group of groups) {
      for (const fecha of group.fechas) {
        for (const match of fecha.matches) {
          const seed = RAFA_LIGA3_FIXTURES.find(
            (m) => m.round === fecha.fecha && m.playerA === match.playerA && m.playerB === match.playerB,
          );
          expect(seed).toBeDefined();
          expect(match.ballsByA).toBe(seed!.ballPlayer === seed!.playerA);
        }
      }
    }
  });
});

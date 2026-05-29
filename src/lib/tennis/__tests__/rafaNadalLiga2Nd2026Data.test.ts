import { describe, expect, it } from 'vitest';
import {
  RAFA_LIGA2_BYE_BY_GROUP_ROUND,
  RAFA_LIGA2_FIXTURES,
  RAFA_LIGA2_GROUPS,
  RAFA_LIGA2_TOURNAMENT_ID,
  buildRafaLiga2GroupStageFixtures,
} from '../rafaNadalLiga2Nd2026Data';
import { matchInputDedupeKey } from '../matchDedupe';

describe('Rafael Nadal Liga 2', () => {
  it('tiene 30 partidos de grupo sin resultados', () => {
    expect(RAFA_LIGA2_FIXTURES).toHaveLength(30);
    expect(RAFA_LIGA2_TOURNAMENT_ID).toBe('t-rafa-nadal');
  });

  it('cada jugador juega 4 partidos y queda libre una sola fecha', () => {
    const allPlayers = Object.values(RAFA_LIGA2_GROUPS).flat();
    const matchCount = new Map<string, number>();
    const byeCount = new Map<string, number>();

    for (const name of allPlayers) {
      matchCount.set(name, 0);
      byeCount.set(name, 0);
    }

    for (const m of RAFA_LIGA2_FIXTURES) {
      matchCount.set(m.playerA, (matchCount.get(m.playerA) ?? 0) + 1);
      matchCount.set(m.playerB, (matchCount.get(m.playerB) ?? 0) + 1);
    }

    for (const [gk, byRound] of Object.entries(RAFA_LIGA2_BYE_BY_GROUP_ROUND)) {
      for (const player of Object.values(byRound)) {
        byeCount.set(player, (byeCount.get(player) ?? 0) + 1);
      }
      const groupPlayers = RAFA_LIGA2_GROUPS[gk as keyof typeof RAFA_LIGA2_GROUPS];
      for (const p of groupPlayers) {
        expect(Object.values(byRound).filter((n) => n === p)).toHaveLength(1);
      }
    }

    for (const name of allPlayers) {
      expect(matchCount.get(name)).toBe(4);
      expect(byeCount.get(name)).toBe(1);
    }
  });

  it('no hay partidos duplicados', () => {
    const keys = new Set<string>();
    for (const m of RAFA_LIGA2_FIXTURES) {
      const key = matchInputDedupeKey({
        tournamentId: RAFA_LIGA2_TOURNAMENT_ID,
        group: m.group,
        round: m.round,
        playerA: m.playerA,
        playerB: m.playerB,
      });
      expect(keys.has(key)).toBe(false);
      keys.add(key);
    }
  });

  it('fixture público marca pelotas en playerA cuando corresponde', () => {
    const groups = buildRafaLiga2GroupStageFixtures();
    expect(groups).toHaveLength(3);
    const first = groups[0]!.fechas[0]!.matches[0]!;
    const seed = RAFA_LIGA2_FIXTURES.find((m) => m.group === 'A' && m.round === 1 && m.playerA === first.playerA)!;
    expect(first.ballsByA).toBe(seed.ballPlayer === seed.playerA);
  });
});

import { describe, expect, it } from 'vitest';
import {
  RAFA_LIGA4_BYE_BY_GROUP_ROUND,
  RAFA_LIGA4_FIXTURES,
  RAFA_LIGA4_GROUPS,
  RAFA_LIGA4_TOURNAMENT_ID,
  buildRafaLiga4GroupStageFixtures,
} from '../rafaNadalLiga4Nd2026Data';
import { RAFA_LIGA3_GROUPS } from '../rafaNadalLiga3Nd2026Data';
import { matchInputDedupeKey } from '../matchDedupe';

const EXPECTED_GROUPS = {
  A: ['Cardozo M.', 'Blanco J.', 'Castellanos M.', 'Malcangi R.', 'Gonzalez Dias F.'],
  B: ['Repecka J.', 'Chantada M.', 'Murchio M.', 'Rios J.', 'Gonzalez Dias C.'],
  C: ['Beitia J.', 'Vera F.', 'Cellilli M.', 'Cordoba G.', 'Garcia J.'],
};

describe('Rafael Nadal Liga 4', () => {
  it('usa el torneo Rafael Nadal Liga 4 con grupos correctos', () => {
    expect(RAFA_LIGA4_TOURNAMENT_ID).toBe('t-rafa-nadal-l4');
    expect(RAFA_LIGA4_GROUPS).toEqual(EXPECTED_GROUPS);
    expect(Object.values(RAFA_LIGA4_GROUPS).every((players) => players.length === 5)).toBe(true);
  });

  it('mantiene Vera F. en Liga 4 y Bernardini G. en Liga 3', () => {
    const liga4Roster = Object.values(RAFA_LIGA4_GROUPS).flat();
    const liga3Roster = Object.values(RAFA_LIGA3_GROUPS).flat();
    expect(liga4Roster).toContain('Vera F.');
    expect(liga4Roster).not.toContain('Bernardini G.');
    expect(RAFA_LIGA4_GROUPS.C).toContain('Vera F.');
    expect(liga3Roster).toContain('Bernardini G.');
  });

  it('tiene 30 partidos programados sin resultados', () => {
    expect(RAFA_LIGA4_FIXTURES).toHaveLength(30);
  });

  it('cada jugador juega 4 partidos y queda libre una sola fecha', () => {
    const allPlayers = Object.values(RAFA_LIGA4_GROUPS).flat();
    const matchCount = new Map<string, number>();
    const byeCount = new Map<string, number>();

    for (const name of allPlayers) {
      matchCount.set(name, 0);
      byeCount.set(name, 0);
    }

    for (const m of RAFA_LIGA4_FIXTURES) {
      matchCount.set(m.playerA, (matchCount.get(m.playerA) ?? 0) + 1);
      matchCount.set(m.playerB, (matchCount.get(m.playerB) ?? 0) + 1);
    }

    for (const [gk, byRound] of Object.entries(RAFA_LIGA4_BYE_BY_GROUP_ROUND)) {
      const groupPlayers = RAFA_LIGA4_GROUPS[gk as keyof typeof RAFA_LIGA4_GROUPS];
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
    for (const m of RAFA_LIGA4_FIXTURES) {
      const key = matchInputDedupeKey({
        tournamentId: RAFA_LIGA4_TOURNAMENT_ID,
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
    const groups = buildRafaLiga4GroupStageFixtures();
    expect(groups).toHaveLength(3);

    for (const group of groups) {
      for (const fecha of group.fechas) {
        for (const match of fecha.matches) {
          const seed = RAFA_LIGA4_FIXTURES.find(
            (m) => m.round === fecha.fecha && m.playerA === match.playerA && m.playerB === match.playerB,
          );
          expect(seed).toBeDefined();
          expect(match.ballsByA).toBe(seed!.ballPlayer === seed!.playerA);
        }
      }
    }
  });
});

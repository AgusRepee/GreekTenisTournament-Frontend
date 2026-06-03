import { describe, expect, it } from 'vitest';
import {
  NOVAK_LIGA3_BYE_BY_GROUP_ROUND,
  NOVAK_LIGA3_FIXTURES,
  NOVAK_LIGA3_GROUPS,
  NOVAK_LIGA3_TOURNAMENT_ID,
  buildNovakLiga3GroupStageFixtures,
} from '../novakLiga3Nd2026Data';
import { RAFA_LIGA3_GROUPS, RAFA_LIGA3_TOURNAMENT_ID } from '../rafaNadalLiga3Nd2026Data';
import { matchInputDedupeKey } from '../matchDedupe';

const EXPECTED_GROUPS = {
  A: ['Pusterla P.', 'Santi M.', 'Rusel S.', 'Bocchicchio F.', 'Repecka A.'],
  B: ['Marin G.', 'Fernandez B.', 'Casadio M.', 'Aguirre W.', 'Bianco D.'],
  C: ['Vito C.', 'Santi G.', 'Del Valle G.', 'Ferreres G.', 'Figueroa M.'],
};

describe('Novak Djokovic Liga 3', () => {
  it('usa el torneo t-novak-l3 y no mezcla con Rafael Nadal Liga 3', () => {
    expect(NOVAK_LIGA3_TOURNAMENT_ID).toBe('t-novak-l3');
    expect(RAFA_LIGA3_TOURNAMENT_ID).toBe('t-rafa-nadal-l3');
    expect(NOVAK_LIGA3_GROUPS).toEqual(EXPECTED_GROUPS);
    expect(NOVAK_LIGA3_GROUPS).not.toEqual(RAFA_LIGA3_GROUPS);
  });

  it('tiene Aguirre W. en Grupo B y no Volpe S.', () => {
    const roster = Object.values(NOVAK_LIGA3_GROUPS).flat();
    expect(roster).toContain('Aguirre W.');
    expect(roster).not.toContain('Volpe S.');
    expect(NOVAK_LIGA3_GROUPS.B).toContain('Aguirre W.');
    expect(NOVAK_LIGA3_GROUPS.B).not.toContain('Volpe S.');
  });

  it('tiene Figueroa M. en Grupo C y no Komesu F.', () => {
    const roster = Object.values(NOVAK_LIGA3_GROUPS).flat();
    expect(roster).toContain('Figueroa M.');
    expect(roster).not.toContain('Komesu F.');
    expect(NOVAK_LIGA3_GROUPS.C).toContain('Figueroa M.');
  });

  it('tiene 30 partidos sin resultados y sin Araujo/Volpe en fixture', () => {
    expect(NOVAK_LIGA3_FIXTURES).toHaveLength(30);
    const names = NOVAK_LIGA3_FIXTURES.flatMap((m) => [m.playerA, m.playerB]);
    expect(names).not.toContain('Volpe S.');
    expect(names.filter((n) => n === 'Aguirre W.')).toHaveLength(4);
    expect(names.filter((n) => n === 'Figueroa M.')).toHaveLength(4);
  });

  it('cada jugador juega 4 partidos y queda libre una sola fecha', () => {
    const allPlayers = Object.values(NOVAK_LIGA3_GROUPS).flat();
    const matchCount = new Map<string, number>();
    const byeCount = new Map<string, number>();

    for (const name of allPlayers) {
      matchCount.set(name, 0);
      byeCount.set(name, 0);
    }

    for (const m of NOVAK_LIGA3_FIXTURES) {
      matchCount.set(m.playerA, (matchCount.get(m.playerA) ?? 0) + 1);
      matchCount.set(m.playerB, (matchCount.get(m.playerB) ?? 0) + 1);
    }

    for (const [gk, byRound] of Object.entries(NOVAK_LIGA3_BYE_BY_GROUP_ROUND)) {
      const groupPlayers = NOVAK_LIGA3_GROUPS[gk as keyof typeof NOVAK_LIGA3_GROUPS];
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
    for (const m of NOVAK_LIGA3_FIXTURES) {
      const key = matchInputDedupeKey({
        tournamentId: NOVAK_LIGA3_TOURNAMENT_ID,
        group: m.group,
        round: m.round,
        playerA: m.playerA,
        playerB: m.playerB,
      });
      expect(keys.has(key)).toBe(false);
      keys.add(key);
    }
  });

  it('fixture publico marca pelotas y libres por fecha', () => {
    const groups = buildNovakLiga3GroupStageFixtures();
    expect(groups).toHaveLength(3);

    for (const group of groups) {
      for (const fecha of group.fechas) {
        expect(fecha.libre).toBeTruthy();
        for (const match of fecha.matches) {
          const seed = NOVAK_LIGA3_FIXTURES.find(
            (m) => m.round === fecha.fecha && m.playerA === match.playerA && m.playerB === match.playerB,
          );
          expect(seed).toBeDefined();
          expect(match.ballsByA).toBe(seed!.ballPlayer === seed!.playerA);
        }
      }
    }
  });
});

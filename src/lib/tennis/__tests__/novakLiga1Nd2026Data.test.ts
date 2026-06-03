import { describe, expect, it } from 'vitest';
import {
  NOVAK_LIGA1_BYE_BY_GROUP_ROUND,
  NOVAK_LIGA1_FIXTURES,
  NOVAK_LIGA1_GROUPS,
  NOVAK_LIGA1_TOURNAMENT_ID,
  buildNovakLiga1GroupStageFixtures,
} from '../novakLiga1Nd2026Data';
import { matchInputDedupeKey } from '../matchDedupe';

const EXPECTED_GROUPS = {
  A: ['Pfening G.', 'Alvarez I.', 'Tacain R.', 'Arico S.', 'Guidobono A.'],
  B: ['Garassi A.', 'Rothkel M.', 'Zanella H.', 'Duarte D.', 'Naddeo M.'],
  C: ['Gaudina A.', 'Cordoba D.', 'Filosa M.', 'Mena C.', 'Novizki P.'],
};

describe('Novak Djokovic Liga 1', () => {
  it('usa el torneo t-novak con grupos definitivos', () => {
    expect(NOVAK_LIGA1_TOURNAMENT_ID).toBe('t-novak');
    expect(NOVAK_LIGA1_GROUPS).toEqual(EXPECTED_GROUPS);
    expect(Object.values(NOVAK_LIGA1_GROUPS).every((players) => players.length === 5)).toBe(true);
  });

  it('incluye Naddeo M. en Grupo B y no Araujo J.', () => {
    const roster = Object.values(NOVAK_LIGA1_GROUPS).flat();
    expect(roster).toContain('Naddeo M.');
    expect(roster).not.toContain('Araujo J.');
    expect(NOVAK_LIGA1_GROUPS.B).toContain('Naddeo M.');
    expect(NOVAK_LIGA1_GROUPS.B).not.toContain('Araujo J.');
  });

  it('tiene 30 partidos programados sin resultados en fixture', () => {
    expect(NOVAK_LIGA1_FIXTURES).toHaveLength(30);
    const names = NOVAK_LIGA1_FIXTURES.flatMap((m) => [m.playerA, m.playerB]);
    expect(names).not.toContain('Araujo J.');
    expect(names.filter((n) => n === 'Naddeo M.')).toHaveLength(4);
  });

  it('cada jugador juega 4 partidos y queda libre una sola fecha', () => {
    const allPlayers = Object.values(NOVAK_LIGA1_GROUPS).flat();
    const matchCount = new Map<string, number>();
    const byeCount = new Map<string, number>();

    for (const name of allPlayers) {
      matchCount.set(name, 0);
      byeCount.set(name, 0);
    }

    for (const m of NOVAK_LIGA1_FIXTURES) {
      matchCount.set(m.playerA, (matchCount.get(m.playerA) ?? 0) + 1);
      matchCount.set(m.playerB, (matchCount.get(m.playerB) ?? 0) + 1);
    }

    for (const [gk, byRound] of Object.entries(NOVAK_LIGA1_BYE_BY_GROUP_ROUND)) {
      const groupPlayers = NOVAK_LIGA1_GROUPS[gk as keyof typeof NOVAK_LIGA1_GROUPS];
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
    for (const m of NOVAK_LIGA1_FIXTURES) {
      const key = matchInputDedupeKey({
        tournamentId: NOVAK_LIGA1_TOURNAMENT_ID,
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
    const groups = buildNovakLiga1GroupStageFixtures();
    expect(groups).toHaveLength(3);

    for (const group of groups) {
      for (const fecha of group.fechas) {
        for (const match of fecha.matches) {
          const seed = NOVAK_LIGA1_FIXTURES.find(
            (m) => m.round === fecha.fecha && m.playerA === match.playerA && m.playerB === match.playerB,
          );
          expect(seed).toBeDefined();
          expect(match.ballsByA).toBe(seed!.ballPlayer === seed!.playerA);
        }
      }
    }
  });
});

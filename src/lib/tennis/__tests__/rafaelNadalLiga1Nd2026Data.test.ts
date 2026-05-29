import { describe, expect, it } from 'vitest';
import {
  RAFAEL_LIGA1_FIXTURES,
  RAFAEL_LIGA1_GROUPS,
  RAFAEL_LIGA1_INTERZONAL_GROUP,
  RAFAEL_LIGA1_TOURNAMENT_ID,
  buildRafaelLiga1GroupStageFixtures,
} from '../rafaelNadalLiga1Nd2026Data';
import { matchInputDedupeKey } from '../matchDedupe';

const EXPECTED_NAMES = [
  'Gaudina A.',
  'Filosa M.',
  'Guidobono A.',
  'Duarte D.',
  'Garassi A.',
  'Tacain R.',
  'Rothkel M.',
  'Lacave L.',
  'Pfening G.',
  'Zanella H.',
  'Alvarez I.',
  'Naddeo M.',
];

describe('Rafael Nadal Liga 1', () => {
  it('tiene 24 partidos programados sin resultados', () => {
    expect(RAFAEL_LIGA1_FIXTURES).toHaveLength(24);
    expect(RAFAEL_LIGA1_TOURNAMENT_ID).toBe('t-rafael-nadal-l1');
  });

  it('respeta nombres exactos del plantel', () => {
    const roster = Object.values(RAFAEL_LIGA1_GROUPS).flat();
    expect(roster).toEqual(EXPECTED_NAMES);
  });

  it('fecha 4 es interzonal con 6 cruces', () => {
    const iz = RAFAEL_LIGA1_FIXTURES.filter((m) => m.group === RAFAEL_LIGA1_INTERZONAL_GROUP);
    expect(iz).toHaveLength(6);
    expect(iz.every((m) => m.round === 4)).toBe(true);
  });

  it('cada jugador tiene 3 partidos de grupo y 1 interzonal', () => {
    const allPlayers = Object.values(RAFAEL_LIGA1_GROUPS).flat();
    const groupCount = new Map<string, number>();
    const izCount = new Map<string, number>();
    for (const name of allPlayers) {
      groupCount.set(name, 0);
      izCount.set(name, 0);
    }
    for (const m of RAFAEL_LIGA1_FIXTURES) {
      const map = m.group === RAFAEL_LIGA1_INTERZONAL_GROUP ? izCount : groupCount;
      map.set(m.playerA, (map.get(m.playerA) ?? 0) + 1);
      map.set(m.playerB, (map.get(m.playerB) ?? 0) + 1);
    }
    for (const name of allPlayers) {
      expect(groupCount.get(name)).toBe(3);
      expect(izCount.get(name)).toBe(1);
    }
  });

  it('no hay partidos duplicados', () => {
    const keys = new Set<string>();
    for (const m of RAFAEL_LIGA1_FIXTURES) {
      const key = matchInputDedupeKey({
        tournamentId: RAFAEL_LIGA1_TOURNAMENT_ID,
        group: m.group,
        round: m.round,
        playerA: m.playerA,
        playerB: m.playerB,
      });
      expect(keys.has(key)).toBe(false);
      keys.add(key);
    }
  });

  it('fixture público incluye bloque Interzonal en fecha 4', () => {
    const groups = buildRafaelLiga1GroupStageFixtures();
    const inter = groups.find((g) => g.name === 'Interzonal');
    expect(inter).toBeDefined();
    expect(inter!.fechas.map((f) => f.fecha)).toEqual([4]);
  });
});

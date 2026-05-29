import { describe, expect, it } from 'vitest';
import {
  RAFA_LIGA5_FIXTURES,
  RAFA_LIGA5_GROUPS,
  RAFA_LIGA5_INTERZONAL_GROUP,
  RAFA_LIGA5_TOURNAMENT_ID,
  buildRafaLiga5GroupStageFixtures,
} from '../rafaNadalLiga5Nd2026Data';
import { matchInputDedupeKey } from '../matchDedupe';

const EXPECTED_NAMES = [
  'Cirigliano D.',
  'Antuña A.',
  'Chantada S.',
  'Vidigt F.',
  'Oviedo M.',
  'Peralta G.',
  'Sola M.',
  'Vila E.',
  'Tellechea L.',
  'Gimenez F.',
  'Vito A.',
  'Amezague J.',
];

describe('Rafael Nadal Liga 5', () => {
  it('tiene 24 partidos programados sin resultados', () => {
    expect(RAFA_LIGA5_FIXTURES).toHaveLength(24);
    expect(RAFA_LIGA5_TOURNAMENT_ID).toBe('t-rafa-nadal-l5');
  });

  it('respeta nombres exactos del plantel', () => {
    const roster = Object.values(RAFA_LIGA5_GROUPS).flat();
    expect(roster).toEqual(EXPECTED_NAMES);
  });

  it('fecha 4 es interzonal con 6 cruces', () => {
    const iz = RAFA_LIGA5_FIXTURES.filter((m) => m.group === RAFA_LIGA5_INTERZONAL_GROUP);
    expect(iz).toHaveLength(6);
    expect(iz.every((m) => m.round === 4)).toBe(true);
  });

  it('cada jugador tiene 3 partidos de grupo y 1 interzonal', () => {
    const allPlayers = Object.values(RAFA_LIGA5_GROUPS).flat();
    const groupCount = new Map<string, number>();
    const izCount = new Map<string, number>();
    for (const name of allPlayers) {
      groupCount.set(name, 0);
      izCount.set(name, 0);
    }
    for (const m of RAFA_LIGA5_FIXTURES) {
      const map = m.group === RAFA_LIGA5_INTERZONAL_GROUP ? izCount : groupCount;
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
    for (const m of RAFA_LIGA5_FIXTURES) {
      const key = matchInputDedupeKey({
        tournamentId: RAFA_LIGA5_TOURNAMENT_ID,
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
    const groups = buildRafaLiga5GroupStageFixtures();
    const inter = groups.find((g) => g.name === 'Interzonal');
    expect(inter).toBeDefined();
    expect(inter!.fechas.map((f) => f.fecha)).toEqual([4]);
    const first = inter!.fechas[0]!.matches[0]!;
    const seed = RAFA_LIGA5_FIXTURES.find(
      (m) => m.group === RAFA_LIGA5_INTERZONAL_GROUP && m.playerA === first.playerA,
    )!;
    expect(first.ballsByA).toBe(seed.ballPlayer === seed.playerA);
  });
});

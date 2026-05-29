import { describe, expect, it } from 'vitest';
import {
  RAFA_LIGA6_FIXTURES,
  RAFA_LIGA6_GROUPS,
  RAFA_LIGA6_INTERZONAL_GROUP,
  RAFA_LIGA6_TOURNAMENT_ID,
  buildRafaLiga6GroupStageFixtures,
} from '../rafaNadalLiga6Nd2026Data';
import { matchInputDedupeKey } from '../matchDedupe';

const EXPECTED_NAMES = [
  'Ballesta F.',
  'De Ruyck G.',
  'Cerene B.',
  'Oshiro E.',
  'Ferrarotti E.',
  'Fedrjanic N.',
  'Fratini M.',
  'Jaureguiberry C.',
  'Oswald J.',
  'Avalos G.',
  'Romay J.',
  'Cellilli F.',
];

describe('Rafael Nadal Liga 6', () => {
  it('tiene 24 partidos programados sin resultados', () => {
    expect(RAFA_LIGA6_FIXTURES).toHaveLength(24);
    expect(RAFA_LIGA6_TOURNAMENT_ID).toBe('t-rafa-nadal-l6');
  });

  it('respeta nombres exactos del plantel', () => {
    const roster = Object.values(RAFA_LIGA6_GROUPS).flat();
    expect(roster).toEqual(EXPECTED_NAMES);
    expect(roster).not.toContain('Opshiro');
    expect(roster).not.toContain('Fedrjanic W.');
  });

  it('fecha 4 es interzonal con 6 cruces', () => {
    const iz = RAFA_LIGA6_FIXTURES.filter((m) => m.group === RAFA_LIGA6_INTERZONAL_GROUP);
    expect(iz).toHaveLength(6);
    expect(iz.every((m) => m.round === 4)).toBe(true);
  });

  it('cada jugador tiene 3 partidos de grupo y 1 interzonal', () => {
    const allPlayers = Object.values(RAFA_LIGA6_GROUPS).flat();
    const groupCount = new Map<string, number>();
    const izCount = new Map<string, number>();
    for (const name of allPlayers) {
      groupCount.set(name, 0);
      izCount.set(name, 0);
    }
    for (const m of RAFA_LIGA6_FIXTURES) {
      const map = m.group === RAFA_LIGA6_INTERZONAL_GROUP ? izCount : groupCount;
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
    for (const m of RAFA_LIGA6_FIXTURES) {
      const key = matchInputDedupeKey({
        tournamentId: RAFA_LIGA6_TOURNAMENT_ID,
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
    const groups = buildRafaLiga6GroupStageFixtures();
    const inter = groups.find((g) => g.name === 'Interzonal');
    expect(inter).toBeDefined();
    expect(inter!.fechas.map((f) => f.fecha)).toEqual([4]);
    const first = inter!.fechas[0]!.matches[0]!;
    const seed = RAFA_LIGA6_FIXTURES.find(
      (m) => m.group === RAFA_LIGA6_INTERZONAL_GROUP && m.playerA === first.playerA,
    )!;
    expect(first.ballsByA).toBe(seed.ballPlayer === seed.playerA);
  });
});

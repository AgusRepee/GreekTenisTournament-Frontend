import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LIGA5_ND_RESULTS,
  DEFAULT_LIGA5_ND_SCHEDULES,
  LIGA5_ND_FIXTURES,
  LIGA5_ND_TOURNAMENT_ID,
} from '../liga5Nd2026Data';
import { generatePlayersFromLigas } from '../generatePlayersFromLigas';
import { parseMatch } from '../matchStatsEngine';

describe('Liga 5 ND 2026 data', () => {
  it('loads fixtures, schedules and available results for the standalone tournament', () => {
    expect(LIGA5_ND_FIXTURES).toHaveLength(35);
    expect(DEFAULT_LIGA5_ND_RESULTS).toHaveLength(34);
    expect(DEFAULT_LIGA5_ND_SCHEDULES).toHaveLength(35);
    expect(DEFAULT_LIGA5_ND_RESULTS.every((m) => m.tournamentId === LIGA5_ND_TOURNAMENT_ID)).toBe(true);
  });

  it('keeps the pending Cordoba G. vs Sola M. quarterfinal without a loaded result', () => {
    expect(
      DEFAULT_LIGA5_ND_RESULTS.some(
        (m) => m.group === 'Cuartos de Final' && m.playerA === 'Córdoba G.' && m.playerB === 'Sola M.',
      ),
    ).toBe(false);
    expect(
      DEFAULT_LIGA5_ND_SCHEDULES.some((s) => s.dedupeKey.includes('córdoba g.') && s.dedupeKey.includes('sola m.')),
    ).toBe(true);
  });

  it('parses scores, walkovers and retirements', () => {
    expect(DEFAULT_LIGA5_ND_RESULTS.filter((m) => m.status === 'walkover')).toHaveLength(5);
    expect(DEFAULT_LIGA5_ND_RESULTS.filter((m) => m.status === 'retired')).toHaveLength(1);
    for (const match of DEFAULT_LIGA5_ND_RESULTS) {
      expect(() => parseMatch(match)).not.toThrow();
    }
  });

  it('adds accented Liga 5 names to the player registry', () => {
    const names = new Set(generatePlayersFromLigas().filter((p) => p.liga === 5).map((p) => p.name));
    for (const name of ['Ríos J.', 'Córdoba A.', 'Córdoba G.', 'González Días F.', 'González Días C.', 'Giménez F.']) {
      expect(names.has(name)).toBe(true);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { DEFAULT_NOVAK_LIGA1_RESULTS, DEFAULT_NOVAK_LIGA1_SCHEDULES } from '../novakLiga1DefaultResults';
import { parseMatch } from '../matchStatsEngine';

describe('Novak Djokovic Liga 1 default results', () => {
  it('loads the provided played results and walkovers with parseable winners', () => {
    expect(DEFAULT_NOVAK_LIGA1_RESULTS).toHaveLength(33);
    expect(DEFAULT_NOVAK_LIGA1_RESULTS.filter((m) => m.status === 'walkover')).toHaveLength(5);
    expect(DEFAULT_NOVAK_LIGA1_SCHEDULES).toHaveLength(28);

    for (const match of DEFAULT_NOVAK_LIGA1_RESULTS) {
      const parsed = parseMatch(match);
      expect(parsed.winner).toBeTruthy();
      if (match.status === 'walkover') {
        expect(match.score).toMatch(/^[AB]$/);
        expect(parsed.sets).toHaveLength(0);
      }
    }
  });

  it('uses the canonical accented names requested for Liga 1', () => {
    const names = DEFAULT_NOVAK_LIGA1_RESULTS.flatMap((m) => [m.playerA, m.playerB]);
    expect(names).toContain('Álvarez I.');
    expect(names).toContain('Córdoba D.');
    expect(names).not.toContain('Alvarez I.');
    expect(names).not.toContain('Cordoba D.');
  });
});

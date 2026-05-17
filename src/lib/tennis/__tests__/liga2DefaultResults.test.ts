import { describe, expect, it } from 'vitest';
import { DEFAULT_LIGA2_RESULTS, LIGA2_INCONSISTENCIES, LIGA2_TOURNAMENT_ID } from '../liga2DefaultResults';
import { generatePlayersFromLigas } from '../generatePlayersFromLigas';
import { parseMatch } from '../matchStatsEngine';
import { getBracketMatchesForLibrary, getPlayerById } from '../../mockData';

describe('Liga 2 default results', () => {
  it('loads only Liga 2 results without dates', () => {
    expect(DEFAULT_LIGA2_RESULTS).toHaveLength(29);
    expect(DEFAULT_LIGA2_RESULTS.every((m) => m.tournamentId === LIGA2_TOURNAMENT_ID)).toBe(true);
    expect(DEFAULT_LIGA2_RESULTS.every((m) => !m.date)).toBe(true);
  });

  it('keeps the reported inconsistent Cancio self-match out of loaded results', () => {
    expect(LIGA2_INCONSISTENCIES[0]).toContain('Cancio M.');
    expect(
      DEFAULT_LIGA2_RESULTS.some((m) => m.playerA === 'Cancio M.' && m.playerB === 'Cancio M.'),
    ).toBe(false);
  });

  it('parses available scores including the Spanish retirement note', () => {
    const retired = DEFAULT_LIGA2_RESULTS.find((m) => m.status === 'retired');
    expect(retired?.score).toBe('6-3 / 4-1 y abandono');
    for (const match of DEFAULT_LIGA2_RESULTS) {
      expect(() => parseMatch(match)).not.toThrow();
    }
  });

  it('uses the accented Monzón M. name in the Liga 2 player registry', () => {
    const liga2Names = new Set(generatePlayersFromLigas().filter((p) => p.liga === 2).map((p) => p.name));
    expect(liga2Names.has('Monzón M.')).toBe(true);
    expect(liga2Names.has('Monzon M.')).toBe(false);
  });

  it('resolves backend-style Liga 2 player ids to local player names', () => {
    expect(getPlayerById('p-l2-monzon-m')?.name).toBe('Monzón M.');
  });

  it('builds the public Liga 2 bracket from loaded knockout results', () => {
    const matches = getBracketMatchesForLibrary(LIGA2_TOURNAMENT_ID);
    const quarterfinals = matches.filter((m) => m.tournamentRoundText === '1');

    expect(quarterfinals.map((m) => m.participants.map((p) => p.name)).slice(0, 2)).toEqual([
      ['Lacave L.', 'Mayer D.'],
      ['Colomer S.', 'Komesu M.'],
    ]);
  });
});

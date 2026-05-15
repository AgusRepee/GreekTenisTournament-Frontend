import { describe, expect, it } from 'vitest';
import { generatePlayersFromLigas } from '../generatePlayersFromLigas';
import { calculateGroupStandings } from '../groupStandings';
import { parseMatch } from '../matchStatsEngine';
import {
  DEFAULT_LIGA6_ND_RESULTS,
  DEFAULT_LIGA6_ND_SCHEDULES,
  LIGA6_ND_FIXTURES,
  LIGA6_ND_GROUPS,
  LIGA6_ND_TOURNAMENT_ID,
} from '../liga6Nd2026Data';

describe('Novak Djokovic Liga 6 data', () => {
  it('loads the existing Novak Liga 6 tournament without creating a separate tournament id', () => {
    expect(LIGA6_ND_TOURNAMENT_ID).toBe('t-novak-l6');
    expect(LIGA6_ND_FIXTURES).toHaveLength(27);
    expect(DEFAULT_LIGA6_ND_RESULTS).toHaveLength(20);
    expect(DEFAULT_LIGA6_ND_SCHEDULES).toHaveLength(27);
    expect(DEFAULT_LIGA6_ND_RESULTS.every((m) => m.tournamentId === LIGA6_ND_TOURNAMENT_ID)).toBe(true);
  });

  it('keeps playoff pending matches scheduled without loaded results', () => {
    expect(
      DEFAULT_LIGA6_ND_RESULTS.some(
        (m) => m.group === 'Cuartos de Final' && m.playerA === 'Antuña A.' && m.playerB === 'De Ruyck G.',
      ),
    ).toBe(false);
    expect(DEFAULT_LIGA6_ND_SCHEDULES.some((s) => s.dedupeKey.includes('cellilli f.') && s.dedupeKey.includes('bye'))).toBe(true);
    expect(DEFAULT_LIGA6_ND_SCHEDULES.some((s) => s.dedupeKey.includes('bye') && s.dedupeKey.includes('ballesta f.'))).toBe(true);
  });

  it('parses scores, walkovers and the injury retirement', () => {
    expect(DEFAULT_LIGA6_ND_RESULTS.filter((m) => m.status === 'walkover')).toHaveLength(4);
    expect(DEFAULT_LIGA6_ND_RESULTS.filter((m) => m.status === 'retired')).toHaveLength(1);
    for (const match of DEFAULT_LIGA6_ND_RESULTS) {
      expect(() => parseMatch(match)).not.toThrow();
    }
  });

  it('matches the requested final group order', () => {
    const groupA = calculateGroupStandings(DEFAULT_LIGA6_ND_RESULTS.filter((m) => m.group === 'A'), LIGA6_ND_GROUPS.A);
    const groupB = calculateGroupStandings(DEFAULT_LIGA6_ND_RESULTS.filter((m) => m.group === 'B'), LIGA6_ND_GROUPS.B);

    expect(groupA.map((r) => r.player)).toEqual(['Cellilli F.', 'Amezague J.', 'De Ruyck G.', 'Fedrjanic N.', 'Bataglia F.']);
    expect(groupB.map((r) => r.player)).toEqual(['Ballesta F.', 'Antuña A.', 'Ferrarotti E.', 'Fratini M.', 'Oshiro E.']);
    expect(groupA.map((r) => [r.played, r.won, r.lost])).toEqual([[4, 4, 0], [4, 3, 1], [4, 2, 2], [4, 1, 3], [4, 0, 4]]);
    expect(groupB.map((r) => [r.played, r.won, r.lost])).toEqual([[4, 4, 0], [4, 3, 1], [4, 2, 2], [4, 1, 3], [4, 0, 4]]);
  });

  it('adds normalized Liga 6 names to the player registry', () => {
    const names = new Set(generatePlayersFromLigas().filter((p) => p.liga === 6).map((p) => p.name));
    for (const name of ['De Ruyck G.', 'Amezague J.', 'Cellilli F.', 'Bataglia F.', 'Fedrjanic N.', 'Antuña A.', 'Ballesta F.', 'Fratini M.', 'Ferrarotti E.', 'Oshiro E.']) {
      expect(names.has(name)).toBe(true);
    }
    expect(names.has('Antuña R.')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { getBracketMatchesForLibrary } from '../../mockData';
import { calculateGroupStandings } from '../groupStandings';
import { parseMatch } from '../matchStatsEngine';
import {
  DEFAULT_LIGA4_ND_RESULTS,
  DEFAULT_LIGA4_ND_SCHEDULES,
  LIGA4_ND_FIXTURES,
  LIGA4_ND_GROUPS,
  LIGA4_ND_INTERZONAL_GROUP,
  LIGA4_ND_TOURNAMENT_ID,
} from '../liga4Nd2026Data';

describe('Novak Djokovic Liga 4 data', () => {
  it('loads fixtures, schedules and available results for the existing Novak Liga 4 tournament', () => {
    expect(LIGA4_ND_FIXTURES).toHaveLength(31);
    expect(DEFAULT_LIGA4_ND_RESULTS).toHaveLength(30);
    expect(DEFAULT_LIGA4_ND_SCHEDULES).toHaveLength(31);
    expect(LIGA4_ND_TOURNAMENT_ID).toBe('t-novak-l4');
    expect(DEFAULT_LIGA4_ND_RESULTS.every((m) => m.tournamentId === LIGA4_ND_TOURNAMENT_ID)).toBe(true);
  });

  it('keeps pending playoff matches without loaded results', () => {
    expect(
      DEFAULT_LIGA4_ND_RESULTS.some(
        (m) => m.group === 'Semifinales' && m.playerA === 'Bernardini G.' && m.playerB === 'Beitia J.',
      ),
    ).toBe(false);
    expect(
      DEFAULT_LIGA4_ND_SCHEDULES.some(
        (s) => s.dedupeKey.includes('bernardini g.') && s.dedupeKey.includes('beitia j.'),
      ),
    ).toBe(true);
  });

  it('parses scores and walkovers', () => {
    expect(DEFAULT_LIGA4_ND_RESULTS.filter((m) => m.status === 'walkover')).toHaveLength(5);
    for (const match of DEFAULT_LIGA4_ND_RESULTS) {
      expect(() => parseMatch(match)).not.toThrow();
    }
  });

  it('matches expected group standings after loading all group and interzonal results', () => {
    const groupResults = DEFAULT_LIGA4_ND_RESULTS.filter((m) => m.group === 'A' || m.group === 'B' || m.group === 'C');
    const groupA = calculateGroupStandings(groupResults.filter((m) => m.group === 'A'), LIGA4_ND_GROUPS.A);
    const groupB = calculateGroupStandings(groupResults.filter((m) => m.group === 'B'), LIGA4_ND_GROUPS.B);
    const groupC = calculateGroupStandings(groupResults.filter((m) => m.group === 'C'), LIGA4_ND_GROUPS.C);

    expect(groupA.map((r) => r.player)).toEqual(['Beitia J.', 'Chantada M.', 'Malcangi R.', 'Cardozo M.']);
    expect(groupB.map((r) => r.player)).toEqual(['Repecka J.', 'Vera F.', 'Blanco J.', 'Anetta D.']);
    expect(groupC.map((r) => r.player)).toEqual(['Garcia J.', 'Bernardini G.', 'Murchio M.', 'Cellilli M.']);
  });

  it('uses the interzonal group key aligned with public fixtures', () => {
    expect(
      DEFAULT_LIGA4_ND_RESULTS.some(
        (m) => m.group === LIGA4_ND_INTERZONAL_GROUP && m.playerA === 'Repecka J.' && m.playerB === 'Cardozo M.',
      ),
    ).toBe(true);
  });

  it('builds the public elimination bracket in the requested visual order', () => {
    const matches = getBracketMatchesForLibrary(LIGA4_ND_TOURNAMENT_ID);
    const quarterfinals = matches.filter((m) => m.tournamentRoundText === '1');
    const semifinals = matches.filter((m) => m.tournamentRoundText === '2');

    expect(quarterfinals.map((m) => m.participants.map((p) => p.name))).toEqual([
      ['Repecka J.', 'Blanco J.'],
      ['Chantada M.', 'Vera F.'],
      ['Bernardini G.', 'Garcia J.'],
      ['Murchio M.', 'Beitia J.'],
    ]);
    expect(semifinals.map((m) => m.participants.map((p) => p.name))).toEqual([
      ['Repecka J.', 'Vera F.'],
      ['Bernardini G.', 'Beitia J.'],
    ]);
  });
});

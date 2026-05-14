import { describe, it, expect } from 'vitest';
import type { MatchInput } from '@/types/tennisResults';
import type { Player, Tournament } from '@/lib/mockData';
import {
  validateMatchResult,
  resolveMatchWinner,
  calculateGroupStandings,
  calculateTournamentClassification,
  calculatePlayerStats,
  calculateRanking,
  recalculateTournamentFromData,
  ENGINE_GROUP_RULES,
} from '@/lib/tournamentEngine';

const p = (id: string, name: string, category: Player['category'] = 'Tercera'): Player => ({
  id,
  name,
  category,
});

function t(id: string, league: 1 | 2 | 3 | 4 | 5 | 6 = 3): Tournament {
  return {
    id,
    name: id,
    category: 'Tercera',
    status: 'finished',
    startDate: '2025-01-01',
    endDate: '2025-02-01',
    location: 'X',
    league,
  };
}

describe('tournamentEngine (central)', () => {
  const m1 = {
    id: 'm1',
    player1Id: 'a',
    player2Id: 'b',
    player1Name: 'Ana',
    player2Name: 'Bea',
    tournamentId: 't1',
    group: 'A',
  };

  it('validateMatchResult rechaza marcador vacío en played', () => {
    const r = validateMatchResult(m1, { status: 'played', score: '' });
    expect(r.valid).toBe(false);
    expect(r).toMatchObject({ valid: false });
    if (!r.valid) expect(r.errors.length).toBeGreaterThan(0);
  });

  it('validateMatchResult acepta 6-4 6-4 y winnerId coherente', () => {
    const r = validateMatchResult(m1, { status: 'played', score: '6-4 6-4', winnerId: 'a' });
    expect(r).toEqual({ valid: true });
  });

  it('validateMatchResult rechaza winnerId incoherente', () => {
    const r = validateMatchResult(m1, { status: 'played', score: '6-4 6-4', winnerId: 'b' });
    expect(r.valid).toBe(false);
  });

  it('validateMatchResult acepta match tie-break como último set', () => {
    const r = validateMatchResult(m1, { status: 'played', score: '6-4 4-6 10-8', winnerId: 'a' });
    expect(r).toEqual({ valid: true });
  });

  it('validateMatchResult walkover con winnerId', () => {
    const r = validateMatchResult(m1, { status: 'walkover', winnerId: 'b' });
    expect(r).toEqual({ valid: true });
  });

  it('resolveMatchWinner walkover con marcador 6-0 6-0 (lado A)', () => {
    const rw = resolveMatchWinner(m1, { status: 'walkover', score: '6-0 6-0' });
    expect(rw.winnerId).toBe('a');
    expect(rw.setsWonPlayer1).toBe(2);
    expect(rw.setsWonPlayer2).toBe(0);
    expect(rw.gamesWonPlayer1).toBe(12);
    expect(rw.gamesWonPlayer2).toBe(0);
  });

  it('validateMatchResult rechaza walkover 6-0 6-0 con winnerId incoherente', () => {
    const r = validateMatchResult(m1, { status: 'walkover', score: '6-0 6-0', winnerId: 'b' });
    expect(r.valid).toBe(false);
  });

  it('resolveMatchWinner devuelve sets y ganador', () => {
    const rw = resolveMatchWinner(m1, { status: 'played', score: '6-4 3-6 6-1' });
    expect(rw.winnerId).toBe('a');
    expect(rw.loserId).toBe('b');
    expect(rw.setsWonPlayer1).toBe(2);
    expect(rw.setsWonPlayer2).toBe(1);
    expect(rw.gamesWonPlayer1).toBeGreaterThan(0);
  });

  it('calculateGroupStandings: orden por rendimiento (PG / sets / games / H2H), sin puntos de tabla', () => {
    const players = [p('a', 'Ana'), p('b', 'Bea'), p('c', 'Carla')];
    const matches: MatchInput[] = [
      {
        matchId: 'x1',
        tournamentId: 't1',
        group: 'G1',
        playerA: 'Ana',
        playerB: 'Bea',
        score: '6-0 6-0',
        status: 'played',
      },
      {
        matchId: 'x2',
        tournamentId: 't1',
        group: 'G1',
        playerA: 'Ana',
        playerB: 'Carla',
        score: '6-4 6-4',
        status: 'played',
      },
      {
        matchId: 'x3',
        tournamentId: 't1',
        group: 'G1',
        playerA: 'Bea',
        playerB: 'Carla',
        score: '6-4 6-4',
        status: 'played',
      },
    ];
    const st = calculateGroupStandings(matches, players, ENGINE_GROUP_RULES);
    const ana = st.find((r) => r.playerId === 'a');
    const bea = st.find((r) => r.playerId === 'b');
    expect(ana?.points).toBe(0);
    expect(bea?.points).toBe(0);
    expect(ana?.won).toBe(2);
    expect(bea?.won).toBe(1);
    expect(st[0].playerId).toBe('a');
  });

  it('calculateTournamentClassification: 2 directos por grupo + mejor tercero', () => {
    const groups = [
      {
        groupId: 'G1',
        standings: [
          { playerId: 'a', displayName: 'A', position: 1, played: 2, won: 2, lost: 0, setsWon: 4, setsLost: 0, setsDifference: 4, gamesWon: 0, gamesLost: 0, points: 0 },
          { playerId: 'b', displayName: 'B', position: 2, played: 2, won: 1, lost: 1, setsWon: 2, setsLost: 2, setsDifference: 0, gamesWon: 0, gamesLost: 0, points: 0 },
          { playerId: 'c', displayName: 'C', position: 3, played: 2, won: 0, lost: 2, setsWon: 0, setsLost: 4, setsDifference: -4, gamesWon: 0, gamesLost: 0, points: 0 },
        ],
      },
      {
        groupId: 'G2',
        standings: [
          { playerId: 'd', displayName: 'D', position: 1, played: 2, won: 2, lost: 0, setsWon: 4, setsLost: 0, setsDifference: 4, gamesWon: 0, gamesLost: 0, points: 0 },
          { playerId: 'e', displayName: 'E', position: 2, played: 2, won: 1, lost: 1, setsWon: 2, setsLost: 2, setsDifference: 0, gamesWon: 0, gamesLost: 0, points: 0 },
          { playerId: 'f', displayName: 'F', position: 3, played: 2, won: 0, lost: 2, setsWon: 0, setsLost: 4, setsDifference: -4, gamesWon: 0, gamesLost: 0, points: 0 },
        ],
      },
    ];
    const cl = calculateTournamentClassification(groups, {
      advancePerGroup: 2,
      bestThirdsSlots: 1,
      repechageSlots: 0,
    });
    expect(cl.directQualifiers).toHaveLength(4);
    expect(cl.bestThirds).toHaveLength(1);
    expect(cl.orderedEntry.length).toBe(5);
  });

  it('calculatePlayerStats', () => {
    const matches: MatchInput[] = [
      {
        matchId: '1',
        tournamentId: 't1',
        playerA: 'Ana',
        playerB: 'Bea',
        score: '6-2 6-2',
        status: 'played',
      },
    ];
    const s = calculatePlayerStats('a', matches, [
      { id: 'a', name: 'Ana' },
      { id: 'b', name: 'Bea' },
    ]);
    expect(s.matchesPlayed).toBe(1);
    expect(s.wins).toBe(1);
    expect(s.winRatePercent).toBe(100);
  });

  it('calculateRanking incluye títulos si hay final KO', () => {
    const players = [p('x', 'X'), p('y', 'Y')];
    const tournaments = [t('t99', 3)];
    const results: MatchInput[] = [];
    const ko = [
      {
        id: 'f1',
        tournamentId: 't99',
        playerA: 'x',
        playerB: 'y',
        score: '6-4 6-4',
        winnerId: 'x',
        round: 'Final',
      },
    ];
    const rows = calculateRanking(players, tournaments, results, { league: 3, knockoutMatches: ko });
    const rx = rows.find((r) => r.playerId === 'x');
    expect(rx?.titles).toBe(1);
    expect(rx?.finalsReached).toBe(1);
  });

  it('recalculateTournamentFromData agrupa standings', () => {
    const players = [p('a', 'Ana'), p('b', 'Bea')];
    const tournaments = [t('t1', 3)];
    const resultMatches: MatchInput[] = [
      {
        matchId: 'z',
        tournamentId: 't1',
        group: 'G1',
        playerA: 'Ana',
        playerB: 'Bea',
        score: '6-1 6-1',
        status: 'played',
      },
    ];
    const out = recalculateTournamentFromData({
      tournamentId: 't1',
      players,
      tournaments,
      resultMatches,
      knockoutMatches: [],
    });
    expect(out.groups.G1).toBeDefined();
    expect(out.groups.G1.some((r) => r.playerId === 'a')).toBe(true);
  });
});

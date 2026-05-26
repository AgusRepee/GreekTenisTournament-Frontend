import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { MatchInput } from '@/types/tennisResults';
import type { Player, Tournament, Match } from '@/lib/mockData';
import { validateMatchResult } from '@/lib/tournamentEngine';
import { failedFlowChecks, runResultsFlowVerification } from '@/lib/tennis/resultsFlowVerification';
import type { ClubCatalogPort } from '@/data/services/contracts/clubCatalogPort';
import { setClubCatalogPort, resetDataPortsToLocalDefaults } from '@/data/services/registry';

function stubClubCatalogPort(players: Player[]): ClubCatalogPort {
  const snapshot = { players, tournaments: [] as Tournament[], matches: [] as Match[] };
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => snapshot,
    subscribe: (cb: () => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    refresh: () => {
      listeners.forEach((cb) => cb());
    },
  };
}

const p = (id: string, name: string): Player => ({
  id,
  name,
  category: 'Tercera',
});

function tournamentFlow(id: string): Tournament {
  return {
    id,
    name: 'Torneo verificación',
    category: 'Tercera',
    status: 'ongoing',
    startDate: '2025-01-01',
    endDate: '2025-02-28',
    location: 'Club',
    league: 3,
    ligaDoc: {
      grupos: {
        'Grupo A': ['Alvarez I.', 'Araujo J.'],
      },
    },
  };
}

const engineRef = {
  id: 'dedupe-alv-ar',
  player1Id: 'p-alvarez',
  player2Id: 'p-araujo',
  player1Name: 'Alvarez I.',
  player2Name: 'Araujo J.',
  tournamentId: 't-flow',
  group: 'Grupo A',
};

describe('resultsFlowVerification (Alvarez vs Araujo)', () => {
  const players = [p('p-alvarez', 'Alvarez I.'), p('p-araujo', 'Araujo J.')];
  const tournaments = [tournamentFlow('t-flow')];

  beforeEach(() => {
    setClubCatalogPort(stubClubCatalogPort(players));
  });

  afterEach(() => {
    resetDataPortsToLocalDefaults();
  });

  const baseMatch = (score: string): MatchInput => ({
    matchId: 'm-alv-ar',
    tournamentId: 't-flow',
    group: 'Grupo A',
    playerA: 'Alvarez I.',
    playerB: 'Araujo J.',
    score,
    status: 'played',
  });

  it('6-4 6-3: grupo, stats y ranking coherentes', () => {
    const checks = runResultsFlowVerification({
      players,
      tournaments,
      resultMatches: [baseMatch('6-4 6-3')],
      knockoutMatches: [],
      tournamentId: 't-flow',
      groupKey: 'Grupo A',
      expectedWinnerId: 'p-alvarez',
      expectedLoserId: 'p-araujo',
    });
    expect(failedFlowChecks(checks)).toEqual([]);
  });

  it('validateMatchResult: rechaza empate de sets (1-1)', () => {
    const r = validateMatchResult(engineRef, {
      status: 'played',
      score: '6-4 4-6',
      winnerId: 'p-alvarez',
    });
    expect(r.valid).toBe(false);
    if (!r.valid) {
      expect(r.errors.length).toBeGreaterThan(0);
    }
  });

  it('validateMatchResult: rechaza marcador inválido', () => {
    const r = validateMatchResult(engineRef, { status: 'played', score: 'foo-bar', winnerId: 'p-alvarez' });
    expect(r.valid).toBe(false);
  });

  it('validateMatchResult: acepta walkover con winnerId', () => {
    const r = validateMatchResult(engineRef, { status: 'walkover', winnerId: 'p-araujo' });
    expect(r).toEqual({ valid: true });
  });

  it('modificar ganador: standings reflejan al nuevo ganador', () => {
    const out = runResultsFlowVerification({
      players,
      tournaments,
      resultMatches: [baseMatch('3-6 2-6')],
      knockoutMatches: [],
      tournamentId: 't-flow',
      groupKey: 'Grupo A',
      expectedWinnerId: 'p-araujo',
      expectedLoserId: 'p-alvarez',
    });
    expect(failedFlowChecks(out)).toEqual([]);
  });
});

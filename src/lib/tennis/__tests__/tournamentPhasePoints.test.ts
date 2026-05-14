import { describe, it, expect } from 'vitest';
import type { Match } from '../../../types/tournament';
import type { Tournament } from '../../../types/tournament';
import { calculateTournamentPoints, DEFAULT_TOURNAMENT_REACH_POINTS } from '../tournamentPhasePoints';
import { getPlayerReachedPhase } from '../playerReachedPhase';

const baseTournament = (id: string): Tournament => ({
  id,
  name: 'Test',
  league: 3,
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  status: 'in_progress',
  rules: {},
  groups: [],
});

function ko(
  tid: string,
  id: string,
  stage: Match['stage'],
  p1: string,
  p2: string,
  winner: string | null,
  roundNumber: number,
): Match {
  return {
    id,
    tournamentId: tid,
    stage,
    roundNumber,
    player1Id: p1,
    player2Id: p2,
    winnerId: winner ?? undefined,
    completed: winner != null,
    outcome: winner ? 'played' : 'pending',
  };
}

describe('getPlayerReachedPhase (domain Match[])', () => {
  it('detecta campeón desde partidos modelo Match', () => {
    const tid = 't1';
    const matches: Match[] = [
      ko(tid, 'qf1', 'quarterfinal', 'a', 'h', 'a', 1),
      ko(tid, 'qf2', 'quarterfinal', 'd', 'e', 'd', 2),
      ko(tid, 'qf3', 'quarterfinal', 'c', 'f', 'c', 3),
      ko(tid, 'qf4', 'quarterfinal', 'b', 'g', 'b', 4),
      ko(tid, 'sf1', 'semifinal', 'a', 'd', 'a', 5),
      ko(tid, 'sf2', 'semifinal', 'b', 'c', 'b', 6),
      ko(tid, 'f1', 'final', 'a', 'b', 'a', 7),
    ];
    expect(getPlayerReachedPhase('a', matches)).toBe('champion');
    expect(getPlayerReachedPhase('b', matches)).toBe('finalist');
  });

  it('cuartos: perdedor es quarterfinalist', () => {
    const tid = 't2';
    const matches: Match[] = [ko(tid, 'qf1', 'quarterfinal', 'x', 'y', 'y', 1)];
    expect(getPlayerReachedPhase('x', matches)).toBe('quarterfinalist');
  });
});

describe('calculateTournamentPoints', () => {
  it('asigna puntos por fase y respeta phaseReachPoints en reglas', () => {
    const tid = 'tp1';
    const t: Tournament = {
      ...baseTournament(tid),
      rules: {
        phaseReachPoints: { champion: 999 },
      },
    };
    const matches: Match[] = [ko(tid, 'f1', 'final', 'p1', 'p2', 'p1', 7)];
    const r = calculateTournamentPoints('p1', t, matches);
    expect(r.phase).toBe('champion');
    expect(r.points).toBe(999);
  });

  it('grupo sin KO: group_stage y puntos por defecto', () => {
    const tid = 'tp2';
    const t = baseTournament(tid);
    const matches: Match[] = [
      {
        id: 'g1',
        tournamentId: tid,
        stage: 'group',
        groupName: 'A',
        player1Id: 'u1',
        player2Id: 'u2',
        winnerId: 'u1',
        completed: true,
        outcome: 'played',
      },
    ];
    const r = calculateTournamentPoints('u2', t, matches);
    expect(r.phase).toBe('group_stage');
    expect(r.points).toBe(DEFAULT_TOURNAMENT_REACH_POINTS.group_stage);
  });

  it('filtra por tournamentId', () => {
    const t = baseTournament('only');
    const matches: Match[] = [
      ko('other', 'f', 'final', 'a', 'b', 'a', 1),
      ko('only', 'f2', 'final', 'x', 'y', 'x', 1),
    ];
    expect(calculateTournamentPoints('a', t, matches).points).toBe(0);
    expect(calculateTournamentPoints('x', t, matches).phase).toBe('champion');
  });
});

import { describe, it, expect } from 'vitest';
import { getPlayerReachedPhase, type TournamentPhaseMatch } from '../playerReachedPhase';

function ko(
  id: string,
  a: string,
  b: string,
  winner: string | null,
  round: string,
): TournamentPhaseMatch {
  return { playerA: a, playerB: b, winnerId: winner, round };
}

describe('getPlayerReachedPhase', () => {
  it('campeón y finalista por partido de final', () => {
    const final = ko('f', 'p1', 'p2', 'p2', 'Final');
    expect(getPlayerReachedPhase('p2', [final])).toBe('champion');
    expect(getPlayerReachedPhase('p1', [final])).toBe('finalist');
  });

  it('final sin ganador aún: ambos cuentan como finalista', () => {
    const final = ko('f', 'p1', 'p2', null, 'Final');
    expect(getPlayerReachedPhase('p1', [final])).toBe('finalist');
    expect(getPlayerReachedPhase('p2', [final])).toBe('finalist');
  });

  it('semifinalista al perder semis', () => {
    const matches: TournamentPhaseMatch[] = [
      ko('s1', 'p1', 'p3', 'p1', 'Semifinales'),
      ko('s2', 'p2', 'p4', 'p4', 'Semifinales'),
    ];
    expect(getPlayerReachedPhase('p2', matches)).toBe('semifinalist');
    expect(getPlayerReachedPhase('p1', matches)).toBe('none');
  });

  it('cuartos de final no se confunden con final', () => {
    const matches = [ko('q', 'p1', 'p2', 'p2', 'Cuartos de final')];
    expect(getPlayerReachedPhase('p1', matches)).toBe('quarterfinalist');
  });

  it('repechaje sin cuadro principal (participación en repechaje)', () => {
    const matches = [
      ko('r', 'p1', 'p2', 'p2', 'Repechaje — ida'),
    ];
    expect(getPlayerReachedPhase('p1', matches)).toBe('repechage');
    expect(getPlayerReachedPhase('p2', matches)).toBe('repechage');
  });

  it('grupo con partido completado', () => {
    const m: TournamentPhaseMatch = {
      playerA: 'p1',
      playerB: 'p2',
      winnerId: 'p1',
      group: 'A',
      completed: true,
    };
    expect(getPlayerReachedPhase('p2', [m])).toBe('group_stage');
  });

  it('prioriza KO sobre grupos', () => {
    const matches: TournamentPhaseMatch[] = [
      { playerA: 'p1', playerB: 'p2', winnerId: 'p2', group: 'A', completed: true },
      ko('f', 'p1', 'p3', 'p3', 'Final'),
    ];
    expect(getPlayerReachedPhase('p1', matches)).toBe('finalist');
  });
});

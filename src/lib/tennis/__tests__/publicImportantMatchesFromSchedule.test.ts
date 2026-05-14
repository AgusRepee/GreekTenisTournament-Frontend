import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Tournament } from '@/lib/mockData';
import type { MatchScheduleEntry } from '@/lib/tennis/matchScheduleStore';
import type { SchedulableMatch } from '@/lib/tennis/schedulableMatchCatalog';
import {
  buildImportantMatchReasonLabels,
  calculateImportantMatchScore,
  listImportantMatchesFromSchedules,
} from '../publicImportantMatchesFromSchedule';

vi.mock('@/lib/tennis/schedulableMatchCatalog', () => ({
  buildSchedulableMatches: vi.fn(),
}));

import { buildSchedulableMatches } from '@/lib/tennis/schedulableMatchCatalog';

const mockBuildSchedulable = vi.mocked(buildSchedulableMatches);

function baseTournament(over: Partial<Tournament> = {}): Tournament {
  return {
    id: 't-x',
    name: 'Torneo Test',
    category: 'Primera',
    status: 'upcoming',
    startDate: '2026-05-01',
    endDate: '2026-05-31',
    location: 'Club',
    league: 1,
    ...over,
  };
}

describe('calculateImportantMatchScore', () => {
  const nowMs = new Date('2026-05-08T12:00:00').getTime();

  it('prioriza eliminatoria final sobre fase de grupos', () => {
    const tour = baseTournament();
    const schedule = {
      dedupeKey: 'k',
      tournamentId: tour.id,
      leagueNum: 1,
      scheduleStatus: 'confirmed' as const,
      date: '2026-05-20',
      time: '10:00',
      updatedAt: nowMs,
    };
    const koFinal: SchedulableMatch = {
      dedupeKey: 'k',
      tournamentId: tour.id,
      kind: 'ko',
      playerA: 'A',
      playerB: 'B',
      groupLabel: 'Final',
      fixtureRoundLabel: 'Final',
      koStage: 'final',
    };
    const group: SchedulableMatch = {
      dedupeKey: 'g',
      tournamentId: tour.id,
      kind: 'fixture',
      playerA: 'C',
      playerB: 'D',
      groupLabel: 'Grupo A',
      fixtureRound: 9,
      fixtureRoundLabel: 'Fecha 9',
      groupKey: 'A',
    };
    const sGroup: MatchScheduleEntry = { ...schedule, dedupeKey: 'g' };
    const sKo: MatchScheduleEntry = { ...schedule, dedupeKey: 'k' };

    const finalScore = calculateImportantMatchScore({
      schedule: sKo,
      schedulable: koFinal,
      tournament: tour,
      matchInstantMs: nowMs + 86400000 * 14,
      nowMs,
    });
    const groupScore = calculateImportantMatchScore({
      schedule: sGroup,
      schedulable: group,
      tournament: tour,
      matchInstantMs: nowMs + 86400000,
      nowMs,
    });
    expect(finalScore).toBeGreaterThan(groupScore);
  });

  it('entre mismos kind, confirmed suma más que scheduled', () => {
    const tour = baseTournament();
    const schedulable: SchedulableMatch = {
      dedupeKey: 'x',
      tournamentId: tour.id,
      kind: 'fixture',
      playerA: 'A',
      playerB: 'B',
      groupLabel: 'Grupo A',
      fixtureRound: 1,
      fixtureRoundLabel: 'Fecha 1',
      groupKey: 'A',
    };
    const confirmed = calculateImportantMatchScore({
      schedule: {
        dedupeKey: 'x',
        tournamentId: tour.id,
        leagueNum: 1,
        scheduleStatus: 'confirmed',
        date: '2026-05-10',
        time: '10:00',
        updatedAt: nowMs,
      },
      schedulable,
      tournament: tour,
      matchInstantMs: nowMs + 86400000,
      nowMs,
    });
    const scheduled = calculateImportantMatchScore({
      schedule: {
        dedupeKey: 'x',
        tournamentId: tour.id,
        leagueNum: 1,
        scheduleStatus: 'scheduled',
        date: '2026-05-10',
        time: '10:00',
        updatedAt: nowMs,
      },
      schedulable,
      tournament: tour,
      matchInstantMs: nowMs + 86400000,
      nowMs,
    });
    expect(confirmed).toBeGreaterThan(scheduled);
  });

  it('suma importancia por seeds y posiciones de ranking cuando vienen en el contexto', () => {
    const tour = baseTournament();
    const schedule = {
      dedupeKey: 'x',
      tournamentId: tour.id,
      leagueNum: 1,
      scheduleStatus: 'confirmed' as const,
      date: '2026-05-10',
      time: '10:00',
      updatedAt: nowMs,
    };
    const schedulable: SchedulableMatch = {
      dedupeKey: 'x',
      tournamentId: tour.id,
      kind: 'fixture',
      playerA: 'A',
      playerB: 'B',
      groupLabel: 'Grupo A',
      fixtureRound: 1,
      fixtureRoundLabel: 'Fecha 1',
      groupKey: 'A',
    };
    const baseCtx = {
      schedule,
      schedulable,
      tournament: tour,
      matchInstantMs: nowMs + 86400000,
      nowMs,
    };
    const plain = calculateImportantMatchScore(baseCtx);
    const boosted = calculateImportantMatchScore({
      ...baseCtx,
      player1Seed: 1,
      player2Seed: 2,
      player1RankingPosition: 1,
      player2RankingPosition: 3,
    });
    expect(boosted).toBeGreaterThan(plain);
  });

  it('no suma confirmedAt al score cuando el estado ya es confirmed', () => {
    const tour = baseTournament();
    const schedulable: SchedulableMatch = {
      dedupeKey: 'x',
      tournamentId: tour.id,
      kind: 'fixture',
      playerA: 'A',
      playerB: 'B',
      groupLabel: 'Grupo A',
      fixtureRound: 1,
      fixtureRoundLabel: 'Fecha 1',
      groupKey: 'A',
    };
    const base = {
      dedupeKey: 'x',
      tournamentId: tour.id,
      leagueNum: 1,
      scheduleStatus: 'confirmed' as const,
      date: '2026-05-10',
      time: '10:00',
      updatedAt: nowMs,
    };
    const withStamp = calculateImportantMatchScore({
      schedule: { ...base, confirmedAt: nowMs },
      schedulable,
      tournament: tour,
      matchInstantMs: nowMs + 86400000,
      nowMs,
    });
    const noStamp = calculateImportantMatchScore({
      schedule: base,
      schedulable,
      tournament: tour,
      matchInstantMs: nowMs + 86400000,
      nowMs,
    });
    expect(withStamp).toBe(noStamp);
  });

  it('suma confirmedAt al score solo si el estado no es confirmed', () => {
    const tour = baseTournament();
    const schedulable: SchedulableMatch = {
      dedupeKey: 'x',
      tournamentId: tour.id,
      kind: 'fixture',
      playerA: 'A',
      playerB: 'B',
      groupLabel: 'Grupo A',
      fixtureRound: 1,
      fixtureRoundLabel: 'Fecha 1',
      groupKey: 'A',
    };
    const scheduledNoStamp = calculateImportantMatchScore({
      schedule: {
        dedupeKey: 'x',
        tournamentId: tour.id,
        leagueNum: 1,
        scheduleStatus: 'scheduled',
        date: '2026-05-10',
        time: '10:00',
        updatedAt: nowMs,
      },
      schedulable,
      tournament: tour,
      matchInstantMs: nowMs + 86400000,
      nowMs,
    });
    const scheduledWithStamp = calculateImportantMatchScore({
      schedule: {
        dedupeKey: 'x',
        tournamentId: tour.id,
        leagueNum: 1,
        scheduleStatus: 'scheduled',
        date: '2026-05-10',
        time: '10:00',
        updatedAt: nowMs,
        confirmedAt: nowMs,
      },
      schedulable,
      tournament: tour,
      matchInstantMs: nowMs + 86400000,
      nowMs,
    });
    expect(scheduledWithStamp).toBeGreaterThan(scheduledNoStamp);
  });
});

describe('listImportantMatchesFromSchedules', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-08T12:00:00'));
    mockBuildSchedulable.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ordena por score de importancia y luego por fecha más próxima', () => {
    const tGroup = baseTournament({ id: 't-g', name: 'Grupos' });
    const tKo = baseTournament({ id: 't-k', name: 'KO' });

    const rowGroup: SchedulableMatch = {
      dedupeKey: 'dg',
      tournamentId: 't-g',
      kind: 'fixture',
      playerA: 'P1',
      playerB: 'P2',
      groupLabel: 'A',
      fixtureRound: 1,
      fixtureRoundLabel: 'Fecha 1',
      groupKey: 'A',
    };
    const rowSemi: SchedulableMatch = {
      dedupeKey: 'dk',
      tournamentId: 't-k',
      kind: 'ko',
      playerA: 'P3',
      playerB: 'P4',
      groupLabel: 'Semifinal',
      fixtureRoundLabel: 'Semifinal',
      koStage: 'semi',
    };

    mockBuildSchedulable.mockImplementation((tid: string) => {
      if (tid === 't-g') return [rowGroup];
      if (tid === 't-k') return [rowSemi];
      return [];
    });

    const schedules: MatchScheduleEntry[] = [
      {
        dedupeKey: 'dg',
        tournamentId: 't-g',
        leagueNum: 1,
        scheduleStatus: 'confirmed',
        date: '2026-05-09',
        time: '09:00',
        updatedAt: Date.now(),
      },
      {
        dedupeKey: 'dk',
        tournamentId: 't-k',
        leagueNum: 1,
        scheduleStatus: 'confirmed',
        date: '2026-05-15',
        time: '18:00',
        updatedAt: Date.now(),
      },
    ];

    const out = listImportantMatchesFromSchedules(schedules, [tGroup, tKo], [], []);

    expect(out.length).toBe(2);
    expect(out[0]!.round).toBe('Semifinal');
    expect(out[1]!.round).toBe('Fecha 1');
    expect(out[0]!.mainReason).toBe('SEMIFINAL');
    expect(out[0]!.reasonLabels?.[0]).toBe(out[0]!.mainReason);
    expect(out[1]!.mainReason).toBe('Próximo partido');
    expect(out[1]!.reasonLabels?.length).toBeGreaterThan(0);
  });

  it('a igual importancia, gana el más próximo en el tiempo', () => {
    const tour = baseTournament({ id: 't1' });
    const row: SchedulableMatch = {
      dedupeKey: 'd1',
      tournamentId: 't1',
      kind: 'fixture',
      playerA: 'A',
      playerB: 'B',
      groupLabel: 'A',
      fixtureRound: 2,
      fixtureRoundLabel: 'Fecha 2',
      groupKey: 'A',
    };
    mockBuildSchedulable.mockReturnValue([row]);

    const schedules: MatchScheduleEntry[] = [
      {
        dedupeKey: 'd1',
        tournamentId: 't1',
        leagueNum: 1,
        scheduleStatus: 'scheduled',
        date: '2026-05-20',
        time: '10:00',
        updatedAt: Date.now(),
      },
      {
        dedupeKey: 'd2',
        tournamentId: 't1',
        leagueNum: 1,
        scheduleStatus: 'scheduled',
        date: '2026-05-10',
        time: '10:00',
        updatedAt: Date.now(),
      },
    ];

    const rowB = { ...row, dedupeKey: 'd2' };
    mockBuildSchedulable.mockReturnValue([
      row,
      { ...rowB, playerA: 'C', playerB: 'D' },
    ]);

    const out = listImportantMatchesFromSchedules(schedules, [tour], [], []);
    expect(out.map((m) => m.id)).toEqual(['d2', 'd1']);
    for (const m of out) {
      expect(m.mainReason).toBeTruthy();
      expect(m.reasonLabels?.length).toBeGreaterThan(0);
    }
  });
});

describe('buildImportantMatchReasonLabels', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-08T12:00:00'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const nowMs = new Date('2026-05-08T12:00:00').getTime();

  it('prioriza la fase KO en el motivo principal', () => {
    const tour = baseTournament({ startDate: '2026-05-01', endDate: '2026-05-31', status: 'upcoming' });
    const schedule = {
      dedupeKey: 'k',
      tournamentId: tour.id,
      leagueNum: 1,
      scheduleStatus: 'confirmed' as const,
      date: '2026-05-20',
      time: '10:00',
      updatedAt: nowMs,
    };
    const koFinal: SchedulableMatch = {
      dedupeKey: 'k',
      tournamentId: tour.id,
      kind: 'ko',
      playerA: 'A',
      playerB: 'B',
      groupLabel: 'Final',
      fixtureRoundLabel: 'Final',
      koStage: 'final',
    };
    const { mainReason, reasonLabels } = buildImportantMatchReasonLabels({
      schedule,
      schedulable: koFinal,
      tournament: tour,
      matchInstantMs: nowMs + 86400000,
      nowMs,
      player1Seed: 1,
      player2Seed: 2,
      player1RankingPosition: 1,
      player2RankingPosition: 2,
    });
    expect(mainReason).toBe('FINAL');
    expect(reasonLabels).toContain('FINAL');
    expect(reasonLabels).toContain('TOP SEEDS');
    expect(reasonLabels).toContain('TOP RANKING');
    expect(reasonLabels).toContain('Torneo en curso');
  });

  it('FINAL gana a TOP SEEDS y TOP RANKING', () => {
    const tour = baseTournament();
    const { mainReason } = buildImportantMatchReasonLabels({
      schedule: {
        dedupeKey: 'k',
        tournamentId: tour.id,
        leagueNum: 1,
        scheduleStatus: 'confirmed',
        date: '2026-05-20',
        time: '10:00',
        updatedAt: nowMs,
      },
      schedulable: {
        dedupeKey: 'k',
        tournamentId: tour.id,
        kind: 'ko',
        playerA: 'A',
        playerB: 'B',
        groupLabel: 'Final',
        fixtureRoundLabel: 'Final',
        koStage: 'final',
      },
      tournament: tour,
      matchInstantMs: nowMs + 86400000,
      nowMs,
      player1Seed: 1,
      player2Seed: 2,
      player1RankingPosition: 1,
      player2RankingPosition: 2,
    });
    expect(mainReason).toBe('FINAL');
  });

  it('en fase de grupos, TOP SEEDS gana a FECHA si no es final ni semifinal', () => {
    const tour = baseTournament();
    const { mainReason } = buildImportantMatchReasonLabels({
      schedule: {
        dedupeKey: 'x',
        tournamentId: tour.id,
        leagueNum: 1,
        scheduleStatus: 'confirmed',
        date: '2026-05-12',
        time: '10:00',
        updatedAt: nowMs,
      },
      schedulable: {
        dedupeKey: 'x',
        tournamentId: tour.id,
        kind: 'fixture',
        playerA: 'A',
        playerB: 'B',
        groupLabel: 'A',
        fixtureRound: 2,
        fixtureRoundLabel: 'Fecha 2',
        groupKey: 'A',
      },
      tournament: tour,
      matchInstantMs: nowMs + 86400000,
      nowMs,
      player1Seed: 1,
      player2Seed: 2,
    });
    expect(mainReason).toBe('TOP SEEDS');
  });

  it('TOP RANKING no lo desplaza el sello logístico', () => {
    const tour = baseTournament();
    const { mainReason, reasonLabels } = buildImportantMatchReasonLabels({
      schedule: {
        dedupeKey: 'x',
        tournamentId: tour.id,
        leagueNum: 1,
        scheduleStatus: 'scheduled',
        date: '2026-05-12',
        time: '10:00',
        updatedAt: nowMs,
        confirmedAt: nowMs,
      },
      schedulable: {
        dedupeKey: 'x',
        tournamentId: tour.id,
        kind: 'fixture',
        playerA: 'A',
        playerB: 'B',
        groupLabel: 'A',
        fixtureRound: 3,
        fixtureRoundLabel: 'Fecha 3',
        groupKey: 'A',
      },
      tournament: tour,
      matchInstantMs: nowMs + 86400000,
      nowMs,
      player1Seed: 20,
      player2Seed: 21,
      player1RankingPosition: 2,
      player2RankingPosition: 5,
    });
    expect(mainReason).toBe('TOP RANKING');
    expect(reasonLabels.join('|').includes('Sede')).toBe(false);
    expect(reasonLabels).toContain('Confirmación registrada');
  });

  it('sin señal fuerte en fecha 1, el motivo principal es Próximo partido', () => {
    const tour = baseTournament();
    const { mainReason } = buildImportantMatchReasonLabels({
      schedule: {
        dedupeKey: 'x',
        tournamentId: tour.id,
        leagueNum: 1,
        scheduleStatus: 'confirmed',
        date: '2026-05-12',
        time: '10:00',
        updatedAt: nowMs,
      },
      schedulable: {
        dedupeKey: 'x',
        tournamentId: tour.id,
        kind: 'fixture',
        playerA: 'A',
        playerB: 'B',
        groupLabel: 'A',
        fixtureRound: 1,
        fixtureRoundLabel: 'Fecha 1',
        groupKey: 'A',
      },
      tournament: tour,
      matchInstantMs: nowMs + 86400000,
      nowMs,
    });
    expect(mainReason).toBe('Próximo partido');
  });

  it('CUARTOS sigue siendo el motivo principal frente a otros detalles logísticos', () => {
    const tour = baseTournament();
    const { mainReason } = buildImportantMatchReasonLabels({
      schedule: {
        dedupeKey: 'q',
        tournamentId: tour.id,
        leagueNum: 1,
        scheduleStatus: 'confirmed',
        date: '2026-05-18',
        time: '16:00',
        updatedAt: nowMs,
      },
      schedulable: {
        dedupeKey: 'q',
        tournamentId: tour.id,
        kind: 'ko',
        playerA: 'A',
        playerB: 'B',
        groupLabel: 'Cuartos',
        fixtureRoundLabel: 'Cuartos',
        koStage: 'quarter',
      },
      tournament: tour,
      matchInstantMs: nowMs + 86400000,
      nowMs,
    });
    expect(mainReason).toBe('CUARTOS');
  });

  it('torneo Masters 1000 muestra etiqueta y prioriza por encima de LIGA', () => {
    const tour = baseTournament({ id: 't-masters', name: 'Masters Finals' });
    const { mainReason, reasonLabels } = buildImportantMatchReasonLabels({
      schedule: {
        dedupeKey: 'x',
        tournamentId: tour.id,
        leagueNum: 1,
        scheduleStatus: 'confirmed',
        date: '2026-05-12',
        time: '10:00',
        updatedAt: nowMs,
      },
      schedulable: {
        dedupeKey: 'x',
        tournamentId: tour.id,
        kind: 'fixture',
        playerA: 'A',
        playerB: 'B',
        groupLabel: 'A',
        fixtureRound: 2,
        fixtureRoundLabel: 'Fecha 2',
        groupKey: 'A',
      },
      tournament: tour,
      matchInstantMs: nowMs + 86400000,
      nowMs,
    });
    expect(reasonLabels).toContain('MASTERS 1000');
    expect(reasonLabels.indexOf('MASTERS 1000')).toBeLessThan(reasonLabels.indexOf('LIGA 1'));
    expect(mainReason).toBe('MASTERS 1000');
  });
});

import type { Player } from '@/lib/mockData';
import { getTournamentById } from '@/lib/mockData';
import { buildFixtureCatalogEntriesForTournament } from '@/lib/tennis/buildFixtureCatalog';
import { sortFixtureEntriesByGroupThenRound } from '@/lib/tennis/fixtureResultsOrdering';
import { buildKnockoutAdminEntries, type KnockoutStage } from '@/lib/tennis/adminKnockoutCatalog';

export type SchedulableMatchKind = 'fixture' | 'ko';

export interface SchedulableMatch {
  dedupeKey: string;
  tournamentId: string;
  kind: SchedulableMatchKind;
  playerA: string;
  playerB: string;
  groupLabel: string;
  fixtureRound?: number;
  fixtureRoundLabel: string;
  groupKey?: string;
  koStage?: KnockoutStage;
}

function koStageTitle(ko: KnockoutStage): string {
  if (ko === 'repechaje') return 'Repechaje';
  if (ko === 'octavos') return 'Octavos';
  if (ko === 'quarter') return 'Cuartos';
  if (ko === 'semi') return 'Semifinal';
  return 'Final';
}

export function buildSchedulableMatches(tournamentId: string, players: Player[]): SchedulableMatch[] {
  const tour = getTournamentById(tournamentId);
  const fixtureRows = sortFixtureEntriesByGroupThenRound(buildFixtureCatalogEntriesForTournament(tour, players)).map((e) => ({
    dedupeKey: e.dedupeKey,
    tournamentId: e.tournamentId,
    kind: 'fixture' as const,
    playerA: e.playerA,
    playerB: e.playerB,
    groupLabel: e.group,
    fixtureRound: e.round,
    fixtureRoundLabel: `Fecha ${e.round}`,
    groupKey: e.group,
  }));

  const koRows = buildKnockoutAdminEntries(tournamentId, players).map((e) => ({
    dedupeKey: e.dedupeKey,
    tournamentId: e.tournamentId,
    kind: 'ko' as const,
    playerA: e.playerA,
    playerB: e.playerB,
    groupLabel: koStageTitle(e.koStage),
    fixtureRoundLabel: koStageTitle(e.koStage),
    groupKey: e.group,
    koStage: e.koStage,
  }));

  return [...fixtureRows, ...koRows];
}


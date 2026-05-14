import type { LeagueNum } from '@/lib/mockData';

/** Ciclo de vida del proyecto (constructor); no reemplaza `Tournament.status` del catálogo. */
export type AdminBuilderLifecycle = 'draft' | 'groups_configured' | 'fixture_generated' | 'active' | 'finished';

export type AdminEliminationStart = 'final' | 'semifinals' | 'quarterfinals' | 'octavos';

export const ELIMINATION_START_LABELS: Record<AdminEliminationStart, string> = {
  final: 'Final',
  semifinals: 'Semifinales',
  quarterfinals: 'Cuartos de final',
  octavos: 'Octavos de final',
};

export interface AdminLeagueGroupConfig {
  groupCount: number;
  playersPerGroupExpected: number;
  qualifyTopN: number;
  repechajeMejoresTerceros: boolean;
  classificationRulesText: string;
  eliminationStart: AdminEliminationStart;
}

export interface AdminGroupRow {
  groupKey: string;
  label: string;
  playerIds: string[];
}

export interface AdminLeagueBuilderSlice {
  leagueNum: LeagueNum;
  config: AdminLeagueGroupConfig | null;
  /** Pool lateral: jugadores de la liga aún no colocados en un grupo. */
  availablePlayerIds: string[];
  groups: AdminGroupRow[];
  groupsLocked: boolean;
  /** Copia al confirmar grupos (para comparar / auditoría). */
  groupsCommitted: AdminGroupRow[] | null;
}

export interface AdminReplacementEntry {
  id: string;
  at: string;
  leagueNum: LeagueNum;
  outgoingPlayerId: string;
  incomingPlayerId: string;
  reason?: string;
}

export interface AdminSyntheticPlayer {
  id: string;
  firstName: string;
  lastName: string;
  leagueNum: LeagueNum;
  createdAt: string;
}

export interface AdminTournamentProject {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  coverImageDataUrl?: string;
  shortDescription: string;
  startDate: string;
  endDate: string;
  lifecycle: AdminBuilderLifecycle;
  selectedLeagues: LeagueNum[];
  /** Claves `"1"`…`"6"` en JSON. */
  leagues: Record<string, AdminLeagueBuilderSlice>;
  syntheticPlayers: AdminSyntheticPlayer[];
  replacementHistory: AdminReplacementEntry[];
  fixtureGenerated: boolean;
  resultsCommitted: boolean;
}

export type BuilderWizardStep = 'meta' | 'leagues' | 'league_config' | 'league_groups' | 'summary';

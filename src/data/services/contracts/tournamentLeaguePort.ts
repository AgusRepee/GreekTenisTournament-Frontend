export interface TournamentLeagueRow {
  id: string;
  tournamentId: string;
  leagueNum: number;
  groupStageStatus: string | null;
  eliminationStatus: string | null;
}

/**
 * Estado de `TournamentLeague` (grupos + eliminación) por torneo/liga.
 * Local: derivado del overlay de torneo; API: filas MySQL.
 */
export interface TournamentLeaguePort {
  /** Recarga filas para un torneo (API: GET admin; local: no-op). */
  refreshForTournament(tournamentId: string): Promise<void>;
  getRow(tournamentId: string, leagueNum: number): TournamentLeagueRow | undefined;
  confirmGroupResults(leagueId: string, payload?: Record<string, unknown>): Promise<void>;
  reopenGroupResults(leagueId: string): Promise<{ warning?: string }>;
  updateEliminationStatus(leagueId: string, status: string): Promise<void>;
  subscribe(listener: () => void): () => void;
  getSnapshot(): TournamentLeagueRow[];
}

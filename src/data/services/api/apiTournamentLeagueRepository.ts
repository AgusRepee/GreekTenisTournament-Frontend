import type { TournamentLeaguePort, TournamentLeagueRow } from '../contracts/tournamentLeaguePort';
import {
  confirmGroupResults as apiConfirmGroupResults,
  getAdminTournamentLeagues,
  reopenGroupResults as apiReopenGroupResults,
  updateTournamentLeagueEliminationStatus,
} from '@/lib/api/apiClient';

function mapRow(r: Record<string, unknown>): TournamentLeagueRow {
  return {
    id: String(r.id),
    tournamentId: String(r.tournamentId),
    leagueNum: Number(r.leagueNum),
    groupStageStatus: r.groupStageStatus != null ? String(r.groupStageStatus) : null,
    eliminationStatus: r.eliminationStatus != null ? String(r.eliminationStatus) : null,
  };
}

export function createApiTournamentLeagueRepository(): TournamentLeaguePort {
  const listeners = new Set<() => void>();
  let rows: TournamentLeagueRow[] = [];

  function emit(): void {
    listeners.forEach((l) => l());
  }

  return {
    async refreshForTournament(tournamentId: string): Promise<void> {
      try {
        const raw = await getAdminTournamentLeagues(tournamentId);
        if (!Array.isArray(raw)) {
          console.warn('[apiTournamentLeague] respuesta inesperada');
          return;
        }
        const next = (raw as Record<string, unknown>[]).map(mapRow);
        rows = rows.filter((x) => x.tournamentId !== tournamentId).concat(next);
        emit();
      } catch (e) {
        console.warn('[apiTournamentLeague] refresh falló', e);
      }
    },
    getRow(tournamentId: string, leagueNum: number): TournamentLeagueRow | undefined {
      return rows.find((x) => x.tournamentId === tournamentId && x.leagueNum === leagueNum);
    },
    async confirmGroupResults(leagueId: string, payload?: Record<string, unknown>): Promise<void> {
      await apiConfirmGroupResults(leagueId, payload);
    },
    async reopenGroupResults(leagueId: string): Promise<{ warning?: string }> {
      const res = (await apiReopenGroupResults(leagueId)) as { warning?: string };
      return { warning: res.warning };
    },
    async updateEliminationStatus(leagueId: string, status: string): Promise<void> {
      await updateTournamentLeagueEliminationStatus(leagueId, status);
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot(): TournamentLeagueRow[] {
      return rows;
    },
  };
}

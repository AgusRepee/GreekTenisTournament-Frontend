import { categoryToLeague, getTournamentById } from '@/lib/mockData';
import { ligaNumFromNovakTournamentId } from '@/lib/tennis/generateTournamentsFromLigas';
import type { TournamentLeaguePort, TournamentLeagueRow } from '../contracts/tournamentLeaguePort';

function effectiveLeagueNum(tournamentId: string, tournament: ReturnType<typeof getTournamentById>): number | null {
  if (!tournament) return null;
  const fromNovak = ligaNumFromNovakTournamentId(tournamentId);
  if (fromNovak != null) return fromNovak;
  return tournament.league ?? categoryToLeague(tournament.category);
}

/**
 * Modo local: no hay `TournamentLeague` en MySQL; el estado de grupos vive en `Tournament.groupStageStatus`.
 */
export function createLocalTournamentLeagueRepository(): TournamentLeaguePort {
  const listeners = new Set<() => void>();
  return {
    async refreshForTournament(): Promise<void> {
      /* no-op */
    },
    getRow(tournamentId: string, leagueNum: number): TournamentLeagueRow | undefined {
      const t = getTournamentById(tournamentId);
      if (!t) return undefined;
      const ln = effectiveLeagueNum(tournamentId, t);
      if (ln == null || ln !== leagueNum) return undefined;
      const gs = t.groupStageStatus === 'confirmed' ? 'confirmed' : t.groupStageStatus === 'reopened' ? 'reopened' : null;
      return {
        id: `local:${tournamentId}:${leagueNum}`,
        tournamentId,
        leagueNum,
        groupStageStatus: gs,
        eliminationStatus: 'unavailable',
      };
    },
    async confirmGroupResults(): Promise<void> {
      /* persistencia la hace `persistTournamentToStorage` en el workspace */
    },
    async reopenGroupResults(): Promise<{ warning?: string }> {
      return {};
    },
    async updateEliminationStatus(): Promise<void> {
      /* no-op */
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot(): TournamentLeagueRow[] {
      return [];
    },
  };
}

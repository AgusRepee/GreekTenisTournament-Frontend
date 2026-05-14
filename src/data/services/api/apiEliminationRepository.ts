import type { EliminationBracketPort } from '../contracts/eliminationBracketPort';
import {
  confirmElimination,
  generateEliminationBracket,
  getAdminEliminationBracket,
  putEliminationBracket,
} from '@/lib/api/apiClient';

export function createApiEliminationRepository(): EliminationBracketPort {
  return {
    async generateDraft(leagueId: string, bracket: unknown): Promise<unknown> {
      return generateEliminationBracket(leagueId, bracket);
    },
    async saveDraft(leagueId: string, bracket: unknown): Promise<unknown> {
      return putEliminationBracket(leagueId, bracket);
    },
    async confirmBracket(leagueId: string): Promise<{ matchesCreated?: number }> {
      const res = (await confirmElimination(leagueId)) as { matchesCreated?: number };
      return { matchesCreated: res.matchesCreated };
    },
    async getBracket(leagueId: string): Promise<unknown> {
      return getAdminEliminationBracket(leagueId);
    },
  };
}

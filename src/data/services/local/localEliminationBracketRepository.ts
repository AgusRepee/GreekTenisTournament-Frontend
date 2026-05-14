import type { EliminationBracketPort } from '../contracts/eliminationBracketPort';

/** Modo local: el armado KO sigue en `replaceKnockoutShellMatches` / `partidos`. */
export function createLocalEliminationBracketRepository(): EliminationBracketPort {
  return {
    async generateDraft(): Promise<unknown> {
      return {};
    },
    async saveDraft(): Promise<unknown> {
      return {};
    },
    async confirmBracket(): Promise<{ matchesCreated?: number }> {
      return {};
    },
    async getBracket(): Promise<unknown> {
      return null;
    },
  };
}

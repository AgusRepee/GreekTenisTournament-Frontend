/**
 * Operaciones de cuadro KO persistido en servidor (`EliminationBracket` + `Match` KO).
 * Modo local: la UI sigue usando `replaceKnockoutShellMatches` / `partidos` (sin llamar a este puerto).
 */
export interface EliminationBracketPort {
  generateDraft(leagueId: string, bracket: unknown): Promise<unknown>;
  saveDraft(leagueId: string, bracket: unknown): Promise<unknown>;
  confirmBracket(leagueId: string): Promise<{ matchesCreated?: number }>;
  getBracket(leagueId: string): Promise<unknown>;
}

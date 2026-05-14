/** DTOs HTTP mínimos alineados a la API de Greek Tennis (shape evolutivo). */

export type ApiErrorBody = { error?: string; message?: string };

export type BulkSaveResultsBody = {
  results: Record<string, unknown>[];
};

export type FinalizeTournamentBody = {
  championId?: string;
  finalistId?: string;
};

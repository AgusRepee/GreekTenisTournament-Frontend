import type { MatchInput } from '@/data/types';

/**
 * Acceso a resultados de partidos (entrada del motor de stats / rankings).
 * Implementación actual: localStorage; futura: API REST u otro backend.
 */
export interface MatchResultsPort {
  getAll(): MatchInput[];
  getByMatchId(matchId: string): MatchInput | undefined;
  upsert(result: MatchInput): void;
  removeByDedupeKey(dedupeKey: string): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): MatchInput[];
  getServerSnapshot(): MatchInput[];
}

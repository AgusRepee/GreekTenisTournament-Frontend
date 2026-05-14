import type { ClubDataSnapshot } from '@/data/types';

/**
 * Catálogo del club: jugadores, torneos y partidos persistidos.
 * Implementación actual: merge seed + localStorage; futura: API + caché.
 */
export interface ClubCatalogPort {
  getSnapshot(): ClubDataSnapshot;
  subscribe(listener: () => void): () => void;
  /** Recargar desde la fuente de persistencia (p. ej. tras escritura admin). */
  refresh(): void;
}

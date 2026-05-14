/**
 * Compatibilidad: la implementación vive en la capa `@/data`.
 * Importar desde aquí o desde `@/data` indistintamente.
 */

export type { ClubDataSnapshot } from '@/data/types';

export {
  useClubData,
  useClubPlayers,
  useClubTournaments,
  useClubMatches,
  getClubSnapshot,
  subscribeClubData,
  refreshClubDataFromStorage,
} from '@/data/hooks/clubCatalog';

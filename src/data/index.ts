/**
 * Capa de datos (puertos, hooks, tipos, seed).
 *
 * - **types**: contratos de dominio y claves de persistencia
 * - **seed**: datos iniciales (`buildClubDataDefaults`)
 * - **services**: interfaces + implementación local (sustituible por API)
 * - **hooks**: única entrada React recomendada para la UI (`useResults`, `useClubData`)
 *
 * **Motor de cálculo** (sin I/O): `src/lib/tennis/*` — recibe `MatchInput[]` y entidades del catálogo;
 * no debe importar localStorage.
 *
 * **Sincronía admin ↔ sitio público**: misma entrada React (`useResults`, `useClubData`). Los marcadores van a
 * `MATCH_RESULTS_STORAGE_KEY`; otras pestañas del navegador se actualizan vía evento `storage`.
 */

export type { MatchInput, ClubDataSnapshot } from './types';
export { PERSISTENCE_KEYS, MATCH_RESULTS_STORAGE_KEY } from './types';

export * from './seed';

export type { MatchResultsPort } from './services/contracts/matchResultsPort';
export type { MatchSchedulePort, MatchScheduleEntry, MatchScheduleStatus } from './services/contracts/matchSchedulePort';
export type { TournamentLeaguePort, TournamentLeagueRow } from './services/contracts/tournamentLeaguePort';
export type { EliminationBracketPort } from './services/contracts/eliminationBracketPort';
export type { ClubCatalogPort } from './services/contracts/clubCatalogPort';
export {
  getMatchResultsPort,
  getMatchSchedulePort,
  getTournamentLeaguePort,
  getEliminationBracketPort,
  getClubCatalogPort,
  setMatchResultsPort,
  setMatchSchedulePort,
  setTournamentLeaguePort,
  setEliminationBracketPort,
  setClubCatalogPort,
  resetDataPortsToLocalDefaults,
} from './services/registry';

export {
  useResults,
  upsertResult,
  addResult,
  getResults,
  getResultByMatchId,
  removeResultByDedupeKey,
} from './hooks/matchResults';

export {
  useClubData,
  useClubPlayers,
  useClubTournaments,
  useClubMatches,
  getClubSnapshot,
  subscribeClubData,
  refreshClubDataFromStorage,
} from './hooks/clubCatalog';

/** Modo API: ranking y perfil público desde MySQL (solo lectura). */
export { fetchApiRankingsByLeague } from './services/api/apiRankingRepository';
export { fetchPublicPlayerProfile } from './services/api/apiPlayerProfileRepository';

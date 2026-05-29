import type { MatchResultsPort } from './contracts/matchResultsPort';
import type { MatchSchedulePort } from './contracts/matchSchedulePort';
import type { TournamentLeaguePort } from './contracts/tournamentLeaguePort';
import type { EliminationBracketPort } from './contracts/eliminationBracketPort';
import type { ClubCatalogPort } from './contracts/clubCatalogPort';
import { createLocalMatchResultsRepository } from './local/localMatchResultsRepository';
import { createLocalMatchScheduleRepository } from './local/localMatchScheduleRepository';
import { createLocalTournamentLeagueRepository } from './local/localTournamentLeagueRepository';
import { createLocalEliminationBracketRepository } from './local/localEliminationBracketRepository';
import { createLocalClubCatalogRepository } from './local/localClubCatalogRepository';
import { createApiMatchResultsRepository } from './api/apiMatchResultsRepository';
import { createApiMatchScheduleRepository } from './api/apiMatchScheduleRepository';
import { createApiTournamentLeagueRepository } from './api/apiTournamentLeagueRepository';
import { createApiEliminationRepository } from './api/apiEliminationRepository';
import { createApiClubCatalogRepository } from './api/apiClubCatalogRepository';
import { getDataSourceMode } from '@/lib/data/tournamentRepository';

/**
 * Registro de implementaciones (inyección para tests o futuro cliente API).
 * La UI no debe importar este módulo directamente; usar hooks en `../hooks`.
 *
 * `VITE_DATA_SOURCE=api` + `VITE_API_URL` + JWT: resultados vía MySQL (`createApiMatchResultsRepository`).
 */

function createInitialMatchResultsPort(): MatchResultsPort {
  if (getDataSourceMode() === 'api') {
    return createApiMatchResultsRepository();
  }
  return createLocalMatchResultsRepository();
}

function createInitialMatchSchedulePort(): MatchSchedulePort {
  if (getDataSourceMode() === 'api') {
    return createApiMatchScheduleRepository();
  }
  return createLocalMatchScheduleRepository();
}

function createInitialTournamentLeaguePort(): TournamentLeaguePort {
  if (getDataSourceMode() === 'api') {
    return createApiTournamentLeagueRepository();
  }
  return createLocalTournamentLeagueRepository();
}

function createInitialEliminationBracketPort(): EliminationBracketPort {
  if (getDataSourceMode() === 'api') {
    return createApiEliminationRepository();
  }
  return createLocalEliminationBracketRepository();
}

let matchResultsPort: MatchResultsPort = createInitialMatchResultsPort();
let matchSchedulePort: MatchSchedulePort = createInitialMatchSchedulePort();
let tournamentLeaguePort: TournamentLeaguePort = createInitialTournamentLeaguePort();
let eliminationBracketPort: EliminationBracketPort = createInitialEliminationBracketPort();
let clubCatalogPort: ClubCatalogPort =
  getDataSourceMode() === 'api' ? createApiClubCatalogRepository() : createLocalClubCatalogRepository();

export function getMatchResultsPort(): MatchResultsPort {
  return matchResultsPort;
}

export function getClubCatalogPort(): ClubCatalogPort {
  return clubCatalogPort;
}

export function getMatchSchedulePort(): MatchSchedulePort {
  return matchSchedulePort;
}

export function getTournamentLeaguePort(): TournamentLeaguePort {
  return tournamentLeaguePort;
}

export function getEliminationBracketPort(): EliminationBracketPort {
  return eliminationBracketPort;
}

/** Tests o sustitución por backend. */
export function setMatchResultsPort(port: MatchResultsPort): void {
  matchResultsPort = port;
}

export function setMatchSchedulePort(port: MatchSchedulePort): void {
  matchSchedulePort = port;
}

export function setTournamentLeaguePort(port: TournamentLeaguePort): void {
  tournamentLeaguePort = port;
}

export function setEliminationBracketPort(port: EliminationBracketPort): void {
  eliminationBracketPort = port;
}

export function setClubCatalogPort(port: ClubCatalogPort): void {
  clubCatalogPort = port;
}

/** Restaurar implementaciones por defecto (p. ej. después de tests). */
export function resetDataPortsToLocalDefaults(): void {
  matchResultsPort = createLocalMatchResultsRepository();
  matchSchedulePort = createLocalMatchScheduleRepository();
  tournamentLeaguePort = createLocalTournamentLeagueRepository();
  eliminationBracketPort = createLocalEliminationBracketRepository();
  clubCatalogPort = createLocalClubCatalogRepository();
}

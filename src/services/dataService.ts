/**
 * Capa de datos unificada para la app de torneos.
 *
 * Hoy: lecturas sobre el snapshot de `clubDataStore` (merge defaults + localStorage)
 * y escrituras en las mismas claves que el resto del club (`PERSISTENCE_KEYS`).
 *
 * Mañana: sustituir implementaciones por `fetch`/API manteniendo estas firmas (o variantes `*Async`).
 */

import type { LeagueNum, Match, Player, Tournament } from '@/lib/mockData';
import { categoryToLeague } from '@/lib/mockData';
import { buildClubDataDefaults } from '@/lib/clubDataDefaults';
import { getClubSnapshot, refreshClubDataFromStorage } from '@/lib/clubDataStore';
import { getData, saveData, PERSISTENCE_KEYS } from '@/lib/localPersistence';

/** Grupo derivado de la plantilla JSON del torneo (`ligaDoc.grupos`). */
export interface TournamentGroupView {
  id: string;
  name: string;
  /** Nombres de jugadores como en la plantilla. */
  players: string[];
}

/** Payload al guardar resultado de un partido persistido. */
export interface MatchResultPayload {
  score: string;
  winnerId: string | null;
  scheduledDate?: string;
}

let seeded = false;

function readPersistedMatchesOnly(): Match[] {
  const raw = getData<unknown>(PERSISTENCE_KEYS.partidos);
  return Array.isArray(raw) ? (raw as Match[]) : [];
}

/**
 * Si no hay ninguna clave de datos del club, persiste el seed inicial (jugadores por defecto, listas vacías).
 * Así `localStorage` deja de estar “vacío” y el comportamiento es predecible para migraciones futuras a API.
 */
export function initializeTournamentDataFromSeedIfEmpty(): void {
  if (typeof localStorage === 'undefined' || seeded) return;

  const hasJugadores = getData(PERSISTENCE_KEYS.jugadores) != null;
  const hasTorneos = getData(PERSISTENCE_KEYS.torneos) != null;
  const hasPartidos = getData(PERSISTENCE_KEYS.partidos) != null;

  if (hasJugadores || hasTorneos || hasPartidos) {
    seeded = true;
    return;
  }

  const { defaultPlayers } = buildClubDataDefaults();
  saveData(PERSISTENCE_KEYS.jugadores, defaultPlayers);
  saveData(PERSISTENCE_KEYS.torneos, []);
  saveData(PERSISTENCE_KEYS.partidos, []);
  refreshClubDataFromStorage();
  seeded = true;
}

function ensureInitialized(): void {
  initializeTournamentDataFromSeedIfEmpty();
}

/** Todos los jugadores visibles en la app (defaults + overrides en `jugadores`). */
export function getPlayers(): Player[] {
  ensureInitialized();
  return getClubSnapshot().players;
}

/** Todos los torneos (defaults + `torneos` persistidos). */
export function getTournaments(): Tournament[] {
  ensureInitialized();
  return getClubSnapshot().tournaments;
}

function leagueOfTournament(t: Tournament): LeagueNum {
  return t.league ?? categoryToLeague(t.category);
}

/**
 * Torneo principal de una liga (1–6). Si hay varios, el primero estable por `id`.
 */
export function getTournamentByLeague(league: LeagueNum): Tournament | undefined {
  const list = getTournaments()
    .filter((t) => leagueOfTournament(t) === league)
    .sort((a, b) => a.id.localeCompare(b.id));
  return list[0];
}

/** Partidos persistidos del club filtrados por torneo (`partidos` en localStorage). */
export function getMatchesByTournament(tournamentId: string): Match[] {
  ensureInitialized();
  return getClubSnapshot().matches.filter((m) => m.tournamentId === tournamentId);
}

/**
 * Actualiza un partido ya guardado en `partidos` por `id`.
 * No crea partidos nuevos (usá el CRUD de admin o una futura API).
 */
export function saveMatchResult(matchId: string, result: MatchResultPayload): void {
  ensureInitialized();
  const list = readPersistedMatchesOnly();
  const idx = list.findIndex((m) => m.id === matchId);
  if (idx < 0) {
    throw new Error(`No se encontró el partido con id "${matchId}".`);
  }
  const prev = list[idx]!;
  const next: Match = {
    ...prev,
    score: result.score,
    winnerId: result.winnerId,
    scheduledDate: result.scheduledDate ?? prev.scheduledDate,
  };
  const copy = [...list];
  copy[idx] = next;
  saveData(PERSISTENCE_KEYS.partidos, copy);
  refreshClubDataFromStorage();
}

/**
 * Grupos de la plantilla del torneo (`ligaDoc`), si existe.
 */
export function getGroupsByTournament(tournamentId: string): TournamentGroupView[] {
  ensureInitialized();
  const t = getTournaments().find((x) => x.id === tournamentId);
  const grupos = t?.ligaDoc?.grupos;
  if (!grupos) return [];
  return Object.entries(grupos).map(([name, players]) => ({
    id: `${tournamentId}-group-${name}`,
    name,
    players: [...players],
  }));
}

/** Objeto único para inyección / sustitución por API en tests o futuro. */
export const tournamentDataService = {
  getPlayers,
  getTournaments,
  getTournamentByLeague,
  getMatchesByTournament,
  saveMatchResult,
  getGroupsByTournament,
  initializeTournamentDataFromSeedIfEmpty,
} as const;

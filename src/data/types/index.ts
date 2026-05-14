/**
 * Tipos de dominio y contratos de la capa de datos (independientes del backend).
 */

import type { Match, Player, Tournament } from '@/lib/mockData';

export type { MatchInput } from '../../types/tennisResults';

/** Snapshot unificado de catálogo del club (jugadores, torneos, partidos KO). */
export type ClubDataSnapshot = {
  players: Player[];
  tournaments: Tournament[];
  matches: Match[];
};

export { PERSISTENCE_KEYS, MATCH_RESULTS_STORAGE_KEY } from './persistenceKeys';

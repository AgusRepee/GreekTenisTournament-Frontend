/**
 * Tipos del motor de resultados (ver docs/TENNIS_ENGINE_SPEC.md).
 * No acoplados a mockData: importaciones futuras desde este módulo.
 */

export type MatchStatus = 'played' | 'walkover' | 'retired' | 'pending' | 'suspended';

/** Perfil de jugador para registry / resolución de alias (dominio resultados). */
export interface TennisPlayerRef {
  id?: string;
  name: string;
  canonicalName?: string;
  aliases?: string[];
  liga?: number;
}

/** @deprecated Usá TennisPlayerRef; se mantiene alias por compatibilidad con borradores previos. */
export type Player = TennisPlayerRef;

export interface MatchInput {
  /** Clave estable del partido (torneo + fecha + grupo + jugadores). Opcional en entrada; el store la rellena. */
  matchId?: string;
  tournamentId: string;
  group?: string;
  /** Número de fecha del fixture (equivalente conceptual a “fecha” del torneo). */
  round?: number;
  playerA: string;
  playerB: string;
  score?: string;
  status: MatchStatus;
  date?: string;
}

/** Nombre alineado al contrato conceptual “MatchResult” del spec. */
export type MatchResult = MatchInput;

export interface ParsedSet {
  gamesA: number;
  gamesB: number;
  tiebreak?: number;
  isMatchTiebreak?: boolean;
}

export interface ParsedMatch {
  playerA: string;
  playerB: string;
  sets: ParsedSet[];
  winner?: string;
  isWalkover?: boolean;
  isRetired?: boolean;
}

export interface PlayerStats {
  player: string;
  played: number;
  won: number;
  lost: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  winRate: number;
  streak: number;
}

export interface StandingRow {
  player: string;
  played: number;
  won: number;
  lost: number;
  setsDiff: number;
  gamesDiff: number;
  points: number;
}

export interface GroupStanding {
  group: string;
  rows: StandingRow[];
}

export interface TournamentMeta {
  id: string;
  slug?: string;
  name: string;
  liga: number;
  status: 'upcoming' | 'ongoing' | 'finished';
  startDate?: string;
  endDate?: string;
  slotsTotal?: number;
  slotsTaken?: number;
  phaseKind?: 'groups' | 'ko' | 'mixed';
  rulesNote?: string;
}

export interface MatchResultBatch {
  matches: MatchInput[];
}

export interface PlayerRegistryEntry {
  name: string;
  aliases?: string[];
  id?: string;
  liga?: number;
}

export type PlayerRegistry = PlayerRegistryEntry[];

/** Compatible con docs/ligaN.json (plantilla estructural). */
export interface LigaTemplate {
  torneo: string;
  liga: number;
  grupos: Record<string, string[]>;
  fechas: Array<{
    numero: number;
    /** Fase por grupos (típico) */
    grupos?: Record<string, string[]>;
    /** Ej. fecha interzonal en liga4.json: líneas “A (P) vs B” */
    partidos?: string[];
    tipo?: string;
  }>;
  nota?: string;
}

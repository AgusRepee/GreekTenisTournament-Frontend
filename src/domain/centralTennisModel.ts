/**
 * Modelo de datos centralizado — contrato de dominio (tenis / torneos).
 *
 * Objetivo: una sola fuente de verdad; hoy mapeable a localStorage/JSON;
 * mañana migrable a MySQL (Hostinger) manteniendo las mismas entidades y relaciones.
 *
 * No reemplaza aún a `mockData` ni a `MatchInput`; sirve como especificación y base de migración.
 */

/** ISO 8601 date-time o fecha según contexto en API futura. */
export type ISODateString = string;

/** Identificadores estables (UUID v4, CUID, o slug+suffix controlado por el servidor). */
export type EntityId = string;

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

export type PlayerStatus = 'active' | 'inactive';

export interface Player {
  id: EntityId;
  firstName: string;
  lastName: string;
  /** Nombre mostrado en UI (puede armarse de first+last o apodo oficial). */
  displayName: string;
  /** Liga deportiva del club (1–6 u otro enum acordado). */
  league: number;
  nationality?: string;
  photo?: string;
  status: PlayerStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// ---------------------------------------------------------------------------
// Tournament
// ---------------------------------------------------------------------------

export type TournamentLifecycleStatus = 'draft' | 'active' | 'finalized' | 'archived';

export interface Tournament {
  id: EntityId;
  name: string;
  slug: string;
  status: TournamentLifecycleStatus;
  startDate: ISODateString;
  endDate: ISODateString;
  image?: string;
  /** Referencias a {@link TournamentLeague.id} (no duplicar config inline si existe entidad hija). */
  leagueIds: EntityId[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// ---------------------------------------------------------------------------
// TournamentLeague (liga dentro de un torneo)
// ---------------------------------------------------------------------------

export type TournamentLeagueStatus = 'draft' | 'active' | 'completed' | 'archived';

/** JSON serializable; en MySQL podría ser JSON column o tablas normalizadas de reglas. */
export type JsonObject = Record<string, unknown>;

export interface TournamentLeague {
  id: EntityId;
  tournamentId: EntityId;
  /** Número o código de liga (1–6, etc.). */
  league: number;
  status: TournamentLeagueStatus;
  /** Reglas de competición (formato, sets, TB, etc.). */
  rules: JsonObject;
  /** Puntos por victoria, WO, fase alcanzada, etc. */
  pointsConfig: JsonObject;
  /** Plantilla: grupos, fechas, fixture base (equivalente conceptual a ligaN.json). */
  groupsConfig: JsonObject;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// ---------------------------------------------------------------------------
// Group
// ---------------------------------------------------------------------------

export interface Group {
  id: EntityId;
  tournamentLeagueId: EntityId;
  /** Etiqueta corta: A, B, C o nombre libre. */
  name: string;
  playerIds: EntityId[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// ---------------------------------------------------------------------------
// Match
// ---------------------------------------------------------------------------

export type MatchStage = 'group' | 'elimination' | 'playoff' | 'final';

export type MatchStatus = 'pending' | 'played' | 'walkover' | 'suspended';

export interface Match {
  id: EntityId;
  tournamentId: EntityId;
  tournamentLeagueId: EntityId;
  /** Ausente en fase KO pura o interzonal según reglas. */
  groupId?: EntityId;
  stage: MatchStage;
  /** Etiqueta humana: "Fecha 1", "Cuartos", "Semifinal", "Final". */
  roundName: string;
  player1Id: EntityId;
  player2Id: EntityId;
  scheduledDate?: ISODateString;
  status: MatchStatus;
  /** FK al resultado canónico (1:1 o 1:N si historial; ver nota en doc). */
  resultId?: EntityId;
  winnerId?: EntityId;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// ---------------------------------------------------------------------------
// MatchResult
// ---------------------------------------------------------------------------

export type MatchResultType = 'normal' | 'walkover' | 'suspended';

/** Un set: games por lado; tie-break a nivel set opcional en evolución del modelo. */
export interface SetScore {
  p1: number;
  p2: number;
  /** Tie-break del set (games 6–6), si aplica. */
  tiebreak?: { p1: number; p2: number };
}

export interface MatchResult {
  id: EntityId;
  matchId: EntityId;
  sets: SetScore[];
  winnerId: EntityId;
  loserId: EntityId;
  type: MatchResultType;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// ---------------------------------------------------------------------------
// RankingSnapshot (materialización / caché de ranking por liga)
// ---------------------------------------------------------------------------

export interface RankingSnapshot {
  id: EntityId;
  playerId: EntityId;
  league: number;
  points: number;
  tournamentsPlayed: number;
  wins: number;
  losses: number;
  titles: number;
  updatedAt: ISODateString;
}

// ---------------------------------------------------------------------------
// AuditLog
// ---------------------------------------------------------------------------

export type AuditEntityType =
  | 'player'
  | 'tournament'
  | 'tournament_league'
  | 'group'
  | 'match'
  | 'match_result'
  | 'ranking_snapshot';

export interface AuditLog {
  id: EntityId;
  action: string;
  entityType: AuditEntityType;
  entityId: EntityId;
  /** Estado previo (JSON); en DB JSON/TEXT. */
  before: JsonObject | null;
  /** Estado nuevo (JSON). */
  after: JsonObject | null;
  createdAt: ISODateString;
  user: EntityId | string;
}

// ---------------------------------------------------------------------------
// Eventos de dominio (orquestación futura)
// ---------------------------------------------------------------------------

/** Payload mínimo tras persistir un resultado: motor recalcula derivados. */
export interface MatchResultSavedEvent {
  type: 'match_result.saved';
  matchId: EntityId;
  resultId: EntityId;
  tournamentId: EntityId;
  tournamentLeagueId: EntityId;
}

/** Contrato del “motor” que la UI o workers invocan tras escribir. */
export interface DomainRecomputeScope {
  tournamentLeagueId: EntityId;
  /** Si aplica, limitar recálculo a un grupo. */
  groupId?: EntityId;
}

export type RecomputeJob =
  | { kind: 'group_standings'; scope: DomainRecomputeScope }
  | { kind: 'elimination_bracket'; tournamentId: EntityId }
  | { kind: 'league_ranking'; league: number }
  | { kind: 'player_profile_stats'; playerIds: EntityId[] };

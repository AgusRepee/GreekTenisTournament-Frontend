import type { PlayoffQualificationRules } from '../lib/tennis/playoffQualification';

/**
 * Modelo de dominio del motor de torneos automático.
 *
 * Principio: standings, rankings y estadísticas agregadas NO se persisten como fuente de verdad;
 * se derivan de entidades estructuradas (jugadores, torneos, grupos, partidos con resultados).
 *
 * Los tipos de `mockData` / UI legacy pueden mapearse hacia estos tipos gradualmente.
 */

/** Liga del club (selector 1–6 del sitio). */
export type LeagueId = 1 | 2 | 3 | 4 | 5 | 6;

/** Ciclo de vida del torneo en el motor automático. */
export type TournamentLifecycleStatus =
  | 'draft'
  | 'upcoming'
  | 'in_progress'
  | 'finished'
  | 'cancelled';

/** Etapa del cuadro o del fixture. */
export type MatchStage =
  | 'group'
  | 'repechage'
  | 'interzonal'
  | 'quarterfinal'
  | 'semifinal'
  | 'final';

/**
 * Reglas parametrizables del torneo (puntos por resultado, desempates, etc.).
 * Persistible como JSON; el motor interpreta estos valores al calcular tablas.
 */
export interface TournamentRules {
  /** Puntos por victoria en fase de grupos (tabla). */
  winPoints?: number;
  /** Puntos por derrota en fase de grupos. */
  lossPoints?: number;
  /** Puntos walkover ganador / perdedor. */
  walkoverWinPoints?: number;
  walkoverLossPoints?: number;
  retirementWinPoints?: number;
  retirementLossPoints?: number;
  /** Si la tabla usa desempate por diferencia de sets / games / cara a cara. */
  useSetDifference?: boolean;
  useGameDifference?: boolean;
  useHeadToHead?: boolean;
  /** Tope de puntos de ranking que aporta este torneo (si aplica). */
  maxRankingPoints?: number;
  /** Texto libre o claves para reglas adicionales (mejores terceros, etc.). */
  notes?: string;
  /**
   * Clasificación al playoff tras grupos (`computePlayoffQualification`).
   * Se fusiona con valores por defecto en runtime.
   */
  playoffQualification?: Partial<PlayoffQualificationRules>;
  /**
   * Puntos por fase máxima alcanzada en el torneo (`calculateTournamentPoints`).
   * Se fusiona con `DEFAULT_TOURNAMENT_REACH_POINTS`.
   */
  phaseReachPoints?: Partial<TournamentReachPointsTable>;
  /** Extensión para reglas futuras sin romper tipos. */
  [key: string]: unknown;
}

/** Puntos por fase alcanzada (no por partido). */
export interface TournamentReachPointsTable {
  champion: number;
  finalist: number;
  semifinalist: number;
  quarterfinalist: number;
  /** Al menos un partido de grupos sin fase KO superior. */
  group_stage: number;
  /** Participación en repechaje sin cuadro principal KO. */
  repechage: number;
}

/**
 * Jugador en el modelo de torneo.
 * Perfil de presentación (foto, país) + datos de competición (liga, seed).
 */
export interface Player {
  id: string;
  name: string;
  league: LeagueId;
  /** Código ISO o etiqueta de país para UI. */
  country?: string;
  /** Ruta o URL de foto (ej. `/players/foo.webp`). */
  photo?: string;
  /** Cabeza de serie en el torneo/grupo (opcional). */
  seed?: number;
  /** Si participa en torneos activos; false = histórico o baja. */
  active: boolean;
}

/**
 * Grupo dentro de un torneo (fase regular).
 */
export interface Group {
  id: string;
  tournamentId: string;
  /** Etiqueta visible: "A", "B", "Grupo 1", etc. */
  name: string;
  /** IDs de jugadores asignados a este grupo. */
  players: string[];
}

/**
 * Torneo: contenedor de grupos, fechas y reglas.
 * `groups` puede estar anidado o resuelto vía IDs según la capa de persistencia.
 */
export interface Tournament {
  id: string;
  name: string;
  league: LeagueId;
  /** YYYY-MM-DD */
  startDate: string;
  endDate: string;
  status: TournamentLifecycleStatus;
  /** Tope de puntos de ranking otorgados por este torneo (negocio / UI). */
  maxPoints?: number;
  /** Reglas usadas por el motor al calcular tablas y desempates. */
  rules: TournamentRules;
  /** Grupos de la fase regular (referencias por id a `Group`). */
  groups: Group[];
}

/**
 * Partido entre dos jugadores.
 * Fuente de verdad para recalcular standings: solo partidos `completed` con `result` / `winnerId` coherentes.
 */
export interface Match {
  id: string;
  tournamentId: string;
  stage: MatchStage;
  /** En fase de grupos: vínculo al nombre o id lógico del grupo. */
  groupName?: string;
  /** Fecha del torneo / número de fecha del fixture. */
  roundNumber?: number;
  player1Id: string;
  player2Id: string;
  /** YYYY-MM-DD o ISO; opcional si aún no está programado. */
  date?: string;
  /** Marcador en texto (ej. "6-4 6-3"); el motor lo parsea para estadísticas. */
  result?: string;
  /** Walkover / retiro / jugado — alineado con el motor de resultados. */
  outcome?: 'played' | 'walkover' | 'retired' | 'pending';
  /** Debe coincidir con `player1Id` o `player2Id` cuando el partido está terminado. */
  winnerId?: string;
  completed: boolean;
}

/**
 * Entrada de ranking / tabla de posiciones **calculada** (no persistir como dato maestro).
 * Se obtiene ejecutando el motor sobre partidos completados y reglas del torneo.
 */
export interface RankingEntry {
  /** Jugador clasificado. */
  playerId: string;
  position: number;
  /** Torneo o ámbito del ranking (global de liga, un torneo, un grupo…). */
  scope: {
    type: 'tournament' | 'group' | 'league_global';
    tournamentId?: string;
    groupId?: string;
    league?: LeagueId;
  };
  played: number;
  won: number;
  lost: number;
  setsFor: number;
  setsAgainst: number;
  setsDifference: number;
  gamesFor?: number;
  gamesAgainst?: number;
  gamesDifference?: number;
  /** Puntos de tabla o ranking según `TournamentRules`. */
  points: number;
  /** Solo informativo: marca que este objeto es derivado. */
  readonly computed: true;
}

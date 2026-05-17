/**
 * Central mock data for the tennis club tournament website.
 * Visitors only view information. No login.
 * Manual data updates: see docs/DATA_LOADING.md
 */

import type { TournamentCatalogType } from '@/types/tournamentCatalog';
import type { LigaTemplate } from '../types/tennisResults';
import {
  getLiga3PlayerById,
  getLiga3GroupStandings,
  getLiga3TournamentRanking,
  LIGA3_BRACKET_MATCHES,
  getLiga3GroupStageResults,
  getLiga3Calendar,
  LIGA3_STATUS,
  getLiga3FinalMatch,
  getLiga3Preclasificacion,
  LIGA3_POINTS_SYSTEM,
  LIGA3_CLASSIFICATION_RULES,
} from './liga3Data';
import { getClubSnapshot } from './clubDataStore';
import { LIGA6_ND_FIXTURES, LIGA6_ND_TOURNAMENT_ID } from './tennis/liga6Nd2026Data';
import { effectiveTournamentCatalogType } from './tennis/rankingPointsGreek500';

export const CATEGORIES = ['Primera', 'Segunda', 'Tercera', 'Cuarta', 'Quinta A', 'Quinta B'] as const;
export type CategoryKey = (typeof CATEGORIES)[number];

/** Selector página Torneos / inicio: Ligas 1–6. */
export const LEAGUES = [1, 2, 3, 4, 5, 6] as const;
/** Número de liga en ranking, perfil y badges (1–6). */
export type LeagueNum = 1 | 2 | 3 | 4 | 5 | 6;

export function categoryToLeague(cat: CategoryKey | string | undefined): LeagueNum {
  const map: Record<CategoryKey, LeagueNum> = {
    Primera: 1,
    Segunda: 2,
    Tercera: 3,
    Cuarta: 4,
    'Quinta A': 5,
    'Quinta B': 6,
  };
  if (cat == null) return 3;
  const L = map[cat as CategoryKey];
  return L ?? 3;
}

/** Categoría canónica para una liga 1–6 (inverso de `categoryToLeague`). */
export function leagueToCategory(league: LeagueNum): CategoryKey {
  const map: Record<LeagueNum, CategoryKey> = {
    1: 'Primera',
    2: 'Segunda',
    3: 'Tercera',
    4: 'Cuarta',
    5: 'Quinta A',
    6: 'Quinta B',
  };
  return map[league];
}

export type TournamentStatus = 'upcoming' | 'finished';

/**
 * Preclasificación oficial del torneo: snapshot del orden del ranking de liga al momento de fijarlo.
 * No se actualiza sola cuando el ranking cambia; sirve para cabezas de serie en bracket y comunicación.
 */
export interface TournamentPreclasificacion {
  /** ISO 8601 */
  capturedAt: string;
  /** Ej. "Ranking de liga" o "Top 8 ranking (Master Finals)". */
  sourceLabel?: string;
  /** Seed 1 = primer id; orden completo capturado (típicamente toda la liga o los inscritos). */
  orderedPlayerIds: string[];
}

export interface PlayerStats {
  matchesPlayed: number;
  wins: number;
  losses: number;
}

/**
 * Jugador persistible: identidad y perfil. Puntos, PJ/PG/PP y rankings salen de partidos + selectores.
 */
export type PlayerProfileVisibility = 'visible' | 'hidden';

export interface Player {
  id: string;
  name: string;
  category: CategoryKey;
  /** YYYY-MM-DD */
  birthDate?: string;
  nationality?: string;
  /** Derecha | Zurdo */
  playingHand?: 'Derecha' | 'Zurdo';
  /** Golpe principal */
  mainShot?: string;
  /** Promotion/relegation history for profile. */
  promotionHistory?: PromotionHistoryEntry[];
  /** Foto de perfil: nombre de archivo en `/img` o `data:image/...` (local). */
  profileImage?: string;
  /** Altura en centímetros (opcional; solo se muestra en perfil si existe). */
  heightCm?: number;
  /** Texto breve opcional en la ficha. */
  profileBio?: string;
  /** Visibilidad del perfil en listados públicos (admin siempre puede ver). */
  profileVisibility?: PlayerProfileVisibility;
  /** Plantel: inactivo no oculta el perfil salvo que también esté `hidden`. */
  rosterActive?: boolean;
  /** Apodo (búsqueda y ficha). */
  nickname?: string;
  /** Notas solo panel admin; no se muestran en el sitio público. */
  internalNotes?: string;
}

export interface Tournament {
  id: string;
  name: string;
  category: CategoryKey;
  /** Greek 500 (regular) vs Masters Greek 1000 (cierre); define tabla base de puntos ranking en servidor. */
  tournamentType?: TournamentCatalogType;
  status: TournamentStatus;
  startDate: string;
  endDate: string;
  location: string;
  /** Conteo mostrable: derivar de partidos cuando falte. */
  matchCount?: number;
  /** Ignorado por el motor: campeón/finalista salen del cuadro. Solo compat. JSON viejo. */
  winnerId?: string | null;
  finalistId?: string | null;
  /** Cover image filename en /img (Novak por liga: novakrojo, novaknaranja, novakazul L3, novajverde L4, …) */
  coverImage?: string;
  /** Liga 1–5 en torneos (filtro Directorio); defaults desde categoría si no se setea */
  league?: LeagueNum;
  /** Total slots (cupos) for upcoming tournaments */
  slotsTotal?: number;
  /** Taken slots for upcoming tournaments */
  slotsTaken?: number;
  /** Plantilla `docs/ligaN.json` cuando el torneo Novak se genera desde /docs */
  ligaDoc?: LigaTemplate;
  /** Archivado en admin: solo lectura en el workspace del torneo. */
  archived?: boolean;
  /**
   * Admin: cierre oficial de la fase de grupos (habilita armado de eliminación y bloquea edición de resultados de fixture
   * hasta desbloquear). Ausente = fase abierta.
   */
  groupStageStatus?: 'confirmed';
  /**
   * Plantel por grupo (admin Tabla): IDs de jugador del club o `name:Norm` provisorios.
   * Claves = letra de plantilla (`A`, `B`, …). Si falta, se usa `ligaDoc` / `ligasData`.
   */
  groupRosterOverride?: Record<string, string[]>;
  /** Orden de cabeza de serie congelado respecto al ranking vivo (ver `TournamentPreclasificacion`). */
  preclasificacion?: TournamentPreclasificacion;
}

export interface Match {
  id: string;
  tournamentId: string;
  playerA: string;
  playerB: string;
  score: string;
  winnerId: string | null;
  round?: string;
  scheduledDate?: string;
  scheduledTime?: string;
}

export interface BracketRounds {
  quarterfinals: Match[];
  semifinals: Match[];
  final: Match[];
}

export interface GroupTableRow {
  playerId: string;
  PJ: number;
  PG: number;
  PP: number;
  points: number;
}

export interface GroupTable {
  name: string;
  rows: GroupTableRow[];
}

/** Group stage row with set statistics (for tournament group tables) */
export interface GroupTableRowWithSets {
  position: number;
  playerId: string;
  PJ: number;
  setsWon: number;
  setsLost: number;
  /** Games ganados / perdidos en la fase de grupos (desktop). */
  gamesWon: number;
  gamesLost: number;
  setDiff: number;
  /** Optional: for Liga 3 group tables */
  PG?: number;
  PP?: number;
  /** @deprecated La tabla de grupo no usa puntos tipo liga; no mostrar en UI. */
  points?: number;
  /** Cambio de posición desde la última fecha: +2 = subió 2, -1 = bajó 1 (Liga 3) */
  positionChange?: number;
}

export interface GroupTableWithSets {
  name: string;
  rows: GroupTableRowWithSets[];
}

export interface UpcomingMatchDisplay {
  id: string;
  date: string;
  time: string;
  playerA: string;
  playerB: string;
  round?: string;
  /** Group label e.g. "Grupo A" for Liga 3 upcoming */
  group?: string;
  /** true = playerA brings balls, false = playerB (tennis ball icon) */
  ballsByPlayerA?: boolean;
}

/** One match line in a group fixture: "PlayerA (P) vs PlayerB" */
export interface GroupFixtureMatch {
  playerA: string;
  playerB: string;
  ballsByA: boolean;
  /** Marcador público desde el store de resultados (admin); sin valor → UI muestra Pendiente */
  resultSummary?: string | null;
}

/** One round (Fecha) in a group: list of matches + optional libre */
export interface GroupFecha {
  fecha: number;
  matches: GroupFixtureMatch[];
  libre?: string;
}

/** Full fixture for one group (e.g. Grupo A) */
export interface GroupStageGroup {
  name: string;
  fechas: GroupFecha[];
}

/** Scheduled/featured match for display (no live data) */
export interface ScheduledMatch {
  id: string;
  label: string;
  playerA: string;
  playerB: string;
  category: string;
  dateTime: string;
  round: string;
  /** Short date for cards e.g. "dom 21 abr" */
  date?: string;
  /** Time e.g. "10:00" */
  time?: string;
  /** Origen agenda: torneo concreto para navegación desde la home (evita ambigüedad por liga). */
  tournamentId?: string;
  /** Motivos de relevancia (p. ej. `listImportantMatchesFromSchedules`), del más al menos peso. */
  reasonLabels?: string[];
  /** Motivo principal para mostrar en tarjetas (típicamente `reasonLabels[0]`). */
  mainReason?: string;
}

export interface RankingRow {
  position: number;
  playerId: string;
  player: Player;
  points: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  /** Optional: sets won in tournament (e.g. Liga 3) */
  setsWon?: number;
  /** Optional: sets lost in tournament (e.g. Liga 3) */
  setsLost?: number;
  gamesWon?: number;
  gamesLost?: number;
  /** Change vs previous week: positive = up, negative = down, 0 = no change */
  rankingChange?: number;
  /** Net change in points since last update: positive = gained, negative = lost */
  pointsChange?: number;
  /** Player age (from birthDate) */
  age?: number;
  /** Number of tournaments played (for ranking table) */
  tournamentsPlayed?: number;
  /** League number (1-5) for display as "Liga N" */
  leagueNum?: LeagueNum;
  /** Ranking por liga canónico: nombre, foto y bandera mostrados en la tabla. */
  rankingDisplay?: { name: string; avatarUrl: string; nationality?: string };
}

/** Pestañas de ranking en pantalla Rankings (Ligas 1–6). */
export const LEAGUES_RANKING: LeagueNum[] = [1, 2, 3, 4, 5, 6];

export interface PromotionHistoryEntry {
  year: number;
  type: 'promotion' | 'relegation';
  toLeague: LeagueNum;
  fromLeague?: LeagueNum;
}

function firstPlayerNamesInLeague(playerList: Player[], league: LeagueNum, count: number): string[] {
  return playerList
    .filter((p) => categoryToLeague(p.category) === league)
    .slice(0, count)
    .map((p) => p.name);
}

/** Partidos destacados inicio: nombres según jugadores actuales del store. */
export function getFeaturedMatches(): ScheduledMatch[] {
  const players = getClubSnapshot().players;
  const l1 = firstPlayerNamesInLeague(players, 1, 4);
  const l5 = firstPlayerNamesInLeague(players, 5, 2);
  return [
    { id: 'sm-1', label: 'Final de Primera', playerA: l1[0] ?? '—', playerB: l1[1] ?? '—', category: 'Primera', dateTime: 'Sábado 20 Abr, 11:00', round: 'Final', date: 'sáb 20 abr', time: '11:00' },
    { id: 'sm-2', label: 'Semifinal Quinta A', playerA: l5[0] ?? '—', playerB: l5[1] ?? '—', category: 'Quinta A', dateTime: 'Domingo 21 Abr, 10:00', round: 'Semifinal', date: 'dom 21 abr', time: '10:00' },
    { id: 'sm-3', label: 'Partido destacado del fin de semana', playerA: l1[2] ?? '—', playerB: l1[3] ?? '—', category: 'Primera', dateTime: 'Sábado 20 Abr, 16:00', round: 'Semifinal', date: 'sáb 20 abr', time: '16:00' },
  ];
}

export function getUpcomingImportantMatches(): ScheduledMatch[] {
  const players = getClubSnapshot().players;
  const l2 = firstPlayerNamesInLeague(players, 2, 2);
  const l3 = firstPlayerNamesInLeague(players, 3, 2);
  return [
    { id: 'sm-4', label: 'Cuartos de final Segunda', playerA: l2[0] ?? '—', playerB: l2[1] ?? '—', category: 'Segunda', dateTime: 'Viernes 19 Abr, 18:00', round: 'Cuartos', date: 'vie 19 abr', time: '18:00' },
    { id: 'sm-5', label: 'Semifinal Tercera', playerA: l3[0] ?? '—', playerB: l3[1] ?? '—', category: 'Tercera', dateTime: 'Domingo 21 Abr, 12:00', round: 'Semifinal', date: 'dom 21 abr', time: '12:00' },
  ];
}

export function getDefaultProfilePlayerId(): string {
  return getClubSnapshot().players[0]?.id ?? '';
}

/** Novak Djokovic – Liga 3: group stage fixtures (3 groups × 5 fechas) */
export const LIGA3_GROUP_FIXTURES: GroupStageGroup[] = [
  {
    name: 'Grupo A',
    fechas: [
      { fecha: 1, matches: [{ playerA: 'Pusterla P.', playerB: 'Santi M.', ballsByA: true }, { playerA: 'Rusel S.', playerB: 'Bocchicchio F.', ballsByA: true }], libre: 'Repecka A.' },
      { fecha: 2, matches: [{ playerA: 'Bocchicchio F.', playerB: 'Pusterla P.', ballsByA: true }, { playerA: 'Rusel S.', playerB: 'Repecka A.', ballsByA: true }], libre: 'Santi M.' },
      { fecha: 3, matches: [{ playerA: 'Pusterla P.', playerB: 'Rusel S.', ballsByA: true }, { playerA: 'Repecka A.', playerB: 'Santi M.', ballsByA: true }], libre: 'Bocchicchio F.' },
      { fecha: 4, matches: [{ playerA: 'Repecka A.', playerB: 'Pusterla P.', ballsByA: true }, { playerA: 'Santi M.', playerB: 'Bocchicchio F.', ballsByA: true }], libre: 'Rusel S.' },
      { fecha: 5, matches: [{ playerA: 'Santi M.', playerB: 'Rusel S.', ballsByA: true }, { playerA: 'Bocchicchio F.', playerB: 'Repecka A.', ballsByA: true }], libre: 'Pusterla P.' },
    ],
  },
  {
    name: 'Grupo B',
    fechas: [
      { fecha: 1, matches: [{ playerA: 'Marin G.', playerB: 'Fernandez B.', ballsByA: true }, { playerA: 'Casadio M.', playerB: 'Volpe S.', ballsByA: true }], libre: 'Bianco D.' },
      { fecha: 2, matches: [{ playerA: 'Volpe S.', playerB: 'Marin G.', ballsByA: true }, { playerA: 'Casadio M.', playerB: 'Bianco D.', ballsByA: true }], libre: 'Fernandez B.' },
      { fecha: 3, matches: [{ playerA: 'Marin G.', playerB: 'Casadio M.', ballsByA: true }, { playerA: 'Bianco D.', playerB: 'Fernandez B.', ballsByA: true }], libre: 'Volpe S.' },
      { fecha: 4, matches: [{ playerA: 'Bianco D.', playerB: 'Marin G.', ballsByA: true }, { playerA: 'Fernandez B.', playerB: 'Volpe S.', ballsByA: true }], libre: 'Casadio M.' },
      { fecha: 5, matches: [{ playerA: 'Fernandez B.', playerB: 'Casadio M.', ballsByA: true }, { playerA: 'Volpe S.', playerB: 'Bianco D.', ballsByA: true }], libre: 'Marin G.' },
    ],
  },
  {
    name: 'Grupo C',
    fechas: [
      { fecha: 1, matches: [{ playerA: 'Vito C.', playerB: 'Santi G.', ballsByA: true }, { playerA: 'Del Valle G.', playerB: 'Ferreres G.', ballsByA: true }], libre: 'Komesu F.' },
      { fecha: 2, matches: [{ playerA: 'Ferreres G.', playerB: 'Vito C.', ballsByA: true }, { playerA: 'Del Valle G.', playerB: 'Komesu F.', ballsByA: true }], libre: 'Santi G.' },
      { fecha: 3, matches: [{ playerA: 'Vito C.', playerB: 'Del Valle G.', ballsByA: true }, { playerA: 'Komesu F.', playerB: 'Santi G.', ballsByA: true }], libre: 'Ferreres G.' },
      { fecha: 4, matches: [{ playerA: 'Komesu F.', playerB: 'Vito C.', ballsByA: true }, { playerA: 'Santi G.', playerB: 'Ferreres G.', ballsByA: true }], libre: 'Del Valle G.' },
      { fecha: 5, matches: [{ playerA: 'Santi G.', playerB: 'Del Valle G.', ballsByA: true }, { playerA: 'Ferreres G.', playerB: 'Komesu F.', ballsByA: true }], libre: 'Vito C.' },
    ],
  },
];

/** Próximos partidos Liga 3: Fecha 1 según fixture (sin resultados aún). */
function buildLiga3UpcomingFromFixtures(): UpcomingMatchDisplay[] {
  const out: UpcomingMatchDisplay[] = [];
  let id = 0;
  for (const g of LIGA3_GROUP_FIXTURES) {
    const f1 = g.fechas.find((f) => f.fecha === 1);
    if (!f1) continue;
    for (const m of f1.matches) {
      out.push({
        id: `l3-up-${id++}`,
        date: 'Por anunciar',
        time: '—',
        playerA: m.playerA,
        playerB: m.playerB,
        round: 'Fecha 1',
        group: g.name,
        ballsByPlayerA: m.ballsByA,
      });
    }
  }
  return out;
}

export const LIGA3_UPCOMING: UpcomingMatchDisplay[] = buildLiga3UpcomingFromFixtures();

/** Partidos del cuadro de eliminación Liga 3 para getBracketRounds / bracket */
const LIGA3_MATCHES: Match[] = LIGA3_BRACKET_MATCHES.map((m) => ({
  id: m.id,
  tournamentId: 't-novak-l3',
  playerA: m.playerA,
  playerB: m.playerB,
  score: m.score,
  winnerId: m.winnerId,
  round: m.round,
  scheduledDate: m.scheduledDate,
  scheduledTime: m.scheduledTime,
}));

/** Playoff classification rules text for Liga 3 */
export const LIGA3_PLAYOFF_RULES =
  'Los tres primeros de cada Grupo pasan a la Fase de Eliminación Directa.\n\nLos dos peores terceros juegan entre sí un Repechaje.\n\nEl ganador de ese partido avanza a Cuartos de Final junto con el resto de los clasificados y se enfrentará al mejor primero.';

/** Novak Djokovic – Liga 4: group stage fixtures (3 groups × 3 fechas + Fecha 4 Interzonal) */
export const LIGA4_GROUP_FIXTURES: GroupStageGroup[] = [
  {
    name: 'Grupo A',
    fechas: [
      { fecha: 1, matches: [{ playerA: 'Chantada M.', playerB: 'Beitia J.', ballsByA: true }, { playerA: 'Malcangi R.', playerB: 'Cardozo M.', ballsByA: true }] },
      { fecha: 2, matches: [{ playerA: 'Chantada M.', playerB: 'Malcangi R.', ballsByA: true }, { playerA: 'Cardozo M.', playerB: 'Beitia J.', ballsByA: true }] },
      { fecha: 3, matches: [{ playerA: 'Cardozo M.', playerB: 'Chantada M.', ballsByA: true }, { playerA: 'Beitia J.', playerB: 'Malcangi R.', ballsByA: true }] },
    ],
  },
  {
    name: 'Grupo B',
    fechas: [
      { fecha: 1, matches: [{ playerA: 'Anetta D.', playerB: 'Vera F.', ballsByA: true }, { playerA: 'Blanco J.', playerB: 'Repecka J.', ballsByA: true }] },
      { fecha: 2, matches: [{ playerA: 'Blanco J.', playerB: 'Anetta D.', ballsByA: true }, { playerA: 'Vera F.', playerB: 'Repecka J.', ballsByA: true }] },
      { fecha: 3, matches: [{ playerA: 'Repecka J.', playerB: 'Anetta D.', ballsByA: true }, { playerA: 'Bianco D.', playerB: 'Fernandez B.', ballsByA: true }] },
    ],
  },
  {
    name: 'Grupo C',
    fechas: [
      { fecha: 1, matches: [{ playerA: 'Bernardini G.', playerB: 'Murchio M.', ballsByA: true }, { playerA: 'Cellilli M.', playerB: 'Garcia J.', ballsByA: true }] },
      { fecha: 2, matches: [{ playerA: 'Bernardini G.', playerB: 'Cellilli M.', ballsByA: true }, { playerA: 'Murchio M.', playerB: 'Garcia J.', ballsByA: true }] },
      { fecha: 3, matches: [{ playerA: 'Garcia J.', playerB: 'Bernardini G.', ballsByA: true }, { playerA: 'Murchio M.', playerB: 'Cellilli M.', ballsByA: true }] },
    ],
  },
  {
    name: 'Fecha 4 (Interzonal)',
    fechas: [
      {
        fecha: 4,
        matches: [
          { playerA: 'Cellilli M.', playerB: 'Chantada M.', ballsByA: true },
          { playerA: 'Beitia J.', playerB: 'Bernardini G.', ballsByA: true },
          { playerA: 'Malcangi R.', playerB: 'Blanco J.', ballsByA: true },
          { playerA: 'Repecka J.', playerB: 'Cardozo M.', ballsByA: true },
          { playerA: 'Anetta D.', playerB: 'Murchio M.', ballsByA: true },
          { playerA: 'Garcia J.', playerB: 'Vera F.', ballsByA: true },
        ],
      },
    ],
  },
];

/** Ball responsibility note for group fixture (P) */
export const GROUP_FIXTURE_BALL_NOTE = '(P): Jugador asignado para llevar pelotas en ese partido.';

// ---- Default tournament rules and points ----
export const DEFAULT_TOURNAMENT_RULES = [
  'Partidos al mejor de 3 sets.',
  'Super tie-break en el tercer set (a 10 puntos).',
  'Tolerancia de 15 minutos de llegada.',
];

/** Rule about who brings the balls (logo next to name). */
export const BALL_RULE_TEXT =
  'El jugador o pareja que tenga el logo del torneo junto a su nombre deberá llevar las pelotas para ese partido.';

/** Critical rule: late arrival may result in walkover. */
export const LATE_ARRIVAL_RULE_TITLE = 'Llegada tarde';
export const LATE_ARRIVAL_RULE_TEXT =
  'Si un jugador llega tarde más allá del tiempo de tolerancia, el partido puede declararse WALKOVER.';

export const DEFAULT_POINTS_SYSTEM = [
  { position: 'Campeón', points: 100 },
  { position: 'Finalista', points: 70 },
  { position: 'Semifinal', points: 40 },
  { position: 'Cuartos de final', points: 20 },
  { position: 'Participación', points: 5 },
];

/** Tournament schedule phases with current-looking dates (relative to today). */
export function getTournamentSchedulePhases(): { phase: string; dateLabel: string }[] {
  const today = new Date();
  const fmt = (d: Date) => d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  const d1 = new Date(today);
  const d2 = new Date(today);
  d2.setDate(d2.getDate() + 7);
  const d3 = new Date(today);
  d3.setDate(d3.getDate() + 14);
  const d4 = new Date(today);
  d4.setDate(d4.getDate() + 18);
  const d5 = new Date(today);
  d5.setDate(d5.getDate() + 21);
  const d6 = new Date(today);
  d6.setDate(d6.getDate() + 25);
  return [
    { phase: 'Semana 1', dateLabel: fmt(d1) },
    { phase: 'Semana 2', dateLabel: fmt(d2) },
    { phase: 'Semana 3', dateLabel: fmt(d3) },
    { phase: 'Cuartos de final', dateLabel: fmt(d4) },
    { phase: 'Semifinales', dateLabel: fmt(d5) },
    { phase: 'Final', dateLabel: fmt(d6) },
  ];
}

/** Listados públicos: ocultar perfiles marcados como hidden (el admin los sigue viendo). */
export function isPlayerProfileListingVisible(p: Player, viewerIsAdmin: boolean): boolean {
  if (viewerIsAdmin) return true;
  return p.profileVisibility !== 'hidden';
}

export function getPlayerById(id: string): Player | undefined {
  if (id === 'sys-ko-bye') return { id, name: 'BYE', category: 'Quinta B' };
  if (id === 'sys-ko-sf1b') return { id, name: 'Ganador Antuña A. / De Ruyck G.', category: 'Quinta B' };
  if (id === 'sys-ko-sf2a') return { id, name: 'Ganador Amezague J. / Ferrarotti E.', category: 'Quinta B' };
  if (id === 'sys-ko-fa') return { id, name: 'Ganador Semifinal 1', category: 'Quinta B' };
  if (id === 'sys-ko-fb') return { id, name: 'Ganador Semifinal 2', category: 'Quinta B' };
  if (id.startsWith('l3-')) {
    const p = getLiga3PlayerById(id);
    return p ? { id: p.id, name: p.name, category: 'Tercera' as const } : undefined;
  }
  return getClubSnapshot().players.find((p) => p.id === id);
}

export function getCurrentTournament(): Tournament | undefined {
  return getClubSnapshot().tournaments.find((t) => t.status === 'upcoming' && isTournamentCurrent(t));
}

export function searchPlayersByName(query: string): Player[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return getClubSnapshot().players.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 20);
}

export function getPlayersByFilters(category: CategoryKey | 'all'): Player[] {
  return getClubSnapshot().players
    .filter((p) => category === 'all' || p.category === category)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

/** Age from birthDate (YYYY-MM-DD). */
export function getPlayerAge(birthDate: string | undefined): number | undefined {
  if (!birthDate) return undefined;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/** Seed (1-based) en cuadro: solo Liga 3 mock; el resto usa `buildOfficialTournamentSeedMap` (+ ranking vivo si no hay snapshot). */
export function getSeedInTournament(tournamentId: string, playerId: string): number | undefined {
  if (tournamentId === 't-novak-l3') return getLiga3Preclasificacion(playerId);
  return undefined;
}

export function getTournamentsByStatus(status: TournamentStatus | 'all'): Tournament[] {
  const tournaments = getClubSnapshot().tournaments;
  if (status === 'all') return [...tournaments];
  return tournaments.filter((t) => t.status === status);
}

export function getTournamentsByLeague(league: LeagueNum, status?: TournamentStatus): Tournament[] {
  const list = status ? getTournamentsByStatus(status) : getTournamentsByStatus('all');
  return list.filter(t => (t.league ?? categoryToLeague(t.category)) === league);
}

/** True if tournament is currently in progress (today between start and end, status upcoming). */
export function isTournamentCurrent(t: Tournament): boolean {
  if (t.status !== 'upcoming') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(t.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(t.endDate);
  end.setHours(23, 59, 59, 999);
  return today >= start && today <= end;
}

/** Id sin partidos: cuadro de eliminación solo TBD (cuartos/semis/final). */
export const EMPTY_BRACKET_TOURNAMENT_ID = '__empty_bracket__';

/**
 * Torneos anunciados pero aún no en curso: misma estructura de pestañas que el torneo activo,
 * sin datos de grupos/ranking/bracket real. Liga 3 sigue su flujo propio.
 */
export function isTournamentPlaceholderDetail(t: Tournament): boolean {
  if (t.id === 't-novak-l3') return false;
  return t.status === 'upcoming' && !isTournamentCurrent(t);
}

/**
 * Torneo de la misma liga que la categoría del partido (para enlazar desde “Partidos importantes”).
 * Prioridad: torneo en curso → próximo upcoming → último finalizado.
 */
export function getTournamentIdForImportantMatchCategory(category: string): string | undefined {
  const league = categoryToLeague(category as CategoryKey);
  const inLeague = getClubSnapshot().tournaments.filter((t) => (t.league ?? categoryToLeague(t.category)) === league);
  if (inLeague.length === 0) return undefined;
  const upcoming = inLeague.filter((t) => t.status === 'upcoming');
  const current = upcoming.find(isTournamentCurrent);
  if (current) return current.id;
  if (upcoming.length > 0) {
    return [...upcoming].sort((a, b) => a.startDate.localeCompare(b.startDate))[0].id;
  }
  const finished = inLeague.filter((t) => t.status === 'finished');
  if (finished.length > 0) {
    return [...finished].sort((a, b) => b.endDate.localeCompare(a.endDate))[0].id;
  }
  return inLeague[0].id;
}

export function getTournamentById(id: string): Tournament | undefined {
  return getClubSnapshot().tournaments.find((t) => t.id === id);
}

export function getMatchesByTournament(tournamentId: string): Match[] {
  if (tournamentId === 't-novak-l3') return LIGA3_MATCHES;
  return getClubSnapshot().matches.filter((m) => m.tournamentId === tournamentId);
}

export function getScheduledMatchesByTournament(tournamentId: string): Match[] {
  return getClubSnapshot().matches.filter((m) => m.tournamentId === tournamentId && !m.winnerId && m.scheduledDate);
}

export function getRecentMatchesForPlayer(playerId: string, limit = 5): Match[] {
  return getClubSnapshot().matches
    .filter((m) => m.winnerId !== null && (m.playerA === playerId || m.playerB === playerId))
    .slice(-limit)
    .reverse();
}

/** Promotion/relegation history for profile. */
export function getPlayerPromotionHistory(playerId: string): PromotionHistoryEntry[] {
  const p = getPlayerById(playerId);
  return p?.promotionHistory ?? [];
}

export type PlayerSearchRow = Player & {
  position: number;
  displayName: string;
  /** /players/… o null → usar profileImage en UI */
  displayAvatar: string | null;
  /** Puntos de ranking en la liga (solo UI; derivados de partidos). */
  points?: number;
  stats?: PlayerStats;
};

export function formatTournamentDate(t: Tournament): string {
  const s = new Date(t.startDate);
  const e = new Date(t.endDate);
  return `${s.getDate()} ${s.toLocaleDateString('es-ES', { month: 'short' })} - ${e.getDate()} ${e.toLocaleDateString('es-ES', { month: 'short' })} ${e.getFullYear()}`;
}

/** Tournament ranking: points earned in this tournament (mock: use global points for display). Liga 3: ranking solo del torneo. */
export function getTournamentRanking(tournamentId: string): RankingRow[] {
  if (tournamentId === 't-novak-l3') {
    const rows = getLiga3TournamentRanking();
    return rows.map((r) => {
      const player = getPlayerById(r.playerId)!;
      return {
        position: r.position,
        playerId: r.playerId,
        player,
        points: r.points,
        matchesPlayed: r.PJ,
        wins: r.PG,
        losses: r.PP,
        setsWon: r.setsWon,
        setsLost: r.setsLost,
        gamesWon: r.gamesWon,
        gamesLost: r.gamesLost,
      };
    });
  }
  /** Resto de torneos: ranking desde el motor (`getTournamentTopRankingFromResults` en la UI). */
  return [];
}

/** Bracket by rounds: Cuartos de final → Semifinales → Final */
export function getBracketRounds(tournamentId: string): BracketRounds {
  const all = getMatchesByTournament(tournamentId);
  const roundKey = (round: string | undefined) => (round ?? '').trim().toLocaleLowerCase('es-AR');
  const quarterfinals = all.filter((m) => {
    const key = roundKey(m.round);
    return key === 'cuartos de final' || key === 'cuartos';
  });
  const semifinals = all.filter((m) => {
    const key = roundKey(m.round);
    return key === 'semifinales' || key === 'semifinal';
  });
  const finalMatch = all.filter((m) => roundKey(m.round) === 'final');
  return { quarterfinals, semifinals, final: finalMatch };
}

/** @deprecated Las tablas de grupo salen del motor (`computeTournamentSnapshot` / UI). */
export function getGroupTables(_tournamentId: string): GroupTable[] {
  void _tournamentId;
  return [];
}

/**
 * Próximos torneos para el inicio: catálogo del club (no IDs fijos).
 * Excluye los que están en curso hoy (`isTournamentCurrent`).
 */
export function getUpcomingTournamentsForHome(): Tournament[] {
  return getClubSnapshot()
    .tournaments.filter((t) => t.status === 'upcoming' && !isTournamentCurrent(t))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** Group tables with set statistics: Pos, Player, PJ, Sets +, Sets -, Dif. Liga 3: datos desde liga3Data; resto sin resultados (0). */
export function getGroupTablesWithSetStats(tournamentId: string): GroupTableWithSets[] {
  if (tournamentId === 't-novak-l3') {
    return getLiga3GroupStandings().map((g) => ({
      name: g.name,
      rows: g.rows.map((r, i) => ({
        position: i + 1,
        playerId: r.playerId,
        PJ: r.PJ,
        setsWon: r.setsWon,
        setsLost: r.setsLost,
        gamesWon: r.gamesWon,
        gamesLost: r.gamesLost,
        setDiff: r.setDiff,
        PG: r.PG,
        PP: r.PP,
        points: r.points,
        positionChange: r.positionChange,
      })),
    }));
  }
  const t = getTournamentById(tournamentId);
  if (!t) return [];
  const categoryPlayers = getPlayersByFilters(t.category);
  const half = Math.ceil(categoryPlayers.length / 2);
  const groupAPlayers = categoryPlayers.slice(0, half);
  const groupBPlayers = categoryPlayers.slice(half, half * 2);

  const buildRows = (list: Player[]): GroupTableRowWithSets[] => {
    const rows = list.map((p) => ({
      position: 0,
      playerId: p.id,
      PJ: 0,
      setsWon: 0,
      setsLost: 0,
      gamesWon: 0,
      gamesLost: 0,
      setDiff: 0,
    }));
    rows.sort((a, b) => {
      const na = getPlayerById(a.playerId)?.name ?? '';
      const nb = getPlayerById(b.playerId)?.name ?? '';
      return na.localeCompare(nb, 'es');
    });
    rows.forEach((r, i) => {
      r.position = i + 1;
    });
    return rows;
  };

  return [
    { name: 'Grupo A', rows: buildRows(groupAPlayers) },
    { name: 'Grupo B', rows: buildRows(groupBPlayers) },
  ];
}

/** Format for react-tournament-brackets SingleEliminationBracket */
export interface BracketMatchForLibrary {
  id: string | number;
  name?: string;
  nextMatchId: string | number | null;
  tournamentRoundText: string;
  startTime: string;
  state: 'PLAYED' | 'SCORE_DONE' | 'SCHEDULED' | 'RUNNING' | 'DONE';
  participants: Array<{
    id: string;
    name?: string;
    resultText?: string | null;
    isWinner?: boolean;
    status?: string | null;
    ranking?: number;
  }>;
}

function getLiga6NdBracketMatchesForLibrary(
  seedMap?: ReadonlyMap<string, number> | Map<string, number>,
): BracketMatchForLibrary[] {
  const roundMeta: Record<string, { tournamentRoundText: string; ids: string[]; names: string[]; nextMatchIds: Array<string | null> }> = {
    'Cuartos de Final': {
      tournamentRoundText: '1',
      ids: ['b-q1', 'b-q2', 'b-q3', 'b-q4'],
      names: ['Cuartos 1', 'Cuartos 2', 'Cuartos 3', 'Cuartos 4'],
      nextMatchIds: ['b-s1', 'b-s1', 'b-s2', 'b-s2'],
    },
    Semifinales: {
      tournamentRoundText: '2',
      ids: ['b-s1', 'b-s2'],
      names: ['Semifinal 1', 'Semifinal 2'],
      nextMatchIds: ['b-f', 'b-f'],
    },
    Final: {
      tournamentRoundText: '3',
      ids: ['b-f'],
      names: ['Final'],
      nextMatchIds: [null],
    },
  };

  return (['Final', 'Semifinales', 'Cuartos de Final'] as const).flatMap((group) => {
    const meta = roundMeta[group];
    return LIGA6_ND_FIXTURES.filter((fixture) => fixture.group === group).map((fixture, index) => {
      const isPlayerAWinner = fixture.winner === fixture.playerA;
      const isPlayerBWinner = fixture.winner === fixture.playerB;
      const score = fixture.winnerScore ?? null;
      const participant = (name: string, isWinner: boolean) => ({
        id: name,
        name,
        resultText: score,
        isWinner,
        status: fixture.winner ? 'PLAYED' : null,
        ranking: seedMap?.get(name),
      });

      return {
        id: meta.ids[index],
        name: meta.names[index],
        nextMatchId: meta.nextMatchIds[index],
        tournamentRoundText: meta.tournamentRoundText,
        startTime: '',
        state: fixture.winner ? 'SCORE_DONE' : 'SCHEDULED',
        participants: [
          participant(fixture.playerA, isPlayerAWinner),
          participant(fixture.playerB, isPlayerBWinner),
        ],
      };
    });
  });
}

/** Build bracket matches in library format: Quarterfinals (1) → Semifinals (2) → Final (3) */
export function getBracketMatchesForLibrary(
  tournamentId: string,
  seedMap?: ReadonlyMap<string, number> | Map<string, number>,
): BracketMatchForLibrary[] {
  if (tournamentId === LIGA6_ND_TOURNAMENT_ID) {
    return getLiga6NdBracketMatchesForLibrary(seedMap);
  }

  const rounds = getBracketRounds(tournamentId);
  const tour = getTournamentById(tournamentId);
  const mastersKoLayout = tour != null && effectiveTournamentCatalogType(tour) === 'masters1000';
  const list: BracketMatchForLibrary[] = [];
  const idFinal = 'b-f';
  const idS1 = 'b-s1';
  const idS2 = 'b-s2';

  const seed = (playerId: string) =>
    (seedMap?.has(playerId) ? seedMap.get(playerId) : undefined) ?? getSeedInTournament(tournamentId, playerId);

  // Final
  const f = rounds.final[0];
  if (f) {
    const pa = getPlayerById(f.playerA);
    const pb = getPlayerById(f.playerB);
    list.push({
      id: idFinal,
      name: 'Final',
      nextMatchId: null,
      tournamentRoundText: '3',
      startTime: f.scheduledDate ?? tournamentId,
      state: f.winnerId ? 'SCORE_DONE' : 'SCHEDULED',
      participants: [
        { id: f.playerA, name: pa?.name ?? 'TBD', resultText: f.score || null, isWinner: f.winnerId === f.playerA, status: f.winnerId ? 'PLAYED' : null, ranking: seed(f.playerA) },
        { id: f.playerB, name: pb?.name ?? 'TBD', resultText: f.score || null, isWinner: f.winnerId === f.playerB, status: f.winnerId ? 'PLAYED' : null, ranking: seed(f.playerB) },
      ],
    });
  } else {
    list.push({
      id: idFinal,
      name: 'Final',
      nextMatchId: null,
      tournamentRoundText: '3',
      startTime: '',
      state: 'SCHEDULED',
      participants: [{ id: 'tbd1', name: 'TBD' }, { id: 'tbd2', name: 'TBD' }],
    });
  }

  // Semifinals
  [rounds.semifinals[0], rounds.semifinals[1]].forEach((m, i) => {
    const id = i === 0 ? idS1 : idS2;
    if (m) {
      const pa = getPlayerById(m.playerA);
      const pb = getPlayerById(m.playerB);
      list.push({
        id,
        name: `Semifinal ${i + 1}`,
        nextMatchId: idFinal,
        tournamentRoundText: '2',
        startTime: m.scheduledDate ?? '',
        state: m.winnerId ? 'SCORE_DONE' : 'SCHEDULED',
        participants: [
          { id: m.playerA, name: pa?.name ?? 'TBD', resultText: m.score || null, isWinner: m.winnerId === m.playerA, status: m.winnerId ? 'PLAYED' : null, ranking: seed(m.playerA) },
          { id: m.playerB, name: pb?.name ?? 'TBD', resultText: m.score || null, isWinner: m.winnerId === m.playerB, status: m.winnerId ? 'PLAYED' : null, ranking: seed(m.playerB) },
        ],
      });
    } else {
      list.push({
        id,
        name: `Semifinal ${i + 1}`,
        nextMatchId: idFinal,
        tournamentRoundText: '2',
        startTime: '',
        state: 'SCHEDULED',
        participants: [{ id: `s${i}-1`, name: 'TBD' }, { id: `s${i}-2`, name: 'TBD' }],
      });
    }
  });

  // Quarterfinals (4 cruces). Masters 1000: solo semis + final, sin placeholders de cuartos.
  if (!mastersKoLayout) {
    const qIds = ['b-q1', 'b-q2', 'b-q3', 'b-q4'];
    const semiIds = [idS1, idS1, idS2, idS2];
    for (let i = 0; i < 4; i++) {
      const m = rounds.quarterfinals[i];
      const id = qIds[i];
      const nextId = semiIds[i];
      if (m) {
        const pa = getPlayerById(m.playerA);
        const pb = getPlayerById(m.playerB);
        list.push({
          id,
          name: `Cuartos ${i + 1}`,
          nextMatchId: nextId,
          tournamentRoundText: '1',
          startTime: m.scheduledDate ?? '',
          state: m.winnerId ? 'SCORE_DONE' : 'SCHEDULED',
          participants: [
            { id: m.playerA, name: pa?.name ?? 'TBD', resultText: m.score || null, isWinner: m.winnerId === m.playerA, status: m.winnerId ? 'PLAYED' : null, ranking: seed(m.playerA) },
            { id: m.playerB, name: pb?.name ?? 'TBD', resultText: m.score || null, isWinner: m.winnerId === m.playerB, status: m.winnerId ? 'PLAYED' : null, ranking: seed(m.playerB) },
          ],
        });
      } else {
        list.push({
          id,
          name: `Cuartos ${i + 1}`,
          nextMatchId: nextId,
          tournamentRoundText: '1',
          startTime: '',
          state: 'SCHEDULED',
          participants: [{ id: `q${i}-1`, name: 'TBD' }, { id: `q${i}-2`, name: 'TBD' }],
        });
      }
    }
  }

  return list;
}

/** Group stage fixtures (by group and fecha) – Liga 3 and Liga 4 */
export function getGroupStageFixtures(tournamentId: string): GroupStageGroup[] {
  if (tournamentId === 't-novak-l3') return LIGA3_GROUP_FIXTURES;
  if (tournamentId === 't-novak-l4') return LIGA4_GROUP_FIXTURES;
  return [];
}

/** Upcoming matches with date, time, players for "Próximos partidos". Liga 3: solo la final. */
export function getUpcomingMatchesForTournament(tournamentId: string): UpcomingMatchDisplay[] {
  if (tournamentId === 't-novak-l3') return LIGA3_UPCOMING;
  const scheduled = getClubSnapshot().matches.filter(
    (m) => m.tournamentId === tournamentId && (m.scheduledDate || m.scheduledTime) && !m.winnerId,
  );
  return scheduled.map((m, idx) => {
    const pa = getPlayerById(m.playerA);
    const pb = getPlayerById(m.playerB);
    const date = m.scheduledDate
      ? new Date(m.scheduledDate).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
      : '—';
    return {
      id: m.id,
      date,
      time: m.scheduledTime ?? '—',
      playerA: pa?.name ?? '—',
      playerB: pb?.name ?? '—',
      round: m.round,
      ballsByPlayerA: idx % 2 === 0,
    };
  });
}

// Re-export Liga 3 helpers for TournamentDetailScreen
export {
  getLiga3GroupStageResults,
  getLiga3Calendar,
  LIGA3_STATUS,
  getLiga3FinalMatch,
  getLiga3Preclasificacion,
  LIGA3_POINTS_SYSTEM,
  LIGA3_CLASSIFICATION_RULES,
};

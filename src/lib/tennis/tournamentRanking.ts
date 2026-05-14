/**
 * Ranking por rendimiento en torneo: puntos según **fase alcanzada**, no por partido individual.
 * Todo se calcula en runtime; no persistir la tabla de ranking como fuente de verdad.
 */

import type { MatchInput, PlayerRegistry } from '../../types/tennisResults';
import type { LeagueNum, Match, Player, Tournament } from '../mockData';
import { categoryToLeague, getMatchesByTournament } from '../mockData';
import { cleanPlayerName } from './matchDedupe';
import {
  aggregatePlayerStats,
  normalizePlayerName,
  parseMatch,
  resolvePlayerAlias,
} from './matchStatsEngine';
import {
  getPlayerReachedPhase,
  isRankingBracketRound,
  type PlayerReachedPhase,
  type TournamentPhaseMatch,
} from './playerReachedPhase';

export type TournamentPhase =
  | 'champion'
  | 'finalist'
  | 'semifinalist'
  | 'quarterfinalist'
  | 'repechage'
  | 'group_participant'
  | 'none';

export interface TournamentPhasePointsTable {
  champion: number;
  finalist: number;
  semifinalist: number;
  quarterfinalist: number;
  /** Puntos por fase de repechaje (sin cuadro principal) cuando aplica. */
  repechage: number;
  /** Puntos por disputar al menos un partido de grupos (sin fase KO superior). */
  groupParticipant: number;
}

export const DEFAULT_TOURNAMENT_PHASE_POINTS: TournamentPhasePointsTable = {
  champion: 500,
  finalist: 350,
  semifinalist: 200,
  quarterfinalist: 100,
  repechage: 50,
  groupParticipant: 25,
};

function mapPlayerReachedToTournamentPhase(p: PlayerReachedPhase): TournamentPhase {
  switch (p) {
    case 'champion':
      return 'champion';
    case 'finalist':
      return 'finalist';
    case 'semifinalist':
      return 'semifinalist';
    case 'quarterfinalist':
      return 'quarterfinalist';
    case 'repechage':
      return 'repechage';
    case 'group_stage':
      return 'group_participant';
    default:
      return 'none';
  }
}

function buildPhaseMatchesForTournament(
  tournamentId: string,
  ko: Match[],
  resultMatches: MatchInput[],
  players: Player[],
): TournamentPhaseMatch[] {
  const koRows: TournamentPhaseMatch[] = ko.map((m) => ({
    playerA: resolveToPlayerId(m.playerA, players) ?? m.playerA,
    playerB: resolveToPlayerId(m.playerB, players) ?? m.playerB,
    winnerId: m.winnerId ? resolveToPlayerId(m.winnerId, players) ?? m.winnerId : null,
    round: m.round,
  }));

  const groupRows: TournamentPhaseMatch[] = [];
  for (const m of resultMatches) {
    if (m.tournamentId !== tournamentId || m.status === 'pending' || m.status === 'suspended') continue;
    const g = m.group != null ? String(m.group).trim() : '';
    if (!g || /^interzonal$/i.test(g)) continue;
    const pa = resolveToPlayerId(m.playerA, players) ?? m.playerA;
    const pb = resolveToPlayerId(m.playerB, players) ?? m.playerB;
    let winnerId: string | null = null;
    try {
      const parsed = parseMatch(m);
      if (parsed.winner) {
        winnerId = resolveToPlayerId(parsed.winner, players) ?? parsed.winner;
      }
    } catch {
      /* sin marcador parseable */
    }
    groupRows.push({
      playerA: pa,
      playerB: pb,
      winnerId,
      group: m.group,
      completed: m.status === 'played' || m.status === 'walkover' || m.status === 'retired',
    });
  }

  return [...koRows, ...groupRows];
}

export interface TournamentPointsContext {
  resultMatches: MatchInput[];
  knockoutMatches: Match[];
  players: Player[];
}

export interface TournamentPointsResult {
  points: number;
  phase: TournamentPhase;
  playedInTournament: boolean;
}

export interface RankingSnapshotPrevious {
  positionByPlayerId: Record<string, number>;
  pointsByPlayerId: Record<string, number>;
}

export interface CalculatedRankingRow {
  position: number;
  playerId: string;
  league: LeagueNum;
  points: number;
  tournamentsPlayed: number;
  /** Partidos con resultado en `resultMatches` (PJ). */
  matchesPlayedResults: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  rankingPositionChange: number | null;
  pointsChange: number | null;
}

function playersToRegistry(players: Player[], matches: MatchInput[] = []): PlayerRegistry {
  const out: PlayerRegistry = players.map((p) => ({ name: p.name, id: p.id }));
  const seen = new Set(out.map((entry) => normalizePlayerName(entry.name, { casefold: true })));
  for (const match of matches) {
    for (const raw of [match.playerA, match.playerB]) {
      const name = normalizePlayerName(raw);
      const key = normalizePlayerName(name, { casefold: true });
      if (!name || seen.has(key)) continue;
      out.push({ name });
      seen.add(key);
    }
  }
  return out;
}

function resolveToPlayerId(raw: string, players: Player[]): string | null {
  if (players.some((p) => p.id === raw)) return raw;
  const n = cleanPlayerName(raw);
  const byName = players.find((p) => cleanPlayerName(p.name) === n);
  return byName?.id ?? null;
}

/** Une KO / repechaje del club con el cuadro Liga 3 embebido en mock (mismo criterio que `getBracketRounds`). */
export function mergeKnockoutMatchesForRanking(clubMatches: Match[]): Match[] {
  const map = new Map<string, Match>();
  for (const m of clubMatches) {
    if (isRankingBracketRound(m.round)) map.set(m.id, m);
  }
  for (const m of getMatchesByTournament('t-novak-l3')) {
    if (isRankingBracketRound(m.round)) map.set(m.id, m);
  }
  return Array.from(map.values());
}

function pointsForPhase(phase: TournamentPhase, table: TournamentPhasePointsTable): number {
  switch (phase) {
    case 'champion':
      return table.champion;
    case 'finalist':
      return table.finalist;
    case 'semifinalist':
      return table.semifinalist;
    case 'quarterfinalist':
      return table.quarterfinalist;
    case 'repechage':
      return table.repechage;
    case 'group_participant':
      return table.groupParticipant;
    default:
      return 0;
  }
}

/**
 * Puntos de ranking por torneo según la fase más alta alcanzada (KO + participación en grupos).
 *
 * Requiere contexto con partidos del store y, si aplica, partidos KO (`Match` con `round` tipo Cuartos/Semis/Final).
 */
export function calculateTournamentPoints(
  playerId: string,
  tournament: Tournament,
  ctx: TournamentPointsContext,
  pointsTable: TournamentPhasePointsTable = DEFAULT_TOURNAMENT_PHASE_POINTS,
): TournamentPointsResult {
  const { resultMatches, knockoutMatches, players } = ctx;
  const registry = playersToRegistry(players, resultMatches.filter((m) => m.tournamentId === tournament.id));
  const tid = tournament.id;
  const ko = knockoutMatches.filter((m) => m.tournamentId === tid);

  const phaseMatches = buildPhaseMatchesForTournament(tid, ko, resultMatches, players);
  const phase = mapPlayerReachedToTournamentPhase(getPlayerReachedPhase(playerId, phaseMatches));

  if (
    phase === 'champion' ||
    phase === 'finalist' ||
    phase === 'semifinalist' ||
    phase === 'quarterfinalist' ||
    phase === 'repechage' ||
    phase === 'group_participant'
  ) {
    return {
      points: pointsForPhase(phase, pointsTable),
      phase,
      playedInTournament: true,
    };
  }

  const anyMatch = resultMatches.some((m) => {
    if (m.tournamentId !== tid || m.status === 'pending' || m.status === 'suspended') return false;
    const p = players.find((x) => x.id === playerId);
    if (!p) return false;
    const self = resolvePlayerAlias(p.name, registry);
    const a = registry.length ? resolvePlayerAlias(m.playerA, registry) : normalizePlayerName(m.playerA);
    const b = registry.length ? resolvePlayerAlias(m.playerB, registry) : normalizePlayerName(m.playerB);
    return a === self || b === self;
  });

  if (anyMatch) {
    return { points: 0, phase: 'none', playedInTournament: true };
  }

  return { points: 0, phase: 'none', playedInTournament: false };
}

export interface GlobalRankingOptions {
  league: LeagueNum;
  pointsTable?: TournamentPhasePointsTable;
  previous?: RankingSnapshotPrevious | null;
}

/**
 * Ranking de una liga (datos club / mockData): puntos = suma de fases por torneo;
 * desempate por rendimiento en partidos (`aggregatePlayerStats`).
 * Para el modelo dominio `Player` + `Match` de `types/tournament`, usá `calculateGlobalRanking` en `./globalRanking`.
 */
export function calculateClubLeagueGlobalRanking(
  players: Player[],
  tournaments: Tournament[],
  resultMatches: MatchInput[],
  knockoutMatches: Match[],
  options: GlobalRankingOptions,
): CalculatedRankingRow[] {
  const { league, pointsTable = DEFAULT_TOURNAMENT_PHASE_POINTS, previous } = options;
  const leaguePlayers = players.filter((p) => categoryToLeague(p.category) === league);
  const leagueTournaments = tournaments.filter((t) => (t.league ?? categoryToLeague(t.category)) === league);
  const tidSet = new Set(leagueTournaments.map((t) => t.id));

  const leagueResults = resultMatches.filter((m) => tidSet.has(m.tournamentId));
  const registry = playersToRegistry(players, leagueResults);
  const agg = aggregatePlayerStats(leagueResults, registry);
  const aggById = new Map<string, (typeof agg)[0]>();
  for (const row of agg) {
    const pid = players.find((p) => resolvePlayerAlias(p.name, registry) === row.player)?.id;
    if (pid) aggById.set(pid, row);
  }

  const rows: Omit<CalculatedRankingRow, 'position' | 'rankingPositionChange' | 'pointsChange'>[] = leaguePlayers.map((p) => {
    let points = 0;
    let tournamentsPlayed = 0;
    for (const t of leagueTournaments) {
      const r = calculateTournamentPoints(p.id, t, { resultMatches, knockoutMatches, players }, pointsTable);
      if (r.playedInTournament) tournamentsPlayed += 1;
      points += r.points;
    }
    const a = aggById.get(p.id);
    return {
      playerId: p.id,
      league,
      points,
      tournamentsPlayed,
      matchesPlayedResults: a?.played ?? 0,
      wins: a?.won ?? 0,
      losses: a?.lost ?? 0,
      setsWon: a?.setsWon ?? 0,
      setsLost: a?.setsLost ?? 0,
      gamesWon: a?.gamesWon ?? 0,
      gamesLost: a?.gamesLost ?? 0,
    };
  });

  rows.sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    const sdY = y.setsWon - y.setsLost;
    const sdX = x.setsWon - x.setsLost;
    if (sdY !== sdX) return sdY - sdX;
    const gameDiffY = y.gamesWon - y.gamesLost;
    const gameDiffX = x.gamesWon - x.gamesLost;
    if (gameDiffY !== gameDiffX) return gameDiffY - gameDiffX;
    const gdY = y.wins - y.losses;
    const gdX = x.wins - x.losses;
    if (gdY !== gdX) return gdY - gdX;
    const na = players.find((p) => p.id === x.playerId)?.name ?? '';
    const nb = players.find((p) => p.id === y.playerId)?.name ?? '';
    return na.localeCompare(nb, 'es');
  });

  return rows.map((r, i) => {
    const position = i + 1;
    const prevPos = previous?.positionByPlayerId[r.playerId];
    const prevPts = previous?.pointsByPlayerId[r.playerId];
    const rankingPositionChange =
      prevPos != null ? prevPos - position : null;
    const pointsChange = prevPts != null ? r.points - prevPts : null;
    return {
      ...r,
      position,
      rankingPositionChange,
      pointsChange,
    };
  });
}

/** El ranking no se persiste; siempre `null` (Δ posición / pts solo en memoria si se pasa `previous` explícito). */
export function readRankingSnapshot(_league: LeagueNum): RankingSnapshotPrevious | null {
  void _league;
  return null;
}

/** No-op: no guardar standings/rankings en storage. */
export function writeRankingSnapshot(_league: LeagueNum, _rows: CalculatedRankingRow[]): void {
  void _league;
  void _rows;
}

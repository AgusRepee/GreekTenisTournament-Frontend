/**
 * Estadísticas de jugador derivadas solo de partidos registrados (`MatchInput`) y metadatos de torneos.
 * No usar campos manuales de `Player.stats` como fuente de verdad.
 *
 * Sobrecarga con `Match[]` del modelo dominio: `calculatePlayerStats(playerId, allMatches, allTournaments)`.
 */

import type { LeagueId, Match as DomainMatch, Player as DomainPlayer, Tournament as DomainTournament } from '../../types/tournament';
import type { MatchInput, PlayerRegistry, PlayerStats } from '../../types/tennisResults';
import type { LeagueNum, Match, Player, Tournament } from '../mockData';
import { categoryToLeague } from '../mockData';
import { aggregatePlayerStats, normalizePlayerName, resolvePlayerAlias } from './matchStatsEngine';
import { calculateGlobalRanking, isCompletedRankingMatch, playerParticipatedInTournament } from './globalRanking';
import { calculateTournamentPoints as calculateClubTournamentPoints } from './tournamentRanking';
import { calculateTournamentPoints as calculateDomainTournamentPoints } from './tournamentPhasePoints';

export interface CalculatedPlayerStats {
  playerId: string;
  playerName: string;
  totalMatchesPlayed: number;
  totalWins: number;
  totalLosses: number;
  setsWon: number;
  setsLost: number;
  setDifference: number;
  /** Torneos en los que jugó al menos un partido con resultado. */
  tournamentsPlayed: number;
  /** Torneos con `winnerId` igual a este jugador (datos de torneo, no manual en stats). */
  tournamentsWon: number;
  /**
   * Mejor puesto alcanzado en alguna liga, según ranking agregado solo con partidos de esa liga.
   * null si aún no hay muestra en ninguna liga.
   */
  bestHistoricalRanking: number | null;
  /** Liga actual según la ficha del jugador (categoría). */
  currentLeague: LeagueNum;
  winRate: number;
}

/** Perfil desde partidos `Match` del motor automático (sin roster club). */
export interface PlayerProfileStats {
  playerId: string;
  playerName: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  setDifference: number;
  tournamentsPlayed: number;
  tournamentsWon: number;
  /** Torneos en los que disputó al menos una final (completada). */
  finalsReached: number;
  /** Torneos en los que disputó al menos una semifinal (completada). */
  semifinalsReached: number;
  /** Mejor puesto en `calculateGlobalRanking` (1 = primero); null si no hay datos. */
  bestRankingPosition: number | null;
  winRate: number;
  /** Liga inferida del primer torneo en el que jugó (o 3). */
  league: LeagueId;
}

function playersToRegistry(players: Player[]): PlayerRegistry {
  return players.map((p) => ({
    name: String(p.name ?? '').trim() || p.id || 'Jugador',
    id: p.id,
  }));
}

function sortStatsLikeGlobalRanking(rows: PlayerStats[]): PlayerStats[] {
  return [...rows].sort((a, b) => {
    if (b.won !== a.won) return b.won - a.won;
    const sdA = a.setsWon - a.setsLost;
    const sdB = b.setsWon - b.setsLost;
    if (sdB !== sdA) return sdB - sdA;
    const gdA = a.gamesWon - a.gamesLost;
    const gdB = b.gamesWon - b.gamesLost;
    if (gdB !== gdA) return gdB - gdA;
    return String(a.player ?? '').localeCompare(String(b.player ?? ''), 'es');
  });
}

function leagueOfTournament(t: Tournament): LeagueNum {
  return t.league ?? categoryToLeague(t.category);
}

function bestRankAcrossLeagues(
  selfCanonical: string,
  allMatches: MatchInput[],
  allTournaments: Tournament[],
  registry: PlayerRegistry,
): number | null {
  const leaguesWithPlay = new Set<LeagueNum>();
  for (const m of allMatches) {
    if (m.status === 'pending' || m.status === 'suspended') continue;
    const t = allTournaments.find((x) => x.id === m.tournamentId);
    if (!t) continue;
    const a = registry.length ? resolvePlayerAlias(m.playerA, registry) : normalizePlayerName(m.playerA);
    const b = registry.length ? resolvePlayerAlias(m.playerB, registry) : normalizePlayerName(m.playerB);
    if (a === selfCanonical || b === selfCanonical) {
      leaguesWithPlay.add(leagueOfTournament(t));
    }
  }

  let best: number | null = null;
  for (const league of leaguesWithPlay) {
    const tournamentIds = new Set(
      allTournaments.filter((x) => leagueOfTournament(x) === league).map((x) => x.id),
    );
    const leagueMatches = allMatches.filter(
      (m) => tournamentIds.has(m.tournamentId) && m.status !== 'pending' && m.status !== 'suspended',
    );
    const statsRows = aggregatePlayerStats(leagueMatches, registry);
    const sorted = sortStatsLikeGlobalRanking(statsRows);
    const idx = sorted.findIndex((s) => s.player === selfCanonical);
    if (idx >= 0) {
      const pos = idx + 1;
      best = best === null ? pos : Math.min(best, pos);
    }
  }
  return best;
}

function emptyCalculated(playerId: string, playerName: string, currentLeague: LeagueNum): CalculatedPlayerStats {
  return {
    playerId,
    playerName,
    totalMatchesPlayed: 0,
    totalWins: 0,
    totalLosses: 0,
    setsWon: 0,
    setsLost: 0,
    setDifference: 0,
    tournamentsPlayed: 0,
    tournamentsWon: 0,
    bestHistoricalRanking: null,
    currentLeague,
    winRate: 0,
  };
}

function domainMatchToMatchInput(m: DomainMatch): MatchInput {
  let status: MatchInput['status'] = 'pending';
  if (m.completed && (m.winnerId || (m.result?.trim() && m.outcome && m.outcome !== 'pending'))) {
    status =
      m.outcome === 'walkover' ? 'walkover' : m.outcome === 'retired' ? 'retired' : 'played';
  }
  return {
    matchId: m.id,
    tournamentId: m.tournamentId,
    group: m.groupName ?? '',
    round: m.roundNumber ?? 0,
    playerA: m.player1Id,
    playerB: m.player2Id,
    score: m.result,
    status,
  };
}

function collectDomainPlayerIds(matches: ReadonlyArray<DomainMatch>): Set<string> {
  const s = new Set<string>();
  for (const m of matches) {
    s.add(m.player1Id);
    s.add(m.player2Id);
  }
  return s;
}

function syntheticDomainPlayers(
  matches: ReadonlyArray<DomainMatch>,
  tournaments: ReadonlyArray<DomainTournament>,
): DomainPlayer[] {
  const ids = collectDomainPlayerIds(matches);
  const tidLeague = new Map(tournaments.map((t) => [t.id, t.league]));
  return [...ids].map((id) => {
    const first = matches.find((m) => (m.player1Id === id || m.player2Id === id) && isCompletedRankingMatch(m));
    const league = (first ? tidLeague.get(first.tournamentId) : undefined) ?? 3;
    return { id, name: id, league: league as LeagueId, active: true };
  });
}

function countTournamentsWithStage(
  playerId: string,
  matches: ReadonlyArray<DomainMatch>,
  stage: DomainMatch['stage'],
): number {
  const tids = new Set<string>();
  for (const m of matches) {
    if (m.stage !== stage || !isCompletedRankingMatch(m)) continue;
    if (m.player1Id !== playerId && m.player2Id !== playerId) continue;
    tids.add(m.tournamentId);
  }
  return tids.size;
}

function calculatePlayerStatsFromDomainMatches(
  playerId: string,
  allMatches: ReadonlyArray<DomainMatch>,
  allTournaments: ReadonlyArray<DomainTournament>,
): PlayerProfileStats {
  const played = allMatches.filter((m) => isCompletedRankingMatch(m));
  const ids = collectDomainPlayerIds(allMatches);
  if (!ids.has(playerId)) {
    return {
      playerId,
      playerName: playerId,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      setsWon: 0,
      setsLost: 0,
      setDifference: 0,
      tournamentsPlayed: 0,
      tournamentsWon: 0,
      finalsReached: 0,
      semifinalsReached: 0,
      bestRankingPosition: null,
      winRate: 0,
      league: 3,
    };
  }

  const registry: PlayerRegistry = [...ids].map((id) => ({ name: id, id }));
  const inputs = played
    .map(domainMatchToMatchInput)
    .filter((m) => m.status !== 'pending' && m.status !== 'suspended');
  const rows = aggregatePlayerStats(inputs, registry);
  const row = rows.find((r) => r.player === playerId);

  let tournamentsPlayed = 0;
  let tournamentsWon = 0;
  for (const t of allTournaments) {
    if (!playerParticipatedInTournament(playerId, t.id, played)) continue;
    tournamentsPlayed++;
    if (calculateDomainTournamentPoints(playerId, t, played).phase === 'champion') tournamentsWon++;
  }

  const finalsReached = countTournamentsWithStage(playerId, played, 'final');
  const semifinalsReached = countTournamentsWithStage(playerId, played, 'semifinal');

  const synth = syntheticDomainPlayers(allMatches, allTournaments);
  const ranking = calculateGlobalRanking(synth, [...allTournaments], [...allMatches]);
  const rankEntry = ranking.find((r) => r.playerId === playerId);
  const bestRankingPosition = rankEntry?.position ?? null;

  const mp = row?.played ?? 0;
  const sw = row?.setsWon ?? 0;
  const sl = row?.setsLost ?? 0;

  return {
    playerId,
    playerName: playerId,
    matchesPlayed: mp,
    wins: row?.won ?? 0,
    losses: row?.lost ?? 0,
    setsWon: sw,
    setsLost: sl,
    setDifference: sw - sl,
    tournamentsPlayed,
    tournamentsWon,
    finalsReached,
    semifinalsReached,
    bestRankingPosition,
    winRate: mp > 0 && row ? row.won / mp : 0,
    league: (synth.find((p) => p.id === playerId)?.league ?? 3) as LeagueId,
  };
}

/**
 * Agrega estadísticas del jugador a partir de todos los resultados y la lista de torneos/jugadores del club.
 *
 * @param playerId id de `Player`
 * @param allMatches normalmente `getResults()` / `useResults()` (partidos con `score` y `status` distinto de `pending`)
 * @param allTournaments snapshot de torneos (para liga, `winnerId`, etc.)
 * @param players roster para resolver nombres en `MatchInput`
 */
function calculatePlayerStatsFromClubData(
  playerId: string,
  allMatches: MatchInput[],
  allTournaments: Tournament[],
  players: Player[],
  knockoutMatches: Match[],
): CalculatedPlayerStats {
  const player = players.find((p) => p.id === playerId);
  if (!player) {
    return emptyCalculated(playerId, '—', 1);
  }

  const registry = playersToRegistry(players);
  const resolvedName = String(player.name ?? '').trim() || player.id || 'Jugador';
  const self = resolvePlayerAlias(resolvedName, registry);
  const currentLeague = categoryToLeague(player.category);
  const phaseCtx = { resultMatches: allMatches, knockoutMatches, players };

  const allRows = aggregatePlayerStats(allMatches, registry);
  const row = allRows.find((r) => r.player === self);

  const tournamentsWonFromPhases = (): number =>
    allTournaments.filter((t) => calculateClubTournamentPoints(playerId, t, phaseCtx).phase === 'champion').length;

  if (!row) {
    return {
      ...emptyCalculated(playerId, self, currentLeague),
      tournamentsWon: tournamentsWonFromPhases(),
      bestHistoricalRanking: bestRankAcrossLeagues(self, allMatches, allTournaments, registry),
    };
  }

  const tournamentIdsPlayed = new Set<string>();
  for (const m of allMatches) {
    if (m.status === 'pending' || m.status === 'suspended') continue;
    let a: string;
    let b: string;
    try {
      a = resolvePlayerAlias(String(m.playerA ?? '').trim(), registry);
      b = resolvePlayerAlias(String(m.playerB ?? '').trim(), registry);
    } catch {
      continue;
    }
    if (a === self || b === self) {
      tournamentIdsPlayed.add(m.tournamentId);
    }
  }

  const tournamentsWon = tournamentsWonFromPhases();
  const setDifference = row.setsWon - row.setsLost;
  const winRate = row.played > 0 ? row.won / row.played : 0;

  return {
    playerId,
    playerName: self,
    totalMatchesPlayed: row.played,
    totalWins: row.won,
    totalLosses: row.lost,
    setsWon: row.setsWon,
    setsLost: row.setsLost,
    setDifference,
    tournamentsPlayed: tournamentIdsPlayed.size,
    tournamentsWon,
    bestHistoricalRanking: bestRankAcrossLeagues(self, allMatches, allTournaments, registry),
    currentLeague,
    winRate,
  };
}

function isDomainMatchList(matches: ReadonlyArray<unknown>): matches is ReadonlyArray<DomainMatch> {
  if (matches.length === 0) return true;
  const m = matches[0] as DomainMatch | undefined;
  return m != null && typeof m === 'object' && 'player1Id' in m && 'tournamentId' in m;
}

export function calculatePlayerStats(
  playerId: string,
  allMatches: MatchInput[],
  allTournaments: Tournament[],
  players: Player[],
  knockoutMatches?: Match[],
): CalculatedPlayerStats;
export function calculatePlayerStats(
  playerId: string,
  allMatches: ReadonlyArray<DomainMatch>,
  allTournaments: ReadonlyArray<DomainTournament>,
): PlayerProfileStats;
export function calculatePlayerStats(
  playerId: string,
  allMatches: MatchInput[] | ReadonlyArray<DomainMatch>,
  allTournaments: Tournament[] | ReadonlyArray<DomainTournament>,
  players?: Player[],
  knockoutMatches?: Match[],
): CalculatedPlayerStats | PlayerProfileStats {
  if (players !== undefined) {
    return calculatePlayerStatsFromClubData(
      playerId,
      allMatches as MatchInput[],
      allTournaments as Tournament[],
      players,
      knockoutMatches ?? [],
    );
  }
  if (!isDomainMatchList(allMatches)) {
    throw new TypeError(
      'calculatePlayerStats: sin roster (`players`) se espera Match[] de types/tournament (o array vacío).',
    );
  }
  return calculatePlayerStatsFromDomainMatches(
    playerId,
    allMatches as ReadonlyArray<DomainMatch>,
    allTournaments as ReadonlyArray<DomainTournament>,
  );
}

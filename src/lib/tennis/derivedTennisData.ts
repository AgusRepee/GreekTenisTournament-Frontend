/**
 * Datos de tenis derivados de `MatchInput` + club (jugadores, torneos, partidos KO).
 * Sin arrays manuales duplicados: usar desde pantallas con `useResults()`.
 */

import type { MatchInput } from '../../types/tennisResults';
import type {
  LeagueNum,
  Match,
  Player,
  PlayerSearchRow,
  RankingRow,
  ScheduledMatch,
  Tournament,
  UpcomingMatchDisplay,
} from '../mockData';
import {
  categoryToLeague,
  getPlayerById,
  getTournamentRanking,
  leagueToCategory,
  searchPlayersByName,
} from '../mockData';
import { cleanPlayerName, matchInputDedupeKey } from './matchDedupe';
import type { Liga3GroupMatchResult } from '../liga3Data';
import { LIGA3_TOURNAMENT_ID, getLiga3GroupStageResults } from '../liga3Data';
import {
  calculateClubLeagueGlobalRanking,
  calculateTournamentPoints,
  type CalculatedRankingRow,
  type TournamentPhase,
} from './tournamentRanking';
import { parseMatch, resolvePlayerAlias } from './matchStatsEngine';
import { isRankingBracketRound } from './playerReachedPhase';

type PlayerAliasRegistry = ReturnType<typeof buildRegistry>;

function buildRegistry(players: Player[]) {
  return players.map((p) => ({
    name: String(p.name ?? '').trim() || p.id || 'Jugador',
    id: p.id,
  }));
}

function canonSelfForRegistry(player: Player, registry: PlayerAliasRegistry): string {
  const resolved = String(player.name ?? '').trim() || player.id || 'Jugador';
  return resolvePlayerAlias(resolved, registry);
}

function resolvePlayerAliasSafe(raw: unknown, registry: PlayerAliasRegistry): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  try {
    return resolvePlayerAlias(s, registry);
  } catch {
    return null;
  }
}

/** Tabla de ranking por liga (1–6) recalculada desde resultados. */
export function computeRankingsByLeague(
  players: Player[],
  tournaments: Tournament[],
  results: MatchInput[],
  knockoutMatches: Match[],
): Map<LeagueNum, CalculatedRankingRow[]> {
  const map = new Map<LeagueNum, CalculatedRankingRow[]>();
  for (let L = 1; L <= 6; L++) {
    const league = L as LeagueNum;
    map.set(
      league,
      calculateClubLeagueGlobalRanking(players, tournaments, results, knockoutMatches, {
        league,
        previous: null,
      }),
    );
  }
  return map;
}

export interface DerivedPlayerProfileRankings {
  globalPosition: number | null;
  globalTotal: number;
  league: LeagueNum;
  leaguePosition: number | null;
  leagueTotal: number;
}

/**
 * Posición global (todos los jugadores del club por puntos derivados en su liga) + posición en liga.
 */
/**
 * Historial Campeón / Finalista según fase alcanzada en partidos (KO + grupos), no campos en `Tournament`.
 */
export function getTournamentHistoryForPlayerFromMatches(
  playerId: string,
  tournaments: Tournament[],
  results: MatchInput[],
  knockoutMatches: Match[],
  players: Player[],
): { tournament: Tournament; result: string }[] {
  const ctx = { resultMatches: results, knockoutMatches, players };
  return tournaments
    .filter((t) => t.status === 'finished')
    .flatMap((t) => {
      const { phase } = calculateTournamentPoints(playerId, t, ctx);
      if (phase === 'champion') return [{ tournament: t, result: 'Campeón' }];
      if (phase === 'finalist') return [{ tournament: t, result: 'Finalista' }];
      return [];
    })
    .sort((a, b) =>
      String(b.tournament.endDate ?? '').localeCompare(String(a.tournament.endDate ?? '')),
    );
}

export function derivePlayerProfileRankings(
  playerId: string,
  players: Player[],
  tournaments: Tournament[],
  results: MatchInput[],
  knockoutMatches: Match[],
): DerivedPlayerProfileRankings | null {
  const byLeague = computeRankingsByLeague(players, tournaments, results, knockoutMatches);
  return derivePlayerProfileRankingsFromLeagueMap(playerId, players, byLeague);
}

/** Misma semántica que `derivePlayerProfileRankings` pero con ranking ya materializado (p. ej. API MySQL). */
export function derivePlayerProfileRankingsFromLeagueMap(
  playerId: string,
  players: Player[],
  byLeague: Map<LeagueNum, CalculatedRankingRow[]>,
): DerivedPlayerProfileRankings | null {
  const p = players.find((x) => x.id === playerId);
  if (!p) return null;
  const league = categoryToLeague(p.category);
  const leagueRows = byLeague.get(league) ?? [];
  const lIdx = leagueRows.findIndex((r) => r.playerId === playerId);
  const leaguePosition = lIdx >= 0 ? lIdx + 1 : null;

  const pointsById = new Map<string, number>();
  for (const pl of players) {
    const L = categoryToLeague(pl.category);
    const rows = byLeague.get(L) ?? [];
    const row = rows.find((r) => r.playerId === pl.id);
    pointsById.set(pl.id, row?.points ?? 0);
  }
  const sorted = [...players].sort((a, b) => {
    const pa = pointsById.get(a.id) ?? 0;
    const pb = pointsById.get(b.id) ?? 0;
    if (pb !== pa) return pb - pa;
    return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'es');
  });
  const gIdx = sorted.findIndex((x) => x.id === playerId);
  const globalPosition = gIdx >= 0 ? gIdx + 1 : null;

  return {
    globalPosition,
    globalTotal: players.length,
    league,
    leaguePosition,
    leagueTotal: Math.max(leagueRows.length, 1),
  };
}

export interface RecentMatchDisplay {
  opp: string;
  score: string;
  res: 'Victoria' | 'Derrota';
  color: 'green' | 'red';
  phase: string;
}

/**
 * Últimos partidos con resultado desde el store (sustituye lectura estática de `getClubSnapshot().matches`).
 */
export function recentMatchesFromResults(
  playerId: string,
  results: MatchInput[],
  players: Player[],
  limit: number,
): RecentMatchDisplay[] {
  const registry = buildRegistry(players);
  const self = players.find((p) => p.id === playerId);
  if (!self) return [];

  const selfCanon = canonSelfForRegistry(self, registry);
  const played = results.filter((m) => m.status !== 'pending' && m.status !== 'suspended' && m.score);
  const rows: Array<{ m: MatchInput; t: number }> = [];
  for (const m of played) {
    const a = resolvePlayerAliasSafe(m.playerA, registry);
    const b = resolvePlayerAliasSafe(m.playerB, registry);
    if (a == null || b == null) continue;
    if (a !== selfCanon && b !== selfCanon) continue;
    let winnerName: string | null = null;
    try {
      winnerName = parseMatch(m).winner ?? null;
    } catch {
      continue;
    }
    if (!winnerName) continue;
    const t = m.date ? Date.parse(m.date) : 0;
    rows.push({ m, t: Number.isFinite(t) ? t : 0 });
  }
  rows.sort((x, y) => y.t - x.t);
  return rows.slice(0, limit).map(({ m }) => {
    const a = resolvePlayerAliasSafe(m.playerA, registry);
    const b = resolvePlayerAliasSafe(m.playerB, registry);
    if (a == null || b == null) {
      return {
        opp: '—',
        score: m.score ?? '',
        res: 'Derrota' as const,
        color: 'red' as const,
        phase: '—',
      };
    }
    let winnerName = '';
    try {
      winnerName = parseMatch(m).winner ?? '';
    } catch {
      return {
        opp: '—',
        score: m.score ?? '',
        res: 'Derrota' as const,
        color: 'red' as const,
        phase: '—',
      };
    }
    const oppRaw = winnerName === a ? b : a;
    const oppPlayer = players.find((p) => canonSelfForRegistry(p, registry) === oppRaw);
    const opp = oppPlayer?.name ?? oppRaw;
    const winnerCanon = resolvePlayerAliasSafe(winnerName, registry);
    const isWin = winnerCanon != null && winnerCanon === selfCanon;
    return {
      opp,
      score: m.score ?? '',
      res: isWin ? ('Victoria' as const) : ('Derrota' as const),
      color: isWin ? ('green' as const) : ('red' as const),
      phase: m.group ? `Grupo ${m.group}` : m.round != null ? `Fecha ${m.round}` : '—',
    };
  });
}

function formatProfileMatchDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  const t = Date.parse(dateStr);
  if (!Number.isFinite(t)) return dateStr;
  return new Date(t).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export type ProfileMatchOutcome = 'Victoria' | 'Derrota' | 'W.O.' | 'Suspendido';

export interface RecentMatchProfileRow {
  dateIso?: string;
  dateLabel: string;
  opponent: string;
  score: string;
  outcome: ProfileMatchOutcome;
  /** Ej. retiro en partido (cuando aplica). */
  detail?: string;
  phase: string;
}

/** Últimos partidos desde `GET /api/public/players/:id` (`recentMatches`). */
/** Historial campeón/finalista desde payload público del jugador. */
export function mergeApiTournamentHistory(
  apiHist: unknown,
  clubTournaments: Tournament[],
): { tournament: Tournament; result: string }[] {
  if (!Array.isArray(apiHist)) return [];
  return apiHist.map((raw) => {
    const h = raw as { tournamentId?: string; name?: string; slug?: string | null; role?: string };
    const existing = clubTournaments.find((t) => t.id === h.tournamentId);
    const tournament =
      existing ??
      ({
        id: h.tournamentId ?? '',
        name: h.name ?? 'Torneo',
        category: 'Tercera',
        status: 'finished',
        startDate: '',
        endDate: '',
        location: '',
      } as Tournament);
    const result = h.role === 'Campeón' ? 'Campeón' : 'Finalista';
    return { tournament, result };
  });
}

export function mapApiProfileRecentMatches(apiMatches: unknown, playerId: string): RecentMatchProfileRow[] {
  if (!Array.isArray(apiMatches)) return [];
  return apiMatches.slice(0, 12).map((raw): RecentMatchProfileRow => {
    const m = raw as Record<string, unknown>;
    const p1 = m.player1 as { id?: string; name?: string } | undefined;
    const p2 = m.player2 as { id?: string; name?: string } | undefined;
    const t = m.tournament as { name?: string } | undefined;
    const opp = p1?.id === playerId ? p2?.name ?? '—' : p1?.name ?? '—';
    const wid = (m.winner as { id?: string } | undefined)?.id;
    const won = wid === playerId;
    const score = String(m.score ?? '').trim() || '—';
    const su = score.toUpperCase();
    const isWo = su === 'W.O.' || su === 'WO' || /WALKOVER|W\.O\./i.test(score);
    const dateIso = typeof m.dateIso === 'string' && m.dateIso.trim() ? m.dateIso.trim() : undefined;
    const phaseFromApi = typeof m.phaseLabel === 'string' && m.phaseLabel.trim() ? m.phaseLabel.trim() : null;
    return {
      dateIso,
      dateLabel: dateIso ? formatProfileMatchDate(dateIso) : '—',
      opponent: opp,
      score,
      outcome: isWo ? 'W.O.' : won ? 'Victoria' : 'Derrota',
      phase: phaseFromApi ?? (t?.name ? String(t.name) : 'Torneo'),
    };
  });
}

/** Filas de participación en torneos desde `GET /api/public/players/:id` (`tournamentParticipation`). */
export function mapApiTournamentParticipation(raw: unknown): TournamentParticipationRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const r = item as Record<string, unknown>;
    const tid = String(r.tournamentId ?? '');
    const name = String(r.name ?? 'Torneo');
    const endDate = String(r.endDate ?? '');
    const Lraw = r.league;
    const league =
      typeof Lraw === 'number' && Lraw >= 1 && Lraw <= 6
        ? (Lraw as LeagueNum)
        : (Number.parseInt(String(Lraw ?? '3'), 10) as LeagueNum) || (3 as LeagueNum);
    const phaseLabel = String(r.phaseLabel ?? 'Participó');
    const points = typeof r.points === 'number' && Number.isFinite(r.points) ? r.points : 0;
    const tournament: Tournament = {
      id: tid,
      name,
      category: leagueToCategory(league),
      status: 'finished',
      startDate: endDate,
      endDate,
      location: '',
      league,
    };
    return { tournament, league, phaseLabel, points };
  });
}

/**
 * Últimos partidos para ficha de perfil: incluye suspendidos y walkover, con etiquetas de resultado en español.
 */
export function recentMatchesForProfile(
  playerId: string,
  results: MatchInput[],
  players: Player[],
  limit: number,
): RecentMatchProfileRow[] {
  const registry = buildRegistry(players);
  const self = players.find((p) => p.id === playerId);
  if (!self) return [];

  const selfCanon = canonSelfForRegistry(self, registry);
  const rows: Array<{ m: MatchInput; t: number }> = [];

  for (const m of results) {
    if (m.status === 'pending') continue;
    if (m.status === 'played' && !m.score?.trim()) continue;
    if (m.status === 'retired' && !m.score?.trim()) continue;
    const a = resolvePlayerAliasSafe(m.playerA, registry);
    const b = resolvePlayerAliasSafe(m.playerB, registry);
    if (a == null || b == null) continue;
    if (a !== selfCanon && b !== selfCanon) continue;
    const t = m.date ? Date.parse(m.date) : 0;
    rows.push({ m, t: Number.isFinite(t) ? t : 0 });
  }
  rows.sort((x, y) => y.t - x.t);

  return rows.slice(0, limit).map(({ m }) => {
    const a = resolvePlayerAliasSafe(m.playerA, registry);
    const b = resolvePlayerAliasSafe(m.playerB, registry);
    if (a == null || b == null) {
      return {
        dateIso: m.date,
        dateLabel: formatProfileMatchDate(m.date),
        opponent: '—',
        score: m.score?.trim() ? m.score : '—',
        outcome: 'Derrota' as const,
        phase: '—',
      };
    }
    const oppRaw = a === selfCanon ? b : a;
    const oppPlayer = players.find((p) => canonSelfForRegistry(p, registry) === oppRaw);
    const opponent = oppPlayer?.name ?? oppRaw;
    const phase = m.group ? `Grupo ${m.group}` : m.round != null ? `Fecha ${m.round}` : '—';

    if (m.status === 'suspended') {
      return {
        dateIso: m.date,
        dateLabel: formatProfileMatchDate(m.date),
        opponent,
        score: m.score?.trim() ? m.score : '—',
        outcome: 'Suspendido',
        phase,
      };
    }

    if (m.status === 'walkover') {
      return {
        dateIso: m.date,
        dateLabel: formatProfileMatchDate(m.date),
        opponent,
        score: m.score?.trim() ? m.score : 'W.O.',
        outcome: 'W.O.',
        phase,
      };
    }

    try {
      const parsed = parseMatch(m);
      const winnerName = parsed.winner ?? '';
      const winnerCanon = resolvePlayerAliasSafe(winnerName, registry);
      const isWin = winnerCanon != null && winnerCanon === selfCanon;
      return {
        dateIso: m.date,
        dateLabel: formatProfileMatchDate(m.date),
        opponent,
        score: m.score ?? '',
        outcome: isWin ? ('Victoria' as const) : ('Derrota' as const),
        detail: parsed.isRetired ? 'Retiro' : undefined,
        phase,
      };
    } catch {
      return {
        dateIso: m.date,
        dateLabel: formatProfileMatchDate(m.date),
        opponent,
        score: m.score?.trim() ? m.score : '—',
        outcome: 'Derrota' as const,
        phase,
      };
    }
  });
}

function tournamentPhaseLabelEs(phase: TournamentPhase): string {
  switch (phase) {
    case 'champion':
      return 'Campeón';
    case 'finalist':
      return 'Finalista';
    case 'semifinalist':
      return 'Semifinalista';
    case 'quarterfinalist':
      return 'Cuartos de final';
    case 'repechage':
      return 'Repechaje';
    case 'group_participant':
      return 'Fase de grupos';
    default:
      return 'Participó';
  }
}

export interface TournamentParticipationRow {
  tournament: Tournament;
  league: LeagueNum;
  phaseLabel: string;
  points: number;
}

/** Torneos finalizados en los que el jugador sumó puntos o tiene partidos registrados. */
export function getTournamentParticipationHistoryForPlayer(
  playerId: string,
  tournaments: Tournament[],
  results: MatchInput[],
  knockoutMatches: Match[],
  players: Player[],
): TournamentParticipationRow[] {
  const ctx = { resultMatches: results, knockoutMatches, players };
  const out: TournamentParticipationRow[] = [];
  for (const t of tournaments) {
    if (t.status !== 'finished') continue;
    const r = calculateTournamentPoints(playerId, t, ctx);
    if (!r.playedInTournament) continue;
    const league = t.league ?? categoryToLeague(t.category);
    out.push({
      tournament: t,
      league,
      phaseLabel: r.phase === 'none' ? 'Participó' : tournamentPhaseLabelEs(r.phase),
      points: r.points,
    });
  }
  return out.sort((a, b) =>
    String(b.tournament.endDate ?? '').localeCompare(String(a.tournament.endDate ?? '')),
  );
}

/** Mayor cantidad de victorias consecutivas (cronológico por fecha de partido). */
export function longestWinStreakForPlayer(
  playerId: string,
  results: MatchInput[],
  players: Player[],
): number {
  const registry = buildRegistry(players);
  const self = players.find((p) => p.id === playerId);
  if (!self) return 0;
  const selfCanon = canonSelfForRegistry(self, registry);

  const hits = results.filter((m) => {
    if (m.status === 'pending' || m.status === 'suspended') return false;
    if (m.status === 'played' && !m.score?.trim()) return false;
    if (m.status === 'retired' && !m.score?.trim()) return false;
    const a = resolvePlayerAliasSafe(m.playerA, registry);
    const b = resolvePlayerAliasSafe(m.playerB, registry);
    if (a == null || b == null) return false;
    return a === selfCanon || b === selfCanon;
  });

  const dated = hits
    .map((m) => ({ m, t: m.date ? Date.parse(m.date) : 0 }))
    .sort((x, y) => (Number.isFinite(x.t) ? x.t : 0) - (Number.isFinite(y.t) ? y.t : 0));

  let cur = 0;
  let max = 0;
  for (const { m } of dated) {
    try {
      const w = parseMatch(m).winner;
      const wCanon = w ? resolvePlayerAliasSafe(w, registry) : null;
      const won = !!w && wCanon != null && wCanon === selfCanon;
      if (won) {
        cur += 1;
        max = Math.max(max, cur);
      } else {
        cur = 0;
      }
    } catch {
      cur = 0;
    }
  }
  return max;
}

/** Quita de la lista de próximos los que ya tienen resultado en el store. */
export function filterUpcomingStillPending(
  upcoming: UpcomingMatchDisplay[],
  results: MatchInput[],
  tournamentId: string,
): UpcomingMatchDisplay[] {
  return upcoming.filter((u) => {
    const played = results.some((r) => {
      if (r.tournamentId !== tournamentId) return false;
      if (r.status !== 'played' && r.status !== 'walkover' && r.status !== 'retired') return false;
      if (!r.score?.trim()) return false;
      const a = cleanPlayerName(r.playerA);
      const b = cleanPlayerName(r.playerB);
      const ua = cleanPlayerName(u.playerA);
      const ub = cleanPlayerName(u.playerB);
      return (a === ua && b === ub) || (a === ub && b === ua);
    });
    return !played;
  });
}

/** Fase de grupos Liga 3: filas estáticas + partidos guardados en `resultsStore`. */
export function mergeLiga3GroupResultsWithStore(results: MatchInput[]): Liga3GroupMatchResult[] {
  const base = getLiga3GroupStageResults();
  const fromStore: Liga3GroupMatchResult[] = [];
  for (const m of results) {
    if (m.tournamentId !== LIGA3_TOURNAMENT_ID || m.status !== 'played' || !m.score?.trim()) continue;
    const g = String(m.group ?? '').trim();
    if (!g) continue;
    let winner = '';
    try {
      winner = parseMatch(m).winner ?? '';
    } catch {
      continue;
    }
    const groupLabel = g.replace(/^grupo\s*/i, '').trim();
    const groupName = /^[ABC]$/i.test(groupLabel) ? `Grupo ${groupLabel.toUpperCase()}` : g;
    fromStore.push({
      groupName,
      fecha: typeof m.round === 'number' ? m.round : 1,
      playerA: m.playerA,
      playerB: m.playerB,
      score: m.score,
      winner,
      date: m.date ?? '—',
      time: '—',
    });
  }
  const key = (r: Liga3GroupMatchResult) =>
    `${r.groupName}|${r.fecha}|${cleanPlayerName(r.playerA)}|${cleanPlayerName(r.playerB)}`;
  const map = new Map<string, Liga3GroupMatchResult>();
  for (const r of base) map.set(key(r), r);
  for (const r of fromStore) map.set(key(r), r);
  return Array.from(map.values()).sort((a, b) => {
    const d = String(a.date).localeCompare(String(b.date));
    if (d !== 0) return d;
    return String(a.groupName ?? '').localeCompare(String(b.groupName ?? ''));
  });
}

export type ScheduledMatchWithStore = ScheduledMatch & { storedScore?: string };

export function attachResultsToScheduledMatches(
  matches: ScheduledMatch[],
  results: MatchInput[],
  resolveTournamentId: (category: string) => string | undefined,
): ScheduledMatchWithStore[] {
  return matches.map((sm) => {
    const tid = resolveTournamentId(sm.category);
    if (!tid) return { ...sm };
    const hit = results.find((r) => {
      if (r.tournamentId !== tid) return false;
      if (r.status === 'pending' || r.status === 'suspended' || !r.score?.trim()) return false;
      const a = cleanPlayerName(r.playerA);
      const b = cleanPlayerName(r.playerB);
      const pa = cleanPlayerName(sm.playerA);
      const pb = cleanPlayerName(sm.playerB);
      return (a === pa && b === pb) || (a === pb && b === pa);
    });
    if (!hit?.score) return { ...sm };
    return { ...sm, storedScore: hit.score };
  });
}

function formatKoMatchScheduleCell(m: Match): { dateTime: string; date?: string; time?: string } {
  const dstr = m.scheduledDate?.trim();
  if (dstr) {
    const d = new Date(dstr);
    if (!Number.isNaN(d.getTime())) {
      const timePart =
        m.scheduledTime?.trim() || d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      return {
        dateTime: `${d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} · ${timePart}`,
        date: d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }),
        time: timePart,
      };
    }
  }
  return { dateTime: 'Agenda por confirmar', date: undefined, time: m.scheduledTime?.trim() || undefined };
}

function koRoundSortPriority(round?: string): number {
  const r = (round ?? '').toLowerCase();
  if (r.includes('final') && !r.includes('semi')) return 0;
  if (r.includes('semi')) return 1;
  if (r.includes('cuart')) return 2;
  return 3;
}

function koMatchSortKey(m: Match): number {
  const p = koRoundSortPriority(m.round);
  const d = m.scheduledDate ? Date.parse(m.scheduledDate) : NaN;
  return p * 1e15 + (Number.isFinite(d) ? d : 0);
}

/**
 * Partidos “importantes” para el inicio: eliminatoria del catálogo (`partidos`) con enlace a torneo/liga reales.
 * Prioriza pendientes (sin `winnerId`) y ordena por fecha de agenda / ronda.
 */
export function buildScheduledImportantMatchesFromCatalog(
  matches: Match[],
  tournaments: Tournament[],
  limit = 16,
): ScheduledMatch[] {
  const tid = new Map(tournaments.map((t) => [t.id, t]));
  const pool: Match[] = [];
  for (const m of matches) {
    if (!isRankingBracketRound(m.round)) continue;
    if (!tid.has(m.tournamentId)) continue;
    pool.push(m);
  }
  pool.sort((a, b) => {
    const aw = a.winnerId ? 1 : 0;
    const bw = b.winnerId ? 1 : 0;
    if (aw !== bw) return aw - bw;
    return koMatchSortKey(a) - koMatchSortKey(b);
  });
  return pool.slice(0, limit).map((m) => {
    const t = tid.get(m.tournamentId)!;
    const league = t.league ?? categoryToLeague(t.category);
    const cat = leagueToCategory(league);
    const roundLabel = (m.round ?? '').trim() || 'Eliminación';
    const label = `${roundLabel} · ${t.name}`;
    const when = formatKoMatchScheduleCell(m);
    return {
      id: `pub-ko-${m.id}`,
      label,
      playerA: m.playerA,
      playerB: m.playerB,
      category: cat,
      dateTime: when.dateTime,
      date: when.date,
      time: when.time,
      round: roundLabel,
    };
  });
}

export interface PublicTournamentResultRow {
  key: string;
  date: string;
  time: string;
  phase: string;
  playerA: string;
  playerB: string;
  result: string;
}

function isEliminationStoredGroup(group: string): boolean {
  const g = String(group ?? '').trim();
  return /^ko-/i.test(g) || g.toUpperCase().startsWith('KO');
}

/** Resultados visibles desde `useResults` (fixture / grupos listos para mostrar marcador). */
function isDisplayedGroupOrInterResult(m: MatchInput): boolean {
  const g = String(m.group ?? '').trim();
  if (isEliminationStoredGroup(g)) {
    return (
      m.status === 'pending' ||
      m.status === 'walkover' ||
      m.status === 'retired' ||
      m.status === 'suspended' ||
      (m.status === 'played' && Boolean(m.score?.trim()))
    );
  }
  return (
    m.status === 'walkover' ||
    m.status === 'retired' ||
    m.status === 'suspended' ||
    (m.status === 'played' && Boolean(m.score?.trim()))
  );
}

/** Resultados guardados (`useResults`) para la pestaña pública del torneo. Incluye eliminatoria KO pendiente. */
export function listPublicTournamentResultRows(tournamentId: string, results: MatchInput[]): PublicTournamentResultRow[] {
  const rows = results.filter((m) => m.tournamentId === tournamentId && isDisplayedGroupOrInterResult(m));
  const byKey = new Map<string, MatchInput>();
  for (const m of rows) byKey.set(matchInputDedupeKey(m), m);
  const unique = [...byKey.values()];
  unique.sort((a, b) => {
    const da = a.date ? Date.parse(a.date) : 0;
    const db = b.date ? Date.parse(b.date) : 0;
    return db - da;
  });
  return unique.map((m, i) => {
    const g = String(m.group ?? '').trim();
    let phase = 'Partido';
    if (isEliminationStoredGroup(g)) phase = 'Eliminación';
    else if (g && !/^interzonal$/i.test(g)) phase = /^[A-Z]$/i.test(g) ? `Grupo ${g.toUpperCase()}` : g;
    else if (typeof m.round === 'number') phase = `Fecha ${m.round}`;
    else if (/^interzonal$/i.test(g)) phase = 'Interzonal';

    let result = '—';
    if (isEliminationStoredGroup(g) && m.status === 'pending') result = 'Pendiente';
    else if (isEliminationStoredGroup(g) && m.status === 'played' && !m.score?.trim()) result = 'Pendiente';
    else if (m.status === 'walkover') result = 'W.O.';
    else if (m.status === 'suspended') result = 'Suspendido';
    else if (m.score?.trim()) result = m.score.trim();

    return {
      key: `pub-res-${m.matchId ?? i}-${matchInputDedupeKey(m)}`,
      date: m.date?.trim() || '—',
      time: '—',
      phase,
      playerA: m.playerA,
      playerB: m.playerB,
      result,
    };
  });
}

function resolveName(raw: string, registry: ReturnType<typeof buildRegistry>): string {
  return resolvePlayerAlias(raw, registry);
}

function sortCalculatedRowsGlobal(merged: CalculatedRankingRow[], players: Player[]): CalculatedRankingRow[] {
  const copy = [...merged];
  copy.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const sdB = b.setsWon - b.setsLost;
    const sdA = a.setsWon - a.setsLost;
    if (sdB !== sdA) return sdB - sdA;
    const gameDiffB = b.gamesWon - b.gamesLost;
    const gameDiffA = a.gamesWon - a.gamesLost;
    if (gameDiffB !== gameDiffA) return gameDiffB - gameDiffA;
    const na = players.find((p) => p.id === a.playerId)?.name ?? '';
    const nb = players.find((p) => p.id === b.playerId)?.name ?? '';
    return na.localeCompare(nb, 'es');
  });
  return copy;
}

export function calculatedRankingRowsToGlobalRankingRows(
  mergedSorted: CalculatedRankingRow[],
  players: Player[],
): RankingRow[] {
  const mergedWithRoster = mergedSorted.filter((cr) => players.some((p) => p.id === cr.playerId));
  if (mergedWithRoster.length < mergedSorted.length) {
    console.warn(
      '[calculatedRankingRowsToGlobalRankingRows] Se omitieron filas de ranking sin jugador en el roster actual.',
    );
  }

  return mergedWithRoster.map((cr, index) => {
    const player = players.find((p) => p.id === cr.playerId)!;
    const age = player.birthDate
      ? new Date().getFullYear() - new Date(player.birthDate).getFullYear()
      : undefined;
    let avatarUrl = '';
    const rawImg = player.profileImage?.trim();
    if (rawImg) {
      if (rawImg.startsWith('data:') || /^https?:\/\//i.test(rawImg)) {
        avatarUrl = rawImg;
      } else {
        try {
          avatarUrl = new URL(`../../img/${rawImg}`, import.meta.url).href;
        } catch {
          avatarUrl = '';
        }
      }
    }
    return {
      position: index + 1,
      playerId: cr.playerId,
      player,
      points: cr.points,
      matchesPlayed: cr.matchesPlayedResults,
      wins: cr.wins,
      losses: cr.losses,
      setsWon: cr.setsWon,
      setsLost: cr.setsLost,
      gamesWon: cr.gamesWon,
      gamesLost: cr.gamesLost,
      rankingChange: 0,
      pointsChange: 0,
      tournamentsPlayed: cr.tournamentsPlayed,
      leagueNum: cr.league,
      age,
      rankingDisplay: {
        name: player.name,
        avatarUrl,
        nationality: player.nationality,
      },
    };
  });
}

/** Ranking global desde filas ya calculadas por liga (API MySQL o snapshot local). */
export function buildGlobalRankingRowsFromLeagueMap(
  rankingsByLeague: Map<LeagueNum, CalculatedRankingRow[]>,
  players: Player[],
): RankingRow[] {
  const merged: CalculatedRankingRow[] = [];
  for (let L = 1; L <= 6; L++) {
    merged.push(...(rankingsByLeague.get(L as LeagueNum) ?? []));
  }
  return calculatedRankingRowsToGlobalRankingRows(sortCalculatedRowsGlobal(merged, players), players);
}

/**
 * Ranking global (todas las ligas) solo desde partidos — para búsqueda, perfil y seeds.
 */
export function buildGlobalRankingRowsFromResults(
  players: Player[],
  tournaments: Tournament[],
  results: MatchInput[],
  knockoutMatches: Match[],
): RankingRow[] {
  const merged: CalculatedRankingRow[] = [];
  for (let L = 1; L <= 6; L++) {
    const league = L as LeagueNum;
    merged.push(
      ...calculateClubLeagueGlobalRanking(players, tournaments, results, knockoutMatches, {
        league,
        previous: null,
      }),
    );
  }
  return calculatedRankingRowsToGlobalRankingRows(sortCalculatedRowsGlobal(merged, players), players);
}

/**
 * Búsqueda de jugadores con posición/puntos desde ranking ya materializado (p. ej. `GET /api/public/rankings` → `rankingsByLeague`).
 * No usa `results` ni KO local.
 */
export function searchPlayersWithPositionFromLeagueMap(
  query: string,
  players: Player[],
  rankingsByLeague: Map<LeagueNum, CalculatedRankingRow[]>,
): PlayerSearchRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const globalRows = buildGlobalRankingRowsFromLeagueMap(rankingsByLeague, players);
  const byId = new Map<string, PlayerSearchRow>();

  const rowForPlayer = (playerId: string) => globalRows.findIndex((r) => r.playerId === playerId);

  const nameMatches = players
    .filter((p) => String(p.name ?? '').toLowerCase().includes(q))
    .slice(0, 20);

  for (const p of nameMatches) {
    const idx = rowForPlayer(p.id);
    const pos = idx >= 0 ? idx + 1 : globalRows.length + 1;
    const rd = idx >= 0 ? globalRows[idx] : undefined;
    byId.set(p.id, {
      ...p,
      points: rd?.points ?? 0,
      stats: {
        matchesPlayed: rd?.matchesPlayed ?? 0,
        wins: rd?.wins ?? 0,
        losses: rd?.losses ?? 0,
      },
      position: pos,
      displayName: rd?.rankingDisplay?.name ?? p.name,
      displayAvatar: rd?.rankingDisplay?.avatarUrl?.trim() ? rd.rankingDisplay?.avatarUrl ?? null : null,
    });
  }

  for (let i = 0; i < globalRows.length; i++) {
    const row = globalRows[i];
    const rd = row.rankingDisplay;
    const nameLower = rd?.name?.toLowerCase();
    if (!nameLower || !nameLower.includes(q)) continue;
    const pid = row.playerId;
    if (byId.has(pid)) continue;
    const p = players.find((pl) => pl.id === pid);
    if (!p) continue;
    byId.set(pid, {
      ...p,
      points: row.points,
      stats: {
        matchesPlayed: row.matchesPlayed,
        wins: row.wins,
        losses: row.losses,
      },
      position: i + 1,
      displayName: rd.name ?? p.name,
      displayAvatar: rd.avatarUrl?.trim() ? rd.avatarUrl : null,
    });
  }

  return Array.from(byId.values()).sort((a, b) => a.position - b.position);
}

export function searchPlayersWithPositionFromResults(
  query: string,
  players: Player[],
  tournaments: Tournament[],
  results: MatchInput[],
  knockoutMatches: Match[],
): PlayerSearchRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const globalRows = buildGlobalRankingRowsFromResults(players, tournaments, results, knockoutMatches);
  const byId = new Map<string, PlayerSearchRow>();

  const rowForPlayer = (playerId: string) => globalRows.findIndex((r) => r.playerId === playerId);

  for (const p of searchPlayersByName(query)) {
    const idx = rowForPlayer(p.id);
    const pos = idx >= 0 ? idx + 1 : globalRows.length + 1;
    const rd = idx >= 0 ? globalRows[idx] : undefined;
    byId.set(p.id, {
      ...p,
      points: rd?.points ?? 0,
      stats: {
        matchesPlayed: rd?.matchesPlayed ?? 0,
        wins: rd?.wins ?? 0,
        losses: rd?.losses ?? 0,
      },
      position: pos,
      displayName: rd?.rankingDisplay?.name ?? p.name,
      displayAvatar: rd?.rankingDisplay?.avatarUrl?.trim() ? rd.rankingDisplay?.avatarUrl ?? null : null,
    });
  }

  for (let i = 0; i < globalRows.length; i++) {
    const row = globalRows[i];
    const rd = row.rankingDisplay;
    const nameLower = rd?.name?.toLowerCase();
    if (!nameLower || !nameLower.includes(q)) continue;
    const pid = row.playerId;
    if (byId.has(pid)) continue;
    const p = getPlayerById(pid);
    if (!p) continue;
    byId.set(pid, {
      ...p,
      points: row.points,
      stats: {
        matchesPlayed: row.matchesPlayed,
        wins: row.wins,
        losses: row.losses,
      },
      position: i + 1,
      displayName: rd.name ?? p.name,
      displayAvatar: rd.avatarUrl?.trim() ? rd.avatarUrl : null,
    });
  }

  return Array.from(byId.values()).sort((a, b) => a.position - b.position);
}

/** Top N del torneo por puntos de liga (desde motor); Liga 3 delega en ranking del torneo mock. */
export function getTournamentTopRankingFromResults(
  tournamentId: string,
  players: Player[],
  tournaments: Tournament[],
  results: MatchInput[],
  knockoutMatches: Match[],
  limit: number,
): RankingRow[] {
  if (tournamentId === 't-novak-l3') {
    return getTournamentRanking(tournamentId).slice(0, limit);
  }
  const t = tournaments.find((x) => x.id === tournamentId);
  if (!t) return [];
  const league = t.league ?? categoryToLeague(t.category);
  const rows = calculateClubLeagueGlobalRanking(players, tournaments, results, knockoutMatches, {
    league,
    previous: null,
  });
  return rows.slice(0, limit).map((cr, i) => {
    const player = players.find((p) => p.id === cr.playerId)!;
    let avatarUrl = '';
    const rawImg = player.profileImage?.trim();
    if (rawImg) {
      if (rawImg.startsWith('data:') || /^https?:\/\//i.test(rawImg)) {
        avatarUrl = rawImg;
      } else {
        try {
          avatarUrl = new URL(`../../img/${rawImg}`, import.meta.url).href;
        } catch {
          avatarUrl = '';
        }
      }
    }
    const age = player.birthDate
      ? new Date().getFullYear() - new Date(player.birthDate).getFullYear()
      : undefined;
    return {
      position: i + 1,
      playerId: cr.playerId,
      player,
      points: cr.points,
      matchesPlayed: cr.matchesPlayedResults,
      wins: cr.wins,
      losses: cr.losses,
      setsWon: cr.setsWon,
      setsLost: cr.setsLost,
      tournamentsPlayed: cr.tournamentsPlayed,
      leagueNum: league,
      age,
      rankingDisplay: {
        name: player.name,
        avatarUrl,
        nationality: player.nationality,
      },
    };
  });
}

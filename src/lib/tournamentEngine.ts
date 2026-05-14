/**
 * Motor central de resultados: funciones puras input → output.
 * La UI y el storage llaman estas APIs; no persisten tablas derivadas.
 */

import type { MatchInput, PlayerRegistry } from '@/types/tennisResults';
import type { LeagueNum, Match, Player, Tournament } from '@/lib/mockData';
import { categoryToLeague, getPlayerById } from '@/lib/mockData';
import {
  getEffectiveGrupos,
  getTemplateForTournament,
  resolvePlayerId,
} from '@/lib/tennis/tournamentSnapshotBridge';
import { getClubSnapshot } from '@/lib/clubDataStore';
import { getResults } from '@/data/hooks/matchResults';
import {
  aggregatePlayerStats,
  buildHeadToHeadFromPlayedMatches,
  compareStandingRows,
  computeGroupStandings,
  DEFAULT_RULE_CONFIG,
  lastNMatches,
  normalizePlayerName,
  parseMatch,
  parseMatchScore,
  resolvePlayerAlias,
  type ExtendedStandingRow,
  type HeadToHeadRecord,
  type LastMatchItem,
  type RuleConfig,
} from '@/lib/tennis/matchStatsEngine';
import {
  calculateClubLeagueGlobalRanking,
  mergeKnockoutMatchesForRanking,
  type CalculatedRankingRow,
  type GlobalRankingOptions,
  type TournamentPhasePointsTable,
} from '@/lib/tennis/tournamentRanking';
import { isRankingBracketRound, koRoundKind, type TournamentPhaseMatch } from '@/lib/tennis/playerReachedPhase';

// --- Reglas de grupo (misma fuente que `DEFAULT_RULE_CONFIG` del motor de standings) ---

export const ENGINE_GROUP_RULES: RuleConfig = DEFAULT_RULE_CONFIG;

// --- Tipos de partido / resultado --------------------------------------------

export interface EngineMatchRef {
  id: string;
  player1Id: string;
  player2Id: string;
  /** Si no hay nombres, se usan los ids en el MatchInput interno. */
  player1Name?: string;
  player2Name?: string;
  tournamentId?: string;
  group?: string;
}

export interface EngineMatchResultInput {
  status: MatchInput['status'];
  score?: string;
  /** Opcional: debe coincidir con el ganador inferido del marcador. */
  winnerId?: string | null;
}

export type EngineValidationResult =
  | { valid: true }
  | { valid: false; errors: string[] };

export interface ResolvedMatchWinner {
  winnerId: string | null;
  loserId: string | null;
  setsWonPlayer1: number;
  setsWonPlayer2: number;
  gamesWonPlayer1: number;
  gamesWonPlayer2: number;
  /** Marcador normalizado o resumen (p.ej. sets). */
  scoreSummary?: string;
}

export interface GroupStandingRow {
  playerId: string;
  displayName: string;
  position: number;
  played: number;
  won: number;
  lost: number;
  setsWon: number;
  setsLost: number;
  setsDifference: number;
  gamesWon: number;
  gamesLost: number;
  /** Obsoleto: la tabla de grupo no usa puntos 3/0; se mantiene en 0 por compatibilidad. */
  points: number;
}

export interface EnginePlayer {
  id: string;
  name: string;
  aliases?: string[];
}

export interface TournamentClassificationRules {
  advancePerGroup: number;
  /** Cuántos mejores terceros entran al cuadro (0 = desactivado). */
  bestThirdsSlots: number;
  /** Plazas de repechaje entre cuartos de grupo no clasificados directos. */
  repechageSlots: number;
}

export const DEFAULT_CLASSIFICATION_RULES: TournamentClassificationRules = {
  advancePerGroup: 2,
  bestThirdsSlots: 0,
  repechageSlots: 0,
};

export interface ClassificationRow {
  playerId: string;
  displayName: string;
  groupId: string;
  /** Orden dentro del bucket (1 = mejor). */
  seedOrder: number;
  path: 'group_direct' | 'best_third' | 'repechage';
}

export interface TournamentClassification {
  /** Clasificados directos por grupo (primeros N). */
  directQualifiers: ClassificationRow[];
  bestThirds: ClassificationRow[];
  repechage: ClassificationRow[];
  /** Orden global sugerido: directos por grupo, luego mejores terceros, repechaje. */
  orderedEntry: ClassificationRow[];
}

export interface PlayerEngineStats {
  playerId: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  setsDifference: number;
  winRatePercent: number;
  lastMatches: LastMatchItem[];
}

export interface EngineRankingRow extends CalculatedRankingRow {
  titles: number;
  finalsReached: number;
}

export interface RecalculateTournamentInput {
  tournamentId: string;
  players: Player[];
  tournaments: Tournament[];
  /** Resultados persistidos (grupos + lo que aplique). */
  resultMatches: MatchInput[];
  knockoutMatches: Match[];
  classificationRules?: TournamentClassificationRules;
}

export interface RecalculateTournamentOutput {
  tournamentId: string;
  league: LeagueNum;
  groups: Record<string, GroupStandingRow[]>;
  classification: TournamentClassification;
  knockoutMatches: Match[];
  playerStats: Record<string, PlayerEngineStats>;
  ranking: EngineRankingRow[];
}

function pushErr(errors: string[], msg: string): void {
  errors.push(msg);
}

/** Orden de tabla de grupo: PG → sets → games → cara a cara → nombre (misma lógica que `compareStandingRows`). */
function compareGroupRowsByPerformance(
  a: ExtendedStandingRow,
  b: ExtendedStandingRow,
  headToHead: HeadToHeadRecord[],
): number {
  return compareStandingRows(a, b, ENGINE_GROUP_RULES, headToHead);
}

function playerIdFromCanonical(
  canonicalName: string,
  players: EnginePlayer[],
): string {
  const n = normalizePlayerName(canonicalName, { casefold: true });
  for (const p of players) {
    if (normalizePlayerName(p.id, { casefold: true }) === n) return p.id;
    if (normalizePlayerName(p.name, { casefold: true }) === n) return p.id;
    for (const al of p.aliases ?? []) {
      if (normalizePlayerName(al, { casefold: true }) === n) return p.id;
    }
  }
  return canonicalName;
}

function displayNameFromId(id: string, players: EnginePlayer[]): string {
  return players.find((p) => p.id === id)?.name ?? id;
}

export function toPlayerRegistry(players: EnginePlayer[]): PlayerRegistry {
  return players.map((p) => ({
    name: p.name,
    id: p.id,
    aliases: [p.id, ...(p.aliases ?? [])].filter((x, i, a) => a.indexOf(x) === i),
  }));
}

function mockPlayersToEngine(players: Player[]): EnginePlayer[] {
  return players.map((p) => ({ id: p.id, name: p.name }));
}

/** Construye `MatchInput` mínimo para parseo / standings. */
export function matchRefAndResultToInput(
  match: EngineMatchRef,
  result: EngineMatchResultInput,
): MatchInput {
  const playerA = match.player1Name ?? match.player1Id;
  const playerB = match.player2Name ?? match.player2Id;
  let score = result.score;
  if (result.status === 'walkover') {
    const raw = String(score ?? '').trim();
    const isLetter = /^[AB]$/i.test(raw);
    const isWoWord = raw.toUpperCase() === 'WO' || raw.toUpperCase() === 'W.O.';
    const looksNumeric =
      raw.length > 0 && !isLetter && !isWoWord && /\d/.test(raw) && /[-–]/.test(raw);

    if (looksNumeric) {
      score = raw;
    } else if (result.winnerId === match.player2Id) {
      score = 'B';
    } else if (result.winnerId === match.player1Id) {
      score = 'A';
    } else if (!raw || isWoWord || !isLetter) {
      score = 'A';
    } else {
      score = raw;
    }
  }
  return {
    matchId: match.id,
    tournamentId: match.tournamentId ?? 'unknown',
    group: match.group,
    playerA,
    playerB,
    score,
    status: result.status,
  };
}

/**
 * 1) Valida resultado coherente con el partido (marcador, WO, super tie-break).
 */
export function validateMatchResult(
  match: EngineMatchRef,
  result: EngineMatchResultInput,
): EngineValidationResult {
  const errors: string[] = [];
  const st = result.status;

  if (st === 'pending') {
    pushErr(errors, 'No se puede validar un partido pendiente como resultado final.');
    return errors.length ? { valid: false, errors } : { valid: true };
  }

  if (st === 'suspended') {
    if (result.score?.trim()) {
      pushErr(errors, 'Suspendido: el marcador debe estar vacío (el partido no se disputó).');
    }
    return errors.length ? { valid: false, errors } : { valid: true };
  }

  const input = matchRefAndResultToInput(match, result);

  if (st === 'walkover') {
    const w = result.winnerId;
    if (w != null && w !== match.player1Id && w !== match.player2Id) {
      pushErr(errors, 'Walkover: winnerId debe ser player1Id o player2Id.');
    }
    const scRaw = (result.score ?? '').trim();
    const isLetter = /^[AB]$/i.test(scRaw);
    const isWoTok = !scRaw || scRaw.toUpperCase() === 'WO' || scRaw.toUpperCase() === 'W.O.';
    if (scRaw && !isLetter && !isWoTok) {
      try {
        const ps = parseMatchScore(scRaw, { requireThirdSetSuperTiebreak: false });
        if (!ps.isRetired && ps.setsWonA === ps.setsWonB) {
          pushErr(errors, 'El partido no puede terminar en empate de sets.');
        }
      } catch (e) {
        pushErr(errors, e instanceof Error ? e.message : String(e));
      }
    }
    try {
      const pm = parseMatch(input);
      if (w != null && w.length > 0 && (w === match.player1Id || w === match.player2Id)) {
        const wName =
          w === match.player1Id
            ? (match.player1Name ?? match.player1Id)
            : (match.player2Name ?? match.player2Id);
        const resolved = pm.winner;
        const reg = toPlayerRegistry([
          { id: match.player1Id, name: match.player1Name ?? match.player1Id },
          { id: match.player2Id, name: match.player2Name ?? match.player2Id },
        ]);
        let ok = false;
        try {
          const rw = reg.length ? resolvePlayerAlias(String(resolved), reg) : normalizePlayerName(String(resolved));
          const ww = resolvePlayerAlias(String(wName), reg);
          ok = normalizePlayerName(rw, { casefold: true }) === normalizePlayerName(ww, { casefold: true });
        } catch {
          ok =
            normalizePlayerName(String(resolved), { casefold: true }) ===
            normalizePlayerName(String(wName), { casefold: true });
        }
        if (!ok) {
          pushErr(errors, 'winnerId no coincide con el ganador inferido del marcador.');
        }
      }
    } catch (e) {
      pushErr(errors, e instanceof Error ? e.message : String(e));
    }
    return errors.length ? { valid: false, errors } : { valid: true };
  }

  if (!result.score?.trim()) {
    pushErr(errors, 'El marcador no puede estar vacío para un partido jugado o retirado.');
    return { valid: false, errors };
  }

  try {
    const parsedScore = parseMatchScore(result.score);
    if (!parsedScore.isRetired && parsedScore.setsWonA === parsedScore.setsWonB) {
      pushErr(errors, 'El partido no puede terminar en empate de sets.');
    }
  } catch (e) {
    pushErr(errors, e instanceof Error ? e.message : String(e));
    return { valid: false, errors };
  }

  try {
    const pm = parseMatch({ ...input, status: st });
    if (result.winnerId != null && result.winnerId.length > 0) {
      const wName = match.player1Id === result.winnerId ? (match.player1Name ?? match.player1Id) : match.player2Id === result.winnerId ? (match.player2Name ?? match.player2Id) : result.winnerId;
      const resolved = pm.winner;
      const reg = toPlayerRegistry([
        { id: match.player1Id, name: match.player1Name ?? match.player1Id },
        { id: match.player2Id, name: match.player2Name ?? match.player2Id },
      ]);
      let ok = false;
      try {
        const rw = reg.length ? resolvePlayerAlias(String(resolved), reg) : normalizePlayerName(String(resolved));
        const ww = resolvePlayerAlias(String(wName), reg);
        ok = normalizePlayerName(rw, { casefold: true }) === normalizePlayerName(ww, { casefold: true });
      } catch {
        ok = normalizePlayerName(String(resolved), { casefold: true }) === normalizePlayerName(String(wName), { casefold: true });
      }
      if (!ok) {
        pushErr(errors, 'winnerId no coincide con el ganador inferido del marcador.');
      }
    }
  } catch (e) {
    pushErr(errors, e instanceof Error ? e.message : String(e));
  }

  return errors.length ? { valid: false, errors } : { valid: true };
}

/**
 * 2) Resuelve ganador / perdedor y conteo de sets y games.
 */
export function resolveMatchWinner(
  match: EngineMatchRef,
  result: EngineMatchResultInput,
): ResolvedMatchWinner {
  const input = matchRefAndResultToInput(match, result);
  const p1 = match.player1Id;
  const p2 = match.player2Id;

  if (result.status === 'pending' || result.status === 'suspended') {
    return {
      winnerId: null,
      loserId: null,
      setsWonPlayer1: 0,
      setsWonPlayer2: 0,
      gamesWonPlayer1: 0,
      gamesWonPlayer2: 0,
      scoreSummary: result.score?.trim() || undefined,
    };
  }

  try {
    const pm = parseMatch(input);

    if (pm.isWalkover && pm.sets.length === 0) {
      const sc = String(input.score ?? '').trim();
      const wn =
        pm.winner ?? (sc.toUpperCase() === 'B' ? input.playerB : input.playerA);
      const wid =
        normalizePlayerName(wn, { casefold: true }) === normalizePlayerName(input.playerB, { casefold: true })
          ? p2
          : p1;
      const lid = wid === p1 ? p2 : p1;
      return {
        winnerId: wid,
        loserId: lid,
        setsWonPlayer1: wid === p1 ? 1 : 0,
        setsWonPlayer2: wid === p2 ? 1 : 0,
        gamesWonPlayer1: 0,
        gamesWonPlayer2: 0,
        scoreSummary: 'WO',
      };
    }

    if (pm.sets.length > 0) {
      const rawScore = (result.score ?? input.score ?? '').trim();
      const parsed = parseMatchScore(rawScore);
      const aIsP1 =
        normalizePlayerName(input.playerA, { casefold: true }) === normalizePlayerName(match.player1Name ?? match.player1Id, { casefold: true }) ||
        input.playerA === match.player1Id;
      const sets1 = aIsP1 ? parsed.setsWonA : parsed.setsWonB;
      const sets2 = aIsP1 ? parsed.setsWonB : parsed.setsWonA;
      const g1 = aIsP1 ? parsed.gamesWonA : parsed.gamesWonB;
      const g2 = aIsP1 ? parsed.gamesWonB : parsed.gamesWonA;
      const winnerName = pm.winner!;
      const winnerIsP1 =
        normalizePlayerName(winnerName, { casefold: true }) ===
          normalizePlayerName(match.player1Name ?? match.player1Id, { casefold: true }) || winnerName === match.player1Id;

      const scoreSummary =
        result.status === 'walkover' ? `${rawScore} (W.O.)` : rawScore;

      return {
        winnerId: winnerIsP1 ? p1 : p2,
        loserId: winnerIsP1 ? p2 : p1,
        setsWonPlayer1: sets1,
        setsWonPlayer2: sets2,
        gamesWonPlayer1: g1,
        gamesWonPlayer2: g2,
        scoreSummary,
      };
    }

    return {
      winnerId: null,
      loserId: null,
      setsWonPlayer1: 0,
      setsWonPlayer2: 0,
      gamesWonPlayer1: 0,
      gamesWonPlayer2: 0,
    };
  } catch {
    return {
      winnerId: null,
      loserId: null,
      setsWonPlayer1: 0,
      setsWonPlayer2: 0,
      gamesWonPlayer1: 0,
      gamesWonPlayer2: 0,
    };
  }
}

function extendedToGroupRows(
  rows: ExtendedStandingRow[],
  players: EnginePlayer[],
): GroupStandingRow[] {
  return rows.map((r, idx) => {
    const pid = playerIdFromCanonical(r.player, players);
    return {
      playerId: pid,
      displayName: displayNameFromId(pid, players),
      position: idx + 1,
      played: r.played,
      won: r.won,
      lost: r.lost,
      setsWon: r.setsWon,
      setsLost: r.setsLost,
      setsDifference: r.setsDiff,
      gamesWon: r.gamesWon,
      gamesLost: r.gamesLost,
      points: 0,
    };
  });
}

/**
 * 3) Tabla de grupo con PJ/PG/PP, sets, games y posición con desempate deportivo:
 * PG → diferencia de sets → diferencia de games → sets ganados → enfrentamiento directo → nombre.
 */
export function calculateGroupStandings(
  matches: MatchInput[],
  players: EnginePlayer[],
  rules: RuleConfig = ENGINE_GROUP_RULES,
): GroupStandingRow[] {
  const ep = mockPlayersToEngine(players);
  const registry = toPlayerRegistry(ep);
  const played = matches.filter((m) => m.status !== 'pending' && m.status !== 'suspended');
  const rowsMap = computeGroupStandings(played, rules, registry);
  const headToHead = buildHeadToHeadFromPlayedMatches(played, registry);

  const rosterNames = ep.map((p) => {
    try {
      return resolvePlayerAlias(p.name, registry);
    } catch {
      return normalizePlayerName(p.name);
    }
  });
  const byPlayer = new Map(rowsMap.map((r) => [r.player, { ...r }]));
  const merged: ExtendedStandingRow[] = rosterNames.map((name) => {
    const existing = byPlayer.get(name);
    if (existing) return { ...existing };
    return {
      player: name,
      played: 0,
      won: 0,
      lost: 0,
      setsWon: 0,
      setsLost: 0,
      gamesWon: 0,
      gamesLost: 0,
      setsDiff: 0,
      gamesDiff: 0,
      points: 0,
      position: 0,
    };
  });

  const sorted = [...merged].sort((a, b) => compareGroupRowsByPerformance(a, b, headToHead));
  return extendedToGroupRows(sorted.map((row, i) => ({ ...row, position: i + 1 })), ep);
}

function compareThirds(a: GroupStandingRow, b: GroupStandingRow): number {
  if (b.won !== a.won) return b.won - a.won;
  if (b.setsDifference !== a.setsDifference) return b.setsDifference - a.setsDifference;
  const ga = a.gamesWon - a.gamesLost;
  const gb = b.gamesWon - b.gamesLost;
  if (gb !== ga) return gb - ga;
  if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
  if (a.lost !== b.lost) return a.lost - b.lost;
  return a.displayName.localeCompare(b.displayName, 'es');
}

/**
 * 4) Clasificados, mejores terceros y repechaje según reglas.
 */
export function calculateTournamentClassification(
  groups: Array<{ groupId: string; standings: GroupStandingRow[] }>,
  rules: TournamentClassificationRules = DEFAULT_CLASSIFICATION_RULES,
): TournamentClassification {
  const direct: ClassificationRow[] = [];
  const thirds: Array<GroupStandingRow & { groupId: string }> = [];
  const fourths: Array<GroupStandingRow & { groupId: string }> = [];

  for (const g of groups) {
    const sorted = [...g.standings].sort((a, b) => a.position - b.position);
    const adv = Math.max(0, Math.min(rules.advancePerGroup, sorted.length));
    for (let i = 0; i < adv; i++) {
      const row = sorted[i];
      direct.push({
        playerId: row.playerId,
        displayName: row.displayName,
        groupId: g.groupId,
        seedOrder: i + 1,
        path: 'group_direct',
      });
    }
    if (sorted.length >= 3) {
      thirds.push({ ...sorted[2], groupId: g.groupId });
    }
    if (sorted.length >= 4 && rules.repechageSlots > 0) {
      fourths.push({ ...sorted[3], groupId: g.groupId });
    }
  }

  thirds.sort(compareThirds);
  const bestThirds: ClassificationRow[] = thirds.slice(0, rules.bestThirdsSlots).map((row, i) => ({
    playerId: row.playerId,
    displayName: row.displayName,
    groupId: row.groupId,
    seedOrder: i + 1,
    path: 'best_third' as const,
  }));

  fourths.sort(compareThirds);
  const repechage: ClassificationRow[] = fourths.slice(0, rules.repechageSlots).map((row, i) => ({
    playerId: row.playerId,
    displayName: row.displayName,
    groupId: row.groupId,
    seedOrder: i + 1,
    path: 'repechage' as const,
  }));

  const orderedEntry = [...direct, ...bestThirds, ...repechage];
  return { directQualifiers: direct, bestThirds, repechage, orderedEntry };
}

/**
 * 5) Estadísticas de perfil para un jugador (ids o nombres alineados al registry).
 */
export function calculatePlayerStats(
  playerId: string,
  allMatches: MatchInput[],
  players?: EnginePlayer[],
): PlayerEngineStats {
  const ep = players ?? [];
  const registry = ep.length ? toPlayerRegistry(ep) : undefined;
  const canonical = registry
    ? (() => {
        try {
          const byId = ep.find((p) => p.id === playerId);
          if (byId) return resolvePlayerAlias(byId.name, registry);
          return resolvePlayerAlias(playerId, registry);
        } catch {
          return normalizePlayerName(playerId);
        }
      })()
    : normalizePlayerName(playerId);

  const statsList = aggregatePlayerStats(allMatches, registry);
  const row = statsList.find(
    (s) => normalizePlayerName(s.player, { casefold: true }) === normalizePlayerName(canonical, { casefold: true }),
  );

  const played = row?.played ?? 0;
  const wins = row?.won ?? 0;
  const losses = row?.lost ?? 0;
  const setsWon = row?.setsWon ?? 0;
  const setsLost = row?.setsLost ?? 0;

  return {
    playerId,
    matchesPlayed: played,
    wins,
    losses,
    setsWon,
    setsLost,
    setsDifference: setsWon - setsLost,
    winRatePercent: played === 0 ? 0 : Number(((wins / played) * 100).toFixed(2)),
    lastMatches: lastNMatches(canonical, allMatches, 5, registry),
  };
}

function resolveToPlayerId(raw: string, players: Player[]): string | null {
  if (players.some((p) => p.id === raw)) return raw;
  const n = normalizePlayerName(raw, { casefold: true });
  const byName = players.find((p) => normalizePlayerName(p.name, { casefold: true }) === n);
  return byName?.id ?? null;
}

/** Plantel del grupo (plantilla + override) → filas `Player` mínimas para el motor. */
function rosterPlayersFromTemplateNames(names: string[], tournament: Tournament): Player[] {
  return names.map((name) => {
    const id = resolvePlayerId(name, tournament.id, tournament.category);
    const existing = getPlayerById(id);
    if (existing) return existing;
    return {
      id,
      name,
      category: tournament.category,
      points: 0,
      stats: { matchesPlayed: 0, wins: 0, losses: 0 },
    };
  });
}

function buildPhaseMatchesForTournamentEngine(
  tournamentId: string,
  ko: Match[],
  resultMatches: MatchInput[],
  players: Player[],
): TournamentPhaseMatch[] {
  const koRows: TournamentPhaseMatch[] = ko
    .filter((m) => m.tournamentId === tournamentId)
    .map((m) => ({
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
      /* ignore */
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

function countTitlesAndFinals(
  playerId: string,
  tournamentId: string,
  knockoutMatches: Match[],
): { titles: number; finals: number } {
  const finals = knockoutMatches.filter(
    (m) => m.tournamentId === tournamentId && koRoundKind(m.round ?? '') === 'final',
  );
  let titles = 0;
  let finalsReached = 0;
  for (const m of finals) {
    const a = m.playerA === playerId || m.playerB === playerId;
    if (!a) continue;
    finalsReached += 1;
    if (m.winnerId === playerId) titles += 1;
  }
  return { titles, finals: finalsReached };
}

/**
 * 6) Ranking de liga: puntos por fase, torneos jugados, títulos y finales (KO del torneo).
 */
export function calculateRanking(
  players: Player[],
  tournaments: Tournament[],
  results: MatchInput[],
  options: GlobalRankingOptions & { knockoutMatches: Match[] },
): EngineRankingRow[] {
  const { knockoutMatches, ...rest } = options;
  const base = calculateClubLeagueGlobalRanking(
    players,
    tournaments,
    results,
    knockoutMatches,
    rest,
  );

  const leagueTournaments = tournaments.filter(
    (t) => (t.league ?? categoryToLeague(t.category)) === rest.league,
  );
  const tidSet = new Set(leagueTournaments.map((t) => t.id));

  return base.map((row) => {
    let titles = 0;
    let finalsReached = 0;
    for (const tid of tidSet) {
      const ko = knockoutMatches.filter((m) => m.tournamentId === tid && isRankingBracketRound(m.round));
      const c = countTitlesAndFinals(row.playerId, tid, ko);
      titles += c.titles;
      finalsReached += c.finals;
    }
    return { ...row, titles, finalsReached };
  });
}

/**
 * 7a) Recalculación pura con todos los datos en memoria.
 */
export function recalculateTournamentFromData(input: RecalculateTournamentInput): RecalculateTournamentOutput {
  const { tournamentId, players, tournaments, resultMatches, knockoutMatches } = input;
  const rules = input.classificationRules ?? DEFAULT_CLASSIFICATION_RULES;
  const tournament = tournaments.find((t) => t.id === tournamentId);
  const league: LeagueNum = tournament?.league ?? categoryToLeague(tournament?.category);

  const tidMatches = resultMatches.filter((m) => m.tournamentId === tournamentId);
  const byGroup = new Map<string, MatchInput[]>();
  for (const m of tidMatches) {
    const g = m.group != null ? String(m.group).trim() : '';
    if (!g || /^interzonal$/i.test(g)) continue;
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(m);
  }

  const groupsOut: Record<string, GroupStandingRow[]> = {};
  const groupMetas: Array<{ groupId: string; standings: GroupStandingRow[] }> = [];

  const template = tournament ? getTemplateForTournament(tournament) : null;
  const effectiveGrupoNames =
    tournament && template ? getEffectiveGrupos(tournament, template) : null;

  const groupIds = new Set<string>();
  if (effectiveGrupoNames) {
    for (const k of Object.keys(effectiveGrupoNames)) {
      if (!/^interzonal$/i.test(k.trim())) groupIds.add(k);
    }
  }
  for (const k of byGroup.keys()) {
    if (!/^interzonal$/i.test(String(k).trim())) groupIds.add(k);
  }

  for (const gid of groupIds) {
    const ms = byGroup.get(gid) ?? [];

    let groupPlayers: Player[] = [];
    const rosterNames = effectiveGrupoNames?.[gid];
    if (tournament && rosterNames != null && rosterNames.length > 0) {
      groupPlayers = rosterPlayersFromTemplateNames(rosterNames, tournament);
    } else {
      const ids = new Set<string>();
      for (const m of ms) {
        const a = resolveToPlayerId(m.playerA, players) ?? m.playerA;
        const b = resolveToPlayerId(m.playerB, players) ?? m.playerB;
        ids.add(a);
        ids.add(b);
      }
      groupPlayers = players.filter((p) => ids.has(p.id));
    }

    if (groupPlayers.length === 0 && ms.length === 0) {
      continue;
    }

    const st = calculateGroupStandings(ms, groupPlayers.length > 0 ? groupPlayers : players);
    groupsOut[gid] = st;
    groupMetas.push({ groupId: gid, standings: st });
  }

  const classification = calculateTournamentClassification(groupMetas, rules);

  const ko = knockoutMatches.filter((m) => m.tournamentId === tournamentId);

  const statsById: Record<string, PlayerEngineStats> = {};
  const phaseMatches = buildPhaseMatchesForTournamentEngine(tournamentId, knockoutMatches, resultMatches, players);
  const involved = new Set<string>();
  for (const m of phaseMatches) {
    involved.add(m.playerA);
    involved.add(m.playerB);
  }
  const resultsThisTournament = resultMatches.filter((m) => m.tournamentId === tournamentId);
  for (const pid of involved) {
    if (!pid) continue;
    statsById[pid] = calculatePlayerStats(pid, resultsThisTournament, mockPlayersToEngine(players));
  }

  const ranking = calculateRanking(players, tournaments, resultMatches, {
    league,
    knockoutMatches,
  });

  return {
    tournamentId,
    league,
    groups: groupsOut,
    classification,
    knockoutMatches: ko,
    playerStats: statsById,
    ranking,
  };
}

/**
 * 7b) Recalcula desde snapshot del club + resultados persistidos (útil tras guardar).
 */
export function recalculateTournament(tournamentId: string): RecalculateTournamentOutput {
  const club = getClubSnapshot();
  const results = getResults();
  const ko = mergeKnockoutMatchesForRanking(club.matches);
  return recalculateTournamentFromData({
    tournamentId,
    players: club.players,
    tournaments: club.tournaments,
    resultMatches: results,
    knockoutMatches: ko,
  });
}

export type { TournamentPhasePointsTable };

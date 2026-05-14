/**
 * Motor de torneo derivado 100% de resultados (sets ganados por jugador).
 * No persiste tablas de posición: siempre se recalcula desde los partidos.
 */

import type { MatchInput, PlayerRegistry } from '../../types/tennisResults';
import { upsertResult } from './resultsStore';
import {
  aggregatePlayerStats,
  buildHeadToHeadFromPlayedMatches,
  compareStandingRows,
  computeGroupStandings,
  DEFAULT_RULE_CONFIG,
  normalizePlayerName,
  resolvePlayerAlias,
  type ExtendedStandingRow,
  type RuleConfig,
} from './matchStatsEngine';

/** Partido mínimo: nombres y sets ganados por cada lado (player1 = local / primer jugador). */
export interface EngineMatch {
  player1: string;
  player2: string;
  sets1: number;
  sets2: number;
  id?: string;
  tournamentId?: string;
  /** Alineado con `MatchInput` para clave de deduplicación en resultados. */
  group?: string;
  round?: number;
  date?: string;
}

export interface TournamentForRanking {
  id: string;
  name?: string;
  matches: EngineMatch[];
}

export interface GlobalRankingRow {
  player: string;
  position: number;
  played: number;
  won: number;
  lost: number;
  setsDiff: number;
  gamesDiff: number;
}

function isCompleteSetsTally(a: number, b: number): boolean {
  if (a === b) return false;
  const hi = Math.max(a, b);
  const sum = a + b;
  if (hi < 2) return false;
  if (hi === 2) return sum <= 3;
  if (hi === 3) return sum <= 5;
  return false;
}

/**
 * Convierte sets ganados (2-1, 2-0, …) en un marcador de games sintético
 * que el parser acepta y que conserva el conteo de sets por jugador.
 */
export function setsTallyToScoreString(setsWon1: number, setsWon2: number): string {
  const parts: string[] = [];
  let a = setsWon1;
  let b = setsWon2;
  while (a > 0 || b > 0) {
    if (a > 0) {
      parts.push('6-4');
      a -= 1;
    }
    if (b > 0) {
      parts.push('4-6');
      b -= 1;
    }
  }
  return parts.join(' ');
}

function registryFromPlayers(players: string[] | PlayerRegistry): PlayerRegistry {
  if (!Array.isArray(players)) return players;
  return players.map((name) => ({ name: normalizePlayerName(name) }));
}

function rosterCanonicalNames(
  players: string[] | PlayerRegistry,
  registry: PlayerRegistry
): string[] {
  if (Array.isArray(players)) {
    return players.map((p) => resolvePlayerAlias(normalizePlayerName(p), registry));
  }
  return registry.map((e) => e.name);
}

/**
 * Convierte partidos del motor a `MatchInput` jugados (omite incompletos o inválidos).
 */
export function engineMatchesToMatchInputs(
  matches: EngineMatch[],
  registry?: PlayerRegistry
): MatchInput[] {
  const out: MatchInput[] = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const sets1 = Number(m.sets1);
    const sets2 = Number(m.sets2);
    if (!Number.isFinite(sets1) || !Number.isFinite(sets2)) continue;
    if (!isCompleteSetsTally(sets1, sets2)) continue;

    const playerA = registry
      ? resolvePlayerAlias(m.player1, registry)
      : normalizePlayerName(m.player1);
    const playerB = registry
      ? resolvePlayerAlias(m.player2, registry)
      : normalizePlayerName(m.player2);

    const score = setsTallyToScoreString(sets1, sets2);
    const matchId =
      m.id ??
      `engine-${m.tournamentId ?? 'g'}-${playerA}-${playerB}-${m.date ?? i}-${sets1}-${sets2}`;

    out.push({
      matchId,
      tournamentId: m.tournamentId ?? 'default',
      group: m.group,
      round: m.round,
      playerA,
      playerB,
      score,
      status: 'played',
      date: m.date,
    });
  }
  return out;
}

/**
 * Tabla de posiciones de un grupo: todo derivado de `matches`.
 * `players`: plantilla del grupo (incluye filas en cero si aún no jugaron).
 */
export function calculateStandings(
  matches: EngineMatch[],
  players: string[] | PlayerRegistry,
  config: RuleConfig = DEFAULT_RULE_CONFIG
): ExtendedStandingRow[] {
  const registry = registryFromPlayers(players);
  const matchInputs = engineMatchesToMatchInputs(matches, registry);
  const computed = computeGroupStandings(matchInputs, config, registry);

  const roster = rosterCanonicalNames(players, registry);
  if (roster.length === 0) {
    return computed;
  }

  const byPlayer = new Map(computed.map((r) => [r.player, { ...r }]));
  const merged: ExtendedStandingRow[] = roster.map((name) => {
    const existing = byPlayer.get(name);
    if (existing) return existing;
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

  const headToHead = buildHeadToHeadFromPlayedMatches(matchInputs, registry);
  const sorted = merged.sort((a, b) => compareStandingRows(a, b, config, headToHead));
  return sorted.map((row, index) => ({ ...row, position: index + 1 }));
}

/**
 * Diferencia de sets de un jugador en el conjunto de partidos dado.
 */
export function calculateSetDifference(
  player: string,
  matches: EngineMatch[],
  registry?: PlayerRegistry
): number {
  const reg = registry ?? [];
  const matchInputs = engineMatchesToMatchInputs(matches, reg.length ? reg : undefined);
  const stats = aggregatePlayerStats(matchInputs, reg.length ? reg : undefined);
  const canon = reg.length
    ? resolvePlayerAlias(player, reg)
    : normalizePlayerName(player);
  const row = stats.find((s) => s.player === canon);
  if (!row) return 0;
  return row.setsWon - row.setsLost;
}

/**
 * Ranking global entre varios torneos: agrega todos los `matches` y ordena por rendimiento.
 */
export function calculateRanking(
  tournaments: TournamentForRanking[],
  registry?: PlayerRegistry
): GlobalRankingRow[] {
  const flat: EngineMatch[] = tournaments.flatMap((t) => t.matches);
  const matchInputs = engineMatchesToMatchInputs(flat, registry);
  const stats = aggregatePlayerStats(matchInputs, registry);

  const sorted = [...stats].sort((a, b) => {
    if (b.won !== a.won) return b.won - a.won;
    const sdA = a.setsWon - a.setsLost;
    const sdB = b.setsWon - b.setsLost;
    if (sdB !== sdA) return sdB - sdA;
    const gdA = a.gamesWon - a.gamesLost;
    const gdB = b.gamesWon - b.gamesLost;
    if (gdB !== gdA) return gdB - gdA;
    return a.player.localeCompare(b.player, 'es');
  });

  return sorted.map((s, index) => ({
    player: s.player,
    position: index + 1,
    played: s.played,
    won: s.won,
    lost: s.lost,
    setsDiff: s.setsWon - s.setsLost,
    gamesDiff: s.gamesWon - s.gamesLost,
  }));
}

/**
 * Persiste partidos del motor en `resultsStore` (misma fuente que la UI con `useResults`).
 * Recalcula vistas que lean resultados; no guarda standings aparte.
 */
export function publishEngineMatches(
  matches: EngineMatch[],
  registry?: PlayerRegistry
): void {
  const inputs = engineMatchesToMatchInputs(matches, registry);
  for (const m of inputs) {
    upsertResult(m);
  }
}

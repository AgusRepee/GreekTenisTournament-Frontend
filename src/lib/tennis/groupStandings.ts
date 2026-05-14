/**
 * Tabla de posiciones de grupo calculada solo desde partidos completados.
 * No se persiste: siempre derivar con `calculateGroupStandings`.
 */

import type { MatchInput, PlayerRegistry } from '../../types/tennisResults';
import {
  computeGroupStandings,
  DEFAULT_RULE_CONFIG,
  normalizePlayerName,
  resolvePlayerAlias,
  type ExtendedStandingRow,
  type RuleConfig,
} from './matchStatsEngine';

export interface GroupStandingEntry {
  player: string;
  position: number;
  played: number;
  /** Partidos ganados (PG). */
  won: number;
  /** Partidos perdidos (PP). */
  lost: number;
  setsWon: number;
  setsLost: number;
  setsDifference: number;
}

function registryFromPlayers(players: string[] | PlayerRegistry): PlayerRegistry {
  if (!Array.isArray(players)) return players;
  return players.map((name) => ({ name: normalizePlayerName(name) }));
}

function registryWithMatchParticipants(registry: PlayerRegistry, matches: MatchInput[]): PlayerRegistry {
  const out = [...registry];
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

function rosterCanonicalNames(players: string[] | PlayerRegistry, registry: PlayerRegistry): string[] {
  if (Array.isArray(players)) {
    return players.map((p) => resolvePlayerAlias(normalizePlayerName(p), registry));
  }
  return registry.map((e) => e.name);
}

function emptyStandingRow(player: string): ExtendedStandingRow {
  return {
    player,
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
}

function toEntry(row: ExtendedStandingRow, position: number): GroupStandingEntry {
  return {
    player: row.player,
    position,
    played: row.played,
    won: row.won,
    lost: row.lost,
    setsWon: row.setsWon,
    setsLost: row.setsLost,
    setsDifference: row.setsDiff,
  };
}

/**
 * Orden de desempate para grupos (sin H2H aquí; ver `compareStandingRows` en snapshot con partidos):
 * 1. PG · 2. diferencia de sets · 3. diferencia de games · 4. sets ganados · 5. nombre (es).
 */
export function compareGroupStandingsOrder(a: ExtendedStandingRow, b: ExtendedStandingRow): number {
  if (b.won !== a.won) return b.won - a.won;
  if (b.setsDiff !== a.setsDiff) return b.setsDiff - a.setsDiff;
  if (b.gamesDiff !== a.gamesDiff) return b.gamesDiff - a.gamesDiff;
  if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
  return a.player.localeCompare(b.player, 'es');
}

/**
 * Calcula la tabla del grupo a partir de partidos jugados (`MatchInput` con resultado válido).
 * `players` es la nómina del grupo: quienes no jugaron aparecen con ceros.
 *
 * Orden: victorias → diferencia de sets → sets ganados → alfabético.
 */
export function calculateGroupStandings(
  matches: MatchInput[],
  players: string[] | PlayerRegistry,
  config: RuleConfig = DEFAULT_RULE_CONFIG
): GroupStandingEntry[] {
  const registry = registryWithMatchParticipants(registryFromPlayers(players), matches);
  const computed = computeGroupStandings(matches, config, registry);

  const roster = rosterCanonicalNames(players, registry);
  if (roster.length === 0) {
    const sorted = [...computed].sort(compareGroupStandingsOrder);
    return sorted.map((row, i) => toEntry(row, i + 1));
  }

  const byPlayer = new Map(computed.map((r) => [r.player, { ...r }]));
  const mergedRoster = [...roster];
  const rosterSet = new Set(mergedRoster);
  for (const row of computed) {
    if (rosterSet.has(row.player)) continue;
    mergedRoster.push(row.player);
    rosterSet.add(row.player);
  }
  const merged: ExtendedStandingRow[] = mergedRoster.map((name) => {
    const existing = byPlayer.get(name);
    if (existing) return existing;
    return emptyStandingRow(name);
  });

  const sorted = merged.sort(compareGroupStandingsOrder);
  return sorted.map((row, i) => toEntry(row, i + 1));
}

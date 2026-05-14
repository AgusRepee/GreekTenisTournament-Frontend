import type { GroupTableWithSets, Player } from '@/lib/mockData';
import { getMatchesByTournament, getPlayerById } from '@/lib/mockData';
import { cleanPlayerName } from '@/lib/tennis/matchDedupe';
import { normalizePlayerName } from '@/lib/tennis/matchStatsEngine';
/** Sufijo visual del seed del torneo (no ranking de liga). */
export function formatDisplayNameWithSeed(displayName: string, seed: number | undefined): string {
  const trimmed = displayName.trim();
  if (!trimmed) return displayName;
  if (seed == null || seed < 1 || !Number.isFinite(seed)) return trimmed;
  return `${trimmed} (${seed})`;
}

/**
 * Resuelve el texto del fixture/partido (id, `name:…` o nombre mostrado) a `playerId` del club cuando coincide.
 */
export function resolveMatchSideToPlayerId(raw: string, players: readonly Player[]): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (s.startsWith('name:')) return s;
  if (getPlayerById(s)) return s;
  const target = normalizePlayerName(cleanPlayerName(s), { casefold: true });
  for (const p of players) {
    const nm = normalizePlayerName(cleanPlayerName(p.name), { casefold: true });
    if (nm === target) return p.id;
  }
  return null;
}

/** Participantes del torneo para calcular seeds oficiales (plantel en grupos + jugadores identificables en partidos KO del club). */
export function collectTournamentParticipantIdsForSeeds(params: {
  groupTables: GroupTableWithSets[];
  tournamentId: string;
  players: readonly Player[];
}): string[] {
  const { groupTables, tournamentId, players } = params;
  const set = new Set<string>();
  for (const gt of groupTables) {
    for (const r of gt.rows) {
      const id = r.playerId?.trim();
      if (id) set.add(id);
    }
  }
  for (const m of getMatchesByTournament(tournamentId)) {
    const a = resolveMatchSideToPlayerId(m.playerA, players);
    const b = resolveMatchSideToPlayerId(m.playerB, players);
    if (a) set.add(a);
    if (b) set.add(b);
  }
  return [...set];
}

export type AdminSeedFormatters = {
  seedMap: Map<string, number>;
  formatPlayerId: (playerId: string) => string;
  formatMatchSide: (raw: string) => string;
  formatVs: (playerA: string, playerB: string) => string;
};

export function buildAdminSeedFormatters(seedMap: Map<string, number>, players: readonly Player[]): AdminSeedFormatters {
  const formatPlayerId = (playerId: string): string => {
    const base = getPlayerById(playerId)?.name?.trim() ?? playerId.replace(/^name:/, '');
    return formatDisplayNameWithSeed(base, seedMap.get(playerId));
  };

  const formatMatchSide = (raw: string): string => {
    const id = resolveMatchSideToPlayerId(raw, players);
    if (id) return formatPlayerId(id);
    return raw.trim();
  };

  const formatVs = (playerA: string, playerB: string) => `${formatMatchSide(playerA)} vs ${formatMatchSide(playerB)}`;

  return { seedMap, formatPlayerId, formatMatchSide, formatVs };
}

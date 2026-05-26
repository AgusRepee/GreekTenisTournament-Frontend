/**
 * Resuelve `Player` para filas de ranking público (API) cuando el plantel `club.players`
 * aún no incluye ese id (evita 0 filas en /rankings y nombres crudos en home).
 */

import type { CalculatedRankingRow } from './tournamentRanking';
import type { CategoryKey, LeagueNum, Player } from '../mockData';
import { categoryToLeague, getPlayerById, leagueToCategory } from '../mockData';
import { getDataSourceMode } from '../data/tournamentRepository';

function playerNameSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Empareja jugador del seed local (`p-doc-*`) con fila de ranking API (`p-l2-…`). */
export function findRankingRowForRosterPlayer(
  p: Player,
  rankingsByLeague: Map<LeagueNum, CalculatedRankingRow[]>,
): CalculatedRankingRow | undefined {
  const league = categoryToLeague(p.category);
  const inLeague = rankingsByLeague.get(league) ?? [];
  const exact = inLeague.find((r) => r.playerId === p.id);
  if (exact) return exact;

  const localSlug = playerNameSlug(p.name);
  for (const rows of rankingsByLeague.values()) {
    for (const cr of rows) {
      if (cr.playerId === p.id) return cr;
      const apiName = cr.sourcePlayerName?.trim();
      if (!apiName) continue;
      if (playerNameSlug(apiName) === localSlug) return cr;
      if (apiName.toLowerCase() === String(p.name ?? '').trim().toLowerCase()) return cr;
    }
  }
  return undefined;
}

/** En modo API, `getPlayerById('p-l2-…')` puede devolver un jugador del seed local con id `p-doc-*`; la UI debe usar el id de la URL/API. */
export function withCanonicalPlayerId(requestedId: string, player: Player): Player {
  const pid = requestedId.trim();
  if (!pid || getDataSourceMode() !== 'api' || player.id === pid) return player;
  return { ...player, id: pid };
}

/** Jugador mínimo para `/jugadores/:id` cuando el id viene de la API y no está en el catálogo local. */
export function buildStubPlayerForProfileId(playerId: string, nameHint?: string): Player {
  const name = nameHint?.trim() || playerId;
  return {
    id: playerId,
    name,
    category: 'Segunda',
  };
}

export function resolvePlayerForPublicRanking(cr: CalculatedRankingRow, roster: Player[]): Player {
  const pid = cr.playerId;
  const fromRoster = roster.find((p) => p.id === pid);
  if (fromRoster) return withCanonicalPlayerId(pid, { ...fromRoster, nationality: fromRoster.nationality ?? 'Argentina' });
  const fromCatalog = getPlayerById(pid);
  if (fromCatalog) return withCanonicalPlayerId(pid, { ...fromCatalog, nationality: fromCatalog.nationality ?? 'Argentina' });
  const name = cr.sourcePlayerName?.trim() || cr.playerId;
  const category = (cr.sourcePlayerCategory ?? leagueToCategory(cr.league)) as CategoryKey;
  return {
    id: cr.playerId,
    name,
    category,
    profileImage: cr.sourceProfileImage ?? undefined,
    nationality: cr.sourcePlayerNationality ?? 'Argentina',
  };
}

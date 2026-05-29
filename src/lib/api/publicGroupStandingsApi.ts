import { getPublicGroupStandingsByTournamentId } from '@/lib/api/apiClient';
import type { GroupTableRowWithSets, GroupTableWithSets, Tournament } from '@/lib/mockData';
import { resolvePlayerId } from '@/lib/tennis/tournamentSnapshotBridge';

export type PublicGroupStandingsPayload = {
  tournamentId: string;
  groups: Array<{
    key: string;
    name: string;
    rows: Array<{
      position: number;
      playerId: string;
      playerName: string;
      PJ: number;
      PG: number;
      PP: number;
      setsWon: number;
      setsLost: number;
      gamesWon: number;
      gamesLost: number;
      setDiff: number;
    }>;
  }>;
};

export function mapPublicGroupStandingsToTables(
  payload: PublicGroupStandingsPayload,
  tournament: Tournament,
): GroupTableWithSets[] {
  return payload.groups.map((g) => ({
    name: g.name,
    rows: g.rows.map((r): GroupTableRowWithSets => {
      const pid =
        r.playerId.startsWith('name:') || r.playerId.startsWith('p-')
          ? resolvePlayerId(r.playerName, tournament.id, tournament.category)
          : r.playerId;
      return {
        position: r.position,
        playerId: pid,
        PJ: r.PJ,
        PG: r.PG,
        PP: r.PP,
        setsWon: r.setsWon,
        setsLost: r.setsLost,
        gamesWon: r.gamesWon,
        gamesLost: r.gamesLost,
        setDiff: r.setDiff,
      };
    }),
  }));
}

export async function fetchPublicGroupStandingsTables(
  tournament: Tournament,
): Promise<GroupTableWithSets[] | null> {
  const raw = await getPublicGroupStandingsByTournamentId(tournament.id);
  if (!raw || typeof raw !== 'object') return null;
  const groups = (raw as PublicGroupStandingsPayload).groups;
  if (!Array.isArray(groups) || groups.length === 0) return null;
  return mapPublicGroupStandingsToTables(raw as PublicGroupStandingsPayload, tournament);
}

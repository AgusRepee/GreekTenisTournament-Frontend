import type { LeagueNum } from '@/lib/mockData';
import type { CalculatedRankingRow } from '@/lib/tennis/tournamentRanking';

function parseLeagueRankingApiRow(r: Record<string, unknown>): CalculatedRankingRow | null {
  const pid = typeof r.playerId === 'string' ? r.playerId : '';
  if (!pid) return null;
  const league = Number(r.league);
  if (!Number.isFinite(league) || league < 1 || league > 6) return null;
  const stats =
    r.statsJson && typeof r.statsJson === 'object' && !Array.isArray(r.statsJson)
      ? (r.statsJson as Record<string, unknown>)
      : {};
  const setsWon = Number(stats.setsWon) || 0;
  const setsLost = Number(stats.setsLost) || 0;
  const gamesWon = Number(stats.gamesWon) || 0;
  const gamesLost = Number(stats.gamesLost) || 0;
  const rank = Number(r.rank) || Number(r.position) || 0;
  return {
    position: rank,
    playerId: pid,
    league: league as LeagueNum,
    points: Number(r.points) || 0,
    tournamentsPlayed: Number(stats.tournamentsPlayed) || 0,
    matchesPlayedResults: Number(r.played) || 0,
    wins: Number(r.wins) || 0,
    losses: Number(r.losses) || 0,
    setsWon,
    setsLost,
    gamesWon,
    gamesLost,
    rankingPositionChange: null,
    pointsChange: null,
  };
}

/** Transforma `GET /api/public/rankings` → mapa por liga (compatible con `CalculatedRankingRow`). */
export function mapPublicRankingsResponse(raw: unknown): Map<LeagueNum, CalculatedRankingRow[]> {
  const map = new Map<LeagueNum, CalculatedRankingRow[]>();
  for (let L = 1; L <= 6; L++) map.set(L as LeagueNum, []);

  if (!raw || typeof raw !== 'object') return map;
  const o = raw as Record<string, unknown>;

  const byLeague = o.byLeague as Record<string, unknown[]> | undefined;
  if (byLeague && typeof byLeague === 'object') {
    for (let L = 1; L <= 6; L++) {
      const arr = byLeague[String(L)];
      const rows: CalculatedRankingRow[] = [];
      if (Array.isArray(arr)) {
        for (const item of arr) {
          if (!item || typeof item !== 'object') continue;
          const cr = parseLeagueRankingApiRow(item as Record<string, unknown>);
          if (cr) rows.push(cr);
        }
      }
      map.set(L as LeagueNum, rows);
    }
    return map;
  }

  const flat = (Array.isArray(o.rows) ? o.rows : Array.isArray(o.leagueRows) ? o.leagueRows : []) as unknown[];
  const buckets: Record<number, CalculatedRankingRow[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const item of flat) {
    if (!item || typeof item !== 'object') continue;
    const cr = parseLeagueRankingApiRow(item as Record<string, unknown>);
    if (cr) buckets[cr.league]?.push(cr);
  }
  for (let L = 1; L <= 6; L++) {
    map.set(L as LeagueNum, buckets[L] ?? []);
  }
  return map;
}

import type { LeagueNum, CategoryKey } from '@/lib/mockData';

function parseNestedPlayer(r: Record<string, unknown>): {
  name?: string;
  category?: CategoryKey;
  profileImage?: string | null;
  nationality?: string;
} {
  const raw = r.player;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const p = raw as Record<string, unknown>;
  const name = typeof p.name === 'string' ? p.name.trim() : undefined;
  const category = typeof p.category === 'string' ? (p.category as CategoryKey) : undefined;
  const profileImage =
    typeof p.profileImage === 'string' && p.profileImage.trim() ? p.profileImage.trim() : null;
  const nationality = typeof p.nationality === 'string' && p.nationality.trim() ? p.nationality.trim() : undefined;
  return { name, category, profileImage, nationality };
}

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
  const {
    name: sourcePlayerName,
    category: sourcePlayerCategory,
    profileImage: sourceProfileImage,
    nationality: sourcePlayerNationality,
  } =
    parseNestedPlayer(r);
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
    ...(sourcePlayerName ? { sourcePlayerName } : {}),
    ...(sourcePlayerCategory ? { sourcePlayerCategory } : {}),
    ...(sourceProfileImage !== undefined ? { sourceProfileImage } : {}),
    ...(sourcePlayerNationality ? { sourcePlayerNationality } : {}),
  };
}

function sortAndRepairPositions(rows: CalculatedRankingRow[]): CalculatedRankingRow[] {
  const sorted = [...rows].sort((a, b) => {
    if (a.position > 0 && b.position > 0) return a.position - b.position;
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return (a.sourcePlayerName ?? a.playerId).localeCompare(b.sourcePlayerName ?? b.playerId, 'es');
  });
  return sorted.map((row, index) => (row.position > 0 ? row : { ...row, position: index + 1 }));
}

function mergeRowsByPlayerId(base: CalculatedRankingRow[], extra: CalculatedRankingRow[]): CalculatedRankingRow[] {
  const byPlayer = new Map<string, CalculatedRankingRow>();
  for (const row of base) byPlayer.set(row.playerId, row);
  for (const row of extra) {
    const existing = byPlayer.get(row.playerId);
    if (!existing) {
      byPlayer.set(row.playerId, row);
      continue;
    }
    if (existing.position <= 0 && row.position > 0) {
      byPlayer.set(row.playerId, { ...existing, position: row.position });
    }
  }
  return sortAndRepairPositions(Array.from(byPlayer.values()));
}

/** Transforma `GET /api/public/rankings` → mapa por liga (compatible con `CalculatedRankingRow`). */
export function mapPublicRankingsResponse(raw: unknown): Map<LeagueNum, CalculatedRankingRow[]> {
  const map = new Map<LeagueNum, CalculatedRankingRow[]>();
  for (let L = 1; L <= 6; L++) map.set(L as LeagueNum, []);

  if (!raw || typeof raw !== 'object') return map;
  const o = raw as Record<string, unknown>;

  const flat = (Array.isArray(o.rows) ? o.rows : Array.isArray(o.leagueRows) ? o.leagueRows : []) as unknown[];
  const flatBuckets: Record<number, CalculatedRankingRow[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const item of flat) {
    if (!item || typeof item !== 'object') continue;
    const cr = parseLeagueRankingApiRow(item as Record<string, unknown>);
    if (cr) flatBuckets[cr.league]?.push(cr);
  }

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
      map.set(L as LeagueNum, mergeRowsByPlayerId(rows, flatBuckets[L] ?? []));
    }
    return map;
  }

  for (let L = 1; L <= 6; L++) {
    map.set(L as LeagueNum, sortAndRepairPositions(flatBuckets[L] ?? []));
  }
  return map;
}

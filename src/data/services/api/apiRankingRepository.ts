import { getPublicRankings } from '@/lib/api/apiClient';
import type { LeagueNum } from '@/lib/mockData';
import type { CalculatedRankingRow } from '@/lib/tennis/tournamentRanking';
import { mapPublicRankingsResponse } from './mapPublicRankings';

/** Ranking por liga desde MySQL (`LeagueRankingRow`). */
export async function fetchApiRankingsByLeague(): Promise<Map<LeagueNum, CalculatedRankingRow[]>> {
  const raw = await getPublicRankings();
  return mapPublicRankingsResponse(raw);
}

/**
 * Hook único para rankings y derivados desde la capa de datos (`useResults` + `useClubData`).
 * No conoce localStorage: los datos vienen de `@/data`.
 */

import { useEffect, useMemo, useState } from 'react';
import { useClubData, useResults } from '@/data';
import { fetchApiRankingsByLeague } from '@/data/services/api/apiRankingRepository';
import { getDataSourceMode } from '@/lib/data/tournamentRepository';
import { mergeKnockoutMatchesForRanking } from './tournamentRanking';
import { computeRankingsByLeague } from './derivedTennisData';
import type { LeagueNum, Match } from '../mockData';
import type { CalculatedRankingRow } from './tournamentRanking';

export function useTennisLiveData(): {
  results: ReturnType<typeof useResults>;
  club: ReturnType<typeof useClubData>;
  knockoutMerged: Match[];
  rankingsByLeague: Map<LeagueNum, CalculatedRankingRow[]>;
  rankingsLoadedFromApi: boolean;
} {
  const results = useResults();
  const club = useClubData();
  const matches = Array.isArray(club.matches) ? club.matches : [];
  const players = Array.isArray(club.players) ? club.players : [];
  const tournaments = Array.isArray(club.tournaments) ? club.tournaments : [];
  const knockoutMerged = useMemo(() => mergeKnockoutMatchesForRanking(matches), [matches]);

  const apiMode = getDataSourceMode() === 'api';
  const [apiRankings, setApiRankings] = useState<Map<LeagueNum, CalculatedRankingRow[]> | null>(null);

  useEffect(() => {
    if (!apiMode) {
      setApiRankings(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const m = await fetchApiRankingsByLeague();
        if (!cancelled) setApiRankings(m);
      } catch (e) {
        console.warn('[useTennisLiveData] no se pudo cargar ranking público', e);
        if (!cancelled) setApiRankings(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiMode, results]);

  const localRankings = useMemo(
    () => computeRankingsByLeague(players, tournaments, results, knockoutMerged),
    [players, tournaments, results, knockoutMerged],
  );

  const rankingsByLeague = apiMode && apiRankings ? apiRankings : localRankings;

  const clubSafe = useMemo(
    () => ({ ...club, players, tournaments, matches }),
    [club, players, tournaments, matches],
  );

  return {
    results,
    club: clubSafe,
    knockoutMerged,
    rankingsByLeague,
    rankingsLoadedFromApi: Boolean(apiMode && apiRankings),
  };
}

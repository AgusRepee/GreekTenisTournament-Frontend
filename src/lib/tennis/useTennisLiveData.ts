/**
 * Hook único para rankings y derivados desde la capa de datos (`useResults` + `useClubData`).
 * No conoce localStorage: los datos vienen de `@/data`.
 */

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useClubData, useResults } from '@/data';
import {
  INITIAL_PUBLIC_RANKINGS_STATE,
  ensurePublicRankingsLoaded,
  getPublicRankingsState,
  subscribePublicRankings,
} from '@/data/services/api/publicRankingsStore';
import { getDataSourceMode } from '@/lib/data/tournamentRepository';
import { mergeKnockoutMatchesForRanking } from './tournamentRanking';
import { computeRankingsByLeague } from './derivedTennisData';
import type { LeagueNum, Match } from '../mockData';
import type { CalculatedRankingRow } from './tournamentRanking';

function subscribeApiRankings(onStoreChange: () => void): () => void {
  return subscribePublicRankings(onStoreChange);
}

function getApiRankingsSnapshot(): ReturnType<typeof getPublicRankingsState> {
  return getPublicRankingsState();
}

export function useTennisLiveData(): {
  results: ReturnType<typeof useResults>;
  club: ReturnType<typeof useClubData>;
  knockoutMerged: Match[];
  rankingsByLeague: Map<LeagueNum, CalculatedRankingRow[]>;
  rankingsLoadedFromApi: boolean;
  /** En modo API: true cuando terminó el intento de fetch (éxito o error). */
  rankingsPublicFetchDone: boolean;
} {
  const results = useResults();
  const club = useClubData();
  const matches = Array.isArray(club.matches) ? club.matches : [];
  const players = Array.isArray(club.players) ? club.players : [];
  const tournaments = Array.isArray(club.tournaments) ? club.tournaments : [];
  const knockoutMerged = useMemo(() => mergeKnockoutMatchesForRanking(matches), [matches]);

  const apiMode = getDataSourceMode() === 'api';

  useEffect(() => {
    if (apiMode) ensurePublicRankingsLoaded();
  }, [apiMode]);

  const apiRankingsState = useSyncExternalStore(
    apiMode ? subscribeApiRankings : () => () => {},
    apiMode ? getApiRankingsSnapshot : () => INITIAL_PUBLIC_RANKINGS_STATE,
    () => INITIAL_PUBLIC_RANKINGS_STATE,
  );

  const localRankings = useMemo(
    () => computeRankingsByLeague(players, tournaments, results, knockoutMerged),
    [players, tournaments, results, knockoutMerged],
  );

  const apiRankings = apiMode ? apiRankingsState.map : null;
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
    rankingsLoadedFromApi: Boolean(apiMode && apiRankingsState.loadedFromApi),
    rankingsPublicFetchDone: apiMode ? apiRankingsState.fetchDone : true,
  };
}

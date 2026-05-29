/**
 * Fixture de fase de grupos en la web pública: misma estructura que mockData + resultado vivo desde `useResults`.
 */

import type { GroupFixtureMatch, GroupFecha, GroupStageGroup } from '@/lib/mockData';
import { getTournamentById, LIGA3_GROUP_FIXTURES, LIGA4_GROUP_FIXTURES } from '@/lib/mockData';
import type { FixtureCatalogEntry } from '@/lib/tennis/buildFixtureCatalog';
import { buildFixtureCatalog, buildFixtureCatalogEntriesForTournament } from '@/lib/tennis/buildFixtureCatalog';
import { ligaNumFromNovakTournamentId } from '@/lib/tennis/generateTournamentsFromLigas';
import {
  RAFA_LIGA2_TOURNAMENT_ID,
  buildRafaLiga2GroupStageFixtures,
} from '@/lib/tennis/rafaNadalLiga2Nd2026Data';
import {
  RAFA_LIGA5_TOURNAMENT_ID,
  buildRafaLiga5GroupStageFixtures,
} from '@/lib/tennis/rafaNadalLiga5Nd2026Data';
import {
  RAFA_LIGA6_TOURNAMENT_ID,
  buildRafaLiga6GroupStageFixtures,
} from '@/lib/tennis/rafaNadalLiga6Nd2026Data';
import {
  RAFAEL_LIGA1_TOURNAMENT_ID,
  buildRafaelLiga1GroupStageFixtures,
} from '@/lib/tennis/rafaelNadalLiga1Nd2026Data';
import { cleanPlayerName, matchInputDedupeKey } from '@/lib/tennis/matchDedupe';
import { effectiveTournamentCatalogType } from '@/lib/tennis/rankingPointsGreek500';
import type { MatchInput } from '@/types/tennisResults';
import { formatPublicResultSummary } from '@/lib/tennis/matchDisplayState';

function cloneGroups(base: GroupStageGroup[]): GroupStageGroup[] {
  return JSON.parse(JSON.stringify(base)) as GroupStageGroup[];
}

function groupLetterFromTableName(name: string): string {
  const m = /^Grupo\s+([A-Za-z0-9]+)$/i.exec(name.trim());
  return m ? m[1]!.toUpperCase() : name.trim();
}

function hydrateStaticFixtures(tournamentId: string, groups: GroupStageGroup[], resultsByKey: Map<string, MatchInput>): GroupStageGroup[] {
  const out = cloneGroups(groups);
  for (const g of out) {
    const gk = groupLetterFromTableName(g.name);
    for (const f of g.fechas) {
      for (const match of f.matches) {
        const key = matchInputDedupeKey({
          tournamentId,
          group: gk,
          round: f.fecha,
          playerA: cleanPlayerName(match.playerA),
          playerB: cleanPlayerName(match.playerB),
        });
        const rev = matchInputDedupeKey({
          tournamentId,
          group: gk,
          round: f.fecha,
          playerA: cleanPlayerName(match.playerB),
          playerB: cleanPlayerName(match.playerA),
        });
        const stored = resultsByKey.get(key) ?? resultsByKey.get(rev);
        match.resultSummary = formatPublicResultSummary(stored);
      }
    }
  }
  return out;
}

function groupNameForCatalogGroupKey(key: string): string {
  if (/^interzonal$/i.test(key)) return 'Interzonal';
  if (/^[A-Z0-9]$/i.test(key)) return `Grupo ${key.toUpperCase()}`;
  return key;
}

/** Construye fechas de grupos + interzonal desde entradas de catálogo (Novak o Masters). */
function buildFromFixtureCatalogEntries(
  tournamentId: string,
  entries: FixtureCatalogEntry[],
  resultsByKey: Map<string, MatchInput>,
): GroupStageGroup[] {
  if (entries.length === 0) return [];

  type Acc = Map<string, Map<number, GroupFixtureMatch[]>>;
  const acc: Acc = new Map();

  for (const e of entries) {
    const displayName = groupNameForCatalogGroupKey(e.group);
    if (!acc.has(displayName)) acc.set(displayName, new Map());
    const byRound = acc.get(displayName)!;
    if (!byRound.has(e.round)) byRound.set(e.round, []);
    const list = byRound.get(e.round)!;
    const match: GroupFixtureMatch = {
      playerA: e.playerA,
      playerB: e.playerB,
      ballsByA: list.length % 2 === 0,
    };
    const key = matchInputDedupeKey({
      tournamentId,
      group: e.group,
      round: e.round,
      playerA: cleanPlayerName(e.playerA),
      playerB: cleanPlayerName(e.playerB),
    });
    match.resultSummary = formatPublicResultSummary(resultsByKey.get(key));
    list.push(match);
  }

  const groupNames = [...acc.keys()].sort((a, b) => {
    if (a === 'Interzonal') return 1;
    if (b === 'Interzonal') return -1;
    return a.localeCompare(b, 'es');
  });

  const out: GroupStageGroup[] = [];
  for (const name of groupNames) {
    const byRound = acc.get(name)!;
    const fechas = [...byRound.entries()]
      .sort(([ra], [rb]) => ra - rb)
      .map(
        ([fecha, matches]): GroupFecha => ({
          fecha,
          matches,
        }),
      );
    out.push({ name, fechas });
  }
  return out;
}

function buildFromFixtureCatalog(tournamentId: string, resultsByKey: Map<string, MatchInput>): GroupStageGroup[] {
  const entries = buildFixtureCatalog().filter((e) => e.tournamentId === tournamentId);
  return buildFromFixtureCatalogEntries(tournamentId, entries, resultsByKey);
}

/**
 * Fixtures de grupo para torneos Novak (L1–L6): L3/L4 siguen usando la grilla textual del mock + overlay del store;
 * el resto sale del catálogo de docs (misma fuente que el admin).
 */
export function buildPublicGroupStageFixtures(tournamentId: string | undefined | null, results: MatchInput[]): GroupStageGroup[] {
  const tid = (tournamentId ?? '').trim();
  if (!tid) return [];

  const resultsForTournament = results.filter((r) => r.tournamentId === tid);
  const resultsByKey = new Map<string, MatchInput>();
  for (const r of resultsForTournament) {
    resultsByKey.set(matchInputDedupeKey(r), r);
  }

  if (tid === RAFAEL_LIGA1_TOURNAMENT_ID) {
    return hydrateStaticFixtures(tid, buildRafaelLiga1GroupStageFixtures(), resultsByKey);
  }
  if (tid === RAFA_LIGA2_TOURNAMENT_ID) {
    return hydrateStaticFixtures(tid, buildRafaLiga2GroupStageFixtures(), resultsByKey);
  }
  if (tid === RAFA_LIGA5_TOURNAMENT_ID) {
    return hydrateStaticFixtures(tid, buildRafaLiga5GroupStageFixtures(), resultsByKey);
  }
  if (tid === RAFA_LIGA6_TOURNAMENT_ID) {
    return hydrateStaticFixtures(tid, buildRafaLiga6GroupStageFixtures(), resultsByKey);
  }

  const ln = ligaNumFromNovakTournamentId(tid);
  if (ln === 3) return hydrateStaticFixtures(tid, LIGA3_GROUP_FIXTURES, resultsByKey);
  if (ln === 4) return hydrateStaticFixtures(tid, LIGA4_GROUP_FIXTURES, resultsByKey);
  if (ln != null) return buildFromFixtureCatalog(tid, resultsByKey);

  const tour = getTournamentById(tid);
  if (tour && effectiveTournamentCatalogType(tour) === 'masters1000') {
    const entries = buildFixtureCatalogEntriesForTournament(tour, []);
    return buildFromFixtureCatalogEntries(tid, entries, resultsByKey);
  }

  return [];
}

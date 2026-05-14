/**
 * Tablas por defecto alineadas a la configuración de ranking de la API.
 * Greek 500 = circuito regular; Masters 1000 = cierre de temporada (mayor peso).
 */
import type { TournamentCatalogType } from '@/types/tournamentCatalog';

export type { TournamentCatalogType } from '@/types/tournamentCatalog';

export function normalizeTournamentCatalogType(raw: string | undefined | null): TournamentCatalogType {
  return raw === 'masters1000' ? 'masters1000' : 'greek500';
}

/** Torneo de cierre de temporada (id fijo o nombre); no depende del campo persistido `tournamentType`. */
export function isMastersFinalsTournament(t: { id?: string | null; name?: string | null } | null | undefined): boolean {
  const id = t?.id?.trim();
  if (id === 't-masters') return true;
  const n = (t?.name ?? '').trim();
  return /\bmaster\s*finals\b/i.test(n) || /\bmasters?\s+finals?\b/i.test(n);
}

/** Greek 500 por defecto; solo Masters Finals usa catálogo Masters 1000. */
export function effectiveTournamentCatalogType(
  t: { id?: string | null; name?: string | null; tournamentType?: string | null } | null | undefined,
): TournamentCatalogType {
  return isMastersFinalsTournament(t) ? 'masters1000' : 'greek500';
}

export const DEFAULT_RANKING_POINTS = {
  stageReached: {
    champion: 500,
    finalist: 350,
    semifinalist: 200,
    quarterfinalist: 100,
    repechageLoser: 50,
    groupStage: 25,
  },
  groupMatches: {
    win: 25,
    loss: 5,
    walkoverWin: 15,
    walkoverLoss: 0,
  },
} as const;

export const DEFAULT_RANKING_POINTS_MASTERS_1000 = {
  stageReached: {
    champion: 1000,
    finalist: 700,
    semifinalist: 400,
    quarterfinalist: 200,
    repechageLoser: 100,
    groupStage: 50,
  },
  groupMatches: {
    win: 50,
    loss: 10,
    walkoverWin: 30,
    walkoverLoss: 0,
  },
} as const;

export type RankingPointsGreek500 = typeof DEFAULT_RANKING_POINTS;

/** Puntos por partido de grupo según catálogo (preview en admin). */
export function groupMatchRankingPointsForCatalog(catalog: TournamentCatalogType): {
  win: number;
  loss: number;
  walkoverWin: number;
  walkoverLoss: number;
} {
  return catalog === 'masters1000'
    ? DEFAULT_RANKING_POINTS_MASTERS_1000.groupMatches
    : DEFAULT_RANKING_POINTS.groupMatches;
}

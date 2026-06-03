import { RAFA_LIGA2_TOURNAMENT_ID } from './rafaNadalLiga2Nd2026Data';
import { RAFA_LIGA3_TOURNAMENT_ID } from './rafaNadalLiga3Nd2026Data';
import { RAFA_LIGA4_TOURNAMENT_ID } from './rafaNadalLiga4Nd2026Data';
import { RAFA_LIGA5_TOURNAMENT_ID } from './rafaNadalLiga5Nd2026Data';
import { RAFA_LIGA6_TOURNAMENT_ID } from './rafaNadalLiga6Nd2026Data';
import { RAFAEL_LIGA1_TOURNAMENT_ID } from './rafaelNadalLiga1Nd2026Data';

/** Torneos Rafael Nadal con fixture confirmado. */
export const RAFA_NADAL_ACTIVE_TOURNAMENT_IDS = [
  RAFAEL_LIGA1_TOURNAMENT_ID,
  RAFA_LIGA2_TOURNAMENT_ID,
  RAFA_LIGA3_TOURNAMENT_ID,
  RAFA_LIGA4_TOURNAMENT_ID,
  RAFA_LIGA5_TOURNAMENT_ID,
  RAFA_LIGA6_TOURNAMENT_ID,
] as const;

export type RafaNadalActiveTournamentId = (typeof RAFA_NADAL_ACTIVE_TOURNAMENT_IDS)[number];

export const RAFA_NADAL_SERIES_LABEL = 'Rafael Nadal';

export const RAFA_NADAL_HERO_IMAGE = 'rafa-hero.webp';

export function isRafaNadalTournamentId(id: string | undefined | null): boolean {
  const tid = (id ?? '').trim();
  return (RAFA_NADAL_ACTIVE_TOURNAMENT_IDS as readonly string[]).includes(tid);
}

export function isRafaNadalTournament(t: { id: string; name?: string }): boolean {
  if (isRafaNadalTournamentId(t.id)) return true;
  const name = (t.name ?? '').toLowerCase();
  return name.includes('rafael nadal') || /\brafa nadal\b/i.test(name);
}

/** Serie Rafael Nadal en marcha (ligas 1, 2, 5 y 6). */
type TournamentLike = {
  id: string;
  name?: string;
  status: string;
  startDate: string;
  endDate?: string;
};

export function isRafaNadalSeriesInProgress(t: TournamentLike): boolean {
  return isRafaNadalTournament(t) && t.status === 'upcoming';
}

/** Fecha de inicio más temprana entre los torneos Rafael Nadal cargados. */
export function getRafaNadalSeriesStartDate(tournaments: TournamentLike[]): string | null {
  const dates = tournaments
    .filter(isRafaNadalTournament)
    .map((t) => t.startDate.trim())
    .filter(Boolean)
    .sort();
  return dates[0] ?? null;
}

/** Torneo representativo para el hero (el de inicio más temprano). */
export function getRafaNadalHeroTournament<T extends TournamentLike>(tournaments: T[]): T | null {
  const active = tournaments.filter(isRafaNadalSeriesInProgress);
  if (active.length === 0) return null;
  return [...active].sort((a, b) => a.startDate.localeCompare(b.startDate))[0]!;
}

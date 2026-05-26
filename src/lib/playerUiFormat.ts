/**
 * Formato de presentación para jugadores sin estadísticas de torneo cargadas.
 * No altera el modelo `Player` ni datos en mock/engine.
 */

export type PlayerLikeForSeasonUi = {
  stats?: { matchesPlayed?: number; wins?: number; losses?: number };
  points?: number;
};

/** Sin partidos registrados en el perfil → la UI trata el torneo como “aún no arrancó”. */
export function isSeasonStatsPending(player: PlayerLikeForSeasonUi): boolean {
  return (player.stats?.matchesPlayed ?? 0) === 0;
}

export type RankingRowLikeForUi = {
  matchesPlayed: number;
  points: number;
  /** Torneos con participación (p. ej. desde `statsJson` del API). */
  tournamentsPlayed?: number;
};

export function isRankingRowPending(row: RankingRowLikeForUi): boolean {
  if ((row.points ?? 0) > 0) return false;
  if ((row.tournamentsPlayed ?? 0) > 0) return false;
  return (row.matchesPlayed ?? 0) === 0;
}

export function uiPlayerPoints(player: PlayerLikeForSeasonUi): number {
  return isSeasonStatsPending(player) ? 0 : (player.points ?? 0);
}

/** Posición en listas (#n) o em dash si no aplica. */
export function uiFormatRankHash(pos: number | null | undefined, pending: boolean): string {
  if (pending) return '—';
  if (pos == null || pos <= 0) return '—';
  return `#${pos}`;
}

/** Posición numérica en tablas. */
export function uiFormatTableRank(pos: number, pending: boolean): string {
  if (pending) return '—';
  return String(pos);
}

export function uiFormatTournamentsPlayed(value: number | null | undefined, pending: boolean): string {
  if (pending) return '—';
  if (value == null) return '—';
  return String(value);
}

export function uiFormatPointsCell(points: number, pending: boolean): string {
  const n = pending ? 0 : (points ?? 0);
  return n.toLocaleString('es-AR');
}

/** Fila de grupo (no Liga 3): sin PJ aún → no mostrar posición competitiva en tabla. */
export function isGroupRowStatsPending(isLiga3: boolean, pj: number | undefined): boolean {
  return !isLiga3 && (pj ?? 0) === 0;
}

/** Sin partidos en la fase de grupos → PG / PP / sets como — (Liga 3 y resto). */
export function isGroupMatchStatsPending(pj: number | undefined): boolean {
  return (pj ?? 0) === 0;
}

/**
 * Detección automática de la fase más alta alcanzada por un jugador en un torneo,
 * a partir de partidos de eliminatoria (y opcionalmente grupos / repechaje).
 * No persiste nada: solo lectura de `tournamentMatches`.
 */

import type { Match, MatchStage } from '../../types/tournament';

export type PlayerReachedPhase =
  | 'champion'
  | 'finalist'
  | 'semifinalist'
  | 'quarterfinalist'
  /** Eliminado en repechaje sin llegar al cuadro principal (cuartos+). */
  | 'repechage'
  | 'group_stage'
  | 'none';

/** Mínimo necesario para inferir fases; compatible con `Match` de mockData. */
export interface TournamentPhaseMatch {
  playerA: string;
  playerB: string;
  winnerId?: string | null;
  round?: string;
  /** Si está definido y no es interzonal, cuenta como fase de grupos (sin KO en `round`). */
  group?: string | null;
  /** Si no hay `winnerId`, un partido de grupos jugado puede marcarse explícitamente. */
  completed?: boolean;
}

export function koRoundKind(round?: string): 'final' | 'semi' | 'quarter' | null {
  const r = (round ?? '').toLowerCase();
  if (r.includes('cuart')) return 'quarter';
  if (r.includes('semi')) return 'semi';
  if (r.includes('final')) return 'final';
  return null;
}

export function repechageRound(round?: string): boolean {
  const r = (round ?? '').toLowerCase();
  return r.includes('repech');
}

export function isKnockoutRound(round?: string): boolean {
  return koRoundKind(round) != null;
}

/** Cuartos / semis / final / repechaje (para unir partidos de cuadro en ranking). */
export function isRankingBracketRound(round?: string): boolean {
  return isKnockoutRound(round) || repechageRound(round);
}

function inMatch(playerId: string, m: TournamentPhaseMatch): boolean {
  return m.playerA === playerId || m.playerB === playerId;
}

function isGroupMatch(m: TournamentPhaseMatch): boolean {
  if (repechageRound(m.round) || koRoundKind(m.round)) return false;
  const g = m.group != null ? String(m.group).trim() : '';
  if (!g || /^interzonal$/i.test(g)) return false;
  const played = m.winnerId != null && String(m.winnerId).length > 0;
  const completed = m.completed === true;
  return played || completed;
}

function collectKoByKind(matches: ReadonlyArray<TournamentPhaseMatch>) {
  const ko = matches.filter((m) => isKnockoutRound(m.round));
  return {
    finals: ko.filter((m) => koRoundKind(m.round) === 'final'),
    semis: ko.filter((m) => koRoundKind(m.round) === 'semi'),
    quarters: ko.filter((m) => koRoundKind(m.round) === 'quarter'),
  };
}

function koRoundLabelFromStage(stage: MatchStage): string {
  switch (stage) {
    case 'final':
      return 'Final';
    case 'semifinal':
      return 'Semifinales';
    case 'quarterfinal':
      return 'Cuartos de final';
    case 'repechage':
      return 'Repechaje';
    default:
      return '';
  }
}

/**
 * Convierte un `Match` del modelo automático a la fila usada por la detección de fases.
 */
export function domainMatchToTournamentPhaseMatch(m: Match): TournamentPhaseMatch {
  if (m.stage === 'group') {
    const g = m.groupName?.trim() ?? '';
    return {
      playerA: m.player1Id,
      playerB: m.player2Id,
      winnerId: m.winnerId ?? null,
      group: g || null,
      completed: m.completed,
      round: undefined,
    };
  }
  if (m.stage === 'interzonal') {
    return {
      playerA: m.player1Id,
      playerB: m.player2Id,
      winnerId: m.winnerId ?? null,
      group: 'interzonal',
      completed: m.completed,
      round: undefined,
    };
  }
  return {
    playerA: m.player1Id,
    playerB: m.player2Id,
    winnerId: m.winnerId ?? null,
    round: koRoundLabelFromStage(m.stage),
    group: m.groupName ?? undefined,
  };
}

/** Solo eliminatoria principal + repechaje modelo `Match` (sin fase de grupos). */
export function domainEliminationMatchesToPhaseMatches(matches: ReadonlyArray<Match>): TournamentPhaseMatch[] {
  return matches
    .filter(
      (m) =>
        m.stage === 'quarterfinal' ||
        m.stage === 'semifinal' ||
        m.stage === 'final' ||
        m.stage === 'repechage',
    )
    .map(domainMatchToTournamentPhaseMatch);
}

export function domainMatchesToTournamentPhaseMatches(matches: ReadonlyArray<Match>): TournamentPhaseMatch[] {
  return matches.map(domainMatchToTournamentPhaseMatch);
}

function isDomainMatchList(matches: ReadonlyArray<TournamentPhaseMatch | Match>): matches is ReadonlyArray<Match> {
  const m = matches[0] as Match | TournamentPhaseMatch | undefined;
  if (m == null) return false;
  return typeof m === 'object' && 'player1Id' in m && 'stage' in m;
}

function resolvePlayerReachedPhase(
  playerId: string,
  tournamentMatches: ReadonlyArray<TournamentPhaseMatch>,
): PlayerReachedPhase {
  const { finals, semis, quarters } = collectKoByKind(tournamentMatches);
  const reps = tournamentMatches.filter((m) => repechageRound(m.round));

  const final = finals[0];
  if (final && inMatch(playerId, final)) {
    if (final.winnerId) {
      return final.winnerId === playerId ? 'champion' : 'finalist';
    }
    return 'finalist';
  }

  for (const m of semis) {
    if (!m.winnerId || !inMatch(playerId, m)) continue;
    if (m.winnerId !== playerId) return 'semifinalist';
  }

  for (const m of quarters) {
    if (!m.winnerId || !inMatch(playerId, m)) continue;
    if (m.winnerId !== playerId) return 'quarterfinalist';
  }

  const inMainKo = [...quarters, ...semis, ...finals].some((m) => inMatch(playerId, m));
  if (!inMainKo && reps.some((m) => inMatch(playerId, m))) {
    return 'repechage';
  }

  if (tournamentMatches.some((m) => isGroupMatch(m) && inMatch(playerId, m))) {
    return 'group_stage';
  }

  return 'none';
}

/**
 * Determina la fase más alta alcanzada por el jugador en el conjunto de partidos del torneo.
 *
 * - Sobrecarga con `Match[]` (`eliminationMatches`): solo cuartos/semis/final/repechaje del modelo dominio.
 * - Sobrecarga con `TournamentPhaseMatch[]`: filas legacy (`round` texto, `group`, etc.).
 *
 * - Usa `winnerId` en KO para saber eliminación; si la final no tiene ganador aún, ambos finalistas cuentan como `finalist`.
 * - "Cuartos de final" se clasifica como cuartos (no como final).
 * - Repechaje: participación en rondas cuyo `round` contiene "repech"; si solo hay repechaje (sin cuadro principal), queda `repechage`.
 * - Grupos: partidos con `group` no vacío (excl. interzonal) y resultado (`winnerId` o `completed`).
 */
export function getPlayerReachedPhase(
  playerId: string,
  tournamentMatches: ReadonlyArray<TournamentPhaseMatch>,
): PlayerReachedPhase;
export function getPlayerReachedPhase(playerId: string, eliminationMatches: ReadonlyArray<Match>): PlayerReachedPhase;
export function getPlayerReachedPhase(
  playerId: string,
  matches: ReadonlyArray<TournamentPhaseMatch | Match>,
): PlayerReachedPhase {
  if (matches.length === 0) return 'none';
  if (isDomainMatchList(matches)) {
    return resolvePlayerReachedPhase(playerId, domainEliminationMatchesToPhaseMatches(matches));
  }
  return resolvePlayerReachedPhase(playerId, matches as ReadonlyArray<TournamentPhaseMatch>);
}

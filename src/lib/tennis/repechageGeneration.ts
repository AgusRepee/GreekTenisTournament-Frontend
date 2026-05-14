/**
 * Partido de repechaje entre peores terceros (reglas tipo Novak) y cierre con marcador → ganador para el KO.
 */

import type { Match } from '../../types/tournament';
import type { MatchInput } from '../../types/tennisResults';
import { parseMatch } from './matchStatsEngine';
import {
  mergeRules,
  NOVAK_GROUP_TO_KO_RULES,
  pairWorstThirdsForRepechage,
  splitThirdPlacesForPlayoff,
  type PlayoffQualificationRules,
  type ThirdPlaceRow,
} from './playoffQualification';

/** Partido de repechaje en el modelo `Match` del motor automático. */
export type RepechageMatch = Match & { stage: 'repechage' };

export interface GenerateRepechageOptions {
  tournamentId: string;
  rules?: Partial<PlayoffQualificationRules>;
  /** Por defecto `repechage-{tournamentId}-1`. */
  matchId?: string;
}

/**
 * Genera el partido de repechaje entre los peores terceros del ranking cruzado (según reglas).
 * Devuelve `null` si no hay bloque de repechaje o no se puede emparejar.
 */
export function generateRepechage(
  thirdPlacesRanking: ThirdPlaceRow[],
  options: GenerateRepechageOptions,
): RepechageMatch | null {
  const rules = mergeRules({ ...NOVAK_GROUP_TO_KO_RULES, ...options.rules });
  const { repechageBlock } = splitThirdPlacesForPlayoff(thirdPlacesRanking, rules);
  const pairs = pairWorstThirdsForRepechage(repechageBlock);
  if (pairs.length === 0) return null;
  const first = pairs[0]!;
  return {
    id: options.matchId ?? `repechage-${options.tournamentId}-1`,
    tournamentId: options.tournamentId,
    stage: 'repechage',
    player1Id: first.playerA,
    player2Id: first.playerB,
    completed: false,
    outcome: 'pending',
  };
}

/**
 * Todos los partidos de repechaje cuando el bloque tiene más de dos jugadores (emparejamientos cruzados).
 */
export function generateRepechageMatches(
  thirdPlacesRanking: ThirdPlaceRow[],
  options: GenerateRepechageOptions,
): RepechageMatch[] {
  const rules = mergeRules({ ...NOVAK_GROUP_TO_KO_RULES, ...options.rules });
  const { repechageBlock } = splitThirdPlacesForPlayoff(thirdPlacesRanking, rules);
  const pairs = pairWorstThirdsForRepechage(repechageBlock);
  return pairs.map((p, i) => ({
    id: `repechage-${options.tournamentId}-${i + 1}`,
    tournamentId: options.tournamentId,
    stage: 'repechage' as const,
    player1Id: p.playerA,
    player2Id: p.playerB,
    completed: false,
    outcome: 'pending' as const,
  }));
}

export interface RepechageResultInput {
  /** Marcador parseable por el motor (ej. "6-4 6-3") o para WO: "A" | "B" según `parseMatch`. */
  result: string;
  outcome: 'played' | 'walkover' | 'retired';
}

/**
 * Aplica resultado al partido de repechaje y fija `winnerId` (mismo criterio que partidos de grupo).
 */
export function applyRepechageResult(match: RepechageMatch, input: RepechageResultInput): RepechageMatch {
  const mi: MatchInput = {
    tournamentId: match.tournamentId,
    playerA: match.player1Id,
    playerB: match.player2Id,
    score: input.result,
    status: input.outcome === 'walkover' ? 'walkover' : input.outcome === 'retired' ? 'retired' : 'played',
  };
  const parsed = parseMatch(mi);
  const winnerId = parsed.winner;
  if (!winnerId) {
    throw new Error('applyRepechageResult: no se pudo determinar ganador');
  }
  return {
    ...match,
    result: input.result,
    outcome: input.outcome === 'walkover' ? 'walkover' : input.outcome === 'retired' ? 'retired' : 'played',
    completed: true,
    winnerId,
  };
}

/** Ganador del repechaje si el partido está cerrado; si no, `null`. */
export function getRepechageWinnerId(match: Match | null | undefined): string | null {
  if (!match || match.stage !== 'repechage' || !match.completed) return null;
  return match.winnerId ?? null;
}

export interface QuarterfinalPoolWithRepechage {
  /** IDs que ya pueden usarse para sembrar cuartos (clasificados directos + ganador repechaje si existe). */
  readyPlayerIds: string[];
  repechageWinnerId: string | null;
  /** Falta disputar o cargar el resultado del repechaje. */
  awaitingRepechageWinner: boolean;
}

/**
 * Une clasificados directos al KO con el ganador del repechaje (cuando ya hay resultado)
 * para armar el cupo de cuartos (p. ej. 7 + 1 = 8).
 */
export function buildQuarterfinalPlayerPool(params: {
  directQualifiedPlayerIds: string[];
  repechageMatch: Match | null;
}): QuarterfinalPoolWithRepechage {
  const awaiting =
    params.repechageMatch != null && !params.repechageMatch.completed && params.repechageMatch.stage === 'repechage';
  const repechageWinnerId = getRepechageWinnerId(params.repechageMatch ?? undefined);
  const readyPlayerIds = [...params.directQualifiedPlayerIds];
  if (repechageWinnerId) readyPlayerIds.push(repechageWinnerId);
  return {
    readyPlayerIds,
    repechageWinnerId,
    awaitingRepechageWinner: awaiting,
  };
}

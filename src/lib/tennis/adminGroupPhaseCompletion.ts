/**
 * Comprueba si la fase de grupos (fixture) está lista para armar eliminación.
 * Incluye borradores de marcador en sessionStorage (Resultados).
 */

import type { Match, Player } from '@/lib/mockData';
import { getBracketRounds, getPlayerById, getTournamentById } from '@/lib/mockData';
import { buildFixtureCatalogEntriesForTournament } from '@/lib/tennis/buildFixtureCatalog';
import { sortFixtureEntriesByGroupThenRound } from '@/lib/tennis/fixtureResultsOrdering';
import {
  collectPendingWorkload,
  isKnockoutMatchPlayableNames,
  isPendingResultLoad,
} from '@/lib/tennis/adminPendingWorkload';
import type { MatchScheduleEntry } from '@/data/services/contracts/matchSchedulePort';
import { validateAdminMatchResult, type EditableAdminRow } from '@/lib/tennis/adminMatchResultPipeline';
import { listSessionDraftDirtyDedupeKeys } from '@/lib/tennis/adminResultDraftsSession';
import { matchInputDedupeKey } from '@/lib/tennis/matchDedupe';
import type { MatchInput } from '@/types/tennisResults';
import { effectiveTournamentCatalogType } from '@/lib/tennis/rankingPointsGreek500';

/** Hay al menos un cruce de cuartos con dos jugadores reales (cuadro operativo). */
export function hasPlayableQuarterBracket(tournamentId: string): boolean {
  const { quarterfinals, semifinals } = getBracketRounds(tournamentId);
  const playable = (m: Match) => {
    const na = getPlayerById(m.playerA)?.name ?? m.playerA;
    const nb = getPlayerById(m.playerB)?.name ?? m.playerB;
    return isKnockoutMatchPlayableNames(na, nb);
  };
  if (quarterfinals.some(playable)) return true;
  const tour = getTournamentById(tournamentId);
  if (tour && effectiveTournamentCatalogType(tour) === 'masters1000') {
    return semifinals.some(playable);
  }
  return false;
}

/** Partidos de fixture aún sin resultado útil (no cuenta KO). */
export function collectGroupFixturePendingWorkload(
  tournamentId: string,
  resultsList: MatchInput[],
  players: Player[],
) {
  return collectPendingWorkload(tournamentId, resultsList, players).filter((x) => x.kind === 'fixture');
}

export type GroupPhaseBlockingSummary = {
  fixturePendingCount: number;
  draftDirtyCount: number;
  uniqueBlockingCount: number;
};

export function buildResultsDedupeMap(resultsList: MatchInput[]): Map<string, MatchInput> {
  const m = new Map<string, MatchInput>();
  for (const r of resultsList) {
    m.set(matchInputDedupeKey(r), r);
  }
  return m;
}

export function summarizeGroupPhaseBlockingWithMap(
  tournamentId: string,
  resultsList: MatchInput[],
  players: Player[],
  resultsByDedupeKey: Map<string, MatchInput>,
): GroupPhaseBlockingSummary {
  const fixturePending = collectGroupFixturePendingWorkload(tournamentId, resultsList, players);
  const draftKeys = listSessionDraftDirtyDedupeKeys(tournamentId, resultsByDedupeKey);
  const set = new Set<string>();
  for (const p of fixturePending) set.add(p.dedupeKey);
  for (const k of draftKeys) set.add(k);
  return {
    fixturePendingCount: fixturePending.length,
    draftDirtyCount: draftKeys.length,
    uniqueBlockingCount: set.size,
  };
}

export function isGroupPhaseCompleteForEliminationSetup(
  tournamentId: string,
  resultsList: MatchInput[],
  players: Player[],
  resultsByDedupeKey: Map<string, MatchInput>,
): boolean {
  return summarizeGroupPhaseBlockingWithMap(tournamentId, resultsList, players, resultsByDedupeKey).uniqueBlockingCount === 0;
}

/** Resultados persistidos de fixture de grupos coherentes con el motor (excluye KO). */
export function listInvalidGroupFixtureStoredResults(
  tournamentId: string,
  resultsByDedupeKey: Map<string, MatchInput>,
  players: Player[],
  scheduleByDedupeKey?: Map<string, MatchScheduleEntry>,
): string[] {
  const tour = getTournamentById(tournamentId);
  const entries = sortFixtureEntriesByGroupThenRound(buildFixtureCatalogEntriesForTournament(tour, players));
  const out: string[] = [];
  for (const e of entries) {
    const row: EditableAdminRow = { kind: 'fixture', entry: e };
    const stored = resultsByDedupeKey.get(e.dedupeKey);
    if (!stored || isPendingResultLoad(stored)) {
      out.push(`${e.playerA} vs ${e.playerB}: falta resultado cargado.`);
      continue;
    }
    const errs = validateAdminMatchResult(row, stored, players, {
      enforcePlayedSchedule: Boolean(scheduleByDedupeKey),
      scheduleEntry: scheduleByDedupeKey?.get(e.dedupeKey),
    });
    if (errs.length > 0) out.push(`${e.playerA} vs ${e.playerB}: ${errs.join(' ')}`);
  }
  return out;
}

export function hasGroupFixtureStoredValidationErrors(
  tournamentId: string,
  resultsByDedupeKey: Map<string, MatchInput>,
  players: Player[],
  scheduleByDedupeKey?: Map<string, MatchScheduleEntry>,
): boolean {
  return listInvalidGroupFixtureStoredResults(tournamentId, resultsByDedupeKey, players, scheduleByDedupeKey).length > 0;
}

export type GroupFixtureOutcomeSummary = {
  played: number;
  walkover: number;
  suspended: number;
  groupCount: number;
};

/** Cuenta partidos de fixture por estado (solo claves del catálogo de grupos del torneo). */
export function summarizeGroupFixtureOutcomes(
  tournamentId: string,
  resultsList: MatchInput[],
): GroupFixtureOutcomeSummary {
  const tour = getTournamentById(tournamentId);
  const entries = sortFixtureEntriesByGroupThenRound(buildFixtureCatalogEntriesForTournament(tour, []));
  const keys = new Set(entries.map((e) => e.dedupeKey));
  const byGroup = new Set(entries.map((e) => e.group));
  let played = 0;
  let walkover = 0;
  let suspended = 0;
  for (const r of resultsList) {
    if (r.tournamentId !== tournamentId) continue;
    const k = matchInputDedupeKey(r);
    if (!keys.has(k)) continue;
    if (r.status === 'suspended') suspended += 1;
    else if (r.status === 'walkover' || r.status === 'retired') walkover += 1;
    else if (r.status === 'played' && r.score?.trim()) played += 1;
  }
  return { played, walkover, suspended, groupCount: byGroup.size };
}

/** Torneo con plantilla de grupos y cuadro KO aún no operativo (para alerta Resumen). */
export function shouldShowResumenEliminacionArmadoAlert(
  tournamentId: string,
  isLiga3: boolean,
  templateHasGrupos: boolean,
  resultsList: MatchInput[],
  players: Player[],
  resultsByDedupeKey: Map<string, MatchInput>,
  /** Requiere confirmación explícita de resultados de grupos en admin. */
  groupStageOfficiallyConfirmed: boolean,
): boolean {
  if (isLiga3 || !templateHasGrupos) return false;
  if (!groupStageOfficiallyConfirmed) return false;
  if (!isGroupPhaseCompleteForEliminationSetup(tournamentId, resultsList, players, resultsByDedupeKey)) return false;
  if (hasPlayableQuarterBracket(tournamentId)) return false;
  return true;
}

/** Grupos listos para cerrar oficialmente (sin pasar a eliminación todavía). */
export function shouldShowResumenConfirmarGruposAlert(
  tournamentId: string,
  templateHasGrupos: boolean,
  resultsList: MatchInput[],
  players: Player[],
  resultsByDedupeKey: Map<string, MatchInput>,
  groupStageOfficiallyConfirmed: boolean,
): boolean {
  if (!templateHasGrupos) return false;
  if (groupStageOfficiallyConfirmed) return false;
  if (!isGroupPhaseCompleteForEliminationSetup(tournamentId, resultsList, players, resultsByDedupeKey)) return false;
  if (hasPlayableQuarterBracket(tournamentId)) return false;
  if (hasGroupFixtureStoredValidationErrors(tournamentId, resultsByDedupeKey, players, scheduleByDedupeKey)) return false;
  return true;
}

/**
 * Persistencia admin de resultados: validación (motor central) + MatchInput + catálogo KO.
 */

import type { MatchInput } from '@/types/tennisResults';
import type { Player } from '@/lib/mockData';
import type { MatchScheduleEntry } from '@/data/services/contracts/matchSchedulePort';
import { cleanPlayerName } from '@/lib/tennis/matchDedupe';
import type { FixtureCatalogEntry } from '@/lib/tennis/buildFixtureCatalog';
import type { KnockoutAdminEntry } from '@/lib/tennis/adminKnockoutCatalog';
import { parseMatch, parseMatchScore } from '@/lib/tennis/matchStatsEngine';
import { upsertResult } from '@/lib/tennis/resultsStore';
import { saveMatchResult } from '@/services/dataService';
import { recalculateTournament } from '@/lib/tennis/recalculateTournament';
import {
  validateMatchResult,
  resolveMatchWinner,
  type EngineMatchRef,
  type EngineMatchResultInput,
} from '@/lib/tournamentEngine';
import { isKnockoutMatchPlayableNames, KO_MATCH_PENDING_PLAYERS_MESSAGE } from '@/lib/tennis/adminPendingWorkload';
import { propagateKnockoutWinnerSlots } from '@/lib/tennis/knockoutBracketAdvance';
import {
  matchScheduleHasDateTimeForPlayedResult,
  normalPlayedMatchRequiresSchedule,
  SCHEDULE_REQUIRED_FOR_PLAYED_MESSAGE,
} from '@/lib/tennis/matchScheduleForResultGuard';

export type EditableAdminRow =
  | { kind: 'fixture'; entry: FixtureCatalogEntry }
  | { kind: 'ko'; entry: KnockoutAdminEntry };

export function rowToEngineMatchRef(row: EditableAdminRow, players: Player[]): EngineMatchRef {
  const e = row.entry;
  const resolveId = (name: string) => {
    const c = cleanPlayerName(name).toLowerCase();
    const hit = players.find((x) => cleanPlayerName(x.name).toLowerCase() === c);
    return hit?.id ?? name;
  };
  return {
    id: row.kind === 'ko' ? e.matchId : e.dedupeKey,
    tournamentId: e.tournamentId,
    group: e.group,
    player1Id: resolveId(e.playerA),
    player2Id: resolveId(e.playerB),
    player1Name: e.playerA,
    player2Name: e.playerB,
  };
}

export function engineResultInputFromMatchInput(m: MatchInput, players: Player[]): EngineMatchResultInput {
  let winnerId: string | null | undefined;
  try {
    const parsed = parseMatch(m);
    if (parsed.winner) {
      const c = cleanPlayerName(parsed.winner).toLowerCase();
      const hit = players.find((x) => cleanPlayerName(x.name).toLowerCase() === c);
      winnerId = hit?.id ?? undefined;
    }
  } catch {
    /* sin ganador parseable */
  }
  return { status: m.status, score: m.score, winnerId };
}

export type ValidateAdminMatchResultOpts = {
  /** Si true, exige fecha+hora en agenda para resultados jugados normales (no W.O.). */
  enforcePlayedSchedule?: boolean;
  scheduleEntry?: MatchScheduleEntry | undefined;
};

export function validateAdminMatchResult(
  row: EditableAdminRow,
  next: MatchInput,
  players: Player[],
  opts?: ValidateAdminMatchResultOpts,
): string[] {
  const out: string[] = [];
  if (row.kind === 'ko') {
    const { playerA, playerB } = row.entry;
    const skipPlayableNames = next.status === 'suspended' || next.status === 'walkover';
    if (!skipPlayableNames && !isKnockoutMatchPlayableNames(playerA, playerB)) {
      out.push(KO_MATCH_PENDING_PLAYERS_MESSAGE);
      return out;
    }
  }
  if ((next.status === 'played' || next.status === 'retired') && next.score?.trim()) {
    try {
      parseMatchScore(next.score, { requireThirdSetSuperTiebreak: next.status === 'played' });
    } catch (e) {
      out.push(e instanceof Error ? e.message : 'Marcador inválido.');
    }
  }
  if (
    opts?.enforcePlayedSchedule &&
    normalPlayedMatchRequiresSchedule(next) &&
    !matchScheduleHasDateTimeForPlayedResult(opts.scheduleEntry)
  ) {
    out.push(SCHEDULE_REQUIRED_FOR_PLAYED_MESSAGE);
  }
  const ref = rowToEngineMatchRef(row, players);
  const er = engineResultInputFromMatchInput(next, players);
  const v = validateMatchResult(ref, er);
  if (!v.valid) out.push(...v.errors);
  return out;
}

export interface CommitAdminMatchOptions {
  leagueNum: number;
  /** Si false, no llama a `recalculateTournament` (guardado masivo recalcula una vez al final). */
  runRecalculate?: boolean;
  /** Agenda del partido (dedupeKey); obligatoria para validar resultado jugado normal antes de persistir. */
  scheduleEntry?: MatchScheduleEntry | undefined;
}

/**
 * Valida, persiste `MatchInput`, sincroniza partido KO en `partidos` si existe, y recalcula.
 */
export function commitAdminMatchResult(
  row: EditableAdminRow,
  next: MatchInput,
  players: Player[],
  opts: CommitAdminMatchOptions,
): { ok: true } | { ok: false; errors: string[] } {
  const errors = validateAdminMatchResult(row, next, players, {
    enforcePlayedSchedule: true,
    scheduleEntry: opts.scheduleEntry,
  });
  if (errors.length > 0) return { ok: false, errors };

  upsertResult(next);

  if (row.kind === 'ko') {
    try {
      const ref = rowToEngineMatchRef(row, players);
      const er = engineResultInputFromMatchInput(next, players);
      const rw = resolveMatchWinner(ref, er);
      const trimmed = (next.score ?? '').trim();
      const scoreForCatalog =
        next.status === 'walkover' || next.status === 'retired'
          ? next.status === 'walkover' &&
            trimmed &&
            !/^[AB]$/i.test(trimmed) &&
            trimmed.toUpperCase() !== 'W.O.' &&
            trimmed.toUpperCase() !== 'WO'
            ? trimmed
            : 'W.O.'
          : next.status === 'suspended'
            ? ''
            : trimmed;
      saveMatchResult(row.entry.matchId, {
        score: scoreForCatalog,
        winnerId: next.status === 'suspended' ? null : rw.winnerId,
        scheduledDate: next.date,
      });
      propagateKnockoutWinnerSlots(row.entry.tournamentId);
    } catch {
      /* Partido solo en resultados agregados; no hay fila en `partidos` persistidos. */
    }
  }

  if (opts.runRecalculate !== false) {
    const rec = recalculateTournament({ tournamentId: next.tournamentId, league: opts.leagueNum });
    if (!rec.ok) {
      console.warn('[recalculateTournament] Tras guardar resultado:', rec.error);
    }
  }

  return { ok: true };
}

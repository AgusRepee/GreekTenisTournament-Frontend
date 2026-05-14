/**
 * Verificaciones puras del “cascade” tras guardar un resultado de grupo.
 * No toca localStorage ni React: sirve para tests y scripts de QA.
 */

import type { MatchInput } from '@/types/tennisResults';
import type { LeagueNum, Match, Player, Tournament } from '@/lib/mockData';
import { recalculateTournamentFromData } from '@/lib/tournamentEngine';

export type ResultFlowCheck = { id: string; ok: boolean; detail?: string };

export type ResultsFlowVerificationInput = {
  players: Player[];
  tournaments: Tournament[];
  resultMatches: MatchInput[];
  knockoutMatches: Match[];
  tournamentId: string;
  /** Misma cadena que `MatchInput.group` (ej. `Grupo A`). */
  groupKey: string;
  expectedWinnerId: string;
  expectedLoserId: string;
};

function push(
  checks: ResultFlowCheck[],
  id: string,
  ok: boolean,
  detail?: string,
): void {
  checks.push(ok ? { id, ok: true } : { id, ok: false, detail });
}

/**
 * Ejecuta `recalculateTournamentFromData` y comprueba grupo, stats de motor y ranking por liga.
 */
export function runResultsFlowVerification(input: ResultsFlowVerificationInput): ResultFlowCheck[] {
  const checks: ResultFlowCheck[] = [];
  const {
    players,
    tournaments,
    resultMatches,
    knockoutMatches,
    tournamentId,
    groupKey,
    expectedWinnerId,
    expectedLoserId,
  } = input;

  const tournament = tournaments.find((t) => t.id === tournamentId);
  const league: LeagueNum = tournament?.league ?? 3;

  const out = recalculateTournamentFromData({
    tournamentId,
    players,
    tournaments,
    resultMatches,
    knockoutMatches,
  });

  const groupRows = out.groups[groupKey];
  if (!groupRows?.length) {
    push(checks, 'group.rows', false, `Sin filas para grupo "${groupKey}"`);
    return checks;
  }
  push(checks, 'group.rows', true);

  const wRow = groupRows.find((r) => r.playerId === expectedWinnerId);
  const lRow = groupRows.find((r) => r.playerId === expectedLoserId);
  push(checks, 'group.winnerRow', !!wRow, wRow ? undefined : 'Falta fila del ganador');
  push(checks, 'group.loserRow', !!lRow, lRow ? undefined : 'Falta fila del perdedor');

  if (wRow) {
    push(checks, 'group.winner.played', wRow.played >= 1);
    push(checks, 'group.winner.won', wRow.won >= 1);
    push(checks, 'group.winner.position', wRow.position >= 1);
  }
  if (lRow) {
    push(checks, 'group.loser.played', lRow.played >= 1);
    push(checks, 'group.loser.lost', lRow.lost >= 1);
    push(checks, 'group.loser.vsWinnerWins', wRow ? wRow.won > lRow.won : true, `won L=${lRow.won} W=${wRow?.won}`);
  }
  if (wRow && lRow) {
    push(checks, 'group.order', wRow.position <= lRow.position, `#ganador ${wRow.position} vs #perdedor ${lRow.position}`);
  }

  const wStats = out.playerStats[expectedWinnerId];
  const lStats = out.playerStats[expectedLoserId];
  push(checks, 'stats.winner.exists', !!wStats);
  push(checks, 'stats.loser.exists', !!lStats);
  if (wStats) {
    push(checks, 'stats.winner.matchesPlayed', wStats.matchesPlayed >= 1);
    push(checks, 'stats.winner.wins', wStats.wins >= 1);
    push(checks, 'stats.winner.lastMatches', wStats.lastMatches.length >= 1);
    const lastW = wStats.lastMatches[0];
    if (lastW) {
      push(checks, 'stats.winner.lastResult', lastW.result === 'W', `last result=${lastW.result}`);
    }
  }
  if (lStats) {
    push(checks, 'stats.loser.matchesPlayed', lStats.matchesPlayed >= 1);
    push(checks, 'stats.loser.losses', lStats.losses >= 1);
    push(checks, 'stats.loser.lastMatches', lStats.lastMatches.length >= 1);
    const lastL = lStats.lastMatches[0];
    if (lastL) {
      push(checks, 'stats.loser.lastResult', lastL.result === 'L', `last result=${lastL.result}`);
    }
  }

  const wRank = out.ranking.find((r) => r.playerId === expectedWinnerId);
  const lRank = out.ranking.find((r) => r.playerId === expectedLoserId);
  push(checks, 'ranking.winnerRow', !!wRank);
  push(checks, 'ranking.loserRow', !!lRank);
  if (wRank && lRank) {
    push(
      checks,
      'ranking.winsOrdering',
      wRank.wins >= lRank.wins,
      `wins ${wRank.wins} vs ${lRank.wins}`,
    );
    push(
      checks,
      'ranking.matchesPlayed',
      wRank.matchesPlayedResults >= 1 && lRank.matchesPlayedResults >= 1,
    );
  }

  const tidMatches = resultMatches.filter((m) => m.tournamentId === tournamentId && m.status === 'played');
  push(checks, 'context.league', league >= 1 && league <= 6);
  push(checks, 'context.playedCount', tidMatches.length >= 1, `played matches=${tidMatches.length}`);

  return checks;
}

/** Devuelve solo los checks fallidos (útil para logs). */
export function failedFlowChecks(checks: ResultFlowCheck[]): ResultFlowCheck[] {
  return checks.filter((c) => !c.ok);
}

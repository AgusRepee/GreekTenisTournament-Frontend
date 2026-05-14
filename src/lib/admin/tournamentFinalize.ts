import type { Tournament } from '@/lib/mockData';
import { getBracketRounds, getTournamentById } from '@/lib/mockData';
import { persistTournamentToStorage } from '@/lib/dataService';
import { refreshClubDataFromStorage } from '@/lib/clubDataStore';
import { recalculateTournament } from '@/lib/tennis/recalculateTournament';
import { appendAdminAuditEntry, auditActionLabel } from '@/lib/admin/tournamentAuditLog';
import type { LigaNumKey } from '@/lib/tennis/loadLigasFromDocs';

export function getTournamentFinalMatch(tournamentId: string) {
  const { final } = getBracketRounds(tournamentId);
  return final[0];
}

export type FinalizePrecheck =
  | { ok: true; championId: string; finalistId: string; score: string }
  | { ok: false; reason: string };

/**
 * Solo si la final existe en catálogo, tiene dos jugadores reales y `winnerId` definido.
 */
export function evaluateTournamentFinalize(tournamentId: string): FinalizePrecheck {
  const t = getTournamentById(tournamentId);
  if (!t) return { ok: false, reason: 'Torneo no encontrado.' };
  if (t.status === 'finished') return { ok: false, reason: 'Este torneo ya está finalizado.' };
  const f = getTournamentFinalMatch(tournamentId);
  if (!f) return { ok: false, reason: 'No hay partido de final en el cuadro.' };
  const w = f.winnerId?.trim();
  if (!w) return { ok: false, reason: 'Cargá el resultado de la final (debe registrar ganador).' };
  const a = (f.playerA ?? '').trim();
  const b = (f.playerB ?? '').trim();
  const tbdLike = /tbd|TBD|Tbd/i.test(`${a}|${b}`);
  if (!a || !b || tbdLike) {
    return { ok: false, reason: 'La final debe tener ambos jugadores definidos antes de cerrar.' };
  }
  const finalistId = a === w ? b : b === w ? a : '';
  if (!finalistId) return { ok: false, reason: 'No se pudo determinar el finalista respecto del ganador.' };
  const score = (f.score ?? '').trim() || '(sin marcador registrado en catálogo)';
  return { ok: true, championId: w, finalistId, score };
}

/** Persiste `finished`, campeón/finalista opcional para compatibilidad UI, historial + recálculo. */
export function finalizeTournamentInStorage(opts: {
  tournament: Tournament;
  leagueNum: LigaNumKey;
  championId: string;
  finalistId: string;
  scoreSummary: string;
}): void {
  const next: Tournament = {
    ...opts.tournament,
    status: 'finished',
    winnerId: opts.championId,
    finalistId: opts.finalistId,
  };
  persistTournamentToStorage(next);
  refreshClubDataFromStorage();
  const rec = recalculateTournament({ tournamentId: opts.tournament.id, league: opts.leagueNum });
  const tn = opts.tournament.name?.trim() || opts.tournament.id;
  appendAdminAuditEntry({
    action: 'torneo_finalizado',
    actionLabel: auditActionLabel('torneo_finalizado'),
    tournamentId: opts.tournament.id,
    tournamentName: tn,
    league: opts.leagueNum,
    detail: `Torneo cerrado oficialmente. Campeón playerId=${opts.championId}, finalista=${opts.finalistId}. Marcador referencia cuadro: ${opts.scoreSummary}. Recálculo: ${rec.ok ? 'ok' : 'falló'}.`,
    playersInvolved: `${opts.championId}; ${opts.finalistId}`,
  });
}

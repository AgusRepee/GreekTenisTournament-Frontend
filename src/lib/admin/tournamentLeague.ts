import type { LeagueNum, Tournament } from '@/lib/mockData';
import { categoryToLeague, getTournamentById } from '@/lib/mockData';

/**
 * Resuelve la liga (1–6) a partir del id de torneo y, si hace falta, del registro en club data.
 */
export function getLeagueNumForTournamentId(tournamentId: string, tournament?: Tournament | null): LeagueNum | null {
  if (!tournamentId?.trim()) return null;
  if (tournamentId === 't-novak') return 1;
  const m = /^t-novak-l(\d+)$/.exec(tournamentId);
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 6) return n as LeagueNum;
  }
  const t = tournament ?? getTournamentById(tournamentId);
  if (!t) return null;
  return t.league ?? categoryToLeague(t.category);
}

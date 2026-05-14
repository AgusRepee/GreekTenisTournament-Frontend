import type { Match } from '@/lib/mockData';
import { getAdminTournamentMatches } from '@/lib/api/apiClient';
import { mergePersistedMatches } from '@/lib/tennis/bracketPersist';

export function mapPrismaMatchRowToClubMatch(row: Record<string, unknown>): Match {
  const p1 = row.player1 as { id?: string } | undefined;
  const p2 = row.player2 as { id?: string } | undefined;
  const scheduled = row.scheduledDate;
  let scheduledDate = '';
  if (scheduled != null) {
    if (typeof scheduled === 'string') scheduledDate = scheduled.slice(0, 10);
    else if (typeof (scheduled as Date).toISOString === 'function') {
      try {
        scheduledDate = (scheduled as Date).toISOString().slice(0, 10);
      } catch {
        scheduledDate = '';
      }
    }
  }
  return {
    id: String(row.id),
    tournamentId: String(row.tournamentId),
    playerA: (p1?.id ?? row.player1Id) as string,
    playerB: (p2?.id ?? row.player2Id) as string,
    score: String(row.score ?? ''),
    winnerId: row.winnerId != null ? String(row.winnerId) : null,
    round: typeof row.roundLabel === 'string' ? row.roundLabel : undefined,
    scheduledDate,
  };
}

/** Reemplaza en `partidos` los partidos del torneo con la vista materializada del admin (incluye KO MySQL). */
export async function syncTournamentMatchesFromAdminApi(tournamentId: string): Promise<void> {
  const rows = await getAdminTournamentMatches(tournamentId);
  if (!Array.isArray(rows)) return;
  const mapped = (rows as Record<string, unknown>[]).map(mapPrismaMatchRowToClubMatch);
  mergePersistedMatches((all) => {
    const others = all.filter((m) => m.tournamentId !== tournamentId);
    return [...others, ...mapped];
  });
}

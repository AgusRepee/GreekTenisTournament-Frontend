/**
 * Normaliza `GET /api/public/players/:id` para la UI de perfil.
 */

export function mapPublicPlayerProfileResponse(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;

  const profileRankings =
    o.profileRankings && typeof o.profileRankings === 'object' && !Array.isArray(o.profileRankings)
      ? (o.profileRankings as Record<string, unknown>)
      : null;

  let primaryRanking = o.primaryRanking;
  if (primaryRanking && typeof primaryRanking === 'object' && !Array.isArray(primaryRanking)) {
    const pr = primaryRanking as Record<string, unknown>;
    const rankFromRow = Number(pr.rank ?? pr.position);
    const rankFromProfile =
      profileRankings && typeof profileRankings.leaguePosition === 'number'
        ? profileRankings.leaguePosition
        : NaN;
    const rank = Number.isFinite(rankFromRow) && rankFromRow > 0 ? rankFromRow : rankFromProfile;
    if (Number.isFinite(rank) && rank > 0) {
      primaryRanking = { ...pr, rank };
    }
  }

  return { ...o, primaryRanking };
}

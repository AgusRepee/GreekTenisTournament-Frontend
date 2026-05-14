import { getBracketMatchesForLibrary, getPlayerById } from '../../src/lib/mockData';
import { getLiga3PlayerById } from '../../src/lib/liga3Data';
import type { Round, Match, Player, RoundName } from './types';

const COUNTRY_CODE: Record<string, string> = {
  Argentina: 'AR', Uruguay: 'UY', Chile: 'CL', Paraguay: 'PY', Brasil: 'BR',
  España: 'ES', 'Great Britain': 'GB', Reino: 'GB',
};

function getCountryCode(nationality: string | undefined): string {
  if (!nationality) return '–';
  return COUNTRY_CODE[nationality] ?? nationality.slice(0, 2).toUpperCase();
}

function parseScore(scoreStr: string | null | undefined): { sets1: number[]; sets2: number[] } {
  const sets1: number[] = [];
  const sets2: number[] = [];
  if (!scoreStr || typeof scoreStr !== 'string') return { sets1, sets2 };
  const parts = scoreStr.split(',').map((s) => s.trim().split('-').map(Number));
  for (const [a, b] of parts) {
    if (!Number.isNaN(a)) sets1.push(a);
    if (!Number.isNaN(b)) sets2.push(b);
  }
  return { sets1, sets2 };
}

function participantToPlayer(
  id: string | number,
  name: string | undefined,
  ranking: number | undefined,
  sets: number[],
  tournamentId: string
): Player {
  const idStr = String(id);
  const isLiga3 = idStr.startsWith('l3-');
  const global = getPlayerById(idStr);
  const liga3Player = isLiga3 ? getLiga3PlayerById(idStr) : null;
  const displayName = name || global?.name || liga3Player?.name || 'TBD';
  return {
    name: displayName,
    flag: getCountryCode(global?.nationality),
    image: global?.profileImage ?? '',
    ranking: ranking ?? null,
    sets,
  };
}

const ROUND_MAP: Record<string, RoundName> = {
  '1': 'quarterfinals',
  '2': 'semifinals',
  '3': 'final',
};

/**
 * Converts tournament bracket data (from getBracketMatchesForLibrary) into Round[] for the custom bracket UI.
 */
export function getBracketRoundsForUI(
  tournamentId: string,
  seedMap?: ReadonlyMap<string, number> | Map<string, number>,
): Round[] {
  const raw = getBracketMatchesForLibrary(tournamentId, seedMap);
  const byRound = new Map<RoundName, Match[]>();

  for (const m of raw) {
    const roundName = ROUND_MAP[m.tournamentRoundText ?? '1'] ?? 'quarterfinals';
    const [p1, p2] = m.participants ?? [];
    const scoreStr = p1?.resultText || p2?.resultText || null;
    const { sets1, sets2 } = parseScore(scoreStr);
    const winner: Match['winner'] = p1?.isWinner ? 'player1' : p2?.isWinner ? 'player2' : null;

    const player1 = participantToPlayer(
      p1?.id ?? 'tbd1',
      p1?.name,
      p1?.ranking,
      sets1,
      tournamentId
    );
    const player2 = participantToPlayer(
      p2?.id ?? 'tbd2',
      p2?.name,
      p2?.ranking,
      sets2,
      tournamentId
    );

    byRound.set(roundName, byRound.get(roundName) ?? []);
    byRound.get(roundName)!.push({ player1, player2, winner });
  }

  const order: RoundName[] = ['quarterfinals', 'semifinals', 'final'];
  return order
    .filter((name) => (byRound.get(name)?.length ?? 0) > 0)
    .map((name) => ({ name, matches: byRound.get(name)! }));
}

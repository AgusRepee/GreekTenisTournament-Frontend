/**
 * react-tournament-brackets expects matches in this shape (NOT title/seeds/teams).
 * Each match has participants (not "teams"); the library passes them as topParty/bottomParty to the match component.
 */
export interface BracketParticipant {
  id: string | number;
  name?: string;
  resultText?: string | null;
  isWinner?: boolean;
  status?: string | null;
  ranking?: number;
  [key: string]: unknown;
}

export interface BracketMatchForLibrary {
  id: string | number;
  name?: string;
  nextMatchId: string | number | null;
  tournamentRoundText?: string;
  startTime: string;
  state: string;
  participants: BracketParticipant[];
  [key: string]: unknown;
}

const EMPTY_PARTICIPANT: BracketParticipant = {
  id: 'tbd',
  name: 'TBD',
  resultText: null,
  isWinner: false,
  status: null,
};

/**
 * Ensures every match has a mutable participants array with exactly 2 entries (id + name).
 * Prevents "teams.sort is not a function" / "Cannot read property 'sort' of undefined" in the library.
 */
export function sanitizeBracketMatches(
  rawMatches: BracketMatchForLibrary[] | null | undefined
): BracketMatchForLibrary[] {
  if (!Array.isArray(rawMatches) || rawMatches.length === 0) {
    return [];
  }

  const hasFinal = rawMatches.some((m) => m != null && (m.nextMatchId === null || m.nextMatchId === undefined));
  if (!hasFinal) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('BRACKET DATA: No final match (nextMatchId === null) found. Bracket may not render.');
    }
  }

  return rawMatches.map((match, index) => {
    if (match == null || typeof match !== 'object') {
      return {
        id: `sanitized-${index}`,
        nextMatchId: null as string | number | null,
        tournamentRoundText: '1',
        startTime: '',
        state: 'SCHEDULED',
        participants: [{ ...EMPTY_PARTICIPANT, id: `p1-${index}` }, { ...EMPTY_PARTICIPANT, id: `p2-${index}` }],
      };
    }

    let participants = match.participants;
    if (!Array.isArray(participants)) {
      participants = [];
    }
    // Copy so the library's .sort() doesn't mutate our source; ensure length >= 2
    const p0 = participants[0] != null && typeof participants[0] === 'object'
      ? { id: participants[0].id ?? `p1-${index}`, name: participants[0].name ?? 'TBD', resultText: participants[0].resultText ?? null, isWinner: !!participants[0].isWinner, status: participants[0].status ?? null, ranking: participants[0].ranking, ...participants[0] }
      : { ...EMPTY_PARTICIPANT, id: `p1-${index}` };
    const p1 = participants[1] != null && typeof participants[1] === 'object'
      ? { id: participants[1].id ?? `p2-${index}`, name: participants[1].name ?? 'TBD', resultText: participants[1].resultText ?? null, isWinner: !!participants[1].isWinner, status: participants[1].status ?? null, ranking: participants[1].ranking, ...participants[1] }
      : { ...EMPTY_PARTICIPANT, id: `p2-${index}` };

    return {
      ...match,
      id: match.id ?? index,
      nextMatchId: match.nextMatchId ?? null,
      tournamentRoundText: match.tournamentRoundText ?? '1',
      startTime: typeof match.startTime === 'string' ? match.startTime : '',
      state: typeof match.state === 'string' ? match.state : 'SCHEDULED',
      participants: [p0, p1],
    };
  });
}

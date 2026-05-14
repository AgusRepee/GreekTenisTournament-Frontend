import { ParseError, parseMatchScore } from './matchStatsEngine';

/**
 * Une los tres campos de sets (con o sin "/") en una cadena válida para `parseMatchScore`.
 */
export function joinSetInputs(set1: string, set2: string, set3: string | undefined): string {
  const raw = [set1, set2, set3 ?? '']
    .map((s) =>
      s
        .trim()
        .replace(/\s*\/\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((s) => s.length > 0);
  return raw.join(' ');
}

/** Gana jugador A o B según el marcador (orden: playerA = primer jugador del partido). */
export function inferWinnerSideFromScore(score: string): 'A' | 'B' | null {
  try {
    const p = parseMatchScore(score);
    return p.winner;
  } catch {
    return null;
  }
}

export function inferWinnerName(playerA: string, playerB: string, score: string): string | null {
  const side = inferWinnerSideFromScore(score);
  if (side === 'A') return playerA;
  if (side === 'B') return playerB;
  return null;
}

export function validateScoreForSave(score: string): { ok: true } | { ok: false; message: string } {
  try {
    parseMatchScore(score, { requireThirdSetSuperTiebreak: true });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof ParseError ? e.message : 'Marcador inválido.';
    return { ok: false, message: msg };
  }
}

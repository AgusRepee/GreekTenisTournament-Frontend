import type { MatchInput } from '../../types/tennisResults';

export function cleanPlayerName(raw: string): string {
  return raw
    .replace(/\s*\(P\)\s*$/i, '')
    .replace(/^\s*\(P\)\s*/i, '')
    .trim();
}

/** Misma clave que en el panel admin / resultados persistidos. */
export function matchInputDedupeKey(m: Pick<MatchInput, 'tournamentId' | 'group' | 'round' | 'playerA' | 'playerB'>): string {
  const g = (m.group ?? '').trim();
  const r = m.round ?? 0;
  const na = cleanPlayerName(m.playerA).toLowerCase();
  const nb = cleanPlayerName(m.playerB).toLowerCase();
  return `${m.tournamentId}|${r}|${g}|${na}|${nb}`;
}

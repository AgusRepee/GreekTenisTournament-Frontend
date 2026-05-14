/**
 * Tras guardar un resultado de eliminatoria, rellena jugadores de la ronda siguiente
 * en `partidos` (mismo emparejamiento que `getBracketMatchesForLibrary`: Q1+Q2→SF1, Q3+Q4→SF2, SF1+SF2→Final).
 */

import type { Match } from '@/lib/mockData';
import { mergePersistedMatches } from '@/lib/tennis/bracketPersist';

function sortKoMatches(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => {
    const da = a.scheduledDate ?? '';
    const db = b.scheduledDate ?? '';
    if (da !== db) return da.localeCompare(db);
    return a.id.localeCompare(b.id);
  });
}

function isQuarter(m: Match): boolean {
  const r = (m.round ?? '').trim();
  return r === 'Cuartos de final' || r === 'Cuartos';
}

function isSemi(m: Match): boolean {
  const r = (m.round ?? '').trim();
  return r === 'Semifinales' || r === 'Semifinal';
}

function isFinalRound(m: Match): boolean {
  return (m.round ?? '').trim() === 'Final';
}

function isRepechajeRound(m: Match): boolean {
  const r = (m.round ?? '').trim().toLowerCase();
  return r === 'repechaje' || r.includes('repechaje');
}

function repechajeSlotToken(matchId: string): string | null {
  const m = /-rp-(\d+)$/.exec(matchId.trim());
  if (!m) return null;
  return `WAIT_RP_${m[1]}`;
}

export function propagateKnockoutWinnerSlots(tournamentId: string): void {
  mergePersistedMatches((all) => {
    const tid = tournamentId.trim();
    if (!tid) return all;

    const nextAll = [...all];

    const mut = (matchId: string, fn: (m: Match) => Match) => {
      const idx = nextAll.findIndex((x) => x.id === matchId);
      if (idx < 0) return;
      nextAll[idx] = fn(nextAll[idx]!);
    };

    const rp = sortKoMatches(nextAll.filter((m) => m.tournamentId === tid && isRepechajeRound(m)));
    for (const m of rp) {
      const token = repechajeSlotToken(m.id);
      const w = m.winnerId?.trim();
      if (!token || !w) continue;
      for (let j = 0; j < nextAll.length; j++) {
        const x = nextAll[j]!;
        if (x.tournamentId !== tid) continue;
        if (x.playerA !== token && x.playerB !== token) continue;
        mut(x.id, (row) => ({
          ...row,
          playerA: row.playerA === token ? w : row.playerA,
          playerB: row.playerB === token ? w : row.playerB,
        }));
      }
    }

    const qf = sortKoMatches(nextAll.filter((m) => m.tournamentId === tid && isQuarter(m)));
    const sf = sortKoMatches(nextAll.filter((m) => m.tournamentId === tid && isSemi(m)));
    const fin = sortKoMatches(nextAll.filter((m) => m.tournamentId === tid && isFinalRound(m)));

    if (qf.length >= 4 && sf.length >= 2) {
      const s0 = sf[0]!;
      const s1 = sf[1]!;
      mut(s0.id, (m) => {
        let u = { ...m };
        if (qf[0]!.winnerId) u = { ...u, playerA: qf[0]!.winnerId };
        if (qf[1]!.winnerId) u = { ...u, playerB: qf[1]!.winnerId };
        return u;
      });
      mut(s1.id, (m) => {
        let u = { ...m };
        if (qf[2]!.winnerId) u = { ...u, playerA: qf[2]!.winnerId };
        if (qf[3]!.winnerId) u = { ...u, playerB: qf[3]!.winnerId };
        return u;
      });
    }

    if (sf.length >= 2 && fin.length >= 1) {
      const f0 = fin[0]!;
      mut(f0.id, (m) => {
        let u = { ...m };
        if (sf[0]!.winnerId) u = { ...u, playerA: sf[0]!.winnerId };
        if (sf[1]!.winnerId) u = { ...u, playerB: sf[1]!.winnerId };
        return u;
      });
    }

    return nextAll;
  });
}

/**
 * Crea en `partidos` el cascarón de cuartos + semis + final para un torneo (ids prefijados `ko-{tid}-`).
 * Los cuartos llevan jugadores reales; semis/final quedan con placeholders hasta que avance el ganador.
 */

import type { Match } from '@/lib/mockData';
import { getTournamentById } from '@/lib/mockData';
import { mergePersistedMatches } from '@/lib/tennis/bracketPersist';
import type { EliminationCrossDraft } from '@/lib/tennis/eliminationBracketProposal';
import { effectiveTournamentCatalogType } from '@/lib/tennis/rankingPointsGreek500';

function prefixId(tournamentId: string): string {
  return `ko-${tournamentId.trim()}-`;
}

export function buildKnockoutShellMatches(
  tournamentId: string,
  quarterCrosses: EliminationCrossDraft[],
  preliminaryCrosses: EliminationCrossDraft[] = [],
): Match[] {
  const tid = tournamentId.trim();
  const p = prefixId(tid);
  const tour = getTournamentById(tid);
  const mastersSfOnly =
    preliminaryCrosses.length === 0 &&
    quarterCrosses.length === 2 &&
    tour != null &&
    effectiveTournamentCatalogType(tour) === 'masters1000';

  const rp: Match[] = preliminaryCrosses.map((c, i) => ({
    id: `${p}rp-${i}`,
    tournamentId: tid,
    playerA: c.slotA ?? '',
    playerB: c.slotB ?? '',
    score: '',
    winnerId: null,
    round: 'Repechaje',
    scheduledDate: '',
  }));

  if (mastersSfOnly) {
    const sf: Match[] = quarterCrosses.map((c, i) => ({
      id: `${p}sf-${i}`,
      tournamentId: tid,
      playerA: c.slotA ?? '',
      playerB: c.slotB ?? '',
      score: '',
      winnerId: null,
      round: 'Semifinales',
      scheduledDate: '',
    }));
    const fin: Match[] = [
      {
        id: `${p}fn-0`,
        tournamentId: tid,
        playerA: `${p}tbd-fna`,
        playerB: `${p}tbd-fnb`,
        score: '',
        winnerId: null,
        round: 'Final',
        scheduledDate: '',
      },
    ];
    return [...rp, ...sf, ...fin];
  }

  const qf: Match[] = quarterCrosses.map((c, i) => ({
    id: `${p}qf-${i}`,
    tournamentId: tid,
    playerA: c.slotA ?? '',
    playerB: c.slotB ?? '',
    score: '',
    winnerId: null,
    round: 'Cuartos de final',
    scheduledDate: '',
  }));
  const sf: Match[] = [0, 1].map((i) => ({
    id: `${p}sf-${i}`,
    tournamentId: tid,
    playerA: `${p}tbd-sf${i}a`,
    playerB: `${p}tbd-sf${i}b`,
    score: '',
    winnerId: null,
    round: 'Semifinales',
    scheduledDate: '',
  }));
  const fin: Match[] = [
    {
      id: `${p}fn-0`,
      tournamentId: tid,
      playerA: `${p}tbd-fna`,
      playerB: `${p}tbd-fnb`,
      score: '',
      winnerId: null,
      round: 'Final',
      scheduledDate: '',
    },
  ];
  return [...rp, ...qf, ...sf, ...fin];
}

/** Quita partidos KO generados por este asistente y agrega el nuevo cascarón. */
export function replaceKnockoutShellMatches(
  tournamentId: string,
  quarterCrosses: EliminationCrossDraft[],
  preliminaryCrosses: EliminationCrossDraft[] = [],
): void {
  const tid = tournamentId.trim();
  const pref = prefixId(tid);
  mergePersistedMatches((all) => {
    const stripped = all.filter((m) => !(m.tournamentId === tid && m.id.startsWith(pref)));
    return [...stripped, ...buildKnockoutShellMatches(tid, quarterCrosses, preliminaryCrosses)];
  });
}

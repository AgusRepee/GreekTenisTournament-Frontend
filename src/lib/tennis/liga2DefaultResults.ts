import type { MatchInput } from '@/types/tennisResults';
import { matchInputDedupeKey } from './matchDedupe';

export const LIGA2_TOURNAMENT_ID = 't-novak-l2';
export const LIGA2_INCONSISTENCIES = [
  'Grupo A - Cancio M. a Cancio M. 6-4/6-1: no se carga porque Cancio M. no puede jugar contra sí mismo; rival pendiente de confirmación.',
] as const;

type ResultSeed = {
  group: string;
  round: number;
  playerA: string;
  playerB: string;
  winner: string;
  score: string;
  status?: MatchInput['status'];
};

function result(seed: ResultSeed): MatchInput {
  const winnerIsA = seed.winner === seed.playerA;
  const winnerIsB = seed.winner === seed.playerB;
  if (!winnerIsA && !winnerIsB) {
    throw new Error(`Ganador fuera del partido Liga 2: ${seed.winner}`);
  }
  return {
    tournamentId: LIGA2_TOURNAMENT_ID,
    group: seed.group,
    round: seed.round,
    playerA: seed.playerA,
    playerB: seed.playerB,
    score: seed.score,
    status: seed.status ?? 'played',
  };
}

export const DEFAULT_LIGA2_RESULTS: MatchInput[] = [
  result({ group: 'A', round: 5, playerA: 'Colomer S.', playerB: 'Monzón M.', winner: 'Colomer S.', score: '6-3 / 4-1 y abandono', status: 'retired' }),
  result({ group: 'A', round: 5, playerA: 'Cancio M.', playerB: 'Del Pino A.', winner: 'Cancio M.', score: '6-4 / 1-6 / 10-8' }),
  result({ group: 'A', round: 2, playerA: 'Lacave L.', playerB: 'Cancio M.', winner: 'Lacave L.', score: '6-7 / 6-4 / 10-4' }),
  result({ group: 'A', round: 2, playerA: 'Colomer S.', playerB: 'Del Pino A.', winner: 'Colomer S.', score: '6-3 / 6-4' }),
  result({ group: 'A', round: 1, playerA: 'Lacave L.', playerB: 'Monzón M.', winner: 'Lacave L.', score: '6-1 / 6-1' }),
  result({ group: 'A', round: 1, playerA: 'Colomer S.', playerB: 'Cancio M.', winner: 'Colomer S.', score: '3-6 / 6-3 / 10-6' }),
  result({ group: 'A', round: 3, playerA: 'Monzón M.', playerB: 'Del Pino A.', winner: 'Monzón M.', score: '4-6 / 6-0 / 10-4' }),
  result({ group: 'A', round: 4, playerA: 'Cancio M.', playerB: 'Monzón M.', winner: 'Cancio M.', score: '6-1 / 6-4' }),
  result({ group: 'A', round: 3, playerA: 'Lacave L.', playerB: 'Colomer S.', winner: 'Lacave L.', score: '7-5 / 6-4' }),

  result({ group: 'B', round: 3, playerA: 'Mayer D.', playerB: 'Ruiz J.', winner: 'Mayer D.', score: '6-1 / 7-5' }),
  result({ group: 'B', round: 1, playerA: 'Guareschi A.', playerB: 'Komesu M.', winner: 'Guareschi A.', score: '6-2 / 6-4' }),
  result({ group: 'B', round: 1, playerA: 'Ferreyra O.', playerB: 'Ruiz J.', winner: 'Ferreyra O.', score: '6-4 / 3-6 / 10-3' }),
  result({ group: 'B', round: 5, playerA: 'Mayer D.', playerB: 'Guareschi A.', winner: 'Mayer D.', score: '5-7 / 7-6 / 10-7' }),
  result({ group: 'B', round: 2, playerA: 'Guareschi A.', playerB: 'Ferreyra O.', winner: 'Guareschi A.', score: '6-2 / 6-3' }),
  result({ group: 'B', round: 4, playerA: 'Mayer D.', playerB: 'Ferreyra O.', winner: 'Mayer D.', score: '6-3 / 3-6 / 10-3' }),
  result({ group: 'B', round: 2, playerA: 'Komesu M.', playerB: 'Mayer D.', winner: 'Komesu M.', score: '7-5 / 7-6' }),
  result({ group: 'B', round: 4, playerA: 'Guareschi A.', playerB: 'Ruiz J.', winner: 'Guareschi A.', score: '6-1 / 7-6' }),
  result({ group: 'B', round: 3, playerA: 'Komesu M.', playerB: 'Ferreyra O.', winner: 'Komesu M.', score: '5-7 / 6-2 / 11-9' }),
  result({ group: 'B', round: 5, playerA: 'Komesu M.', playerB: 'Ruiz J.', winner: 'Komesu M.', score: '6-3 / 6-2' }),

  result({ group: 'C', round: 3, playerA: 'Rossi F.', playerB: 'Molina L.', winner: 'Rossi F.', score: '6-0 / 6-2' }),
  result({ group: 'C', round: 5, playerA: 'Scilipoti N.', playerB: 'Gadea M.', winner: 'Scilipoti N.', score: '6-0 / 6-1' }),
  result({ group: 'C', round: 1, playerA: 'Rossi F.', playerB: 'Fredkin B.', winner: 'Rossi F.', score: '6-0 / 6-2' }),
  result({ group: 'C', round: 3, playerA: 'Fredkin B.', playerB: 'Gadea M.', winner: 'Fredkin B.', score: '6-4 / 6-3' }),
  result({ group: 'C', round: 1, playerA: 'Scilipoti N.', playerB: 'Molina L.', winner: 'Scilipoti N.', score: '6-1 / 6-2' }),
  result({ group: 'C', round: 4, playerA: 'Rossi F.', playerB: 'Gadea M.', winner: 'Rossi F.', score: '6-2 / 6-2' }),
  result({ group: 'C', round: 4, playerA: 'Fredkin B.', playerB: 'Scilipoti N.', winner: 'Fredkin B.', score: '6-4 / 2-6 / 10-2' }),
  result({ group: 'C', round: 5, playerA: 'Fredkin B.', playerB: 'Molina L.', winner: 'Fredkin B.', score: '6-1 / 7-5' }),

  result({ group: 'Cuartos de Final', round: 0, playerA: 'Lacave L.', playerB: 'Mayer D.', winner: 'Lacave L.', score: '6-3 / 6-4' }),
  result({ group: 'Cuartos de Final', round: 0, playerA: 'Colomer S.', playerB: 'Komesu M.', winner: 'Colomer S.', score: '6-7 / 7-5 / 10-6' }),
].map((m) => ({ ...m, matchId: matchInputDedupeKey(m) }));

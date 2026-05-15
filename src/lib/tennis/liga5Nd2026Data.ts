import type { MatchScheduleEntry } from '@/data/services/contracts/matchSchedulePort';
import type { LigaTemplate, MatchInput } from '@/types/tennisResults';
import { matchInputDedupeKey } from './matchDedupe';

export const LIGA5_ND_TOURNAMENT_ID = 't-novak-l5';
export const LIGA5_ND_LEAGUE_NUM = 5;

export const LIGA5_ND_CLASSIFICATION_RULE =
  'Los tres primeros de cada grupo clasifican a Play Off. Los dos peores terceros juegan Repechaje. El ganador entra a Cuartos como octavo clasificado. Cruces: 1° vs 8°, 2° vs 7°, 3° vs 6°, 4° vs 5°.';

export const LIGA5_ND_GROUPS = {
  A: ['Ríos J.', 'Peralta G.', 'Ali M.', 'Oviedo M.', 'Manrique E.'],
  B: ['González Días F.', 'Chantada S.', 'Sola M.', 'Cirigliano D.', 'Córdoba A.'],
  C: ['Córdoba G.', 'González Días C.', 'Tellechea L.', 'Vila E.', 'Giménez F.'],
} as const;

export const LIGA5_ND_TEMPLATE: LigaTemplate = {
  torneo: 'Novak Djokovic',
  liga: LIGA5_ND_LEAGUE_NUM,
  grupos: LIGA5_ND_GROUPS,
  fechas: [],
  nota: LIGA5_ND_CLASSIFICATION_RULE,
};

type FixtureSeed = {
  group: string;
  round: number;
  playerA: string;
  playerB: string;
  ballPlayer?: string;
  winner?: string;
  winnerScore?: string;
  status?: MatchInput['status'];
  date?: string;
  time?: string;
  note?: string;
};

function invertScore(score: string): string {
  return score.replace(/(\d+)-(\d+)/g, (_match, a: string, b: string) => `${b}-${a}`);
}

function fixture(seed: FixtureSeed): FixtureSeed {
  return seed;
}

function toResult(seed: FixtureSeed): MatchInput | null {
  if (!seed.winner || !seed.winnerScore) return null;
  const winnerIsA = seed.winner === seed.playerA;
  const winnerIsB = seed.winner === seed.playerB;
  if (!winnerIsA && !winnerIsB) {
    throw new Error(`Ganador fuera del partido Novak Djokovic - Liga 5: ${seed.winner}`);
  }
  if ((seed.status ?? 'played') === 'walkover') {
    return {
      tournamentId: LIGA5_ND_TOURNAMENT_ID,
      group: seed.group,
      round: seed.round,
      playerA: seed.playerA,
      playerB: seed.playerB,
      score: winnerIsA ? 'A' : 'B',
      status: 'walkover',
      date: seed.date,
    };
  }
  return {
    tournamentId: LIGA5_ND_TOURNAMENT_ID,
    group: seed.group,
    round: seed.round,
    playerA: seed.playerA,
    playerB: seed.playerB,
    score: winnerIsA ? seed.winnerScore : invertScore(seed.winnerScore),
    status: seed.status ?? 'played',
    date: seed.date,
  };
}

export const LIGA5_ND_FIXTURES: FixtureSeed[] = [
  fixture({ group: 'A', round: 1, date: '2026-03-11', time: '21:00', playerA: 'Ríos J.', playerB: 'Ali M.', ballPlayer: 'Ríos J.', winner: 'Ríos J.', winnerScore: '5-7 / 6-3 / 11-9' }),
  fixture({ group: 'A', round: 5, date: '2026-03-14', time: '14:00', playerA: 'Oviedo M.', playerB: 'Manrique E.', ballPlayer: 'Oviedo M.', winner: 'Oviedo M.', winnerScore: '6-4 / 6-2' }),
  fixture({ group: 'A', round: 1, date: '2026-03-22', time: '18:00', playerA: 'Peralta G.', playerB: 'Oviedo M.', ballPlayer: 'Peralta G.', winner: 'Peralta G.', winnerScore: '6-3 / 6-1' }),
  fixture({ group: 'A', round: 3, date: '2026-03-23', time: '11:00', playerA: 'Manrique E.', playerB: 'Ali M.', ballPlayer: 'Manrique E.', winner: 'Ali M.', winnerScore: '6-2 / 6-2' }),
  fixture({ group: 'A', round: 2, date: '2026-04-03', time: '18:00', playerA: 'Ríos J.', playerB: 'Oviedo M.', ballPlayer: 'Ríos J.', winner: 'Ríos J.', winnerScore: '4-6 / 6-2 / 10-7' }),
  fixture({ group: 'A', round: 5, date: '2026-04-05', time: '19:00', playerA: 'Ali M.', playerB: 'Peralta G.', ballPlayer: 'Ali M.', winner: 'Peralta G.', winnerScore: '6-2 / 7-5' }),
  fixture({ group: 'A', round: 3, date: '2026-04-12', time: '20:00', playerA: 'Ríos J.', playerB: 'Peralta G.', ballPlayer: 'Ríos J.', winner: 'Ríos J.', winnerScore: '6-3 / 6-2' }),
  fixture({ group: 'A', round: 4, date: '2026-04-18', time: '18:30', playerA: 'Ali M.', playerB: 'Oviedo M.', ballPlayer: 'Ali M.', winner: 'Oviedo M.', winnerScore: '6-0 / 6-1' }),
  fixture({ group: 'A', round: 4, date: '2026-04-25', time: '11:30', playerA: 'Manrique E.', playerB: 'Ríos J.', ballPlayer: 'Manrique E.', winner: 'Ríos J.', winnerScore: '6-0 / 6-4' }),
  fixture({ group: 'A', round: 2, playerA: 'Peralta G.', playerB: 'Manrique E.', winner: 'Peralta G.', winnerScore: 'W.O.', status: 'walkover', note: 'Resultado informado el 06/05/2026.' }),

  fixture({ group: 'B', round: 5, date: '2026-03-12', time: '21:00', playerA: 'González Días F.', playerB: 'Córdoba A.', ballPlayer: 'González Días F.', winner: 'González Días F.', winnerScore: '6-1 / 6-1', note: 'En el chat figura como Grupo C, pero por jugadores y tabla corresponde a Grupo B.' }),
  fixture({ group: 'B', round: 2, date: '2026-03-22', time: '11:00', playerA: 'González Días F.', playerB: 'Sola M.', winner: 'González Días F.', winnerScore: '6-4 / 6-3' }),
  fixture({ group: 'B', round: 1, date: '2026-03-26', time: '21:00', playerA: 'Cirigliano D.', playerB: 'Córdoba A.', ballPlayer: 'Cirigliano D.', winner: 'Cirigliano D.', winnerScore: 'W.O.', status: 'walkover' }),
  fixture({ group: 'B', round: 3, playerA: 'González Días F.', playerB: 'Cirigliano D.', winner: 'González Días F.', winnerScore: '6-4 / 6-1', note: 'Resultado informado el 28/03/2026.' }),
  fixture({ group: 'B', round: 3, date: '2026-04-02', time: '11:00', playerA: 'Sola M.', playerB: 'Córdoba A.', ballPlayer: 'Sola M.', winner: 'Sola M.', winnerScore: '6-2 / 6-0' }),
  fixture({ group: 'B', round: 4, date: '2026-04-10', time: '11:00', playerA: 'Sola M.', playerB: 'Cirigliano D.', ballPlayer: 'Sola M.', winner: 'Sola M.', winnerScore: '6-4 / 6-3' }),
  fixture({ group: 'B', round: 1, date: '2026-04-12', time: '18:00', playerA: 'González Días F.', playerB: 'Chantada S.', ballPlayer: 'González Días F.', winner: 'Chantada S.', winnerScore: '4-6 / 6-4 / 12-10' }),
  fixture({ group: 'B', round: 5, date: '2026-04-18', time: '11:30', playerA: 'Chantada S.', playerB: 'Sola M.', ballPlayer: 'Chantada S.', winner: 'Chantada S.', winnerScore: '1-6 / 6-4 / 10-8', note: 'Reprogramado desde el 29/03/2026.' }),
  fixture({ group: 'B', round: 2, date: '2026-04-27', time: '20:00', playerA: 'Chantada S.', playerB: 'Cirigliano D.', ballPlayer: 'Chantada S.', winner: 'Cirigliano D.', winnerScore: '6-3 / 2-6 / 10-5' }),
  fixture({ group: 'B', round: 4, playerA: 'Chantada S.', playerB: 'Córdoba A.', winner: 'Chantada S.', winnerScore: 'W.O.', status: 'walkover', note: 'Resultado informado el 06/05/2026.' }),

  fixture({ group: 'C', round: 4, date: '2026-03-19', time: '08:30', playerA: 'Vila E.', playerB: 'Tellechea L.', ballPlayer: 'Vila E.', winner: 'Tellechea L.', winnerScore: '6-3 / 6-4' }),
  fixture({ group: 'C', round: 1, date: '2026-03-19', time: '21:00', playerA: 'Córdoba G.', playerB: 'Giménez F.', ballPlayer: 'Córdoba G.', winner: 'Córdoba G.', winnerScore: '6-2 / 6-7 / 10-8' }),
  fixture({ group: 'C', round: 1, date: '2026-03-23', time: '20:45', playerA: 'Tellechea L.', playerB: 'González Días C.', ballPlayer: 'Tellechea L.', winner: 'González Días C.', winnerScore: '7-6 / 6-1' }),
  fixture({ group: 'C', round: 5, date: '2026-04-05', time: '18:00', playerA: 'González Días C.', playerB: 'Córdoba G.', ballPlayer: 'González Días C.', winner: 'Córdoba G.', winnerScore: '6-3 / 6-0' }),
  fixture({ group: 'C', round: 3, date: '2026-04-09', time: '12:00', playerA: 'Tellechea L.', playerB: 'Córdoba G.', ballPlayer: 'Tellechea L.', winner: 'Córdoba G.', winnerScore: '6-2 / 6-4' }),
  fixture({ group: 'C', round: 3, date: '2026-04-14', time: '09:00', playerA: 'Vila E.', playerB: 'González Días C.', ballPlayer: 'Vila E.', winner: 'González Días C.', winnerScore: '6-3 / 6-3' }),
  fixture({ group: 'C', round: 2, date: '2026-04-23', time: '10:00', playerA: 'Córdoba G.', playerB: 'Vila E.', ballPlayer: 'Córdoba G.', winner: 'Córdoba G.', winnerScore: '6-1 / 6-1' }),
  fixture({ group: 'C', round: 4, date: '2026-05-01', time: '11:00', playerA: 'González Días C.', playerB: 'Giménez F.', ballPlayer: 'González Días C.', winner: 'González Días C.', winnerScore: '6-4 / 6-3' }),
  fixture({ group: 'C', round: 2, playerA: 'Tellechea L.', playerB: 'Giménez F.', winner: 'Tellechea L.', winnerScore: 'W.O.', status: 'walkover', note: 'Resultado informado el 06/05/2026.' }),
  fixture({ group: 'C', round: 5, playerA: 'Vila E.', playerB: 'Giménez F.', winner: 'Vila E.', winnerScore: 'W.O.', status: 'walkover', note: 'Resultado informado el 06/05/2026.' }),

  fixture({ group: 'Repechaje', round: 0, date: '2026-05-08', time: '09:00', playerA: 'Tellechea L.', playerB: 'Sola M.', ballPlayer: 'Tellechea L.', winner: 'Sola M.', winnerScore: '3-6 / 6-3 / 10-6' }),
  fixture({ group: 'Cuartos de Final', round: 0, date: '2026-05-10', time: '16:00', playerA: 'Chantada S.', playerB: 'González Días F.', ballPlayer: 'Chantada S.', winner: 'González Días F.', winnerScore: '6-0 / 4-1 y abandono', status: 'retired' }),
  fixture({ group: 'Cuartos de Final', round: 0, date: '2026-05-10', time: '17:00', playerA: 'Ríos J.', playerB: 'Oviedo M.', ballPlayer: 'Ríos J.', winner: 'Ríos J.', winnerScore: '6-3 / 6-1' }),
  fixture({ group: 'Cuartos de Final', round: 0, date: '2026-05-11', time: '08:30', playerA: 'González Días C.', playerB: 'Peralta G.', ballPlayer: 'González Días C.', winner: 'González Días C.', winnerScore: '6-1 / 6-2' }),
  fixture({ group: 'Cuartos de Final', round: 0, playerA: 'Córdoba G.', playerB: 'Sola M.', note: 'Pendiente / sin resultado cargado. Sola M. entra desde Repechaje.' }),
];

export const DEFAULT_LIGA5_ND_RESULTS: MatchInput[] = LIGA5_ND_FIXTURES
  .map(toResult)
  .filter((m): m is MatchInput => Boolean(m))
  .map((m) => ({ ...m, matchId: matchInputDedupeKey(m) }));

export const DEFAULT_LIGA5_ND_SCHEDULES: MatchScheduleEntry[] = LIGA5_ND_FIXTURES.map((m) => {
  const dedupeKey = matchInputDedupeKey({
    tournamentId: LIGA5_ND_TOURNAMENT_ID,
    group: m.group,
    round: m.round,
    playerA: m.playerA,
    playerB: m.playerB,
  });
  const dateMs = m.date ? Date.parse(`${m.date}T00:00:00`) : Date.parse('2026-01-01T00:00:00');
  return {
    dedupeKey,
    tournamentId: LIGA5_ND_TOURNAMENT_ID,
    leagueNum: LIGA5_ND_LEAGUE_NUM,
    scheduleStatus: m.date || m.time ? 'confirmed' : 'unscheduled',
    date: m.date,
    time: m.time,
    note: [m.ballPlayer ? `Jugador con pelotas: ${m.ballPlayer}.` : '', m.note ?? ''].filter(Boolean).join(' '),
    confirmedAt: m.date ? dateMs : undefined,
    updatedAt: dateMs,
  };
});

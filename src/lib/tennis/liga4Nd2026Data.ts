import type { MatchScheduleEntry } from '@/data/services/contracts/matchSchedulePort';
import type { LigaTemplate, MatchInput } from '@/types/tennisResults';
import { matchInputDedupeKey } from './matchDedupe';

export const LIGA4_ND_TOURNAMENT_ID = 't-novak-l4';
export const LIGA4_ND_LEAGUE_NUM = 4;
export const LIGA4_ND_INTERZONAL_GROUP = 'Fecha 4 (Interzonal)';

export const LIGA4_ND_GROUPS = {
  A: ['Beitia J.', 'Chantada M.', 'Malcangi R.', 'Cardozo M.'],
  B: ['Repecka J.', 'Vera F.', 'Blanco J.', 'Anetta D.'],
  C: ['Bernardini G.', 'Garcia J.', 'Murchio M.', 'Cellilli M.'],
} as const;

export const LIGA4_ND_TEMPLATE: LigaTemplate = {
  torneo: 'Novak Djokovic',
  liga: LIGA4_ND_LEAGUE_NUM,
  grupos: LIGA4_ND_GROUPS,
  fechas: [],
  nota: '(P): Jugador asignado para llevar pelotas en ese partido.',
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
    throw new Error(`Ganador fuera del partido Novak Djokovic - Liga 4: ${seed.winner}`);
  }
  if ((seed.status ?? 'played') === 'walkover') {
    return {
      tournamentId: LIGA4_ND_TOURNAMENT_ID,
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
    tournamentId: LIGA4_ND_TOURNAMENT_ID,
    group: seed.group,
    round: seed.round,
    playerA: seed.playerA,
    playerB: seed.playerB,
    score: winnerIsA ? seed.winnerScore : invertScore(seed.winnerScore),
    status: seed.status ?? 'played',
    date: seed.date,
  };
}

export const LIGA4_ND_FIXTURES: FixtureSeed[] = [
  fixture({ group: 'A', round: 1, date: '2026-03-15', time: '17:00', playerA: 'Malcangi R.', playerB: 'Cardozo M.', ballPlayer: 'Malcangi R.', winner: 'Malcangi R.', winnerScore: '6-3 / 6-4' }),
  fixture({ group: 'A', round: 1, date: '2026-04-04', time: '11:00', playerA: 'Beitia J.', playerB: 'Chantada M.', ballPlayer: 'Beitia J.', winner: 'Beitia J.', winnerScore: '6-1 / 6-4' }),
  fixture({ group: 'A', round: 2, playerA: 'Beitia J.', playerB: 'Malcangi R.', ballPlayer: 'Beitia J.', winner: 'Beitia J.', winnerScore: 'W.O.', status: 'walkover' }),
  fixture({ group: 'A', round: 2, date: '2026-04-25', time: '08:00', playerA: 'Cardozo M.', playerB: 'Chantada M.', ballPlayer: 'Cardozo M.', winner: 'Chantada M.', winnerScore: '6-1 / 4-6 / 11-9' }),
  fixture({ group: 'A', round: 3, date: '2026-03-24', time: '12:00', playerA: 'Cardozo M.', playerB: 'Beitia J.', ballPlayer: 'Cardozo M.', winner: 'Beitia J.', winnerScore: '7-5 / 6-2' }),
  fixture({ group: 'A', round: 3, playerA: 'Chantada M.', playerB: 'Malcangi R.', ballPlayer: 'Chantada M.', winner: 'Chantada M.', winnerScore: 'W.O.', status: 'walkover' }),

  fixture({ group: 'B', round: 1, date: '2026-04-12', time: '11:00', playerA: 'Blanco J.', playerB: 'Anetta D.', ballPlayer: 'Blanco J.', winner: 'Blanco J.', winnerScore: '4-6 / 6-2 / 10-7' }),
  fixture({ group: 'B', round: 1, date: '2026-04-19', time: '17:00', playerA: 'Repecka J.', playerB: 'Vera F.', ballPlayer: 'Repecka J.', winner: 'Repecka J.', winnerScore: '6-4 / 3-6 / 10-4' }),
  fixture({ group: 'B', round: 2, date: '2026-03-24', time: '11:00', playerA: 'Blanco J.', playerB: 'Repecka J.', ballPlayer: 'Blanco J.', winner: 'Repecka J.', winnerScore: '6-0 / 7-6' }),
  fixture({ group: 'B', round: 2, date: '2026-03-24', time: '18:00', playerA: 'Vera F.', playerB: 'Anetta D.', ballPlayer: 'Vera F.', winner: 'Vera F.', winnerScore: '6-2 / 6-4' }),
  fixture({ group: 'B', round: 3, playerA: 'Anetta D.', playerB: 'Repecka J.', ballPlayer: 'Anetta D.', winner: 'Repecka J.', winnerScore: 'W.O.', status: 'walkover' }),
  fixture({ group: 'B', round: 3, date: '2026-05-01', time: '14:00', playerA: 'Blanco J.', playerB: 'Vera F.', ballPlayer: 'Blanco J.', winner: 'Vera F.', winnerScore: '6-7 / 6-4 / 10-8' }),

  fixture({ group: 'C', round: 1, date: '2026-04-19', time: '11:30', playerA: 'Bernardini G.', playerB: 'Garcia J.', ballPlayer: 'Bernardini G.', winner: 'Bernardini G.', winnerScore: '4-6 / 6-3 / 10-7' }),
  fixture({ group: 'C', round: 1, date: '2026-03-29', time: '16:00', playerA: 'Murchio M.', playerB: 'Cellilli M.', ballPlayer: 'Murchio M.', winner: 'Cellilli M.', winnerScore: '7-5 / 7-5' }),
  fixture({ group: 'C', round: 2, date: '2026-03-22', time: '19:30', playerA: 'Bernardini G.', playerB: 'Murchio M.', ballPlayer: 'Bernardini G.', winner: 'Murchio M.', winnerScore: '6-4 / 6-2' }),
  fixture({ group: 'C', round: 2, date: '2026-04-05', time: '09:00', playerA: 'Garcia J.', playerB: 'Cellilli M.', ballPlayer: 'Garcia J.', winner: 'Garcia J.', winnerScore: '6-2 / 6-3' }),
  fixture({ group: 'C', round: 3, date: '2026-03-15', time: '20:00', playerA: 'Garcia J.', playerB: 'Murchio M.', ballPlayer: 'Garcia J.', winner: 'Garcia J.', winnerScore: '6-4 / 6-4' }),
  fixture({ group: 'C', round: 3, date: '2026-04-26', time: '18:00', playerA: 'Cellilli M.', playerB: 'Bernardini G.', ballPlayer: 'Cellilli M.', winner: 'Bernardini G.', winnerScore: '6-1 / 6-2' }),

  fixture({ group: LIGA4_ND_INTERZONAL_GROUP, round: 4, date: '2026-03-22', time: '16:00', playerA: 'Cellilli M.', playerB: 'Chantada M.', ballPlayer: 'Cellilli M.', winner: 'Chantada M.', winnerScore: '6-2 / 6-0' }),
  fixture({ group: LIGA4_ND_INTERZONAL_GROUP, round: 4, date: '2026-05-03', time: '12:00', playerA: 'Beitia J.', playerB: 'Bernardini G.', ballPlayer: 'Beitia J.', winner: 'Bernardini G.', winnerScore: '6-3 / 6-2' }),
  fixture({ group: LIGA4_ND_INTERZONAL_GROUP, round: 4, date: '2026-03-31', time: '10:00', playerA: 'Malcangi R.', playerB: 'Blanco J.', ballPlayer: 'Malcangi R.', winner: 'Malcangi R.', winnerScore: '3-6 / 6-4 / 10-8' }),
  fixture({ group: LIGA4_ND_INTERZONAL_GROUP, round: 4, date: '2026-04-05', time: '10:30', playerA: 'Repecka J.', playerB: 'Cardozo M.', ballPlayer: 'Repecka J.', winner: 'Repecka J.', winnerScore: '6-3 / 6-1', note: 'En el chat figura Grupo B; por jugadores reales corresponde a Interzonal.' }),
  fixture({ group: LIGA4_ND_INTERZONAL_GROUP, round: 4, playerA: 'Anetta D.', playerB: 'Murchio M.', ballPlayer: 'Anetta D.', winner: 'Murchio M.', winnerScore: 'W.O.', status: 'walkover' }),
  fixture({ group: LIGA4_ND_INTERZONAL_GROUP, round: 4, date: '2026-05-03', time: '11:30', playerA: 'Garcia J.', playerB: 'Vera F.', ballPlayer: 'Garcia J.', winner: 'Vera F.', winnerScore: '2-6 / 6-3 / 15-13' }),

  fixture({ group: 'Repechaje', round: 0, date: '2026-05-10', time: '16:00', playerA: 'Blanco J.', playerB: 'Malcangi R.', ballPlayer: 'Blanco J.', winner: 'Blanco J.', winnerScore: 'W.O.', status: 'walkover', note: 'W.O. por lesión de Malcangi R.' }),

  fixture({ group: 'Cuartos de Final', round: 0, date: '2026-05-10', time: '11:30', playerA: 'Repecka J.', playerB: 'Blanco J.', ballPlayer: 'Repecka J.', winner: 'Repecka J.', winnerScore: '6-2 / 6-4' }),
  fixture({ group: 'Cuartos de Final', round: 0, date: '2026-05-09', time: '08:00', playerA: 'Chantada M.', playerB: 'Vera F.', ballPlayer: 'Chantada M.', winner: 'Vera F.', winnerScore: '6-4 / 6-1' }),
  fixture({ group: 'Cuartos de Final', round: 0, date: '2026-05-15', time: '21:00', playerA: 'Bernardini G.', playerB: 'Garcia J.', ballPlayer: 'Bernardini G.', winner: 'Bernardini G.', winnerScore: '5-7 / 6-4 / 10-7' }),
  fixture({ group: 'Cuartos de Final', round: 0, date: '2026-05-17', time: '17:00', playerA: 'Murchio M.', playerB: 'Beitia J.', ballPlayer: 'Murchio M.', winner: 'Beitia J.', winnerScore: '6-3 / 6-3' }),

  fixture({ group: 'Semifinales', round: 0, date: '2026-05-20', time: '20:00', playerA: 'Repecka J.', playerB: 'Vera F.', ballPlayer: 'Repecka J.', winner: 'Vera F.', winnerScore: '6-1 / 7-6' }),
  fixture({ group: 'Semifinales', round: 0, playerA: 'Bernardini G.', playerB: 'Beitia J.', note: 'Pendiente / sin resultado cargado.' }),
];

export const DEFAULT_LIGA4_ND_RESULTS: MatchInput[] = LIGA4_ND_FIXTURES
  .map(toResult)
  .filter((m): m is MatchInput => Boolean(m))
  .map((m) => ({ ...m, matchId: matchInputDedupeKey(m) }));

export const DEFAULT_LIGA4_ND_SCHEDULES: MatchScheduleEntry[] = LIGA4_ND_FIXTURES.map((m) => {
  const dedupeKey = matchInputDedupeKey({
    tournamentId: LIGA4_ND_TOURNAMENT_ID,
    group: m.group,
    round: m.round,
    playerA: m.playerA,
    playerB: m.playerB,
  });
  const dateMs = m.date ? Date.parse(`${m.date}T00:00:00`) : Date.parse('2026-01-01T00:00:00');
  return {
    dedupeKey,
    tournamentId: LIGA4_ND_TOURNAMENT_ID,
    leagueNum: LIGA4_ND_LEAGUE_NUM,
    scheduleStatus: m.date || m.time ? 'confirmed' : 'unscheduled',
    date: m.date,
    time: m.time,
    note: [m.ballPlayer ? `Jugador con pelotas: ${m.ballPlayer}.` : '', m.note ?? ''].filter(Boolean).join(' '),
    confirmedAt: m.date ? dateMs : undefined,
    updatedAt: dateMs,
  };
});

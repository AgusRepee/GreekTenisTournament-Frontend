import type { MatchScheduleEntry } from '@/data/services/contracts/matchSchedulePort';
import type { MatchInput } from '@/types/tennisResults';
import { matchInputDedupeKey } from './matchDedupe';

const TOURNAMENT_ID = 't-novak';
const LEAGUE_NUM = 1;

type PlayedSeed = {
  group: string;
  round: number;
  playerA: string;
  playerB: string;
  winner: string;
  winnerScore: string;
  date: string;
  time: string;
};

type WalkoverSeed = {
  group: string;
  round: number;
  playerA: string;
  playerB: string;
  winner: string;
};

function invertScore(score: string): string {
  return score
    .trim()
    .split(/\s+/)
    .map((set) => {
      const [a, b] = set.split('-');
      return a != null && b != null ? `${b}-${a}` : set;
    })
    .join(' ');
}

function played(seed: PlayedSeed): MatchInput {
  const winnerIsA = seed.winner === seed.playerA;
  const winnerIsB = seed.winner === seed.playerB;
  if (!winnerIsA && !winnerIsB) {
    throw new Error(`Ganador fuera del partido: ${seed.winner}`);
  }
  return {
    tournamentId: TOURNAMENT_ID,
    group: seed.group,
    round: seed.round,
    playerA: seed.playerA,
    playerB: seed.playerB,
    score: winnerIsA ? seed.winnerScore : invertScore(seed.winnerScore),
    status: 'played',
    date: seed.date,
  };
}

function walkover(seed: WalkoverSeed): MatchInput {
  const winnerIsA = seed.winner === seed.playerA;
  const winnerIsB = seed.winner === seed.playerB;
  if (!winnerIsA && !winnerIsB) {
    throw new Error(`Ganador fuera del partido: ${seed.winner}`);
  }
  return {
    tournamentId: TOURNAMENT_ID,
    group: seed.group,
    round: seed.round,
    playerA: seed.playerA,
    playerB: seed.playerB,
    score: winnerIsA ? 'A' : 'B',
    status: 'walkover',
  };
}

export const DEFAULT_NOVAK_LIGA1_RESULTS: MatchInput[] = [
  played({ date: '2026-03-13', time: '20:00', group: 'A', round: 3, playerA: 'Guidobono A.', playerB: 'Álvarez I.', winner: 'Guidobono A.', winnerScore: '7-6 6-3' }),
  played({ date: '2026-03-14', time: '18:00', group: 'C', round: 3, playerA: 'Novizki P.', playerB: 'Córdoba D.', winner: 'Novizki P.', winnerScore: '6-2 6-4' }),
  played({ date: '2026-03-15', time: '10:30', group: 'C', round: 1, playerA: 'Filosa M.', playerB: 'Mena C.', winner: 'Filosa M.', winnerScore: '6-4 7-6' }),
  played({ date: '2026-03-16', time: '20:00', group: 'B', round: 4, playerA: 'Duarte D.', playerB: 'Garassi A.', winner: 'Garassi A.', winnerScore: '6-3 6-3' }),
  played({ date: '2026-03-18', time: '21:00', group: 'B', round: 5, playerA: 'Rothkel M.', playerB: 'Araujo J.', winner: 'Rothkel M.', winnerScore: '6-1 6-2' }),
  played({ date: '2026-03-19', time: '12:00', group: 'A', round: 1, playerA: 'Pfening G.', playerB: 'Álvarez I.', winner: 'Álvarez I.', winnerScore: '2-6 6-3 10-5' }),
  played({ date: '2026-03-20', time: '11:30', group: 'B', round: 2, playerA: 'Zanella H.', playerB: 'Garassi A.', winner: 'Garassi A.', winnerScore: '7-5 6-4' }),
  played({ date: '2026-03-22', time: '10:30', group: 'C', round: 3, playerA: 'Gaudina A.', playerB: 'Filosa M.', winner: 'Gaudina A.', winnerScore: '6-4 6-2' }),
  played({ date: '2026-03-27', time: '20:00', group: 'B', round: 0, playerA: 'Garassi A.', playerB: 'Naddeo M.', winner: 'Garassi A.', winnerScore: '6-1 6-4' }),
  played({ date: '2026-03-28', time: '19:45', group: 'B', round: 3, playerA: 'Duarte D.', playerB: 'Rothkel M.', winner: 'Rothkel M.', winnerScore: '6-3 6-3' }),
  played({ date: '2026-03-31', time: '22:00', group: 'A', round: 4, playerA: 'Guidobono A.', playerB: 'Pfening G.', winner: 'Pfening G.', winnerScore: '3-6 6-1 10-4' }),
  played({ date: '2026-04-01', time: '21:00', group: 'A', round: 3, playerA: 'Pfening G.', playerB: 'Tacain R.', winner: 'Tacain R.', winnerScore: '6-4 5-7 10-6' }),
  played({ date: '2026-04-02', time: '13:30', group: 'A', round: 1, playerA: 'Tacain R.', playerB: 'Arico S.', winner: 'Tacain R.', winnerScore: '6-4 6-3' }),
  played({ date: '2026-04-03', time: '12:00', group: 'C', round: 4, playerA: 'Novizki P.', playerB: 'Gaudina A.', winner: 'Novizki P.', winnerScore: '6-3 6-0' }),
  played({ date: '2026-04-05', time: '19:00', group: 'B', round: 1, playerA: 'Garassi A.', playerB: 'Rothkel M.', winner: 'Garassi A.', winnerScore: '6-4 6-1' }),
  played({ date: '2026-04-13', time: '20:00', group: 'B', round: 0, playerA: 'Naddeo M.', playerB: 'Duarte D.', winner: 'Duarte D.', winnerScore: '6-4 7-5' }),
  played({ date: '2026-04-14', time: '20:00', group: 'C', round: 2, playerA: 'Filosa M.', playerB: 'Novizki P.', winner: 'Novizki P.', winnerScore: '6-2 6-3' }),
  played({ date: '2026-04-14', time: '21:00', group: 'A', round: 2, playerA: 'Tacain R.', playerB: 'Guidobono A.', winner: 'Tacain R.', winnerScore: '6-2 3-6 10-7' }),
  played({ date: '2026-04-19', time: '10:00', group: 'A', round: 5, playerA: 'Arico S.', playerB: 'Guidobono A.', winner: 'Guidobono A.', winnerScore: '6-2 6-2' }),
  played({ date: '2026-04-24', time: '21:00', group: 'A', round: 5, playerA: 'Álvarez I.', playerB: 'Tacain R.', winner: 'Álvarez I.', winnerScore: '6-1 6-4' }),
  played({ date: '2026-04-26', time: '10:00', group: 'C', round: 1, playerA: 'Gaudina A.', playerB: 'Córdoba D.', winner: 'Gaudina A.', winnerScore: '7-5 6-4' }),
  played({ date: '2026-04-26', time: '17:00', group: 'B', round: 5, playerA: 'Zanella H.', playerB: 'Duarte D.', winner: 'Zanella H.', winnerScore: '7-5 6-1' }),
  played({ date: '2026-04-30', time: '12:30', group: 'C', round: 2, playerA: 'Mena C.', playerB: 'Gaudina A.', winner: 'Gaudina A.', winnerScore: '6-1 6-1' }),
  played({ date: '2026-05-01', time: '18:00', group: 'B', round: 4, playerA: 'Rothkel M.', playerB: 'Zanella H.', winner: 'Zanella H.', winnerScore: '6-1 7-6' }),
  played({ date: '2026-05-01', time: '19:30', group: 'C', round: 5, playerA: 'Córdoba D.', playerB: 'Filosa M.', winner: 'Córdoba D.', winnerScore: '4-6 6-2 10-8' }),
  walkover({ group: 'A', round: 2, playerA: 'Arico S.', playerB: 'Pfening G.', winner: 'Pfening G.' }),
  walkover({ group: 'A', round: 4, playerA: 'Álvarez I.', playerB: 'Arico S.', winner: 'Álvarez I.' }),
  walkover({ group: 'B', round: 0, playerA: 'Zanella H.', playerB: 'Naddeo M.', winner: 'Zanella H.' }),
  walkover({ group: 'C', round: 5, playerA: 'Mena C.', playerB: 'Novizki P.', winner: 'Novizki P.' }),
  walkover({ group: 'C', round: 4, playerA: 'Córdoba D.', playerB: 'Mena C.', winner: 'Córdoba D.' }),
  played({ date: '2026-05-10', time: '19:00', group: 'Repechaje', round: 0, playerA: 'Córdoba D.', playerB: 'Rothkel M.', winner: 'Córdoba D.', winnerScore: '6-2 6-4' }),
  played({ date: '2026-05-10', time: '11:00', group: 'Cuartos de Final', round: 0, playerA: 'Álvarez I.', playerB: 'Tacain R.', winner: 'Tacain R.', winnerScore: '6-4 6-4' }),
  played({ date: '2026-05-11', time: '22:00', group: 'Cuartos de Final', round: 0, playerA: 'Guidobono A.', playerB: 'Garassi A.', winner: 'Garassi A.', winnerScore: '6-2 4-6 10-2' }),
].map((m) => ({ ...m, matchId: matchInputDedupeKey(m) }));

function scheduleTimeFor(m: MatchInput): string {
  return (
    [
      ['A', 'Guidobono A.', 'Álvarez I.', '20:00'],
      ['C', 'Novizki P.', 'Córdoba D.', '18:00'],
      ['C', 'Filosa M.', 'Mena C.', '10:30'],
      ['B', 'Duarte D.', 'Garassi A.', '20:00'],
      ['B', 'Rothkel M.', 'Araujo J.', '21:00'],
      ['A', 'Pfening G.', 'Álvarez I.', '12:00'],
      ['B', 'Zanella H.', 'Garassi A.', '11:30'],
      ['C', 'Gaudina A.', 'Filosa M.', '10:30'],
      ['B', 'Garassi A.', 'Naddeo M.', '20:00'],
      ['B', 'Duarte D.', 'Rothkel M.', '19:45'],
      ['A', 'Guidobono A.', 'Pfening G.', '22:00'],
      ['A', 'Pfening G.', 'Tacain R.', '21:00'],
      ['A', 'Tacain R.', 'Arico S.', '13:30'],
      ['C', 'Novizki P.', 'Gaudina A.', '12:00'],
      ['B', 'Garassi A.', 'Rothkel M.', '19:00'],
      ['B', 'Naddeo M.', 'Duarte D.', '20:00'],
      ['C', 'Filosa M.', 'Novizki P.', '20:00'],
      ['A', 'Tacain R.', 'Guidobono A.', '21:00'],
      ['A', 'Arico S.', 'Guidobono A.', '10:00'],
      ['A', 'Álvarez I.', 'Tacain R.', '21:00'],
      ['C', 'Gaudina A.', 'Córdoba D.', '10:00'],
      ['B', 'Zanella H.', 'Duarte D.', '17:00'],
      ['C', 'Mena C.', 'Gaudina A.', '12:30'],
      ['B', 'Rothkel M.', 'Zanella H.', '18:00'],
      ['C', 'Córdoba D.', 'Filosa M.', '19:30'],
      ['Repechaje', 'Córdoba D.', 'Rothkel M.', '19:00'],
      ['Cuartos de Final', 'Álvarez I.', 'Tacain R.', '11:00'],
      ['Cuartos de Final', 'Guidobono A.', 'Garassi A.', '22:00'],
    ].find(([group, a, b]) => group === m.group && a === m.playerA && b === m.playerB)?.[3] ?? ''
  );
}

export const DEFAULT_NOVAK_LIGA1_SCHEDULES: MatchScheduleEntry[] = DEFAULT_NOVAK_LIGA1_RESULTS
  .filter((m) => m.status === 'played' && m.date)
  .map((m) => ({
    dedupeKey: matchInputDedupeKey(m),
    tournamentId: TOURNAMENT_ID,
    leagueNum: LEAGUE_NUM,
    scheduleStatus: 'confirmed',
    date: m.date,
    time: scheduleTimeFor(m),
    confirmedAt: Date.parse(`${m.date}T00:00:00`),
    updatedAt: Date.parse(`${m.date}T00:00:00`),
  }));

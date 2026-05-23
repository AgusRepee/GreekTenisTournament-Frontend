import type { MatchScheduleEntry } from '@/data/services/contracts/matchSchedulePort';
import type { LigaTemplate, MatchInput } from '@/types/tennisResults';
import { matchInputDedupeKey } from './matchDedupe';

export const LIGA6_ND_TOURNAMENT_ID = 't-novak-l6';
export const LIGA6_ND_LEAGUE_NUM = 6;

export const LIGA6_ND_CLASSIFICATION_RULE =
    'Clasifican a Cuartos de Final los 4 primeros de cada grupo. Cellilli F. y Ballesta F. pasan directo a Semifinal por BYE.';

export const LIGA6_ND_GROUPS = {
    A: ['Cellilli F.', 'Amezague J.', 'De Ruyck G.', 'Fedrjanic N.', 'Bataglia F.'],
    B: ['Ballesta F.', 'Antuña A.', 'Ferrarotti E.', 'Fratini M.'],
} as const;

export const LIGA6_ND_TEMPLATE: LigaTemplate = {
    torneo: 'Novak Djokovic',
    liga: LIGA6_ND_LEAGUE_NUM,
    grupos: LIGA6_ND_GROUPS,
    fechas: [],
    nota: LIGA6_ND_CLASSIFICATION_RULE,
};

type FixtureSeed = {
    group: string;
    round: number;
    playerA: string;
    playerB: string;
    ballPlayer?: string;
    winner?: string;
    winnerScore?: string;
    scoreIsPlayerAPerspective?: boolean;
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
          throw new Error(`Ganador fuera del partido Novak Djokovic - Liga 6: ${seed.winner}`);
    }
    if ((seed.status ?? 'played') === 'walkover') {
          return {
                  tournamentId: LIGA6_ND_TOURNAMENT_ID,
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
          tournamentId: LIGA6_ND_TOURNAMENT_ID,
          group: seed.group,
          round: seed.round,
          playerA: seed.playerA,
          playerB: seed.playerB,
          score: seed.scoreIsPlayerAPerspective || winnerIsA ? seed.winnerScore : invertScore(seed.winnerScore),
          status: seed.status ?? 'played',
          date: seed.date,
    };
}

export const LIGA6_ND_FIXTURES: FixtureSeed[] = [
    fixture({ group: 'A', round: 2, date: '2026-03-15', time: '18:00', playerA: 'De Ruyck G.', playerB: 'Amezague J.', ballPlayer: 'De Ruyck G.', winner: 'Amezague J.', winnerScore: '6-3 / 6-1' }),
    fixture({ group: 'A', round: 1, date: '2026-04-11', time: '18:30', playerA: 'Cellilli F.', playerB: 'Bataglia F.', ballPlayer: 'Cellilli F.', winner: 'Cellilli F.', winnerScore: '7-6 / 6-2', note: 'Postergado originalmente del 22/03/2026 15:00.' }),
    fixture({ group: 'A', round: 1, date: '2026-03-24', time: '14:00', playerA: 'De Ruyck G.', playerB: 'Fedrjanic N.', ballPlayer: 'De Ruyck G.', winner: 'De Ruyck G.', winnerScore: '6-0 / 7-5' }),
    fixture({ group: 'A', round: 5, date: '2026-04-04', time: '13:00', playerA: 'Fedrjanic N.', playerB: 'Amezague J.', ballPlayer: 'Fedrjanic N.', winner: 'Amezague J.', winnerScore: '6-4 / 6-1', note: 'Resultado corregido desde 6-4/-6-1.' }),
    fixture({ group: 'A', round: 5, date: '2026-04-18', time: '13:00', playerA: 'Bataglia F.', playerB: 'De Ruyck G.', ballPlayer: 'Bataglia F.', winner: 'De Ruyck G.', winnerScore: '6-2 / 6-1' }),
    fixture({ group: 'A', round: 4, date: '2026-04-19', time: '11:00', playerA: 'Amezague J.', playerB: 'Cellilli F.', ballPlayer: 'Amezague J.', winner: 'Cellilli F.', winnerScore: '7-5 / 2-6 / 10-5' }),
    fixture({ group: 'A', round: 2, date: '2026-04-26', time: '14:00', playerA: 'Fedrjanic N.', playerB: 'Cellilli F.', ballPlayer: 'Fedrjanic N.', winner: 'Cellilli F.', winnerScore: '6-1 / 6-4' }),
    fixture({ group: 'A', round: 3, date: '2026-04-26', time: '15:00', playerA: 'Amezague J.', playerB: 'Bataglia F.', ballPlayer: 'Amezague J.', winner: 'Amezague J.', winnerScore: '6-2 / 6-2' }),
    fixture({ group: 'A', round: 4, date: '2026-05-03', time: '15:00', playerA: 'Bataglia F.', playerB: 'Fedrjanic N.', ballPlayer: 'Bataglia F.', winner: 'Fedrjanic N.', winnerScore: '6-2 / 6-4' }),
    fixture({ group: 'A', round: 3, playerA: 'Cellilli F.', playerB: 'De Ruyck G.', winner: 'Cellilli F.', winnerScore: 'W.O.', status: 'walkover', note: 'Resultado informado el 06/05/2026.' }),

    fixture({ group: 'B', round: 2, date: '2026-03-15', time: '20:00', playerA: 'Antuña A.', playerB: 'Ballesta F.', ballPlayer: 'Antuña A.', winner: 'Ballesta F.', winnerScore: '6-2 / 3-6 / 10-7', note: 'Unificado desde Antuña R.' }),
    fixture({ group: 'B', round: 5, date: '2026-03-24', time: '09:00', playerA: 'Antuña A.', playerB: 'Fratini M.', ballPlayer: 'Antuña A.', winner: 'Antuña A.', winnerScore: '6-1 / 6-1', note: 'Unificado desde Antuña R.' }),
    fixture({ group: 'B', round: 1, date: '2026-04-02', time: '21:00', playerA: 'Ballesta F.', playerB: 'Ferrarotti E.', ballPlayer: 'Ballesta F.', winner: 'Ballesta F.', winnerScore: '6-1 / 6-1' }),
    fixture({ group: 'B', round: 3, date: '2026-04-12', time: '16:00', playerA: 'Fratini M.', playerB: 'Ferrarotti E.', ballPlayer: 'Fratini M.', winner: 'Ferrarotti E.', winnerScore: '6-2 / 6-1' }),
    fixture({ group: 'B', round: 4, date: '2026-04-26', time: '19:00', playerA: 'Ferrarotti E.', playerB: 'Antuña A.', ballPlayer: 'Ferrarotti E.', winner: 'Antuña A.', winnerScore: '6-1 / 6-0' }),
    fixture({ group: 'B', round: 4, playerA: 'Ballesta F.', playerB: 'Fratini M.', winner: 'Ballesta F.', winnerScore: 'W.O.', status: 'walkover', note: 'Resultado informado el 06/05/2026.' }),
    

    fixture({ group: 'Cuartos de Final', round: 0, playerA: 'Cellilli F.', playerB: 'BYE', winner: 'Cellilli F.', winnerScore: 'W.O.', status: 'walkover', note: 'Cellilli F. pasa directo a Semifinal por BYE.' }),
    fixture({ group: 'Cuartos de Final', round: 0, playerA: 'Antuña A.', playerB: 'De Ruyck G.', note: 'Pendiente / sin resultado cargado.' }),
    fixture({ group: 'Cuartos de Final', round: 0, playerA: 'Amezague J.', playerB: 'Ferrarotti E.', note: 'Pendiente / sin resultado cargado.' }),
    fixture({ group: 'Cuartos de Final', round: 0, playerA: 'BYE', playerB: 'Ballesta F.', winner: 'Ballesta F.', winnerScore: 'W.O.', status: 'walkover', note: 'Ballesta F. pasa directo a Semifinal por BYE.' }),
    fixture({ group: 'Semifinales', round: 0, playerA: 'Cellilli F.', playerB: 'Ganador Antuña A. / De Ruyck G.', note: 'Pendiente.' }),
    fixture({ group: 'Semifinales', round: 0, playerA: 'Ganador Amezague J. / Ferrarotti E.', playerB: 'Ballesta F.', note: 'Pendiente.' }),
    fixture({ group: 'Final', round: 0, playerA: 'Ganador Semifinal 1', playerB: 'Ganador Semifinal 2', note: 'Pendiente.' }),
  ];

export const DEFAULT_LIGA6_ND_RESULTS: MatchInput[] = LIGA6_ND_FIXTURES
  .filter((m) => m.group === 'A' || m.group === 'B')
  .map(toResult)
  .filter((m): m is MatchInput => Boolean(m))
  .map((m) => ({ ...m, matchId: matchInputDedupeKey(m) }));

export const DEFAULT_LIGA6_ND_SCHEDULES: MatchScheduleEntry[] = LIGA6_ND_FIXTURES.map((m) => {
    const dedupeKey = matchInputDedupeKey({
          tournamentId: LIGA6_ND_TOURNAMENT_ID,
          group: m.group,
          round: m.round,
          playerA: m.playerA,
          playerB: m.playerB,
    });
    const dateMs = m.date ? Date.parse(`${m.date}T00:00:00`) : Date.parse('2026-01-01T00:00:00');
    return {
          dedupeKey,
          tournamentId: LIGA6_ND_TOURNAMENT_ID,
          leagueNum: LIGA6_ND_LEAGUE_NUM,
          scheduleStatus: m.date || m.time ? 'confirmed' : 'unscheduled',
          date: m.date,
          time: m.time,
          note: [m.ballPlayer ? `Jugador con pelotas: ${m.ballPlayer}.` : '', m.note ?? ''].filter(Boolean).join(' '),
          confirmedAt: m.date ? dateMs : undefined,
          updatedAt: dateMs,
    };
});

import type { GroupFixtureMatch, GroupFecha, GroupStageGroup } from '@/lib/mockData';
import type { MatchScheduleEntry } from '@/data/services/contracts/matchSchedulePort';
import type { LigaTemplate } from '@/types/tennisResults';
import { matchInputDedupeKey } from './matchDedupe';

export const NOVAK_LIGA3_TOURNAMENT_ID = 't-novak-l3';
export const NOVAK_LIGA3_LEAGUE_NUM = 3;

export const NOVAK_LIGA3_GROUPS = {
  A: ['Pusterla P.', 'Santi M.', 'Rusel S.', 'Bocchicchio F.', 'Repecka A.'],
  B: ['Marin G.', 'Fernandez B.', 'Casadio M.', 'Aguirre W.', 'Bianco D.'],
  C: ['Vito C.', 'Santi G.', 'Del Valle G.', 'Ferreres G.', 'Figueroa M.'],
} as const;

export const NOVAK_LIGA3_TEMPLATE: LigaTemplate = {
  torneo: 'Novak Djokovic',
  liga: NOVAK_LIGA3_LEAGUE_NUM,
  grupos: NOVAK_LIGA3_GROUPS,
  fechas: [
    {
      numero: 1,
      grupos: {
        A: ['Pusterla P. (P) vs Santi M.', 'Rusel S. (P) vs Bocchicchio F.', 'Libre: Repecka A.'],
        B: ['Marin G. (P) vs Fernandez B.', 'Casadio M. (P) vs Aguirre W.', 'Libre: Bianco D.'],
        C: ['Vito C. (P) vs Santi G.', 'Del Valle G. (P) vs Ferreres G.', 'Libre: Figueroa M.'],
      },
    },
    {
      numero: 2,
      grupos: {
        A: ['Bocchicchio F. (P) vs Pusterla P.', 'Rusel S. (P) vs Repecka A.', 'Libre: Santi M.'],
        B: ['Aguirre W. (P) vs Marin G.', 'Casadio M. (P) vs Bianco D.', 'Libre: Fernandez B.'],
        C: ['Ferreres G. (P) vs Vito C.', 'Del Valle G. (P) vs Figueroa M.', 'Libre: Santi G.'],
      },
    },
    {
      numero: 3,
      grupos: {
        A: ['Pusterla P. (P) vs Rusel S.', 'Repecka A. (P) vs Santi M.', 'Libre: Bocchicchio F.'],
        B: ['Marin G. (P) vs Casadio M.', 'Bianco D. (P) vs Fernandez B.', 'Libre: Aguirre W.'],
        C: ['Vito C. (P) vs Del Valle G.', 'Figueroa M. (P) vs Santi G.', 'Libre: Ferreres G.'],
      },
    },
    {
      numero: 4,
      grupos: {
        A: ['Repecka A. (P) vs Pusterla P.', 'Santi M. (P) vs Bocchicchio F.', 'Libre: Rusel S.'],
        B: ['Bianco D. (P) vs Marin G.', 'Fernandez B. (P) vs Aguirre W.', 'Libre: Casadio M.'],
        C: ['Figueroa M. (P) vs Vito C.', 'Santi G. (P) vs Ferreres G.', 'Libre: Del Valle G.'],
      },
    },
    {
      numero: 5,
      grupos: {
        A: ['Santi M. (P) vs Rusel S.', 'Bocchicchio F. (P) vs Repecka A.', 'Libre: Pusterla P.'],
        B: ['Fernandez B. (P) vs Casadio M.', 'Aguirre W. (P) vs Bianco D.', 'Libre: Marin G.'],
        C: ['Santi G. (P) vs Del Valle G.', 'Ferreres G. (P) vs Figueroa M.', 'Libre: Vito C.'],
      },
    },
  ],
};

export type NovakLiga3FixtureSeed = {
  group: keyof typeof NOVAK_LIGA3_GROUPS | string;
  round: number;
  playerA: string;
  playerB: string;
  ballPlayer: string;
};

function fixture(seed: NovakLiga3FixtureSeed): NovakLiga3FixtureSeed {
  return seed;
}

export const NOVAK_LIGA3_FIXTURES: NovakLiga3FixtureSeed[] = [
  fixture({ group: 'A', round: 1, playerA: 'Pusterla P.', playerB: 'Santi M.', ballPlayer: 'Pusterla P.' }),
  fixture({ group: 'A', round: 1, playerA: 'Rusel S.', playerB: 'Bocchicchio F.', ballPlayer: 'Rusel S.' }),
  fixture({ group: 'A', round: 2, playerA: 'Bocchicchio F.', playerB: 'Pusterla P.', ballPlayer: 'Bocchicchio F.' }),
  fixture({ group: 'A', round: 2, playerA: 'Rusel S.', playerB: 'Repecka A.', ballPlayer: 'Rusel S.' }),
  fixture({ group: 'A', round: 3, playerA: 'Pusterla P.', playerB: 'Rusel S.', ballPlayer: 'Pusterla P.' }),
  fixture({ group: 'A', round: 3, playerA: 'Repecka A.', playerB: 'Santi M.', ballPlayer: 'Repecka A.' }),
  fixture({ group: 'A', round: 4, playerA: 'Repecka A.', playerB: 'Pusterla P.', ballPlayer: 'Repecka A.' }),
  fixture({ group: 'A', round: 4, playerA: 'Santi M.', playerB: 'Bocchicchio F.', ballPlayer: 'Santi M.' }),
  fixture({ group: 'A', round: 5, playerA: 'Santi M.', playerB: 'Rusel S.', ballPlayer: 'Santi M.' }),
  fixture({ group: 'A', round: 5, playerA: 'Bocchicchio F.', playerB: 'Repecka A.', ballPlayer: 'Bocchicchio F.' }),
  fixture({ group: 'B', round: 1, playerA: 'Marin G.', playerB: 'Fernandez B.', ballPlayer: 'Marin G.' }),
  fixture({ group: 'B', round: 1, playerA: 'Casadio M.', playerB: 'Aguirre W.', ballPlayer: 'Casadio M.' }),
  fixture({ group: 'B', round: 2, playerA: 'Aguirre W.', playerB: 'Marin G.', ballPlayer: 'Aguirre W.' }),
  fixture({ group: 'B', round: 2, playerA: 'Casadio M.', playerB: 'Bianco D.', ballPlayer: 'Casadio M.' }),
  fixture({ group: 'B', round: 3, playerA: 'Marin G.', playerB: 'Casadio M.', ballPlayer: 'Marin G.' }),
  fixture({ group: 'B', round: 3, playerA: 'Bianco D.', playerB: 'Fernandez B.', ballPlayer: 'Bianco D.' }),
  fixture({ group: 'B', round: 4, playerA: 'Bianco D.', playerB: 'Marin G.', ballPlayer: 'Bianco D.' }),
  fixture({ group: 'B', round: 4, playerA: 'Fernandez B.', playerB: 'Aguirre W.', ballPlayer: 'Fernandez B.' }),
  fixture({ group: 'B', round: 5, playerA: 'Fernandez B.', playerB: 'Casadio M.', ballPlayer: 'Fernandez B.' }),
  fixture({ group: 'B', round: 5, playerA: 'Aguirre W.', playerB: 'Bianco D.', ballPlayer: 'Aguirre W.' }),
  fixture({ group: 'C', round: 1, playerA: 'Vito C.', playerB: 'Santi G.', ballPlayer: 'Vito C.' }),
  fixture({ group: 'C', round: 1, playerA: 'Del Valle G.', playerB: 'Ferreres G.', ballPlayer: 'Del Valle G.' }),
  fixture({ group: 'C', round: 2, playerA: 'Ferreres G.', playerB: 'Vito C.', ballPlayer: 'Ferreres G.' }),
  fixture({ group: 'C', round: 2, playerA: 'Del Valle G.', playerB: 'Figueroa M.', ballPlayer: 'Del Valle G.' }),
  fixture({ group: 'C', round: 3, playerA: 'Vito C.', playerB: 'Del Valle G.', ballPlayer: 'Vito C.' }),
  fixture({ group: 'C', round: 3, playerA: 'Figueroa M.', playerB: 'Santi G.', ballPlayer: 'Figueroa M.' }),
  fixture({ group: 'C', round: 4, playerA: 'Figueroa M.', playerB: 'Vito C.', ballPlayer: 'Figueroa M.' }),
  fixture({ group: 'C', round: 4, playerA: 'Santi G.', playerB: 'Ferreres G.', ballPlayer: 'Santi G.' }),
  fixture({ group: 'C', round: 5, playerA: 'Santi G.', playerB: 'Del Valle G.', ballPlayer: 'Santi G.' }),
  fixture({ group: 'C', round: 5, playerA: 'Ferreres G.', playerB: 'Figueroa M.', ballPlayer: 'Ferreres G.' }),
];

export const NOVAK_LIGA3_BYE_BY_GROUP_ROUND: Record<string, Record<number, string>> = {
  A: { 1: 'Repecka A.', 2: 'Santi M.', 3: 'Bocchicchio F.', 4: 'Rusel S.', 5: 'Pusterla P.' },
  B: { 1: 'Bianco D.', 2: 'Fernandez B.', 3: 'Aguirre W.', 4: 'Casadio M.', 5: 'Marin G.' },
  C: { 1: 'Figueroa M.', 2: 'Santi G.', 3: 'Ferreres G.', 4: 'Del Valle G.', 5: 'Vito C.' },
};

export const DEFAULT_NOVAK_LIGA3_SCHEDULES: MatchScheduleEntry[] = NOVAK_LIGA3_FIXTURES.map((m) => {
  const dedupeKey = matchInputDedupeKey({
    tournamentId: NOVAK_LIGA3_TOURNAMENT_ID,
    group: m.group,
    round: m.round,
    playerA: m.playerA,
    playerB: m.playerB,
  });
  return {
    dedupeKey,
    tournamentId: NOVAK_LIGA3_TOURNAMENT_ID,
    leagueNum: NOVAK_LIGA3_LEAGUE_NUM,
    scheduleStatus: 'unscheduled',
    note: `Jugador con pelotas: ${m.ballPlayer}.`,
    updatedAt: Date.parse('2026-06-01T00:00:00'),
  };
});

function groupLabel(key: string): string {
  return `Grupo ${key.toUpperCase()}`;
}

export function buildNovakLiga3GroupStageFixtures(): GroupStageGroup[] {
  const acc = new Map<string, Map<number, GroupFixtureMatch[]>>();

  for (const m of NOVAK_LIGA3_FIXTURES) {
    const name = groupLabel(m.group);
    if (!acc.has(name)) acc.set(name, new Map());
    const byRound = acc.get(name)!;
    if (!byRound.has(m.round)) byRound.set(m.round, []);
    byRound.get(m.round)!.push({
      playerA: m.playerA,
      playerB: m.playerB,
      ballsByA: m.ballPlayer === m.playerA,
    });
  }

  return [...acc.keys()]
    .sort((a, b) => a.localeCompare(b, 'es'))
    .map((name) => {
      const groupKey = name.replace(/^Grupo\s+/i, '').toUpperCase();
      const byRound = acc.get(name)!;
      const fechas: GroupFecha[] = [...byRound.entries()]
        .sort(([a], [b]) => a - b)
        .map(([fecha, matches]) => ({
          fecha,
          matches,
          libre: NOVAK_LIGA3_BYE_BY_GROUP_ROUND[groupKey]?.[fecha],
        }));
      return { name, fechas };
    });
}

export function isNovakLiga3TournamentId(tournamentId: string): boolean {
  return tournamentId.trim() === NOVAK_LIGA3_TOURNAMENT_ID;
}

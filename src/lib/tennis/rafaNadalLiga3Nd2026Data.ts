import type { GroupFixtureMatch, GroupFecha, GroupStageGroup } from '@/lib/mockData';
import type { MatchScheduleEntry } from '@/data/services/contracts/matchSchedulePort';
import type { LigaTemplate } from '@/types/tennisResults';
import { matchInputDedupeKey } from './matchDedupe';

export const RAFA_LIGA3_TOURNAMENT_ID = 't-rafa-nadal-l3';
export const RAFA_LIGA3_LEAGUE_NUM = 3;

export const RAFA_LIGA3_GROUPS = {
  A: ['Santi Mat.', 'Casadio M.', 'Vito C.', 'Aguirre W.', 'Del Valle G.'],
  B: ['Fernandez B.', 'Santi Mar.', 'Ferreres G.', 'Bocchicchio F.', 'Bernardini G.'],
  C: ['Figueroa M.', 'Rusel S.', 'Marin G.', 'Pusterla P.', 'Bianco D.'],
} as const;

export const RAFA_LIGA3_TEMPLATE: LigaTemplate = {
  torneo: 'Rafael Nadal',
  liga: RAFA_LIGA3_LEAGUE_NUM,
  grupos: RAFA_LIGA3_GROUPS,
  fechas: [
    {
      numero: 1,
      grupos: {
        A: ['Santi Mat. (P) vs Casadio M.', 'Vito C. (P) vs Aguirre W.', 'Libre: Del Valle G.'],
        B: ['Fernandez B. (P) vs Santi Mar.', 'Ferreres G. (P) vs Bocchicchio F.', 'Libre: Bernardini G.'],
        C: ['Figueroa M. (P) vs Rusel S.', 'Marin G. (P) vs Pusterla P.', 'Libre: Bianco D.'],
      },
    },
    {
      numero: 2,
      grupos: {
        A: ['Aguirre W. (P) vs Santi Mat.', 'Vito C. (P) vs Del Valle G.', 'Libre: Casadio M.'],
        B: ['Bocchicchio F. (P) vs Fernandez B.', 'Ferreres G. (P) vs Bernardini G.', 'Libre: Santi Mar.'],
        C: ['Pusterla P. (P) vs Figueroa M.', 'Marin G. (P) vs Bianco D.', 'Libre: Rusel S.'],
      },
    },
    {
      numero: 3,
      grupos: {
        A: ['Santi Mat. (P) vs Vito C.', 'Del Valle G. (P) vs Casadio M.', 'Libre: Aguirre W.'],
        B: ['Fernandez B. (P) vs Ferreres G.', 'Bernardini G. (P) vs Santi Mar.', 'Libre: Bocchicchio F.'],
        C: ['Figueroa M. (P) vs Marin G.', 'Bianco D. (P) vs Rusel S.', 'Libre: Pusterla P.'],
      },
    },
    {
      numero: 4,
      grupos: {
        A: ['Del Valle G. (P) vs Santi Mat.', 'Casadio M. (P) vs Aguirre W.', 'Libre: Vito C.'],
        B: ['Bernardini G. (P) vs Fernandez B.', 'Santi Mar. (P) vs Bocchicchio F.', 'Libre: Ferreres G.'],
        C: ['Bianco D. (P) vs Figueroa M.', 'Rusel S. (P) vs Pusterla P.', 'Libre: Marin G.'],
      },
    },
    {
      numero: 5,
      grupos: {
        A: ['Casadio M. (P) vs Vito C.', 'Aguirre W. (P) vs Del Valle G.', 'Libre: Santi Mat.'],
        B: ['Santi Mar. (P) vs Ferreres G.', 'Bocchicchio F. (P) vs Bernardini G.', 'Libre: Fernandez B.'],
        C: ['Rusel S. (P) vs Marin G.', 'Pusterla P. (P) vs Bianco D.', 'Libre: Figueroa M.'],
      },
    },
  ],
};

export type RafaLiga3FixtureSeed = {
  group: keyof typeof RAFA_LIGA3_GROUPS | string;
  round: number;
  playerA: string;
  playerB: string;
  ballPlayer: string;
};

function fixture(seed: RafaLiga3FixtureSeed): RafaLiga3FixtureSeed {
  return seed;
}

export const RAFA_LIGA3_FIXTURES: RafaLiga3FixtureSeed[] = [
  fixture({ group: 'A', round: 1, playerA: 'Santi Mat.', playerB: 'Casadio M.', ballPlayer: 'Santi Mat.' }),
  fixture({ group: 'A', round: 1, playerA: 'Vito C.', playerB: 'Aguirre W.', ballPlayer: 'Vito C.' }),
  fixture({ group: 'A', round: 2, playerA: 'Aguirre W.', playerB: 'Santi Mat.', ballPlayer: 'Aguirre W.' }),
  fixture({ group: 'A', round: 2, playerA: 'Vito C.', playerB: 'Del Valle G.', ballPlayer: 'Vito C.' }),
  fixture({ group: 'A', round: 3, playerA: 'Santi Mat.', playerB: 'Vito C.', ballPlayer: 'Santi Mat.' }),
  fixture({ group: 'A', round: 3, playerA: 'Del Valle G.', playerB: 'Casadio M.', ballPlayer: 'Del Valle G.' }),
  fixture({ group: 'A', round: 4, playerA: 'Del Valle G.', playerB: 'Santi Mat.', ballPlayer: 'Del Valle G.' }),
  fixture({ group: 'A', round: 4, playerA: 'Casadio M.', playerB: 'Aguirre W.', ballPlayer: 'Casadio M.' }),
  fixture({ group: 'A', round: 5, playerA: 'Casadio M.', playerB: 'Vito C.', ballPlayer: 'Casadio M.' }),
  fixture({ group: 'A', round: 5, playerA: 'Aguirre W.', playerB: 'Del Valle G.', ballPlayer: 'Aguirre W.' }),
  fixture({ group: 'B', round: 1, playerA: 'Fernandez B.', playerB: 'Santi Mar.', ballPlayer: 'Fernandez B.' }),
  fixture({ group: 'B', round: 1, playerA: 'Ferreres G.', playerB: 'Bocchicchio F.', ballPlayer: 'Ferreres G.' }),
  fixture({ group: 'B', round: 2, playerA: 'Bocchicchio F.', playerB: 'Fernandez B.', ballPlayer: 'Bocchicchio F.' }),
  fixture({ group: 'B', round: 2, playerA: 'Ferreres G.', playerB: 'Bernardini G.', ballPlayer: 'Ferreres G.' }),
  fixture({ group: 'B', round: 3, playerA: 'Fernandez B.', playerB: 'Ferreres G.', ballPlayer: 'Fernandez B.' }),
  fixture({ group: 'B', round: 3, playerA: 'Bernardini G.', playerB: 'Santi Mar.', ballPlayer: 'Bernardini G.' }),
  fixture({ group: 'B', round: 4, playerA: 'Bernardini G.', playerB: 'Fernandez B.', ballPlayer: 'Bernardini G.' }),
  fixture({ group: 'B', round: 4, playerA: 'Santi Mar.', playerB: 'Bocchicchio F.', ballPlayer: 'Santi Mar.' }),
  fixture({ group: 'B', round: 5, playerA: 'Santi Mar.', playerB: 'Ferreres G.', ballPlayer: 'Santi Mar.' }),
  fixture({ group: 'B', round: 5, playerA: 'Bocchicchio F.', playerB: 'Bernardini G.', ballPlayer: 'Bocchicchio F.' }),
  fixture({ group: 'C', round: 1, playerA: 'Figueroa M.', playerB: 'Rusel S.', ballPlayer: 'Figueroa M.' }),
  fixture({ group: 'C', round: 1, playerA: 'Marin G.', playerB: 'Pusterla P.', ballPlayer: 'Marin G.' }),
  fixture({ group: 'C', round: 2, playerA: 'Pusterla P.', playerB: 'Figueroa M.', ballPlayer: 'Pusterla P.' }),
  fixture({ group: 'C', round: 2, playerA: 'Marin G.', playerB: 'Bianco D.', ballPlayer: 'Marin G.' }),
  fixture({ group: 'C', round: 3, playerA: 'Figueroa M.', playerB: 'Marin G.', ballPlayer: 'Figueroa M.' }),
  fixture({ group: 'C', round: 3, playerA: 'Bianco D.', playerB: 'Rusel S.', ballPlayer: 'Bianco D.' }),
  fixture({ group: 'C', round: 4, playerA: 'Bianco D.', playerB: 'Figueroa M.', ballPlayer: 'Bianco D.' }),
  fixture({ group: 'C', round: 4, playerA: 'Rusel S.', playerB: 'Pusterla P.', ballPlayer: 'Rusel S.' }),
  fixture({ group: 'C', round: 5, playerA: 'Rusel S.', playerB: 'Marin G.', ballPlayer: 'Rusel S.' }),
  fixture({ group: 'C', round: 5, playerA: 'Pusterla P.', playerB: 'Bianco D.', ballPlayer: 'Pusterla P.' }),
];

export const RAFA_LIGA3_BYE_BY_GROUP_ROUND: Record<string, Record<number, string>> = {
  A: { 1: 'Del Valle G.', 2: 'Casadio M.', 3: 'Aguirre W.', 4: 'Vito C.', 5: 'Santi Mat.' },
  B: { 1: 'Bernardini G.', 2: 'Santi Mar.', 3: 'Bocchicchio F.', 4: 'Ferreres G.', 5: 'Fernandez B.' },
  C: { 1: 'Bianco D.', 2: 'Rusel S.', 3: 'Pusterla P.', 4: 'Marin G.', 5: 'Figueroa M.' },
};

export const DEFAULT_RAFA_LIGA3_SCHEDULES: MatchScheduleEntry[] = RAFA_LIGA3_FIXTURES.map((m) => {
  const dedupeKey = matchInputDedupeKey({
    tournamentId: RAFA_LIGA3_TOURNAMENT_ID,
    group: m.group,
    round: m.round,
    playerA: m.playerA,
    playerB: m.playerB,
  });
  return {
    dedupeKey,
    tournamentId: RAFA_LIGA3_TOURNAMENT_ID,
    leagueNum: RAFA_LIGA3_LEAGUE_NUM,
    scheduleStatus: 'unscheduled',
    note: `Jugador con pelotas: ${m.ballPlayer}.`,
    updatedAt: Date.parse('2026-05-31T00:00:00'),
  };
});

function groupLabel(key: string): string {
  return `Grupo ${key.toUpperCase()}`;
}

export function buildRafaLiga3GroupStageFixtures(): GroupStageGroup[] {
  const acc = new Map<string, Map<number, GroupFixtureMatch[]>>();

  for (const m of RAFA_LIGA3_FIXTURES) {
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
      const byRound = acc.get(name)!;
      const fechas: GroupFecha[] = [...byRound.entries()]
        .sort(([a], [b]) => a - b)
        .map(([fecha, matches]) => ({ fecha, matches }));
      return { name, fechas };
    });
}

export function isRafaNadalLiga3TournamentId(tournamentId: string): boolean {
  return tournamentId.trim() === RAFA_LIGA3_TOURNAMENT_ID;
}

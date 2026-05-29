import type { GroupFixtureMatch, GroupFecha, GroupStageGroup } from '@/lib/mockData';
import type { MatchScheduleEntry } from '@/data/services/contracts/matchSchedulePort';
import type { LigaTemplate } from '@/types/tennisResults';
import { matchInputDedupeKey } from './matchDedupe';

export const RAFAEL_LIGA1_TOURNAMENT_ID = 't-rafael-nadal-l1';
export const RAFAEL_LIGA1_LEAGUE_NUM = 1;
export const RAFAEL_LIGA1_INTERZONAL_GROUP = 'Interzonal';

export const RAFAEL_LIGA1_GROUPS = {
  A: ['Gaudina A.', 'Filosa M.', 'Guidobono A.', 'Duarte D.'],
  B: ['Garassi A.', 'Tacain R.', 'Rothkel M.', 'Lacave L.'],
  C: ['Pfening G.', 'Zanella H.', 'Alvarez I.', 'Naddeo M.'],
} as const;

export const RAFAEL_LIGA1_TEMPLATE: LigaTemplate = {
  torneo: 'Rafael Nadal',
  liga: RAFAEL_LIGA1_LEAGUE_NUM,
  grupos: RAFAEL_LIGA1_GROUPS,
  fechas: [
    {
      numero: 1,
      grupos: {
        A: ['Gaudina A. (P) vs Guidobono A.', 'Filosa M. (P) vs Duarte D.'],
        B: ['Lacave L. (P) vs Tacain R.', 'Rothkel M. (P) vs Garassi A.'],
        C: ['Pfening G. (P) vs Alvarez I.', 'Naddeo M. (P) vs Zanella H.'],
      },
    },
    {
      numero: 2,
      grupos: {
        A: ['Gaudina A. (P) vs Filosa M.', 'Duarte D. (P) vs Guidobono A.'],
        B: ['Rothkel M. (P) vs Lacave L.', 'Tacain R. (P) vs Garassi A.'],
        C: ['Pfening G. (P) vs Naddeo M.', 'Alvarez I. (P) vs Zanella H.'],
      },
    },
    {
      numero: 3,
      grupos: {
        A: ['Duarte D. (P) vs Gaudina A.', 'Guidobono A. (P) vs Filosa M.'],
        B: ['Garassi A. (P) vs Lacave L.', 'Rothkel M. (P) vs Tacain R.'],
        C: ['Zanella H. (P) vs Pfening G.', 'Alvarez I. (P) vs Naddeo M.'],
      },
    },
    {
      numero: 4,
      tipo: 'interzonal',
      partidos: [
        'Zanella H. (P) vs Gaudina A.',
        'Guidobono A. (P) vs Pfening G.',
        'Filosa M. (P) vs Rothkel M.',
        'Garassi A. (P) vs Duarte D.',
        'Lacave L. (P) vs Alvarez I.',
        'Naddeo M. (P) vs Tacain R.',
      ],
    },
  ],
};

export type RafaelLiga1FixtureSeed = {
  group: string;
  round: number;
  playerA: string;
  playerB: string;
  ballPlayer: string;
};

function fixture(seed: RafaelLiga1FixtureSeed): RafaelLiga1FixtureSeed {
  return seed;
}

export const RAFAEL_LIGA1_FIXTURES: RafaelLiga1FixtureSeed[] = [
  fixture({ group: 'A', round: 1, playerA: 'Gaudina A.', playerB: 'Guidobono A.', ballPlayer: 'Gaudina A.' }),
  fixture({ group: 'A', round: 1, playerA: 'Filosa M.', playerB: 'Duarte D.', ballPlayer: 'Filosa M.' }),
  fixture({ group: 'A', round: 2, playerA: 'Gaudina A.', playerB: 'Filosa M.', ballPlayer: 'Gaudina A.' }),
  fixture({ group: 'A', round: 2, playerA: 'Duarte D.', playerB: 'Guidobono A.', ballPlayer: 'Duarte D.' }),
  fixture({ group: 'A', round: 3, playerA: 'Duarte D.', playerB: 'Gaudina A.', ballPlayer: 'Duarte D.' }),
  fixture({ group: 'A', round: 3, playerA: 'Guidobono A.', playerB: 'Filosa M.', ballPlayer: 'Guidobono A.' }),
  fixture({ group: 'B', round: 1, playerA: 'Lacave L.', playerB: 'Tacain R.', ballPlayer: 'Lacave L.' }),
  fixture({ group: 'B', round: 1, playerA: 'Rothkel M.', playerB: 'Garassi A.', ballPlayer: 'Rothkel M.' }),
  fixture({ group: 'B', round: 2, playerA: 'Rothkel M.', playerB: 'Lacave L.', ballPlayer: 'Rothkel M.' }),
  fixture({ group: 'B', round: 2, playerA: 'Tacain R.', playerB: 'Garassi A.', ballPlayer: 'Tacain R.' }),
  fixture({ group: 'B', round: 3, playerA: 'Garassi A.', playerB: 'Lacave L.', ballPlayer: 'Garassi A.' }),
  fixture({ group: 'B', round: 3, playerA: 'Rothkel M.', playerB: 'Tacain R.', ballPlayer: 'Rothkel M.' }),
  fixture({ group: 'C', round: 1, playerA: 'Pfening G.', playerB: 'Alvarez I.', ballPlayer: 'Pfening G.' }),
  fixture({ group: 'C', round: 1, playerA: 'Naddeo M.', playerB: 'Zanella H.', ballPlayer: 'Naddeo M.' }),
  fixture({ group: 'C', round: 2, playerA: 'Pfening G.', playerB: 'Naddeo M.', ballPlayer: 'Pfening G.' }),
  fixture({ group: 'C', round: 2, playerA: 'Alvarez I.', playerB: 'Zanella H.', ballPlayer: 'Alvarez I.' }),
  fixture({ group: 'C', round: 3, playerA: 'Zanella H.', playerB: 'Pfening G.', ballPlayer: 'Zanella H.' }),
  fixture({ group: 'C', round: 3, playerA: 'Alvarez I.', playerB: 'Naddeo M.', ballPlayer: 'Alvarez I.' }),
  fixture({ group: RAFAEL_LIGA1_INTERZONAL_GROUP, round: 4, playerA: 'Zanella H.', playerB: 'Gaudina A.', ballPlayer: 'Zanella H.' }),
  fixture({ group: RAFAEL_LIGA1_INTERZONAL_GROUP, round: 4, playerA: 'Guidobono A.', playerB: 'Pfening G.', ballPlayer: 'Guidobono A.' }),
  fixture({ group: RAFAEL_LIGA1_INTERZONAL_GROUP, round: 4, playerA: 'Filosa M.', playerB: 'Rothkel M.', ballPlayer: 'Filosa M.' }),
  fixture({ group: RAFAEL_LIGA1_INTERZONAL_GROUP, round: 4, playerA: 'Garassi A.', playerB: 'Duarte D.', ballPlayer: 'Garassi A.' }),
  fixture({ group: RAFAEL_LIGA1_INTERZONAL_GROUP, round: 4, playerA: 'Lacave L.', playerB: 'Alvarez I.', ballPlayer: 'Lacave L.' }),
  fixture({ group: RAFAEL_LIGA1_INTERZONAL_GROUP, round: 4, playerA: 'Naddeo M.', playerB: 'Tacain R.', ballPlayer: 'Naddeo M.' }),
];

export const DEFAULT_RAFAEL_LIGA1_SCHEDULES: MatchScheduleEntry[] = RAFAEL_LIGA1_FIXTURES.map((m) => {
  const dedupeKey = matchInputDedupeKey({
    tournamentId: RAFAEL_LIGA1_TOURNAMENT_ID,
    group: m.group,
    round: m.round,
    playerA: m.playerA,
    playerB: m.playerB,
  });
  return {
    dedupeKey,
    tournamentId: RAFAEL_LIGA1_TOURNAMENT_ID,
    leagueNum: RAFAEL_LIGA1_LEAGUE_NUM,
    scheduleStatus: 'unscheduled',
    note: `Jugador con pelotas: ${m.ballPlayer}.`,
    updatedAt: Date.parse('2026-05-27T00:00:00'),
  };
});

function groupDisplayName(groupKey: string): string {
  if (groupKey === RAFAEL_LIGA1_INTERZONAL_GROUP) return 'Interzonal';
  return `Grupo ${groupKey.toUpperCase()}`;
}

export function buildRafaelLiga1GroupStageFixtures(): GroupStageGroup[] {
  const acc = new Map<string, Map<number, GroupFixtureMatch[]>>();

  for (const m of RAFAEL_LIGA1_FIXTURES) {
    const name = groupDisplayName(m.group);
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
    .sort((a, b) => {
      if (a === 'Interzonal') return 1;
      if (b === 'Interzonal') return -1;
      return a.localeCompare(b, 'es');
    })
    .map((name) => {
      const byRound = acc.get(name)!;
      const fechas: GroupFecha[] = [...byRound.entries()]
        .sort(([a], [b]) => a - b)
        .map(([fecha, matches]) => ({ fecha, matches }));
      return { name, fechas };
    });
}

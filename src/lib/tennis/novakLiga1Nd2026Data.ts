import type { GroupFixtureMatch, GroupFecha, GroupStageGroup } from '@/lib/mockData';
import type { MatchScheduleEntry } from '@/data/services/contracts/matchSchedulePort';
import type { LigaTemplate } from '@/types/tennisResults';
import { matchInputDedupeKey } from './matchDedupe';

export const NOVAK_LIGA1_TOURNAMENT_ID = 't-novak';
export const NOVAK_LIGA1_LEAGUE_NUM = 1;

export const NOVAK_LIGA1_GROUPS = {
  A: ['Pfening G.', 'Alvarez I.', 'Tacain R.', 'Arico S.', 'Guidobono A.'],
  B: ['Garassi A.', 'Rothkel M.', 'Zanella H.', 'Duarte D.', 'Naddeo M.'],
  C: ['Gaudina A.', 'Cordoba D.', 'Filosa M.', 'Mena C.', 'Novizki P.'],
} as const;

export const NOVAK_LIGA1_TEMPLATE: LigaTemplate = {
  torneo: 'Novak Djokovic',
  liga: NOVAK_LIGA1_LEAGUE_NUM,
  grupos: NOVAK_LIGA1_GROUPS,
  fechas: [
    {
      numero: 1,
      grupos: {
        A: ['Pfening G. (P) vs Alvarez I.', 'Tacain R. (P) vs Arico S.', 'Libre: Guidobono A.'],
        B: ['Garassi A. (P) vs Rothkel M.', 'Naddeo M. (P) vs Zanella H.', 'Libre: Duarte D.'],
        C: ['Gaudina A. (P) vs Cordoba D.', 'Filosa M. (P) vs Mena C.', 'Libre: Novizki P.'],
      },
    },
    {
      numero: 2,
      grupos: {
        A: ['Arico S. (P) vs Pfening G.', 'Tacain R. (P) vs Guidobono A.', 'Libre: Alvarez I.'],
        B: ['Zanella H. (P) vs Garassi A.', 'Naddeo M. (P) vs Duarte D.', 'Libre: Rothkel M.'],
        C: ['Mena C. (P) vs Gaudina A.', 'Filosa M. (P) vs Novizki P.', 'Libre: Cordoba D.'],
      },
    },
    {
      numero: 3,
      grupos: {
        A: ['Pfening G. (P) vs Tacain R.', 'Guidobono A. (P) vs Alvarez I.', 'Libre: Arico S.'],
        B: ['Garassi A. (P) vs Naddeo M.', 'Duarte D. (P) vs Rothkel M.', 'Libre: Zanella H.'],
        C: ['Gaudina A. (P) vs Filosa M.', 'Novizki P. (P) vs Cordoba D.', 'Libre: Mena C.'],
      },
    },
    {
      numero: 4,
      grupos: {
        A: ['Guidobono A. (P) vs Pfening G.', 'Alvarez I. (P) vs Arico S.', 'Libre: Tacain R.'],
        B: ['Duarte D. (P) vs Garassi A.', 'Rothkel M. (P) vs Zanella H.', 'Libre: Naddeo M.'],
        C: ['Novizki P. (P) vs Gaudina A.', 'Cordoba D. (P) vs Mena C.', 'Libre: Filosa M.'],
      },
    },
    {
      numero: 5,
      grupos: {
        A: ['Alvarez I. (P) vs Tacain R.', 'Arico S. (P) vs Guidobono A.', 'Libre: Pfening G.'],
        B: ['Rothkel M. (P) vs Naddeo M.', 'Zanella H. (P) vs Duarte D.', 'Libre: Garassi A.'],
        C: ['Cordoba D. (P) vs Filosa M.', 'Mena C. (P) vs Novizki P.', 'Libre: Gaudina A.'],
      },
    },
  ],
};

export type NovakLiga1FixtureSeed = {
  group: keyof typeof NOVAK_LIGA1_GROUPS | string;
  round: number;
  playerA: string;
  playerB: string;
  ballPlayer: string;
};

function fixture(seed: NovakLiga1FixtureSeed): NovakLiga1FixtureSeed {
  return seed;
}

export const NOVAK_LIGA1_FIXTURES: NovakLiga1FixtureSeed[] = [
  fixture({ group: 'A', round: 1, playerA: 'Pfening G.', playerB: 'Alvarez I.', ballPlayer: 'Pfening G.' }),
  fixture({ group: 'A', round: 1, playerA: 'Tacain R.', playerB: 'Arico S.', ballPlayer: 'Tacain R.' }),
  fixture({ group: 'A', round: 2, playerA: 'Arico S.', playerB: 'Pfening G.', ballPlayer: 'Arico S.' }),
  fixture({ group: 'A', round: 2, playerA: 'Tacain R.', playerB: 'Guidobono A.', ballPlayer: 'Tacain R.' }),
  fixture({ group: 'A', round: 3, playerA: 'Pfening G.', playerB: 'Tacain R.', ballPlayer: 'Pfening G.' }),
  fixture({ group: 'A', round: 3, playerA: 'Guidobono A.', playerB: 'Alvarez I.', ballPlayer: 'Guidobono A.' }),
  fixture({ group: 'A', round: 4, playerA: 'Guidobono A.', playerB: 'Pfening G.', ballPlayer: 'Guidobono A.' }),
  fixture({ group: 'A', round: 4, playerA: 'Alvarez I.', playerB: 'Arico S.', ballPlayer: 'Alvarez I.' }),
  fixture({ group: 'A', round: 5, playerA: 'Alvarez I.', playerB: 'Tacain R.', ballPlayer: 'Alvarez I.' }),
  fixture({ group: 'A', round: 5, playerA: 'Arico S.', playerB: 'Guidobono A.', ballPlayer: 'Arico S.' }),
  fixture({ group: 'B', round: 1, playerA: 'Garassi A.', playerB: 'Rothkel M.', ballPlayer: 'Garassi A.' }),
  fixture({ group: 'B', round: 1, playerA: 'Naddeo M.', playerB: 'Zanella H.', ballPlayer: 'Naddeo M.' }),
  fixture({ group: 'B', round: 2, playerA: 'Zanella H.', playerB: 'Garassi A.', ballPlayer: 'Zanella H.' }),
  fixture({ group: 'B', round: 2, playerA: 'Naddeo M.', playerB: 'Duarte D.', ballPlayer: 'Naddeo M.' }),
  fixture({ group: 'B', round: 3, playerA: 'Garassi A.', playerB: 'Naddeo M.', ballPlayer: 'Garassi A.' }),
  fixture({ group: 'B', round: 3, playerA: 'Duarte D.', playerB: 'Rothkel M.', ballPlayer: 'Duarte D.' }),
  fixture({ group: 'B', round: 4, playerA: 'Duarte D.', playerB: 'Garassi A.', ballPlayer: 'Duarte D.' }),
  fixture({ group: 'B', round: 4, playerA: 'Rothkel M.', playerB: 'Zanella H.', ballPlayer: 'Rothkel M.' }),
  fixture({ group: 'B', round: 5, playerA: 'Rothkel M.', playerB: 'Naddeo M.', ballPlayer: 'Rothkel M.' }),
  fixture({ group: 'B', round: 5, playerA: 'Zanella H.', playerB: 'Duarte D.', ballPlayer: 'Zanella H.' }),
  fixture({ group: 'C', round: 1, playerA: 'Gaudina A.', playerB: 'Cordoba D.', ballPlayer: 'Gaudina A.' }),
  fixture({ group: 'C', round: 1, playerA: 'Filosa M.', playerB: 'Mena C.', ballPlayer: 'Filosa M.' }),
  fixture({ group: 'C', round: 2, playerA: 'Mena C.', playerB: 'Gaudina A.', ballPlayer: 'Mena C.' }),
  fixture({ group: 'C', round: 2, playerA: 'Filosa M.', playerB: 'Novizki P.', ballPlayer: 'Filosa M.' }),
  fixture({ group: 'C', round: 3, playerA: 'Gaudina A.', playerB: 'Filosa M.', ballPlayer: 'Gaudina A.' }),
  fixture({ group: 'C', round: 3, playerA: 'Novizki P.', playerB: 'Cordoba D.', ballPlayer: 'Novizki P.' }),
  fixture({ group: 'C', round: 4, playerA: 'Novizki P.', playerB: 'Gaudina A.', ballPlayer: 'Novizki P.' }),
  fixture({ group: 'C', round: 4, playerA: 'Cordoba D.', playerB: 'Mena C.', ballPlayer: 'Cordoba D.' }),
  fixture({ group: 'C', round: 5, playerA: 'Cordoba D.', playerB: 'Filosa M.', ballPlayer: 'Cordoba D.' }),
  fixture({ group: 'C', round: 5, playerA: 'Mena C.', playerB: 'Novizki P.', ballPlayer: 'Mena C.' }),
];

export const NOVAK_LIGA1_BYE_BY_GROUP_ROUND: Record<string, Record<number, string>> = {
  A: { 1: 'Guidobono A.', 2: 'Alvarez I.', 3: 'Arico S.', 4: 'Tacain R.', 5: 'Pfening G.' },
  B: { 1: 'Duarte D.', 2: 'Rothkel M.', 3: 'Zanella H.', 4: 'Naddeo M.', 5: 'Garassi A.' },
  C: { 1: 'Novizki P.', 2: 'Cordoba D.', 3: 'Mena C.', 4: 'Filosa M.', 5: 'Gaudina A.' },
};

export const DEFAULT_NOVAK_LIGA1_SCHEDULES: MatchScheduleEntry[] = NOVAK_LIGA1_FIXTURES.map((m) => {
  const dedupeKey = matchInputDedupeKey({
    tournamentId: NOVAK_LIGA1_TOURNAMENT_ID,
    group: m.group,
    round: m.round,
    playerA: m.playerA,
    playerB: m.playerB,
  });
  return {
    dedupeKey,
    tournamentId: NOVAK_LIGA1_TOURNAMENT_ID,
    leagueNum: NOVAK_LIGA1_LEAGUE_NUM,
    scheduleStatus: 'unscheduled',
    note: `Jugador con pelotas: ${m.ballPlayer}.`,
    updatedAt: Date.parse('2026-06-01T00:00:00'),
  };
});

function groupLabel(key: string): string {
  return `Grupo ${key.toUpperCase()}`;
}

export function buildNovakLiga1GroupStageFixtures(): GroupStageGroup[] {
  const acc = new Map<string, Map<number, GroupFixtureMatch[]>>();

  for (const m of NOVAK_LIGA1_FIXTURES) {
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

export function isNovakLiga1TournamentId(tournamentId: string): boolean {
  return tournamentId.trim() === NOVAK_LIGA1_TOURNAMENT_ID;
}

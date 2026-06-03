import type { GroupFixtureMatch, GroupFecha, GroupStageGroup } from '@/lib/mockData';
import type { MatchScheduleEntry } from '@/data/services/contracts/matchSchedulePort';
import type { LigaTemplate } from '@/types/tennisResults';
import { matchInputDedupeKey } from './matchDedupe';

export const RAFA_LIGA4_TOURNAMENT_ID = 't-rafa-nadal-l4';
export const RAFA_LIGA4_LEAGUE_NUM = 4;

export const RAFA_LIGA4_GROUPS = {
  A: ['Cardozo M.', 'Blanco J.', 'Castellanos M.', 'Malcangi R.', 'Gonzalez Dias F.'],
  B: ['Repecka J.', 'Chantada M.', 'Murchio M.', 'Rios J.', 'Gonzalez Dias C.'],
  C: ['Beitia J.', 'Vera F.', 'Cellilli M.', 'Cordoba G.', 'Garcia J.'],
} as const;

export const RAFA_LIGA4_TEMPLATE: LigaTemplate = {
  torneo: 'Rafael Nadal',
  liga: RAFA_LIGA4_LEAGUE_NUM,
  grupos: RAFA_LIGA4_GROUPS,
  fechas: [
    {
      numero: 1,
      grupos: {
        A: ['Cardozo M. (P) vs Blanco J.', 'Castellanos M. (P) vs Malcangi R.', 'Libre: Gonzalez Dias F.'],
        B: ['Repecka J. (P) vs Chantada M.', 'Murchio M. (P) vs Rios J.', 'Libre: Gonzalez Dias C.'],
        C: ['Beitia J. (P) vs Vera F.', 'Cellilli M. (P) vs Cordoba G.', 'Libre: Garcia J.'],
      },
    },
    {
      numero: 2,
      grupos: {
        A: ['Malcangi R. (P) vs Cardozo M.', 'Castellanos M. (P) vs Gonzalez Dias F.', 'Libre: Blanco J.'],
        B: ['Rios J. (P) vs Repecka J.', 'Murchio M. (P) vs Gonzalez Dias C.', 'Libre: Chantada M.'],
        C: ['Cordoba G. (P) vs Beitia J.', 'Cellilli M. (P) vs Garcia J.', 'Libre: Vera F.'],
      },
    },
    {
      numero: 3,
      grupos: {
        A: ['Cardozo M. (P) vs Castellanos M.', 'Gonzalez Dias F. (P) vs Blanco J.', 'Libre: Malcangi R.'],
        B: ['Repecka J. (P) vs Murchio M.', 'Gonzalez Dias C. (P) vs Chantada M.', 'Libre: Rios J.'],
        C: ['Beitia J. (P) vs Cellilli M.', 'Garcia J. (P) vs Vera F.', 'Libre: Cordoba G.'],
      },
    },
    {
      numero: 4,
      grupos: {
        A: ['Gonzalez Dias F. (P) vs Cardozo M.', 'Blanco J. (P) vs Malcangi R.', 'Libre: Castellanos M.'],
        B: ['Gonzalez Dias C. (P) vs Repecka J.', 'Chantada M. (P) vs Rios J.', 'Libre: Murchio M.'],
        C: ['Garcia J. (P) vs Beitia J.', 'Vera F. (P) vs Cordoba G.', 'Libre: Cellilli M.'],
      },
    },
    {
      numero: 5,
      grupos: {
        A: ['Blanco J. (P) vs Castellanos M.', 'Malcangi R. (P) vs Gonzalez Dias F.', 'Libre: Cardozo M.'],
        B: ['Chantada M. (P) vs Murchio M.', 'Rios J. (P) vs Gonzalez Dias C.', 'Libre: Repecka J.'],
        C: ['Vera F. (P) vs Cellilli M.', 'Cordoba G. (P) vs Garcia J.', 'Libre: Beitia J.'],
      },
    },
  ],
};

export type RafaLiga4FixtureSeed = {
  group: keyof typeof RAFA_LIGA4_GROUPS | string;
  round: number;
  playerA: string;
  playerB: string;
  ballPlayer: string;
};

function fixture(seed: RafaLiga4FixtureSeed): RafaLiga4FixtureSeed {
  return seed;
}

export const RAFA_LIGA4_FIXTURES: RafaLiga4FixtureSeed[] = [
  fixture({ group: 'A', round: 1, playerA: 'Cardozo M.', playerB: 'Blanco J.', ballPlayer: 'Cardozo M.' }),
  fixture({ group: 'A', round: 1, playerA: 'Castellanos M.', playerB: 'Malcangi R.', ballPlayer: 'Castellanos M.' }),
  fixture({ group: 'A', round: 2, playerA: 'Malcangi R.', playerB: 'Cardozo M.', ballPlayer: 'Malcangi R.' }),
  fixture({ group: 'A', round: 2, playerA: 'Castellanos M.', playerB: 'Gonzalez Dias F.', ballPlayer: 'Castellanos M.' }),
  fixture({ group: 'A', round: 3, playerA: 'Cardozo M.', playerB: 'Castellanos M.', ballPlayer: 'Cardozo M.' }),
  fixture({ group: 'A', round: 3, playerA: 'Gonzalez Dias F.', playerB: 'Blanco J.', ballPlayer: 'Gonzalez Dias F.' }),
  fixture({ group: 'A', round: 4, playerA: 'Gonzalez Dias F.', playerB: 'Cardozo M.', ballPlayer: 'Gonzalez Dias F.' }),
  fixture({ group: 'A', round: 4, playerA: 'Blanco J.', playerB: 'Malcangi R.', ballPlayer: 'Blanco J.' }),
  fixture({ group: 'A', round: 5, playerA: 'Blanco J.', playerB: 'Castellanos M.', ballPlayer: 'Blanco J.' }),
  fixture({ group: 'A', round: 5, playerA: 'Malcangi R.', playerB: 'Gonzalez Dias F.', ballPlayer: 'Malcangi R.' }),
  fixture({ group: 'B', round: 1, playerA: 'Repecka J.', playerB: 'Chantada M.', ballPlayer: 'Repecka J.' }),
  fixture({ group: 'B', round: 1, playerA: 'Murchio M.', playerB: 'Rios J.', ballPlayer: 'Murchio M.' }),
  fixture({ group: 'B', round: 2, playerA: 'Rios J.', playerB: 'Repecka J.', ballPlayer: 'Rios J.' }),
  fixture({ group: 'B', round: 2, playerA: 'Murchio M.', playerB: 'Gonzalez Dias C.', ballPlayer: 'Murchio M.' }),
  fixture({ group: 'B', round: 3, playerA: 'Repecka J.', playerB: 'Murchio M.', ballPlayer: 'Repecka J.' }),
  fixture({ group: 'B', round: 3, playerA: 'Gonzalez Dias C.', playerB: 'Chantada M.', ballPlayer: 'Gonzalez Dias C.' }),
  fixture({ group: 'B', round: 4, playerA: 'Gonzalez Dias C.', playerB: 'Repecka J.', ballPlayer: 'Gonzalez Dias C.' }),
  fixture({ group: 'B', round: 4, playerA: 'Chantada M.', playerB: 'Rios J.', ballPlayer: 'Chantada M.' }),
  fixture({ group: 'B', round: 5, playerA: 'Chantada M.', playerB: 'Murchio M.', ballPlayer: 'Chantada M.' }),
  fixture({ group: 'B', round: 5, playerA: 'Rios J.', playerB: 'Gonzalez Dias C.', ballPlayer: 'Rios J.' }),
  fixture({ group: 'C', round: 1, playerA: 'Beitia J.', playerB: 'Vera F.', ballPlayer: 'Beitia J.' }),
  fixture({ group: 'C', round: 1, playerA: 'Cellilli M.', playerB: 'Cordoba G.', ballPlayer: 'Cellilli M.' }),
  fixture({ group: 'C', round: 2, playerA: 'Cordoba G.', playerB: 'Beitia J.', ballPlayer: 'Cordoba G.' }),
  fixture({ group: 'C', round: 2, playerA: 'Cellilli M.', playerB: 'Garcia J.', ballPlayer: 'Cellilli M.' }),
  fixture({ group: 'C', round: 3, playerA: 'Beitia J.', playerB: 'Cellilli M.', ballPlayer: 'Beitia J.' }),
  fixture({ group: 'C', round: 3, playerA: 'Garcia J.', playerB: 'Vera F.', ballPlayer: 'Garcia J.' }),
  fixture({ group: 'C', round: 4, playerA: 'Garcia J.', playerB: 'Beitia J.', ballPlayer: 'Garcia J.' }),
  fixture({ group: 'C', round: 4, playerA: 'Vera F.', playerB: 'Cordoba G.', ballPlayer: 'Vera F.' }),
  fixture({ group: 'C', round: 5, playerA: 'Vera F.', playerB: 'Cellilli M.', ballPlayer: 'Vera F.' }),
  fixture({ group: 'C', round: 5, playerA: 'Cordoba G.', playerB: 'Garcia J.', ballPlayer: 'Cordoba G.' }),
];

export const RAFA_LIGA4_BYE_BY_GROUP_ROUND: Record<string, Record<number, string>> = {
  A: { 1: 'Gonzalez Dias F.', 2: 'Blanco J.', 3: 'Malcangi R.', 4: 'Castellanos M.', 5: 'Cardozo M.' },
  B: { 1: 'Gonzalez Dias C.', 2: 'Chantada M.', 3: 'Rios J.', 4: 'Murchio M.', 5: 'Repecka J.' },
  C: { 1: 'Garcia J.', 2: 'Vera F.', 3: 'Cordoba G.', 4: 'Cellilli M.', 5: 'Beitia J.' },
};

export const DEFAULT_RAFA_LIGA4_SCHEDULES: MatchScheduleEntry[] = RAFA_LIGA4_FIXTURES.map((m) => {
  const dedupeKey = matchInputDedupeKey({
    tournamentId: RAFA_LIGA4_TOURNAMENT_ID,
    group: m.group,
    round: m.round,
    playerA: m.playerA,
    playerB: m.playerB,
  });
  return {
    dedupeKey,
    tournamentId: RAFA_LIGA4_TOURNAMENT_ID,
    leagueNum: RAFA_LIGA4_LEAGUE_NUM,
    scheduleStatus: 'unscheduled',
    note: `Jugador con pelotas: ${m.ballPlayer}.`,
    updatedAt: Date.parse('2026-06-01T00:00:00'),
  };
});

function groupLabel(key: string): string {
  return `Grupo ${key.toUpperCase()}`;
}

export function buildRafaLiga4GroupStageFixtures(): GroupStageGroup[] {
  const acc = new Map<string, Map<number, GroupFixtureMatch[]>>();

  for (const m of RAFA_LIGA4_FIXTURES) {
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

export function isRafaNadalLiga4TournamentId(tournamentId: string): boolean {
  return tournamentId.trim() === RAFA_LIGA4_TOURNAMENT_ID;
}

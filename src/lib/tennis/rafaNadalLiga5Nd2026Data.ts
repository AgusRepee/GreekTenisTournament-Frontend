import type { GroupFixtureMatch, GroupFecha, GroupStageGroup } from '@/lib/mockData';
import type { MatchScheduleEntry } from '@/data/services/contracts/matchSchedulePort';
import type { LigaTemplate } from '@/types/tennisResults';
import { matchInputDedupeKey } from './matchDedupe';

export const RAFA_LIGA5_TOURNAMENT_ID = 't-rafa-nadal-l5';
export const RAFA_LIGA5_LEAGUE_NUM = 5;
/** Clave de grupo para partidos de Fecha 4 (catálogo y dedupe). */
export const RAFA_LIGA5_INTERZONAL_GROUP = 'Interzonal';

export const RAFA_LIGA5_GROUPS = {
  A: ['Cirigliano D.', 'Antuña A.', 'Chantada S.', 'Vidigt F.'],
  B: ['Oviedo M.', 'Peralta G.', 'Sola M.', 'Vila E.'],
  C: ['Tellechea L.', 'Gimenez F.', 'Vito A.', 'Amezague J.'],
} as const;

export const RAFA_LIGA5_TEMPLATE: LigaTemplate = {
  torneo: 'Rafael Nadal',
  liga: RAFA_LIGA5_LEAGUE_NUM,
  grupos: RAFA_LIGA5_GROUPS,
  fechas: [
    {
      numero: 1,
      grupos: {
        A: ['Cirigliano D. (P) vs Antuña A.', 'Chantada S. (P) vs Vidigt F.'],
        B: ['Oviedo M. (P) vs Peralta G.', 'Sola M. (P) vs Vila E.'],
        C: ['Tellechea L. (P) vs Gimenez F.', 'Vito A. (P) vs Amezague J.'],
      },
    },
    {
      numero: 2,
      grupos: {
        A: ['Cirigliano D. (P) vs Chantada S.', 'Vidigt F. (P) vs Antuña A.'],
        B: ['Sola M. (P) vs Oviedo M.', 'Peralta G. (P) vs Vila E.'],
        C: ['Tellechea L. (P) vs Vito A.', 'Gimenez F. (P) vs Amezague J.'],
      },
    },
    {
      numero: 3,
      grupos: {
        A: ['Vidigt F. (P) vs Cirigliano D.', 'Antuña A. (P) vs Chantada S.'],
        B: ['Vila E. (P) vs Oviedo M.', 'Sola M. (P) vs Peralta G.'],
        C: ['Amezague J. (P) vs Tellechea L.', 'Gimenez F. (P) vs Vito A.'],
      },
    },
    {
      numero: 4,
      tipo: 'interzonal',
      partidos: [
        'Amezague J. (P) vs Cirigliano D.',
        'Antuña A. (P) vs Tellechea L.',
        'Chantada S. (P) vs Sola M.',
        'Vila E. (P) vs Vidigt F.',
        'Oviedo M. (P) vs Gimenez F.',
        'Vito A. (P) vs Peralta G.',
      ],
    },
  ],
};

export type RafaLiga5FixtureSeed = {
  group: string;
  round: number;
  playerA: string;
  playerB: string;
  ballPlayer: string;
};

function fixture(seed: RafaLiga5FixtureSeed): RafaLiga5FixtureSeed {
  return seed;
}

export const RAFA_LIGA5_FIXTURES: RafaLiga5FixtureSeed[] = [
  fixture({ group: 'A', round: 1, playerA: 'Cirigliano D.', playerB: 'Antuña A.', ballPlayer: 'Cirigliano D.' }),
  fixture({ group: 'A', round: 1, playerA: 'Chantada S.', playerB: 'Vidigt F.', ballPlayer: 'Chantada S.' }),
  fixture({ group: 'A', round: 2, playerA: 'Cirigliano D.', playerB: 'Chantada S.', ballPlayer: 'Cirigliano D.' }),
  fixture({ group: 'A', round: 2, playerA: 'Vidigt F.', playerB: 'Antuña A.', ballPlayer: 'Vidigt F.' }),
  fixture({ group: 'A', round: 3, playerA: 'Vidigt F.', playerB: 'Cirigliano D.', ballPlayer: 'Vidigt F.' }),
  fixture({ group: 'A', round: 3, playerA: 'Antuña A.', playerB: 'Chantada S.', ballPlayer: 'Antuña A.' }),
  fixture({ group: 'B', round: 1, playerA: 'Oviedo M.', playerB: 'Peralta G.', ballPlayer: 'Oviedo M.' }),
  fixture({ group: 'B', round: 1, playerA: 'Sola M.', playerB: 'Vila E.', ballPlayer: 'Sola M.' }),
  fixture({ group: 'B', round: 2, playerA: 'Sola M.', playerB: 'Oviedo M.', ballPlayer: 'Sola M.' }),
  fixture({ group: 'B', round: 2, playerA: 'Peralta G.', playerB: 'Vila E.', ballPlayer: 'Peralta G.' }),
  fixture({ group: 'B', round: 3, playerA: 'Vila E.', playerB: 'Oviedo M.', ballPlayer: 'Vila E.' }),
  fixture({ group: 'B', round: 3, playerA: 'Sola M.', playerB: 'Peralta G.', ballPlayer: 'Sola M.' }),
  fixture({ group: 'C', round: 1, playerA: 'Tellechea L.', playerB: 'Gimenez F.', ballPlayer: 'Tellechea L.' }),
  fixture({ group: 'C', round: 1, playerA: 'Vito A.', playerB: 'Amezague J.', ballPlayer: 'Vito A.' }),
  fixture({ group: 'C', round: 2, playerA: 'Tellechea L.', playerB: 'Vito A.', ballPlayer: 'Tellechea L.' }),
  fixture({ group: 'C', round: 2, playerA: 'Gimenez F.', playerB: 'Amezague J.', ballPlayer: 'Gimenez F.' }),
  fixture({ group: 'C', round: 3, playerA: 'Amezague J.', playerB: 'Tellechea L.', ballPlayer: 'Amezague J.' }),
  fixture({ group: 'C', round: 3, playerA: 'Gimenez F.', playerB: 'Vito A.', ballPlayer: 'Gimenez F.' }),
  fixture({ group: RAFA_LIGA5_INTERZONAL_GROUP, round: 4, playerA: 'Amezague J.', playerB: 'Cirigliano D.', ballPlayer: 'Amezague J.' }),
  fixture({ group: RAFA_LIGA5_INTERZONAL_GROUP, round: 4, playerA: 'Antuña A.', playerB: 'Tellechea L.', ballPlayer: 'Antuña A.' }),
  fixture({ group: RAFA_LIGA5_INTERZONAL_GROUP, round: 4, playerA: 'Chantada S.', playerB: 'Sola M.', ballPlayer: 'Chantada S.' }),
  fixture({ group: RAFA_LIGA5_INTERZONAL_GROUP, round: 4, playerA: 'Vila E.', playerB: 'Vidigt F.', ballPlayer: 'Vila E.' }),
  fixture({ group: RAFA_LIGA5_INTERZONAL_GROUP, round: 4, playerA: 'Oviedo M.', playerB: 'Gimenez F.', ballPlayer: 'Oviedo M.' }),
  fixture({ group: RAFA_LIGA5_INTERZONAL_GROUP, round: 4, playerA: 'Vito A.', playerB: 'Peralta G.', ballPlayer: 'Vito A.' }),
];

export const DEFAULT_RAFA_LIGA5_SCHEDULES: MatchScheduleEntry[] = RAFA_LIGA5_FIXTURES.map((m) => {
  const dedupeKey = matchInputDedupeKey({
    tournamentId: RAFA_LIGA5_TOURNAMENT_ID,
    group: m.group,
    round: m.round,
    playerA: m.playerA,
    playerB: m.playerB,
  });
  return {
    dedupeKey,
    tournamentId: RAFA_LIGA5_TOURNAMENT_ID,
    leagueNum: RAFA_LIGA5_LEAGUE_NUM,
    scheduleStatus: 'unscheduled',
    note: `Jugador con pelotas: ${m.ballPlayer}.`,
    updatedAt: Date.parse('2026-05-27T00:00:00'),
  };
});

function groupDisplayName(groupKey: string): string {
  if (groupKey === RAFA_LIGA5_INTERZONAL_GROUP) return 'Interzonal';
  return `Grupo ${groupKey.toUpperCase()}`;
}

/** Fixture público con portador de pelotas según (P). */
export function buildRafaLiga5GroupStageFixtures(): GroupStageGroup[] {
  const acc = new Map<string, Map<number, GroupFixtureMatch[]>>();

  for (const m of RAFA_LIGA5_FIXTURES) {
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

export function isRafaNadalLiga5TournamentId(tournamentId: string): boolean {
  return tournamentId.trim() === RAFA_LIGA5_TOURNAMENT_ID;
}

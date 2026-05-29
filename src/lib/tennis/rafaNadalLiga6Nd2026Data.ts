import type { GroupFixtureMatch, GroupFecha, GroupStageGroup } from '@/lib/mockData';
import type { MatchScheduleEntry } from '@/data/services/contracts/matchSchedulePort';
import type { LigaTemplate } from '@/types/tennisResults';
import { matchInputDedupeKey } from './matchDedupe';

export const RAFA_LIGA6_TOURNAMENT_ID = 't-rafa-nadal-l6';
export const RAFA_LIGA6_LEAGUE_NUM = 6;
/** Clave de grupo para partidos de Fecha 4 (catálogo y dedupe). */
export const RAFA_LIGA6_INTERZONAL_GROUP = 'Interzonal';

export const RAFA_LIGA6_GROUPS = {
  A: ['Ballesta F.', 'De Ruyck G.', 'Cerene B.', 'Oshiro E.'],
  B: ['Ferrarotti E.', 'Fedrjanic N.', 'Fratini M.', 'Jaureguiberry C.'],
  C: ['Oswald J.', 'Avalos G.', 'Romay J.', 'Cellilli F.'],
} as const;

export const RAFA_LIGA6_TEMPLATE: LigaTemplate = {
  torneo: 'Rafael Nadal',
  liga: RAFA_LIGA6_LEAGUE_NUM,
  grupos: RAFA_LIGA6_GROUPS,
  fechas: [
    {
      numero: 1,
      grupos: {
        A: ['Ballesta F. (P) vs De Ruyck G.', 'Cerene B. (P) vs Oshiro E.'],
        B: ['Ferrarotti E. (P) vs Fedrjanic N.', 'Fratini M. (P) vs Jaureguiberry C.'],
        C: ['Oswald J. (P) vs Avalos G.', 'Romay J. (P) vs Cellilli F.'],
      },
    },
    {
      numero: 2,
      grupos: {
        A: ['Ballesta F. (P) vs Cerene B.', 'Oshiro E. (P) vs De Ruyck G.'],
        B: ['Fratini M. (P) vs Ferrarotti E.', 'Fedrjanic N. (P) vs Jaureguiberry C.'],
        C: ['Oswald J. (P) vs Romay J.', 'Avalos G. (P) vs Cellilli F.'],
      },
    },
    {
      numero: 3,
      grupos: {
        A: ['Oshiro E. (P) vs Ballesta F.', 'De Ruyck G. (P) vs Cerene B.'],
        B: ['Jaureguiberry C. (P) vs Ferrarotti E.', 'Fedrjanic N. (P) vs Fratini M.'],
        C: ['Cellilli F. (P) vs Oswald J.', 'Avalos G. (P) vs Romay J.'],
      },
    },
    {
      numero: 4,
      tipo: 'interzonal',
      partidos: [
        'Cellilli F. (P) vs Ballesta F.',
        'De Ruyck G. (P) vs Oswald J.',
        'Cerene B. (P) vs Fratini M.',
        'Jaureguiberry C. (P) vs Oshiro E.',
        'Ferrarotti E. (P) vs Avalos G.',
        'Romay J. (P) vs Fedrjanic N.',
      ],
    },
  ],
};

export type RafaLiga6FixtureSeed = {
  group: string;
  round: number;
  playerA: string;
  playerB: string;
  ballPlayer: string;
};

function fixture(seed: RafaLiga6FixtureSeed): RafaLiga6FixtureSeed {
  return seed;
}

export const RAFA_LIGA6_FIXTURES: RafaLiga6FixtureSeed[] = [
  fixture({ group: 'A', round: 1, playerA: 'Ballesta F.', playerB: 'De Ruyck G.', ballPlayer: 'Ballesta F.' }),
  fixture({ group: 'A', round: 1, playerA: 'Cerene B.', playerB: 'Oshiro E.', ballPlayer: 'Cerene B.' }),
  fixture({ group: 'A', round: 2, playerA: 'Ballesta F.', playerB: 'Cerene B.', ballPlayer: 'Ballesta F.' }),
  fixture({ group: 'A', round: 2, playerA: 'Oshiro E.', playerB: 'De Ruyck G.', ballPlayer: 'Oshiro E.' }),
  fixture({ group: 'A', round: 3, playerA: 'Oshiro E.', playerB: 'Ballesta F.', ballPlayer: 'Oshiro E.' }),
  fixture({ group: 'A', round: 3, playerA: 'De Ruyck G.', playerB: 'Cerene B.', ballPlayer: 'De Ruyck G.' }),
  fixture({ group: 'B', round: 1, playerA: 'Ferrarotti E.', playerB: 'Fedrjanic N.', ballPlayer: 'Ferrarotti E.' }),
  fixture({ group: 'B', round: 1, playerA: 'Fratini M.', playerB: 'Jaureguiberry C.', ballPlayer: 'Fratini M.' }),
  fixture({ group: 'B', round: 2, playerA: 'Fratini M.', playerB: 'Ferrarotti E.', ballPlayer: 'Fratini M.' }),
  fixture({ group: 'B', round: 2, playerA: 'Fedrjanic N.', playerB: 'Jaureguiberry C.', ballPlayer: 'Fedrjanic N.' }),
  fixture({ group: 'B', round: 3, playerA: 'Jaureguiberry C.', playerB: 'Ferrarotti E.', ballPlayer: 'Jaureguiberry C.' }),
  fixture({ group: 'B', round: 3, playerA: 'Fedrjanic N.', playerB: 'Fratini M.', ballPlayer: 'Fedrjanic N.' }),
  fixture({ group: 'C', round: 1, playerA: 'Oswald J.', playerB: 'Avalos G.', ballPlayer: 'Oswald J.' }),
  fixture({ group: 'C', round: 1, playerA: 'Romay J.', playerB: 'Cellilli F.', ballPlayer: 'Romay J.' }),
  fixture({ group: 'C', round: 2, playerA: 'Oswald J.', playerB: 'Romay J.', ballPlayer: 'Oswald J.' }),
  fixture({ group: 'C', round: 2, playerA: 'Avalos G.', playerB: 'Cellilli F.', ballPlayer: 'Avalos G.' }),
  fixture({ group: 'C', round: 3, playerA: 'Cellilli F.', playerB: 'Oswald J.', ballPlayer: 'Cellilli F.' }),
  fixture({ group: 'C', round: 3, playerA: 'Avalos G.', playerB: 'Romay J.', ballPlayer: 'Avalos G.' }),
  fixture({ group: RAFA_LIGA6_INTERZONAL_GROUP, round: 4, playerA: 'Cellilli F.', playerB: 'Ballesta F.', ballPlayer: 'Cellilli F.' }),
  fixture({ group: RAFA_LIGA6_INTERZONAL_GROUP, round: 4, playerA: 'De Ruyck G.', playerB: 'Oswald J.', ballPlayer: 'De Ruyck G.' }),
  fixture({ group: RAFA_LIGA6_INTERZONAL_GROUP, round: 4, playerA: 'Cerene B.', playerB: 'Fratini M.', ballPlayer: 'Cerene B.' }),
  fixture({ group: RAFA_LIGA6_INTERZONAL_GROUP, round: 4, playerA: 'Jaureguiberry C.', playerB: 'Oshiro E.', ballPlayer: 'Jaureguiberry C.' }),
  fixture({ group: RAFA_LIGA6_INTERZONAL_GROUP, round: 4, playerA: 'Ferrarotti E.', playerB: 'Avalos G.', ballPlayer: 'Ferrarotti E.' }),
  fixture({ group: RAFA_LIGA6_INTERZONAL_GROUP, round: 4, playerA: 'Romay J.', playerB: 'Fedrjanic N.', ballPlayer: 'Romay J.' }),
];

export const DEFAULT_RAFA_LIGA6_SCHEDULES: MatchScheduleEntry[] = RAFA_LIGA6_FIXTURES.map((m) => {
  const dedupeKey = matchInputDedupeKey({
    tournamentId: RAFA_LIGA6_TOURNAMENT_ID,
    group: m.group,
    round: m.round,
    playerA: m.playerA,
    playerB: m.playerB,
  });
  return {
    dedupeKey,
    tournamentId: RAFA_LIGA6_TOURNAMENT_ID,
    leagueNum: RAFA_LIGA6_LEAGUE_NUM,
    scheduleStatus: 'unscheduled',
    note: `Jugador con pelotas: ${m.ballPlayer}.`,
    updatedAt: Date.parse('2026-05-26T00:00:00'),
  };
});

function groupDisplayName(groupKey: string): string {
  if (groupKey === RAFA_LIGA6_INTERZONAL_GROUP) return 'Interzonal';
  return `Grupo ${groupKey.toUpperCase()}`;
}

/** Fixture público con portador de pelotas según (P). */
export function buildRafaLiga6GroupStageFixtures(): GroupStageGroup[] {
  const acc = new Map<string, Map<number, GroupFixtureMatch[]>>();

  for (const m of RAFA_LIGA6_FIXTURES) {
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

export function isRafaNadalLiga6TournamentId(tournamentId: string): boolean {
  return tournamentId.trim() === RAFA_LIGA6_TOURNAMENT_ID;
}

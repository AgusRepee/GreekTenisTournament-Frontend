import type { GroupFixtureMatch, GroupFecha, GroupStageGroup } from '@/lib/mockData';
import type { MatchScheduleEntry } from '@/data/services/contracts/matchSchedulePort';
import type { LigaTemplate } from '@/types/tennisResults';
import { matchInputDedupeKey } from './matchDedupe';

export const RAFA_LIGA2_TOURNAMENT_ID = 't-rafa-nadal';
export const RAFA_LIGA2_LEAGUE_NUM = 2;

export const RAFA_LIGA2_GROUPS = {
  A: ['Colomer S.', 'Masciotra J.', 'Santi G.', 'Sarquis P.', 'Molina L.'],
  B: ['Ferdkin B.', 'Mayer D.', 'Komesu M.', 'Cancio M.', 'Repecka A.'],
  C: ['Guareschi A.', 'Urbini A.', 'Fusto B.', 'Monzón M.', 'Ruiz J.'],
} as const;

export const RAFA_LIGA2_TEMPLATE: LigaTemplate = {
  torneo: 'Rafael Nadal',
  liga: RAFA_LIGA2_LEAGUE_NUM,
  grupos: RAFA_LIGA2_GROUPS,
  fechas: [
    {
      numero: 1,
      grupos: {
        A: ['Masciotra J. (P) vs Santi G.', 'Colomer S. (P) vs Sarquis P.', 'Libre: Molina L.'],
        B: ['Ferdkin B. (P) vs Cancio M.', 'Komesu M. (P) vs Repecka A.', 'Libre: Mayer D.'],
        C: ['Guareschi A. (P) vs Urbini A.', 'Fusto B. (P) vs Monzón M.', 'Libre: Ruiz J.'],
      },
    },
    {
      numero: 2,
      grupos: {
        A: ['Sarquis P. (P) vs Masciotra J.', 'Colomer S. (P) vs Molina L.', 'Libre: Santi G.'],
        B: ['Repecka A. (P) vs Ferdkin B.', 'Komesu M. (P) vs Mayer D.', 'Libre: Cancio M.'],
        C: ['Monzón M. (P) vs Guareschi A.', 'Fusto B. (P) vs Ruiz J.', 'Libre: Urbini A.'],
      },
    },
    {
      numero: 3,
      grupos: {
        A: ['Masciotra J. (P) vs Colomer S.', 'Molina L. (P) vs Santi G.', 'Libre: Sarquis P.'],
        B: ['Ferdkin B. (P) vs Komesu M.', 'Mayer D. (P) vs Cancio M.', 'Libre: Repecka A.'],
        C: ['Guareschi A. (P) vs Fusto B.', 'Ruiz J. (P) vs Urbini A.', 'Libre: Monzón M.'],
      },
    },
    {
      numero: 4,
      grupos: {
        A: ['Molina L. (P) vs Masciotra J.', 'Santi G. (P) vs Sarquis P.', 'Libre: Colomer S.'],
        B: ['Mayer D. (P) vs Ferdkin B.', 'Cancio M. (P) vs Repecka A.', 'Libre: Komesu M.'],
        C: ['Ruiz J. (P) vs Guareschi A.', 'Urbini A. (P) vs Monzón M.', 'Libre: Fusto B.'],
      },
    },
    {
      numero: 5,
      grupos: {
        A: ['Santi G. (P) vs Colomer S.', 'Sarquis P. (P) vs Molina L.', 'Libre: Masciotra J.'],
        B: ['Cancio M. (P) vs Komesu M.', 'Repecka A. (P) vs Mayer D.', 'Libre: Ferdkin B.'],
        C: ['Urbini A. (P) vs Fusto B.', 'Monzón M. (P) vs Ruiz J.', 'Libre: Guareschi A.'],
      },
    },
  ],
};

export type RafaFixtureSeed = {
  group: keyof typeof RAFA_LIGA2_GROUPS | string;
  round: number;
  playerA: string;
  playerB: string;
  ballPlayer: string;
};

function fixture(seed: RafaFixtureSeed): RafaFixtureSeed {
  return seed;
}

export const RAFA_LIGA2_FIXTURES: RafaFixtureSeed[] = [
  fixture({ group: 'A', round: 1, playerA: 'Masciotra J.', playerB: 'Santi G.', ballPlayer: 'Masciotra J.' }),
  fixture({ group: 'A', round: 1, playerA: 'Colomer S.', playerB: 'Sarquis P.', ballPlayer: 'Colomer S.' }),
  fixture({ group: 'A', round: 2, playerA: 'Sarquis P.', playerB: 'Masciotra J.', ballPlayer: 'Sarquis P.' }),
  fixture({ group: 'A', round: 2, playerA: 'Colomer S.', playerB: 'Molina L.', ballPlayer: 'Colomer S.' }),
  fixture({ group: 'A', round: 3, playerA: 'Masciotra J.', playerB: 'Colomer S.', ballPlayer: 'Masciotra J.' }),
  fixture({ group: 'A', round: 3, playerA: 'Molina L.', playerB: 'Santi G.', ballPlayer: 'Molina L.' }),
  fixture({ group: 'A', round: 4, playerA: 'Molina L.', playerB: 'Masciotra J.', ballPlayer: 'Molina L.' }),
  fixture({ group: 'A', round: 4, playerA: 'Santi G.', playerB: 'Sarquis P.', ballPlayer: 'Santi G.' }),
  fixture({ group: 'A', round: 5, playerA: 'Santi G.', playerB: 'Colomer S.', ballPlayer: 'Santi G.' }),
  fixture({ group: 'A', round: 5, playerA: 'Sarquis P.', playerB: 'Molina L.', ballPlayer: 'Sarquis P.' }),
  fixture({ group: 'B', round: 1, playerA: 'Ferdkin B.', playerB: 'Cancio M.', ballPlayer: 'Ferdkin B.' }),
  fixture({ group: 'B', round: 1, playerA: 'Komesu M.', playerB: 'Repecka A.', ballPlayer: 'Komesu M.' }),
  fixture({ group: 'B', round: 2, playerA: 'Repecka A.', playerB: 'Ferdkin B.', ballPlayer: 'Repecka A.' }),
  fixture({ group: 'B', round: 2, playerA: 'Komesu M.', playerB: 'Mayer D.', ballPlayer: 'Komesu M.' }),
  fixture({ group: 'B', round: 3, playerA: 'Ferdkin B.', playerB: 'Komesu M.', ballPlayer: 'Ferdkin B.' }),
  fixture({ group: 'B', round: 3, playerA: 'Mayer D.', playerB: 'Cancio M.', ballPlayer: 'Mayer D.' }),
  fixture({ group: 'B', round: 4, playerA: 'Mayer D.', playerB: 'Ferdkin B.', ballPlayer: 'Mayer D.' }),
  fixture({ group: 'B', round: 4, playerA: 'Cancio M.', playerB: 'Repecka A.', ballPlayer: 'Cancio M.' }),
  fixture({ group: 'B', round: 5, playerA: 'Cancio M.', playerB: 'Komesu M.', ballPlayer: 'Cancio M.' }),
  fixture({ group: 'B', round: 5, playerA: 'Repecka A.', playerB: 'Mayer D.', ballPlayer: 'Repecka A.' }),
  fixture({ group: 'C', round: 1, playerA: 'Guareschi A.', playerB: 'Urbini A.', ballPlayer: 'Guareschi A.' }),
  fixture({ group: 'C', round: 1, playerA: 'Fusto B.', playerB: 'Monzón M.', ballPlayer: 'Fusto B.' }),
  fixture({ group: 'C', round: 2, playerA: 'Monzón M.', playerB: 'Guareschi A.', ballPlayer: 'Monzón M.' }),
  fixture({ group: 'C', round: 2, playerA: 'Fusto B.', playerB: 'Ruiz J.', ballPlayer: 'Fusto B.' }),
  fixture({ group: 'C', round: 3, playerA: 'Guareschi A.', playerB: 'Fusto B.', ballPlayer: 'Guareschi A.' }),
  fixture({ group: 'C', round: 3, playerA: 'Ruiz J.', playerB: 'Urbini A.', ballPlayer: 'Ruiz J.' }),
  fixture({ group: 'C', round: 4, playerA: 'Ruiz J.', playerB: 'Guareschi A.', ballPlayer: 'Ruiz J.' }),
  fixture({ group: 'C', round: 4, playerA: 'Urbini A.', playerB: 'Monzón M.', ballPlayer: 'Urbini A.' }),
  fixture({ group: 'C', round: 5, playerA: 'Urbini A.', playerB: 'Fusto B.', ballPlayer: 'Urbini A.' }),
  fixture({ group: 'C', round: 5, playerA: 'Monzón M.', playerB: 'Ruiz J.', ballPlayer: 'Monzón M.' }),
];

/** Libre por grupo y fecha (desde plantilla). */
export const RAFA_LIGA2_BYE_BY_GROUP_ROUND: Record<string, Record<number, string>> = {
  A: { 1: 'Molina L.', 2: 'Santi G.', 3: 'Sarquis P.', 4: 'Colomer S.', 5: 'Masciotra J.' },
  B: { 1: 'Mayer D.', 2: 'Cancio M.', 3: 'Repecka A.', 4: 'Komesu M.', 5: 'Ferdkin B.' },
  C: { 1: 'Ruiz J.', 2: 'Urbini A.', 3: 'Monzón M.', 4: 'Fusto B.', 5: 'Guareschi A.' },
};

export const DEFAULT_RAFA_LIGA2_SCHEDULES: MatchScheduleEntry[] = RAFA_LIGA2_FIXTURES.map((m) => {
  const dedupeKey = matchInputDedupeKey({
    tournamentId: RAFA_LIGA2_TOURNAMENT_ID,
    group: m.group,
    round: m.round,
    playerA: m.playerA,
    playerB: m.playerB,
  });
  return {
    dedupeKey,
    tournamentId: RAFA_LIGA2_TOURNAMENT_ID,
    leagueNum: RAFA_LIGA2_LEAGUE_NUM,
    scheduleStatus: 'unscheduled',
    note: `Jugador con pelotas: ${m.ballPlayer}.`,
    updatedAt: Date.parse('2026-05-26T00:00:00'),
  };
});

function groupLabel(key: string): string {
  return `Grupo ${key.toUpperCase()}`;
}

/** Fixture público con portador de pelotas según (P). */
export function buildRafaLiga2GroupStageFixtures(): GroupStageGroup[] {
  const acc = new Map<string, Map<number, GroupFixtureMatch[]>>();

  for (const m of RAFA_LIGA2_FIXTURES) {
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

export function isRafaNadalTournamentId(tournamentId: string): boolean {
  return tournamentId.trim() === RAFA_LIGA2_TOURNAMENT_ID;
}

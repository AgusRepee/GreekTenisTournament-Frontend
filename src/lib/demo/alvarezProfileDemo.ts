/**
 * Datos de demostración SOLO para la ficha visual del jugador "Alvarez I." (variantes de nombre).
 * No escribe en el store de resultados ni altera rankings globales reales: el merge ocurre solo en ProfileScreen.
 */

import type { CalculatedPlayerStats } from '../tennis/calculatePlayerStats';
import type {
  DerivedPlayerProfileRankings,
  RecentMatchProfileRow,
  TournamentParticipationRow,
} from '../tennis/derivedTennisData';
import type { Tournament } from '../mockData';

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/\p{M}+/gu, '');
}

/**
 * Coincide solo con variantes del jugador demo: "Alvarez", "Alvarez I", "Alvarez I.", "Álvarez I.".
 * No activa en "Alvarez García" u otros apellidos.
 */
export function isAlvarezDemoProfile(name: string): boolean {
  const raw = stripDiacritics(String(name ?? '').trim()).replace(/\s+/g, ' ').toLowerCase();
  return raw === 'alvarez' || raw === 'alvarez i' || raw === 'alvarez i.';
}

export const ALVAREZ_DEMO_TAG = 'Solo visual · no afecta rankings reales';

/** Parche sobre `calculatePlayerStats` (carrera). */
export const ALVAREZ_DEMO_CAREER_PATCH: Partial<CalculatedPlayerStats> = {
  totalMatchesPlayed: 28,
  totalWins: 19,
  totalLosses: 9,
  setsWon: 43,
  setsLost: 24,
  setDifference: 19,
  tournamentsPlayed: 6,
  tournamentsWon: 2,
  bestHistoricalRanking: 2,
  currentLeague: 1,
  winRate: 19 / 28,
};

export const ALVAREZ_DEMO_SEASON_PATCH: Partial<CalculatedPlayerStats> = {
  totalMatchesPlayed: 8,
  totalWins: 6,
  totalLosses: 2,
  tournamentsPlayed: 1,
  tournamentsWon: 0,
  setsWon: 13,
  setsLost: 6,
  setDifference: 7,
  winRate: 6 / 8,
};

export const ALVAREZ_DEMO_POINTS_CAREER = 730;
export const ALVAREZ_DEMO_POINTS_SEASON = 220;

export const ALVAREZ_DEMO_RANKINGS: DerivedPlayerProfileRankings = {
  globalPosition: 12,
  globalTotal: 48,
  league: 1,
  leaguePosition: 3,
  leagueTotal: 16,
};

export const ALVAREZ_DEMO_FINALS_CAREER = { reached: 3, won: 2, pct: Math.round((2 / 3) * 100) };
export const ALVAREZ_DEMO_FINALS_SEASON = { reached: 1, won: 0 };

export const ALVAREZ_DEMO_WIN_PCT = 68;
export const ALVAREZ_DEMO_SETS_WON_PCT = 64;

const demoTournament = (
  id: string,
  name: string,
  endDate: string,
  phaseLabel: string,
  points: number,
): TournamentParticipationRow => ({
  tournament: {
    id: `demo-alvarez-${id}`,
    name,
    category: 'Primera',
    status: 'finished',
    startDate: `${endDate.slice(0, 7)}-01`,
    endDate,
    location: 'Greek Tennis',
    league: 1,
  } as Tournament,
  league: 1,
  phaseLabel,
  points,
});

export const ALVAREZ_DEMO_TOURNAMENT_ROWS: TournamentParticipationRow[] = [
  demoTournament('novak', 'Novak Djokovic - Liga 1', '2026-02-20', 'Finalista', 350),
  demoTournament('federer', 'Roger Federer - Liga 1', '2026-01-15', 'Campeón', 500),
  demoTournament('nadal', 'Rafael Nadal - Liga 1', '2025-11-10', 'Semifinalista', 200),
  demoTournament('apertura', 'Copa Apertura - Liga 1', '2025-09-05', 'Cuartos de final', 100),
];

export const ALVAREZ_DEMO_RECENT_MATCHES: RecentMatchProfileRow[] = [
  {
    dateIso: '2026-04-06',
    dateLabel: '6 abr 2026',
    opponent: 'Araujo J.',
    score: '6-4, 6-3',
    outcome: 'Victoria',
    phase: 'Fecha 4',
  },
  {
    dateIso: '2026-03-30',
    dateLabel: '30 mar 2026',
    opponent: 'Arico S.',
    score: '4-6, 6-3, 10-8',
    outcome: 'Victoria',
    detail: 'Remontada',
    phase: 'Fecha 3',
  },
  {
    dateIso: '2026-03-23',
    dateLabel: '23 mar 2026',
    opponent: 'Tacain R.',
    score: '6-7, 6-4, 8-10',
    outcome: 'Derrota',
    phase: 'Fecha 2',
  },
  {
    dateIso: '2026-03-16',
    dateLabel: '16 mar 2026',
    opponent: 'Pfening G.',
    score: '6-2, 6-2',
    outcome: 'Victoria',
    phase: 'Fecha 1',
  },
  {
    dateIso: '2026-03-09',
    dateLabel: '9 mar 2026',
    opponent: 'Guidobono A.',
    score: 'W.O.',
    outcome: 'Victoria',
    detail: 'Victoria por walkover',
    phase: 'Fecha 1',
  },
];

export const ALVAREZ_DEMO_ACHIEVEMENTS: { title: string; detail: string }[] = [
  { title: 'Campeón', detail: 'Roger Federer - Liga 1' },
  { title: 'Finalista', detail: 'Novak Djokovic - Liga 1' },
  { title: 'Mejor ranking histórico', detail: 'Puesto #2' },
  { title: 'Racha máxima', detail: '6 victorias consecutivas' },
  { title: 'Mayor remontada', detail: 'Ganó 4-6, 6-3, 10-8 vs Arico S.' },
];

/** Campos de ficha para hero / información básica (no persiste en el store). */
export function mergeAlvarezDemoPlayerFields<T extends { name: string }>(player: T): T {
  if (!isAlvarezDemoProfile(player.name)) return player;
  return {
    ...player,
    nationality: 'Argentina',
    category: 'Primera',
    playingHand: 'Diestro',
    heightCm: 178,
    birthDate: '1997-04-12',
  } as T;
}

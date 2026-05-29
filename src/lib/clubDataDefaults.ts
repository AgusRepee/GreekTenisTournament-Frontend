/**
 * Base club data from docs / generators (no localStorage).
 * Merged with persisted rows in `clubDataStore`.
 */

import type { CategoryKey, LeagueNum, Player, Tournament } from './mockData'; // type-only: no runtime cycle
import { generatePlayersFromLigas } from './tennis/generatePlayersFromLigas';
import { countPlayersInGrupos, generateTournamentsFromLigas } from './tennis/generateTournamentsFromLigas';
import {
  LIGA5_ND_LEAGUE_NUM,
  LIGA5_ND_TEMPLATE,
  LIGA5_ND_TOURNAMENT_ID,
} from './tennis/liga5Nd2026Data';
import {
  LIGA6_ND_LEAGUE_NUM,
  LIGA6_ND_TEMPLATE,
  LIGA6_ND_TOURNAMENT_ID,
} from './tennis/liga6Nd2026Data';
import {
  RAFA_LIGA2_LEAGUE_NUM,
  RAFA_LIGA2_TEMPLATE,
  RAFA_LIGA2_TOURNAMENT_ID,
} from './tennis/rafaNadalLiga2Nd2026Data';
import {
  RAFA_LIGA5_LEAGUE_NUM,
  RAFA_LIGA5_TEMPLATE,
  RAFA_LIGA5_TOURNAMENT_ID,
} from './tennis/rafaNadalLiga5Nd2026Data';
import {
  RAFA_LIGA6_LEAGUE_NUM,
  RAFA_LIGA6_TEMPLATE,
  RAFA_LIGA6_TOURNAMENT_ID,
} from './tennis/rafaNadalLiga6Nd2026Data';
import {
  RAFAEL_LIGA1_LEAGUE_NUM,
  RAFAEL_LIGA1_TEMPLATE,
  RAFAEL_LIGA1_TOURNAMENT_ID,
} from './tennis/rafaelNadalLiga1Nd2026Data';

function leagueNumToCategory(n: number): CategoryKey {
  const m: Record<number, CategoryKey> = {
    1: 'Primera',
    2: 'Segunda',
    3: 'Tercera',
    4: 'Cuarta',
    5: 'Quinta A',
    6: 'Quinta B',
  };
  return m[n]!;
}

function getCurrentPeriodDates(): { startDate: string; endDate: string } {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 7);
  const end = new Date(today);
  end.setDate(end.getDate() + 21);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

const NOVAK_COVER_BY_LEAGUE: Record<number, string> = {
  1: 'novakrojo.webp',
  2: 'novaknaranja.webp',
  3: 'novakazul.webp',
  4: 'novajverde.webp',
  5: 'novaknegro.webp',
  6: 'novakblanco.webp',
};

function buildNovakTournamentsFromDocs(period: { startDate: string; endDate: string }): Tournament[] {
  return generateTournamentsFromLigas().map((row) => {
    const t =
      row.liga === LIGA5_ND_LEAGUE_NUM
        ? LIGA5_ND_TEMPLATE
        : row.liga === LIGA6_ND_LEAGUE_NUM
          ? LIGA6_ND_TEMPLATE
          : row.template;
    const playersN = countPlayersInGrupos(t);
    const slotsTotal = Math.max(8, playersN <= 8 ? 8 : 12);
    const slotsTaken = Math.min(slotsTotal, Math.max(0, Math.floor(slotsTotal * 0.65)));
    const isNovakLiga5Nd = row.id === LIGA5_ND_TOURNAMENT_ID;
    const isNovakLiga6Nd = row.id === LIGA6_ND_TOURNAMENT_ID;
    return {
      id: row.id,
      name: `${t.torneo} - Liga ${t.liga}`,
      category: leagueNumToCategory(t.liga),
      tournamentType: 'greek500' as const,
      status: 'upcoming' as const,
      startDate: isNovakLiga5Nd ? '2026-03-11' : isNovakLiga6Nd ? '2026-03-15' : period.startDate,
      endDate: isNovakLiga5Nd || isNovakLiga6Nd ? '2026-05-31' : period.endDate,
      location: t.liga === 1 ? 'Club de Tenis — Pistas centrales' : 'Club de Tenis',
      coverImage: NOVAK_COVER_BY_LEAGUE[t.liga] ?? 'novakrojo.webp',
      league: t.liga as LeagueNum,
      slotsTotal,
      slotsTaken: isNovakLiga5Nd || isNovakLiga6Nd ? playersN : slotsTaken,
      ligaDoc: t,
    };
  });
}

export function buildClubDataDefaults(): { defaultPlayers: Player[]; defaultTournaments: Tournament[] } {
  const currentPeriod = getCurrentPeriodDates();
  const defaultPlayers: Player[] = generatePlayersFromLigas().map((d) => ({
    id: d.id,
    name: d.name,
    category: leagueNumToCategory(d.liga),
    nationality: 'Argentina',
  }));
  const defaultTournaments: Tournament[] = [
    ...buildNovakTournamentsFromDocs(currentPeriod),
    {
      id: RAFAEL_LIGA1_TOURNAMENT_ID,
      name: 'Rafael Nadal - Liga 1',
      category: leagueNumToCategory(RAFAEL_LIGA1_LEAGUE_NUM),
      tournamentType: 'greek500',
      status: 'upcoming',
      startDate: '2026-05-27',
      endDate: '2026-12-31',
      location: 'Club de Tenis — Pistas centrales',
      coverImage: 'rafa-violeta.webp',
      league: RAFAEL_LIGA1_LEAGUE_NUM as LeagueNum,
      slotsTotal: 12,
      slotsTaken: 12,
      ligaDoc: RAFAEL_LIGA1_TEMPLATE,
    },
    {
      id: RAFA_LIGA2_TOURNAMENT_ID,
      name: 'Rafael Nadal - Liga 2',
      category: leagueNumToCategory(RAFA_LIGA2_LEAGUE_NUM),
      tournamentType: 'greek500',
      status: 'upcoming',
      startDate: '2026-05-26',
      endDate: '2026-12-31',
      location: 'Club de Tenis',
      coverImage: 'rafa-naranja.webp',
      league: RAFA_LIGA2_LEAGUE_NUM as LeagueNum,
      slotsTotal: 15,
      slotsTaken: 15,
      ligaDoc: RAFA_LIGA2_TEMPLATE,
    },
    {
      id: RAFA_LIGA5_TOURNAMENT_ID,
      name: 'Rafael Nadal - Liga 5',
      category: leagueNumToCategory(RAFA_LIGA5_LEAGUE_NUM),
      tournamentType: 'greek500',
      status: 'upcoming',
      startDate: '2026-05-27',
      endDate: '2026-12-31',
      location: 'Club de Tenis',
      coverImage: 'rafa-negro.webp',
      league: RAFA_LIGA5_LEAGUE_NUM as LeagueNum,
      slotsTotal: 12,
      slotsTaken: 12,
      ligaDoc: RAFA_LIGA5_TEMPLATE,
    },
    {
      id: RAFA_LIGA6_TOURNAMENT_ID,
      name: 'Rafael Nadal - Liga 6',
      category: leagueNumToCategory(RAFA_LIGA6_LEAGUE_NUM),
      tournamentType: 'greek500',
      status: 'upcoming',
      startDate: '2026-05-26',
      endDate: '2026-12-31',
      location: 'Club de Tenis',
      coverImage: 'rafa-blanco.webp',
      league: RAFA_LIGA6_LEAGUE_NUM as LeagueNum,
      slotsTotal: 12,
      slotsTaken: 12,
      ligaDoc: RAFA_LIGA6_TEMPLATE,
    },
    {
      id: 't-federer',
      name: 'Torneo Roger Federer',
      category: 'Primera',
      tournamentType: 'greek500',
      status: 'upcoming',
      startDate: '2026-09-01',
      endDate: '2026-09-01',
      location: 'Club de Tenis',
      coverImage: 'federer.webp',
      league: 1,
      slotsTotal: 8,
      slotsTaken: 5,
    },
    {
      id: 't-masters',
      name: 'Torneo Master Finals',
      category: 'Primera',
      tournamentType: 'masters1000',
      status: 'upcoming',
      startDate: '2026-12-01',
      endDate: '2026-12-01',
      location: 'Club de Tenis — Pistas centrales',
      coverImage: 'masters.webp',
      league: 1,
      slotsTotal: 8,
      slotsTaken: 0,
    },
  ];
  return { defaultPlayers, defaultTournaments };
}

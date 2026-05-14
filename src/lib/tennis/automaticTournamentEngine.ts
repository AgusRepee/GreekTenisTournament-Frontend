/**
 * Motor de torneo automático: standings, rankings, stats y fases **solo** desde partidos.
 * No persiste tablas de posiciones ni rankings; recalcular al agregar resultados.
 */

import type { MatchInput } from '../../types/tennisResults';
import type { LeagueNum, Match, Player, Tournament } from '../mockData';
import type { CalculatedRankingRow } from './tournamentRanking';
import { calculateClubLeagueGlobalRanking } from './tournamentRanking';
import type { PlayerStats as MatchListPlayerStats } from '../../types/tennisResults';
import { aggregatePlayerStats } from './matchStatsEngine';
import { calculateGroupStandings, type GroupStandingEntry } from './groupStandings';
import { getPlayerReachedPhase, type PlayerReachedPhase, type TournamentPhaseMatch } from './playerReachedPhase';

export type { GroupStandingEntry };

/** Tabla de un grupo dentro de un torneo (derivada). */
export interface StandingsGroupResult {
  tournamentId: string;
  groupKey: string;
  rows: GroupStandingEntry[];
}

/**
 * Tablas de posiciones por grupo a partir de resultados.
 * Agrupa por `tournamentId` + `group` (`MatchInput.group`). La nómina incluye quienes jugaron; si pasás `tournaments` con `ligaDoc.grupos`, se completan nombres del grupo aunque aún no hayan jugado.
 */
/** Tablas por torneo/grupo desde `MatchInput` + plantilla opcional. */
export function calculateStandingsFromMatchResults(
  matches: MatchInput[],
  players: Player[],
  tournaments?: Tournament[],
): StandingsGroupResult[] {
  void players;
  const played = matches.filter(
    (m) =>
      m.status !== 'pending' &&
      m.status !== 'suspended' &&
      (m.score?.trim() || m.status === 'walkover' || m.status === 'retired'),
  );
  const byKey = new Map<string, MatchInput[]>();
  for (const m of played) {
    const g = (m.group ?? '').trim() || '_';
    const key = `${m.tournamentId}::${g}`;
    const list = byKey.get(key) ?? [];
    list.push(m);
    byKey.set(key, list);
  }

  const out: StandingsGroupResult[] = [];
  for (const [key, groupMatches] of byKey) {
    const sep = key.indexOf('::');
    const tournamentId = key.slice(0, sep);
    const rawG = key.slice(sep + 2);
    const t = tournaments?.find((x) => x.id === tournamentId);
    const names = new Set<string>();
    for (const m of groupMatches) {
      names.add(m.playerA.trim());
      names.add(m.playerB.trim());
    }
    if (t?.ligaDoc?.grupos && rawG !== '_') {
      const gNorm = rawG.replace(/^grupo\s*/i, '').trim().toUpperCase();
      for (const [gName, plist] of Object.entries(t.ligaDoc.grupos)) {
        const gn = gName.replace(/^grupo\s*/i, '').trim().toUpperCase();
        if (gn === gNorm || gName.toUpperCase().endsWith(gNorm)) {
          for (const n of plist) names.add(n.trim());
        }
      }
    }
    const rosterNames = [...names].sort((a, b) => a.localeCompare(b, 'es'));
    const rows = calculateGroupStandings(groupMatches, rosterNames);
    out.push({ tournamentId, groupKey: rawG === '_' ? '' : rawG, rows });
  }
  out.sort((a, b) => a.tournamentId.localeCompare(b.tournamentId) || a.groupKey.localeCompare(b.groupKey));
  return out;
}

/**
 * Rankings por liga (1–6) desde resultados. Sin persistencia de snapshots.
 */
/** Rankings por liga (puntos por fase de torneo) — misma fuente que la pantalla Rankings. */
export function calculateLeagueRankingsMap(
  tournaments: Tournament[],
  matches: MatchInput[],
  players: Player[],
  knockoutMatches: Match[] = [],
): Map<LeagueNum, CalculatedRankingRow[]> {
  const map = new Map<LeagueNum, CalculatedRankingRow[]>();
  for (let L = 1; L <= 6; L++) {
    const league = L as LeagueNum;
    map.set(
      league,
      calculateClubLeagueGlobalRanking(players, tournaments, matches, knockoutMatches, {
        league,
        previous: null,
      }),
    );
  }
  return map;
}

/**
 * Estadísticas agregadas por nombre (W/L, sets) solo desde `matches`.
 * Para stats por `playerId` + torneos usá `calculatePlayerStats` en `calculatePlayerStats.ts`.
 */
export function aggregatePlayerStatsFromMatches(matches: MatchInput[]): MatchListPlayerStats[] {
  return aggregatePlayerStats(matches, []);
}

/**
 * Fase más alta alcanzada por jugador en un torneo (partidos KO con `round` / `winnerId`).
 */
export function detectPlayerPhase(
  playerId: string,
  tournamentId: string,
  knockoutMatches: ReadonlyArray<Match>,
): PlayerReachedPhase {
  const phaseMatches: TournamentPhaseMatch[] = knockoutMatches
    .filter((m) => m.tournamentId === tournamentId)
    .map((m) => ({
      playerA: m.playerA,
      playerB: m.playerB,
      winnerId: m.winnerId,
      round: m.round,
      group: null,
    }));
  return getPlayerReachedPhase(playerId, phaseMatches);
}

export interface PlayerPhaseByTournament {
  playerId: string;
  tournamentId: string;
  phase: PlayerReachedPhase;
}

/**
 * Recorre jugadores y torneos con partidos KO; devuelve fase detectada por par (jugador, torneo).
 */
export function detectAllPlayerPhases(players: Player[], knockoutMatches: Match[]): PlayerPhaseByTournament[] {
  const byTournament = new Map<string, Match[]>();
  for (const m of knockoutMatches) {
    const tid = m.tournamentId;
    const list = byTournament.get(tid) ?? [];
    list.push(m);
    byTournament.set(tid, list);
  }
  const out: PlayerPhaseByTournament[] = [];
  for (const [tournamentId, ms] of byTournament) {
    const phaseMatches: TournamentPhaseMatch[] = ms.map((m) => ({
      playerA: m.playerA,
      playerB: m.playerB,
      winnerId: m.winnerId,
      round: m.round,
      group: null,
    }));
    for (const p of players) {
      const phase = getPlayerReachedPhase(p.id, phaseMatches);
      if (phase !== 'none') {
        out.push({ playerId: p.id, tournamentId, phase });
      }
    }
  }
  return out;
}

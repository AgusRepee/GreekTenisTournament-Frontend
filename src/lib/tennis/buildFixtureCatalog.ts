import type { LigaTemplate } from '../../types/tennisResults';
import type { Tournament, Player } from '../mockData';
import { categoryToLeague } from '../mockData';
import { LIGA_NUMBERS, type LigaNumKey } from './loadLigasFromDocs';
import { ligasData } from './loadLigasFromDocs';
import { novakTournamentId } from './generateTournamentsFromLigas';
import { RAFA_LIGA2_TEMPLATE, RAFA_LIGA2_TOURNAMENT_ID } from './rafaNadalLiga2Nd2026Data';
import { RAFA_LIGA5_TEMPLATE, RAFA_LIGA5_TOURNAMENT_ID } from './rafaNadalLiga5Nd2026Data';
import { RAFA_LIGA6_TEMPLATE, RAFA_LIGA6_TOURNAMENT_ID } from './rafaNadalLiga6Nd2026Data';
import { RAFAEL_LIGA1_TEMPLATE, RAFAEL_LIGA1_TOURNAMENT_ID } from './rafaelNadalLiga1Nd2026Data';
import { cleanPlayerName, matchInputDedupeKey } from './matchDedupe';
import { parseLibre, parseVsLine } from './fixtureLineParse';
import { getTemplateFechas } from './ligaFechas';
import { effectiveTournamentCatalogType } from './rankingPointsGreek500';
import { getEffectiveGrupos, getTemplateForTournament } from './tournamentSnapshotBridge';

/** Round-robin 4 jugadores: 3 fechas, 2 partidos por fecha. */
const MASTERS_RR4_ROUNDS: [number, number][][] = [
  [
    [0, 1],
    [2, 3],
  ],
  [
    [0, 2],
    [1, 3],
  ],
  [
    [0, 3],
    [1, 2],
  ],
];

function pushMastersRoundRobinGroup(
  tournamentId: string,
  ligaNum: LigaNumKey,
  groupKey: string,
  round: number,
  names: string[],
  pairs: [number, number][],
  out: FixtureCatalogEntry[],
): void {
  for (const [ia, ib] of pairs) {
    const playerA = cleanPlayerName(names[ia] ?? '');
    const playerB = cleanPlayerName(names[ib] ?? '');
    if (!playerA.trim() || !playerB.trim()) continue;
    const dedupeKey = matchInputDedupeKey({
      tournamentId,
      group: groupKey,
      round,
      playerA,
      playerB,
    });
    out.push({
      dedupeKey,
      tournamentId,
      ligaNum,
      stage: 'group',
      round,
      group: groupKey,
      playerA,
      playerB,
    });
  }
}

function buildMastersRoundRobinFixtureCatalog(
  tournamentId: string,
  ligaNum: LigaNumKey,
  grupos: Record<string, string[]>,
): FixtureCatalogEntry[] {
  const tid = tournamentId.trim();
  const out: FixtureCatalogEntry[] = [];
  const keys = Object.keys(grupos).sort((a, b) => a.localeCompare(b, 'es'));
  for (const gk of keys) {
    const names = grupos[gk] ?? [];
    if (names.length === 0) continue;
    MASTERS_RR4_ROUNDS.forEach((pairs, idx) => {
      pushMastersRoundRobinGroup(tid, ligaNum, gk, idx + 1, names, pairs, out);
    });
  }
  return out;
}

export type FixtureCatalogStage = 'group' | 'interzonal';

export interface FixtureCatalogEntry {
  dedupeKey: string;
  tournamentId: string;
  ligaNum: LigaNumKey;
  stage: FixtureCatalogStage;
  round: number;
  /** Clave de grupo o `Interzonal` (misma convención que la carga por fecha). */
  group: string;
  playerA: string;
  playerB: string;
}

function pushFromFechas(
  ligaNum: LigaNumKey,
  fechas: LigaTemplate['fechas'],
  tournamentId: string,
  out: FixtureCatalogEntry[],
): void {
  for (const fecha of fechas) {
    const round = fecha.numero;
    if (fecha.grupos) {
      for (const [gk, rawLines] of Object.entries(fecha.grupos)) {
        for (const line of rawLines as string[]) {
          if (parseLibre(line)) continue;
          const vs = parseVsLine(line);
          if (!vs) continue;
          const playerA = cleanPlayerName(vs.a);
          const playerB = cleanPlayerName(vs.b);
          const group = gk;
          const dedupeKey = matchInputDedupeKey({
            tournamentId,
            group,
            round,
            playerA,
            playerB,
          });
          out.push({
            dedupeKey,
            tournamentId,
            ligaNum,
            stage: 'group',
            round,
            group,
            playerA,
            playerB,
          });
        }
      }
    }
    if (Array.isArray(fecha.partidos)) {
      for (const line of fecha.partidos) {
        const vs = parseVsLine(line);
        if (!vs) continue;
        const playerA = cleanPlayerName(vs.a);
        const playerB = cleanPlayerName(vs.b);
        const group = 'Interzonal';
        const dedupeKey = matchInputDedupeKey({
          tournamentId,
          group,
          round,
          playerA,
          playerB,
        });
        out.push({
          dedupeKey,
          tournamentId,
          ligaNum,
          stage: 'interzonal',
          round,
          group,
          playerA,
          playerB,
        });
      }
    }
  }
}

/** Todos los partidos del fixture Novak (ligas 1–6) y Rafael Nadal (L1, L2, L5, L6) para gestión de pendientes. */
export function buildFixtureCatalog(): FixtureCatalogEntry[] {
  const out: FixtureCatalogEntry[] = [];
  for (const ligaNum of LIGA_NUMBERS) {
    const template = ligasData[ligaNum];
    const fechas = getTemplateFechas(ligaNum, template);
    const tournamentId = novakTournamentId(ligaNum);
    pushFromFechas(ligaNum, fechas, tournamentId, out);
  }
  pushFromFechas(RAFAEL_LIGA1_TEMPLATE.liga as LigaNumKey, RAFAEL_LIGA1_TEMPLATE.fechas, RAFAEL_LIGA1_TOURNAMENT_ID, out);
  pushFromFechas(RAFA_LIGA2_TEMPLATE.liga as LigaNumKey, RAFA_LIGA2_TEMPLATE.fechas, RAFA_LIGA2_TOURNAMENT_ID, out);
  pushFromFechas(RAFA_LIGA5_TEMPLATE.liga as LigaNumKey, RAFA_LIGA5_TEMPLATE.fechas, RAFA_LIGA5_TOURNAMENT_ID, out);
  pushFromFechas(RAFA_LIGA6_TEMPLATE.liga as LigaNumKey, RAFA_LIGA6_TEMPLATE.fechas, RAFA_LIGA6_TOURNAMENT_ID, out);
  return out;
}

/**
 * Fixture de grupos del torneo (Novak: líneas del doc; Masters: RR 2×4 desde plantel efectivo).
 * `players` reservado por compatibilidad con llamadas futuras (nombres salen de `getEffectiveGrupos`).
 */
export function buildFixtureCatalogEntriesForTournament(
  tournament: Tournament | undefined,
  _players: Player[],
): FixtureCatalogEntry[] {
  void _players;
  if (!tournament?.id?.trim()) return [];
  const tid = tournament.id.trim();
  if (effectiveTournamentCatalogType(tournament) !== 'masters1000') {
    return buildFixtureCatalog().filter((e) => e.tournamentId === tid);
  }
  const league = (tournament.league ?? categoryToLeague(tournament.category)) as LigaNumKey;
  const template = getTemplateForTournament(tournament);
  if (!template) return [];
  const grupos = getEffectiveGrupos(tournament, template);
  return buildMastersRoundRobinFixtureCatalog(tid, league, grupos);
}

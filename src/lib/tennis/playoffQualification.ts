/**
 * Clasificación automática al playoff tras la fase de grupos.
 * Todo se deriva de partidos y reglas configurables por torneo (`PlayoffQualificationRules`).
 */

import type { MatchInput, PlayerRegistry } from '../../types/tennisResults';
import {
  calculateGroupStandings,
  compareGroupStandingsOrder,
  type GroupStandingEntry,
} from './groupStandings';
import type { ExtendedStandingRow, RuleConfig } from './matchStatsEngine';
import { DEFAULT_RULE_CONFIG } from './matchStatsEngine';

/** Reglas de cupos entre grupos y repechaje de terceros (parametrizable por torneo). */
export interface PlayoffQualificationRules {
  /**
   * Puestos 1..N en cada grupo clasifican directo (sin pasar por pool de terceros).
   * Ej.: 3 = "los tres primeros de cada grupo pasan".
   */
  directQualifyingPositionsInGroup: number;
  /**
   * Si true, el jugador en `crossGroupThirdPlaceRank` de cada grupo entra al ranking global de terceros
   * (útil cuando solo pasan 1º–2º por grupo y el 3º compite entre sí).
   * Si `directQualifyingPositionsInGroup` >= `crossGroupThirdPlaceRank`, esos terceros ya están en directo y
   * no se duplican en el pool (se ignora el pool salvo advertencia).
   */
  poolCrossGroupThirdPlaces: boolean;
  /** Puesto del grupo que alimenta el pool de terceros (casi siempre 3). */
  crossGroupThirdPlaceRank: number;
  /** Entre los terceros del pool (ordenados mejor → peor), cuántos mejores clasifican sin repechaje. */
  bestThirdPlacesAutoQualify: number;
  /** Cuántos de los peores del ranking de terceros van al repechaje (típico 2 = un partido). */
  worstThirdPlacesRepechageCount: number;
  /** Cupos que otorga el repechaje de terceros (p. ej. 1 = el ganador entra a cuartos). */
  repechageWinnerPlayoffSlots: number;
  /** Ordenar los 1º de cada grupo (mejor primero) para ventaja de seed en el KO. */
  rankGroupFirstPlacesForSeeding: boolean;
  /**
   * Terceros que no entran en "mejores K" ni en "peores M" (hueco en el medio).
   * `none` = no clasifican y se listan en `unassignedThirds`.
   * `qualify_all` = también entran al playoff como wildcards.
   */
  remainingCrossGroupThirdsPolicy: 'none' | 'qualify_all';
}

export const DEFAULT_PLAYOFF_QUALIFICATION_RULES: PlayoffQualificationRules = {
  directQualifyingPositionsInGroup: 2,
  poolCrossGroupThirdPlaces: true,
  crossGroupThirdPlaceRank: 3,
  bestThirdPlacesAutoQualify: 0,
  worstThirdPlacesRepechageCount: 0,
  repechageWinnerPlayoffSlots: 1,
  rankGroupFirstPlacesForSeeding: true,
  remainingCrossGroupThirdsPolicy: 'none',
};

export interface GroupDescriptor {
  name: string;
  players: string[] | PlayerRegistry;
}

export interface PlayoffQualificationInput {
  tournamentId: string;
  matches: MatchInput[];
  groups: GroupDescriptor[];
  /** Reglas de clasificación; se fusionan con `DEFAULT_PLAYOFF_QUALIFICATION_RULES`. */
  rules?: Partial<PlayoffQualificationRules>;
  /** Reglas del motor de tabla (puntos, etc.) al calcular cada grupo. */
  ruleConfig?: RuleConfig;
  registry?: PlayerRegistry;
}

export type QualificationPath =
  | { kind: 'group_direct'; groupName: string; position: number }
  | { kind: 'best_third_cross_group' }
  | { kind: 'repechage_third_winner'; repechagePairingId: string }
  | { kind: 'remaining_third_wildcard' };

export interface QualifiedPlayer {
  player: string;
  path: QualificationPath;
}

export interface ThirdPlaceRow {
  player: string;
  groupName: string;
  standing: GroupStandingEntry;
}

export interface RepechagePairing {
  id: string;
  playerA: string;
  playerB: string;
  /** Texto fijo para UI / integración con cuadro. */
  rewardDescription: string;
}

export interface PlayoffQualificationResult {
  rulesUsed: PlayoffQualificationRules;
  standingsByGroup: Record<string, GroupStandingEntry[]>;
  /** Terceros del pool ordenados de mejor a peor (entre grupos). */
  thirdPlacesRanked: ThirdPlaceRow[];
  directQualified: QualifiedPlayer[];
  bestThirdsQualified: QualifiedPlayer[];
  repechagePairings: RepechagePairing[];
  /** Terceros en el “hueco” cuando best+repech no cubren todos (policy `none`). */
  unassignedThirds: ThirdPlaceRow[];
  warnings: string[];
  /** 1º de cada grupo, mejor primero (para cabeza de serie / orden de QF). */
  groupWinnersSeedingOrder: ThirdPlaceRow[];
  /** Orden sugerido de entrada al playoff: directos (por orden de grupos), mejores terceros, wildcards de terceros. Los ganadores de repechaje se añaden al persistir el resultado del partido. */
  playoffEntryOrder: QualifiedPlayer[];
}

/** Cupo de playoff: jugador ya clasificado o hueco hasta resolver repechaje. */
export type PlayoffEntrySlot =
  | { kind: 'player'; index: number; qualified: QualifiedPlayer }
  | { kind: 'pending_repechage'; index: number; pairing: RepechagePairing };

/**
 * Construye la lista ordenada de cupos para armar cuartos/semis (clasificados + huecos repechaje).
 */
export function buildPlayoffEntrySlots(result: PlayoffQualificationResult): PlayoffEntrySlot[] {
  const slots: PlayoffEntrySlot[] = [];
  let index = 0;
  for (const q of result.playoffEntryOrder) {
    slots.push({ kind: 'player', index: index++, qualified: q });
  }
  for (const p of result.repechagePairings) {
    slots.push({ kind: 'pending_repechage', index: index++, pairing: p });
  }
  return slots;
}

export function mergeRules(partial?: Partial<PlayoffQualificationRules>): PlayoffQualificationRules {
  return { ...DEFAULT_PLAYOFF_QUALIFICATION_RULES, ...partial };
}

/** Reglas estilo Novak (Liga 3): 1º y 2º directo; entre 3º el mejor pasa; los dos peores terceros al repechaje. */
export const NOVAK_GROUP_TO_KO_RULES: Partial<PlayoffQualificationRules> = {
  directQualifyingPositionsInGroup: 2,
  poolCrossGroupThirdPlaces: true,
  crossGroupThirdPlaceRank: 3,
  bestThirdPlacesAutoQualify: 1,
  worstThirdPlacesRepechageCount: 2,
  repechageWinnerPlayoffSlots: 1,
  rankGroupFirstPlacesForSeeding: true,
  remainingCrossGroupThirdsPolicy: 'none',
};

/** Entrada: tablas ya calculadas desde partidos reales (`calculateGroupStandings` / motor). */
export interface GroupStandingsInput {
  groupName: string;
  rows: GroupStandingEntry[];
}

export interface QualifiedPlayerStanding {
  player: string;
  groupName: string;
  standing: GroupStandingEntry;
}

export type DirectQualifierReason = 'first_in_group' | 'second_in_group' | 'best_third_cross_group';

export interface DirectQualifier {
  player: string;
  groupName: string;
  reason: DirectQualifierReason;
}

export interface GroupQualificationFromStandings {
  /** 1º de cada grupo, ordenados de mejor a peor (el primero es el “mejor primero” para cruce con ganador de repechaje). */
  firstPlaces: QualifiedPlayerStanding[];
  secondPlaces: QualifiedPlayerStanding[];
  /** Los 3º de cada grupo (antes de repartir mejor/peores entre grupos). */
  thirdPlaces: QualifiedPlayerStanding[];
  /** Pasan a eliminación sin repechaje: todos los 1º y 2º + el/los mejores 3º entre grupos. */
  directQualified: DirectQualifier[];
  /** Los dos peores 3º (según orden global) que deben jugarse el repechaje. */
  repechagePlayers: QualifiedPlayerStanding[];
}

function entryToComparableForThird(row: GroupStandingEntry): ExtendedStandingRow {
  return {
    player: row.player,
    played: row.played,
    won: row.won,
    lost: row.lost,
    setsWon: row.setsWon,
    setsLost: row.setsLost,
    gamesWon: 0,
    gamesLost: 0,
    setsDiff: row.setsDifference,
    gamesDiff: 0,
    points: 0,
    position: row.position,
  };
}

function compareThirdPlaceRows(a: ThirdPlaceRow, b: ThirdPlaceRow): number {
  return compareGroupStandingsOrder(entryToComparableForThird(a.standing), entryToComparableForThird(b.standing));
}

/**
 * Ordena terceros entre grupos de mejor a peor (clasificación cruzada).
 * Criterios (igual que `compareGroupStandingsOrder` / tabla de grupo):
 * 1. Partidos ganados · 2. Diferencia de sets · 3. Sets ganados · 4. Nombre (es).
 */
export function rankThirdPlacedPlayers(thirdPlaces: ThirdPlaceRow[]): ThirdPlaceRow[] {
  return [...thirdPlaces].sort(compareThirdPlaceRows);
}

/**
 * Parte el ranking cruzado de terceros: mejores K (clasificación directa), el resto, y bloque M peor para repechaje.
 */
export function splitThirdPlacesForPlayoff(
  thirdPlaces: ThirdPlaceRow[],
  rules: PlayoffQualificationRules,
): {
  ranked: ThirdPlaceRow[];
  bestThirdsDirect: ThirdPlaceRow[];
  /** Terceros que no entran en los K mejores (incluye candidatos a repechaje y “hueco”). */
  afterBest: ThirdPlaceRow[];
  repechageBlock: ThirdPlaceRow[];
} {
  const ranked = rankThirdPlacedPlayers(thirdPlaces);
  const k = Math.min(rules.bestThirdPlacesAutoQualify, ranked.length);
  const mRep = rules.worstThirdPlacesRepechageCount;
  const mRepEven = mRep > 0 && mRep % 2 !== 0 ? mRep - 1 : mRep;
  const bestThirdsDirect = ranked.slice(0, k);
  const afterBest = ranked.slice(k);
  const repechageBlock =
    mRepEven > 0 && afterBest.length > 0
      ? afterBest.slice(-Math.min(mRepEven, afterBest.length))
      : [];
  return { ranked, bestThirdsDirect, afterBest, repechageBlock };
}

/**
 * Reordena filas del grupo con los mismos criterios que el motor: PG → diff sets → sets ganados → nombre.
 */
export function normalizeGroupStandingRows(rows: GroupStandingEntry[]): GroupStandingEntry[] {
  if (rows.length === 0) return [];
  const ext = rows.map(entryToComparableForThird);
  const sorted = [...ext].sort(compareGroupStandingsOrder);
  return sorted.map((row, i) => ({
    player: row.player,
    position: i + 1,
    played: row.played,
    won: row.won,
    lost: row.lost,
    setsWon: row.setsWon,
    setsLost: row.setsLost,
    setsDifference: row.setsDiff,
  }));
}

/**
 * Clasificación al playoff solo desde tablas de grupos ya calculadas (sin nombres hardcodeados).
 * Por defecto aplica reglas tipo Novak: top 3 por grupo en la tabla; 1º y 2º directos; el mejor 3º global
 * también directo; los dos peores 3º van al repechaje.
 */
export function getQualifiedPlayers(
  groupStandings: GroupStandingsInput[],
  rules?: Partial<PlayoffQualificationRules>,
): GroupQualificationFromStandings {
  const merged = mergeRules({ ...NOVAK_GROUP_TO_KO_RULES, ...rules });

  const normalized = groupStandings.map((g) => ({
    groupName: g.groupName,
    rows: normalizeGroupStandingRows(g.rows),
  }));

  const firstPlaces: QualifiedPlayerStanding[] = [];
  const secondPlaces: QualifiedPlayerStanding[] = [];
  const thirdPlaces: QualifiedPlayerStanding[] = [];

  for (const { groupName, rows } of normalized) {
    const r1 = rows.find((r) => r.position === 1);
    const r2 = rows.find((r) => r.position === 2);
    const r3 = rows.find((r) => r.position === 3);
    if (r1) firstPlaces.push({ player: r1.player, groupName, standing: r1 });
    if (r2) secondPlaces.push({ player: r2.player, groupName, standing: r2 });
    if (r3) thirdPlaces.push({ player: r3.player, groupName, standing: r3 });
  }

  if (merged.rankGroupFirstPlacesForSeeding) {
    firstPlaces.sort((a, b) =>
      compareGroupStandingsOrder(entryToComparableForThird(a.standing), entryToComparableForThird(b.standing)),
    );
  }

  const thirdPool: ThirdPlaceRow[] = thirdPlaces.map((t) => ({
    player: t.player,
    groupName: t.groupName,
    standing: t.standing,
  }));
  const { bestThirdsDirect: bestSlice, repechageBlock: worstBlock } = splitThirdPlacesForPlayoff(thirdPool, merged);

  const repechagePlayers: QualifiedPlayerStanding[] = worstBlock.map((w) => ({
    player: w.player,
    groupName: w.groupName,
    standing: w.standing,
  }));

  const groupOrder = [...new Set(normalized.map((g) => g.groupName))].sort((a, b) => a.localeCompare(b, 'es'));
  const directQualified: DirectQualifier[] = [];
  for (const gname of groupOrder) {
    const rows = normalized.find((x) => x.groupName === gname)?.rows ?? [];
    const r1 = rows.find((r) => r.position === 1);
    const r2 = rows.find((r) => r.position === 2);
    if (r1) directQualified.push({ player: r1.player, groupName: gname, reason: 'first_in_group' });
    if (r2) directQualified.push({ player: r2.player, groupName: gname, reason: 'second_in_group' });
  }
  for (const b of bestSlice) {
    directQualified.push({ player: b.player, groupName: b.groupName, reason: 'best_third_cross_group' });
  }

  return {
    firstPlaces,
    secondPlaces,
    thirdPlaces,
    directQualified,
    repechagePlayers,
  };
}

function matchesForGroup(
  matches: MatchInput[],
  tournamentId: string,
  groupName: string,
): MatchInput[] {
  const g = groupName.trim();
  return matches.filter(
    (m) =>
      m.tournamentId === tournamentId &&
      String(m.group ?? '').trim() === g &&
      m.status !== 'pending' &&
      m.status !== 'suspended',
  );
}

/** Número de partidos en una liga todos contra todos. */
export function expectedRoundRobinMatches(playerCount: number): number {
  if (playerCount < 2) return 0;
  return (playerCount * (playerCount - 1)) / 2;
}

/**
 * Partidos de grupo jugados vs esperados (round-robin completo).
 */
export function countPlayedGroupMatches(matches: MatchInput[], tournamentId: string, groupName: string): number {
  return matchesForGroup(matches, tournamentId, groupName).filter((m) => m.status === 'played' || m.status === 'walkover' || m.status === 'retired').length;
}

export function isGroupStageComplete(
  matches: MatchInput[],
  tournamentId: string,
  group: GroupDescriptor,
): boolean {
  const n = group.players.length;
  const need = expectedRoundRobinMatches(n);
  if (need === 0) return true;
  return countPlayedGroupMatches(matches, tournamentId, group.name) >= need;
}

/**
 * Empareja terceros en orden mejor→peor del bloque recibido (típicamente los “peores” ya recortados).
 * Con 2 filas → un partido; con 4 → dos partidos cruzando extremos del bloque.
 */
export function pairWorstThirdsForRepechage(
  thirdPlacesBestFirst: ThirdPlaceRow[],
): Array<{ playerA: string; playerB: string }> {
  const m = thirdPlacesBestFirst.length;
  if (m < 2) return [];
  const pairs: Array<{ playerA: string; playerB: string }> = [];
  for (let i = 0; i < m / 2; i++) {
    const left = thirdPlacesBestFirst[i]!;
    const right = thirdPlacesBestFirst[m - 1 - i]!;
    if (left.player === right.player) break;
    pairs.push({ playerA: left.player, playerB: right.player });
  }
  return pairs;
}

function dedupeQualified(list: QualifiedPlayer[]): QualifiedPlayer[] {
  const seen = new Set<string>();
  const out: QualifiedPlayer[] = [];
  for (const q of list) {
    if (seen.has(q.player)) continue;
    seen.add(q.player);
    out.push(q);
  }
  return out;
}

/**
 * Calcula tablas por grupo, clasificados directos, ranking de terceros, repechaje y orden de seeds de 1º.
 */
export function computePlayoffQualification(input: PlayoffQualificationInput): PlayoffQualificationResult {
  const rules = mergeRules(input.rules);
  const { tournamentId, matches, groups } = input;
  const ruleConfig = input.ruleConfig ?? DEFAULT_RULE_CONFIG;
  const warnings: string[] = [];

  const standingsByGroup: Record<string, GroupStandingEntry[]> = {};
  for (const g of groups) {
    const groupMatches = matchesForGroup(matches, tournamentId, g.name);
    standingsByGroup[g.name] = calculateGroupStandings(groupMatches, g.players, ruleConfig);
  }

  const directQualified: QualifiedPlayer[] = [];
  for (const g of groups) {
    const table = standingsByGroup[g.name] ?? [];
    for (const row of table) {
      if (row.position <= rules.directQualifyingPositionsInGroup) {
        directQualified.push({
          player: row.player,
          path: { kind: 'group_direct', groupName: g.name, position: row.position },
        });
      }
    }
  }

  const thirdPool: ThirdPlaceRow[] = [];
  const thirdAlreadyDirect =
    rules.poolCrossGroupThirdPlaces &&
    rules.crossGroupThirdPlaceRank <= rules.directQualifyingPositionsInGroup;

  if (thirdAlreadyDirect && rules.poolCrossGroupThirdPlaces) {
    warnings.push(
      `crossGroupThirdPlaceRank (${rules.crossGroupThirdPlaceRank}) está incluido en directQualifyingPositionsInGroup (${rules.directQualifyingPositionsInGroup}); el pool de terceros entre grupos no aplica.`,
    );
  }

  if (rules.poolCrossGroupThirdPlaces && !thirdAlreadyDirect) {
    for (const g of groups) {
      const table = standingsByGroup[g.name] ?? [];
      const row = table.find((r) => r.position === rules.crossGroupThirdPlaceRank);
      if (!row) {
        warnings.push(`Grupo "${g.name}": no hay puesto ${rules.crossGroupThirdPlaceRank} para el pool de terceros.`);
        continue;
      }
      thirdPool.push({ player: row.player, groupName: g.name, standing: row });
    }
  }

  const {
    ranked: thirdPlacesRanked,
    bestThirdsDirect: bestSlice,
    afterBest,
    repechageBlock: worstBlock,
  } = splitThirdPlacesForPlayoff(thirdPool, rules);
  const nThird = thirdPlacesRanked.length;
  const k = Math.min(rules.bestThirdPlacesAutoQualify, nThird);
  const mRep = rules.worstThirdPlacesRepechageCount;

  if (mRep % 2 !== 0 && mRep > 0) {
    warnings.push(`worstThirdPlacesRepechageCount (${mRep}) debería ser par para emparejar; se usará ${mRep - 1}.`);
  }
  const mRepEven = mRep > 0 && mRep % 2 !== 0 ? mRep - 1 : mRep;

  if (k > nThird && nThird > 0) {
    warnings.push(`bestThirdPlacesAutoQualify (${k}) supera los terceros en pool (${nThird}).`);
  }

  if (mRepEven > 0 && worstBlock.length < mRepEven) {
    warnings.push(
      `Repechaje de terceros: se pidieron ${mRepEven} jugadores pero solo hay ${worstBlock.length} en el resto tras los mejores ${k}.`,
    );
  }

  const bestSet = new Set(bestSlice.map((r) => r.player));
  const worstSet = new Set(worstBlock.map((r) => r.player));

  const bestThirdsQualified: QualifiedPlayer[] = bestSlice.map((r) => ({
    player: r.player,
    path: { kind: 'best_third_cross_group' },
  }));

  const rawPairs = pairWorstThirdsForRepechage(worstBlock);
  const repechagePairings: RepechagePairing[] = rawPairs.map((p, i) => ({
    id: `repech-third-${i + 1}`,
    playerA: p.playerA,
    playerB: p.playerB,
    rewardDescription:
      rules.repechageWinnerPlayoffSlots > 0
        ? `Ganador obtiene cupo(s) al playoff (${rules.repechageWinnerPlayoffSlots})`
        : 'Repechaje (sin cupo configurado)',
  }));

  const middle = afterBest.filter((r) => !worstSet.has(r.player));
  const remainingWildcards: QualifiedPlayer[] = [];
  if (rules.remainingCrossGroupThirdsPolicy === 'qualify_all' && middle.length > 0) {
    for (const r of middle) {
      remainingWildcards.push({ player: r.player, path: { kind: 'remaining_third_wildcard' } });
    }
  } else if (middle.length > 0) {
    warnings.push(
      `${middle.length} tercero(s) quedan fuera del bloque "mejores ${k}" y "peores ${mRepEven}"; no clasifican (remainingCrossGroupThirdsPolicy: none).`,
    );
  }

  const unassignedThirds: ThirdPlaceRow[] =
    rules.remainingCrossGroupThirdsPolicy === 'none' ? middle : [];

  const groupWinnersSeedingOrder: ThirdPlaceRow[] = [];
  if (rules.rankGroupFirstPlacesForSeeding) {
    const winners: ThirdPlaceRow[] = [];
    for (const g of groups) {
      const table = standingsByGroup[g.name] ?? [];
      const first = table.find((r) => r.position === 1);
      if (first) {
        winners.push({ player: first.player, groupName: g.name, standing: first });
      }
    }
    groupWinnersSeedingOrder.push(...rankThirdPlacedPlayers(winners));
  }

  const playoffEntryOrder = dedupeQualified([
    ...directQualified,
    ...bestThirdsQualified,
    ...remainingWildcards,
  ]);

  return {
    rulesUsed: rules,
    standingsByGroup,
    thirdPlacesRanked,
    directQualified,
    bestThirdsQualified,
    repechagePairings,
    unassignedThirds,
    warnings,
    groupWinnersSeedingOrder,
    playoffEntryOrder,
  };
}

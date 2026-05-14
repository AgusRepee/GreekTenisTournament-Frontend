/**
 * Cuadro de eliminación (8 jugadores → cuartos, semis, final) derivado solo de clasificados reales.
 */

import type { Match, MatchStage } from '../../types/tournament';
import type { MatchInput } from '../../types/tennisResults';
import { compareGroupStandingsOrder, type GroupStandingEntry } from './groupStandings';
import { parseMatch, type ExtendedStandingRow } from './matchStatsEngine';
import type { DirectQualifier, QualifiedPlayerStanding } from './playoffQualification';

/** Texto fijo para huecos aún sin ganador de ronda previa o cupo pendiente. */
export const ELIMINATION_SLOT_TBD = 'A confirmar';

export interface GenerateEliminationMatchesInput {
  tournamentId: string;
  /** Mejor → peor (p. ej. salida de `getQualifiedPlayers`). */
  firstPlaces: QualifiedPlayerStanding[];
  secondPlaces: QualifiedPlayerStanding[];
  /**
   * 3º por grupo (para ubicar al mejor tercero clasificado directo).
   * Si se omite, solo se usan segundos en cabezas 4–7.
   */
  thirdPlaces?: QualifiedPlayerStanding[];
  directQualified: DirectQualifier[];
  /** Ganador del repechaje; `null` si aún no hay o no aplica. */
  repechageWinner: string | null;
  /** Prefijo para `id` de partidos (default: `ko`). */
  idPrefix?: string;
}

export interface EliminationBracketResult {
  quarterfinals: Match[];
  semifinals: Match[];
  final: Match;
  /** Orden de cabeza de serie 1 (mejor) → 8 (peor / repechaje cuando aplica). */
  seedOrder: string[];
}

const KO_STAGES: ReadonlySet<MatchStage> = new Set(['quarterfinal', 'semifinal', 'final']);

export interface AdvanceBracketResult {
  /** Misma longitud y orden que la entrada; partidos KO actualizados. */
  matches: Match[];
  /** Por `tournamentId`, ganador de la final si ya está cerrada; si no, `null`. */
  championIdByTournament: Record<string, string | null>;
}

function isEliminationKoStage(stage: MatchStage): boolean {
  return KO_STAGES.has(stage);
}

function sortEliminationMatches(a: Match, b: Match): number {
  const order: Record<MatchStage, number> = {
    group: 0,
    repechage: 0,
    interzonal: 0,
    quarterfinal: 1,
    semifinal: 2,
    final: 3,
  };
  const da = order[a.stage] ?? 99;
  const db = order[b.stage] ?? 99;
  if (da !== db) return da - db;
  return (a.roundNumber ?? 0) - (b.roundNumber ?? 0);
}

/** `outcome` explícito, o `played` si ya está `completed` con marcador (flujo admin). */
function resolvedOutcomeForParse(m: Match): 'played' | 'walkover' | 'retired' | 'pending' {
  if (m.outcome && m.outcome !== 'pending') return m.outcome;
  if (m.completed && m.result?.trim()) return 'played';
  return 'pending';
}

function matchToMatchInput(m: Match): MatchInput {
  const outcome = resolvedOutcomeForParse(m);
  const status: MatchInput['status'] =
    outcome === 'walkover' ? 'walkover' : outcome === 'retired' ? 'retired' : outcome === 'played' ? 'played' : 'pending';
  return {
    tournamentId: m.tournamentId,
    playerA: m.player1Id,
    playerB: m.player2Id,
    score: m.result,
    status,
  };
}

function canParseEliminationResult(m: Match): boolean {
  if (!m.result?.trim()) return false;
  if (resolvedOutcomeForParse(m) === 'pending') return false;
  if (m.player1Id === ELIMINATION_SLOT_TBD || m.player2Id === ELIMINATION_SLOT_TBD) return false;
  return true;
}

/**
 * Si hay marcador y resultado válido, rellena `winnerId` y `completed` desde el motor de parseo.
 */
export function enrichEliminationMatchFromResult(m: Match): Match {
  if (m.completed && m.winnerId) return { ...m };
  if (!canParseEliminationResult(m)) return { ...m };
  try {
    const parsed = parseMatch(matchToMatchInput(m));
    const winner = parsed.winner;
    if (!winner) return { ...m };
    const outcome: Match['outcome'] =
      parsed.isWalkover ? 'walkover' : parsed.isRetired ? 'retired' : 'played';
    return {
      ...m,
      completed: true,
      winnerId: winner,
      outcome,
    };
  } catch {
    return { ...m };
  }
}

function winnerOrTbd(m: Match): string {
  if (m.completed && m.winnerId) return m.winnerId;
  return ELIMINATION_SLOT_TBD;
}

/**
 * Propaga ganadores de cuartos → semis → final (mismo emparejamiento que `generateEliminationMatches`).
 * Re-ejecutar tras cada entrada de resultado mantiene el cuadro coherente.
 */
export function advanceBracket(matches: ReadonlyArray<Match>): AdvanceBracketResult {
  const byId = new Map<string, Match>(matches.map((m) => [m.id, { ...m }]));

  const koMatchIds = matches.filter((m) => isEliminationKoStage(m.stage)).map((m) => m.id);
  const tids = [...new Set(koMatchIds.map((id) => byId.get(id)!.tournamentId))];

  for (const tid of tids) {
    const ko = [...byId.values()]
      .filter((m) => m.tournamentId === tid && isEliminationKoStage(m.stage))
      .sort(sortEliminationMatches);

    const qfs = ko.filter((m) => m.stage === 'quarterfinal');
    const sfs = ko.filter((m) => m.stage === 'semifinal');
    const finals = ko.filter((m) => m.stage === 'final');

    for (const m of qfs) {
      byId.set(m.id, enrichEliminationMatchFromResult(byId.get(m.id)!));
    }

    if (qfs.length >= 4 && sfs.length >= 2) {
      const q = qfs.map((x) => byId.get(x.id)!);
      const sf0 = { ...byId.get(sfs[0]!.id)! };
      const sf1 = { ...byId.get(sfs[1]!.id)! };
      sf0.player1Id = winnerOrTbd(q[0]!);
      sf0.player2Id = winnerOrTbd(q[1]!);
      sf1.player1Id = winnerOrTbd(q[2]!);
      sf1.player2Id = winnerOrTbd(q[3]!);
      byId.set(sf0.id, sf0);
      byId.set(sf1.id, sf1);
    }

    for (const m of sfs) {
      byId.set(m.id, enrichEliminationMatchFromResult(byId.get(m.id)!));
    }

    if (finals.length >= 1 && sfs.length >= 2) {
      const s = sfs.map((x) => byId.get(x.id)!);
      const f = { ...byId.get(finals[0]!.id)! };
      f.player1Id = winnerOrTbd(s[0]!);
      f.player2Id = winnerOrTbd(s[1]!);
      byId.set(f.id, f);
    }

    for (const m of finals) {
      byId.set(m.id, enrichEliminationMatchFromResult(byId.get(m.id)!));
    }
  }

  const out = matches.map((m) => byId.get(m.id)!);

  const championIdByTournament: Record<string, string | null> = {};
  for (const tid of tids) {
    const fin = [...byId.values()].find((m) => m.tournamentId === tid && m.stage === 'final');
    championIdByTournament[tid] =
      fin && fin.completed && fin.winnerId ? fin.winnerId : null;
  }

  return { matches: out, championIdByTournament };
}

function qualifiedToExt(q: QualifiedPlayerStanding): ExtendedStandingRow {
  const row = q.standing;
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

function compareQualified(a: QualifiedPlayerStanding, b: QualifiedPlayerStanding): number {
  if (a.player === ELIMINATION_SLOT_TBD) return 1;
  if (b.player === ELIMINATION_SLOT_TBD) return -1;
  return compareGroupStandingsOrder(qualifiedToExt(a), qualifiedToExt(b));
}

function emptyStanding(player: string): GroupStandingEntry {
  return {
    player,
    position: 99,
    played: 0,
    won: 0,
    lost: 0,
    setsWon: 0,
    setsLost: 0,
    setsDifference: 0,
  };
}

function bestThirdQualified(
  thirdPlaces: QualifiedPlayerStanding[],
  directQualified: DirectQualifier[],
): QualifiedPlayerStanding | undefined {
  const name = directQualified.find((d) => d.reason === 'best_third_cross_group')?.player;
  if (!name) return undefined;
  return thirdPlaces.find((t) => t.player === name);
}

/**
 * Construye cabezas de serie 1..8: 1º–3º de grupo, luego 4º–7º entre 2º y mejor 3º (por tabla),
 * y 8º = ganador repechaje (o hueco / fallback).
 */
export function computeEliminationSeedOrder8(input: GenerateEliminationMatchesInput): string[] {
  const { firstPlaces, secondPlaces, thirdPlaces = [], directQualified, repechageWinner } = input;

  const firstNames = firstPlaces.map((f) => f.player);
  const bestThird = bestThirdQualified(thirdPlaces, directQualified);

  const secondsSorted = [...secondPlaces].sort(compareQualified);

  const middlePool: QualifiedPlayerStanding[] = [...secondsSorted];
  if (bestThird) middlePool.push(bestThird);
  middlePool.sort(compareQualified);

  /** Cuatro jugadores para ocupar cabezas 4–7 (mejor clasificado entre 2º + mejor 3º → cabeza 4). */
  const middleFour: QualifiedPlayerStanding[] = middlePool.slice(0, 4);
  while (middleFour.length < 4) {
    middleFour.push({
      player: ELIMINATION_SLOT_TBD,
      groupName: '',
      standing: emptyStanding(ELIMINATION_SLOT_TBD),
    });
  }

  const s1 = firstNames[0] ?? ELIMINATION_SLOT_TBD;
  const s2 = firstNames[1] ?? ELIMINATION_SLOT_TBD;
  const s3 = firstNames[2] ?? ELIMINATION_SLOT_TBD;
  const s4 = middleFour[0]!.player;
  const s5 = middleFour[1]!.player;
  const s6 = middleFour[2]!.player;
  const s7 = middleFour[3]!.player;
  const s8 = repechageWinner ?? ELIMINATION_SLOT_TBD;

  const raw = [s1, s2, s3, s4, s5, s6, s7, s8];
  const seen = new Set<string>();
  return raw.map((name) => {
    if (name === ELIMINATION_SLOT_TBD) return name;
    if (seen.has(name)) return ELIMINATION_SLOT_TBD;
    seen.add(name);
    return name;
  });
}

function makeMatch(
  tournamentId: string,
  id: string,
  stage: Match['stage'],
  roundNumber: number,
  player1Id: string,
  player2Id: string,
): Match {
  return {
    id,
    tournamentId,
    stage,
    roundNumber,
    player1Id,
    player2Id,
    completed: false,
    outcome: 'pending',
  };
}

/**
 * Genera cuartos (emparejamientos 1v8, 4v5, 3v6, 2v7), semis y final con placeholders hasta resolver resultados.
 */
export function generateEliminationMatches(
  input: GenerateEliminationMatchesInput,
): EliminationBracketResult {
  const tid = input.tournamentId;
  const prefix = input.idPrefix ?? 'ko';
  const seeds = computeEliminationSeedOrder8(input);
  const [S1, S2, S3, S4, S5, S6, S7, S8] = seeds;

  const quarterfinals: Match[] = [
    makeMatch(tid, `${prefix}-qf-1`, 'quarterfinal', 1, S1, S8),
    makeMatch(tid, `${prefix}-qf-2`, 'quarterfinal', 2, S4, S5),
    makeMatch(tid, `${prefix}-qf-3`, 'quarterfinal', 3, S3, S6),
    makeMatch(tid, `${prefix}-qf-4`, 'quarterfinal', 4, S2, S7),
  ];

  const semifinals: Match[] = [
    makeMatch(tid, `${prefix}-sf-1`, 'semifinal', 5, ELIMINATION_SLOT_TBD, ELIMINATION_SLOT_TBD),
    makeMatch(tid, `${prefix}-sf-2`, 'semifinal', 6, ELIMINATION_SLOT_TBD, ELIMINATION_SLOT_TBD),
  ];

  const final = makeMatch(tid, `${prefix}-f-1`, 'final', 7, ELIMINATION_SLOT_TBD, ELIMINATION_SLOT_TBD);

  return {
    quarterfinals,
    semifinals,
    final,
    seedOrder: seeds,
  };
}

// src/lib/tennis/matchStatsEngine.ts

import type {
  MatchInput,
  ParsedMatch,
  ParsedSet,
  PlayerRegistry,
  PlayerRegistryEntry,
  PlayerStats,
  StandingRow,
} from '../../types/tennisResults';
  
  /**
   * Configuración de reglas para cálculo de standings.
   */
  export interface RuleConfig {
    winPoints: number;
    lossPoints: number;
    walkoverWinPoints: number;
    walkoverLossPoints: number;
    retirementWinPoints: number;
    retirementLossPoints: number;
    useHeadToHead: boolean;
    useSetDifference: boolean;
    useGameDifference: boolean;
    sortFallback: "alphabetical" | "random_draw";
    groupAdvanceCount: number;
  }
  
  /**
   * Reglas por defecto del club para tabla de fase de grupos (alineado con `ENGINE_GROUP_RULES` en `tournamentEngine`).
   * Victoria 3 · derrota 0 (incl. W.O. y retiro salvo que un torneo defina override futuro).
   */
  export const DEFAULT_RULE_CONFIG: RuleConfig = {
    winPoints: 3,
    lossPoints: 0,
    walkoverWinPoints: 3,
    walkoverLossPoints: 0,
    retirementWinPoints: 3,
    retirementLossPoints: 0,
    useHeadToHead: true,
    useSetDifference: true,
    useGameDifference: true,
    sortFallback: "alphabetical",
    groupAdvanceCount: 2,
  };
  
  export type PlacementCode =
    | "champion"
    | "finalist"
    | "semifinalist"
    | "quarterfinalist"
    | "group_qualified"
    | "participant"
    | "walkover_win"
    | "disqualified";
  
  export type RankingPointsTable = Record<PlacementCode, number>;
  
  export const DEFAULT_POINTS_TABLE: RankingPointsTable = {
    champion: 100,
    finalist: 70,
    semifinalist: 45,
    quarterfinalist: 25,
    group_qualified: 15,
    participant: 5,
    walkover_win: 0,
    disqualified: 0,
  };
  
  export interface AliasSuggestion {
    input: string;
    suggestions: string[];
  }
  
  export class ParseError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ParseError";
    }
  }
  
  export class UnknownPlayerError extends Error {
    public details: AliasSuggestion;
  
    constructor(input: string, suggestions: string[] = []) {
      super(
        suggestions.length > 0
          ? `No se pudo resolver el jugador "${input}". Quizás quisiste decir: ${suggestions.join(", ")}`
          : `No se pudo resolver el jugador "${input}".`
      );
      this.name = "UnknownPlayerError";
      this.details = { input, suggestions };
    }
  }
  
  export class InconsistentResultError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "InconsistentResultError";
    }
  }
  
  export interface ParsedScoreOutcome {
    sets: ParsedSet[];
    setsWonA: number;
    setsWonB: number;
    gamesWonA: number;
    gamesWonB: number;
    winner: "A" | "B";
    isWalkover: boolean;
    isRetired: boolean;
  }
  
  export interface HeadToHeadRecord {
    a: string;
    b: string;
    winner: string;
  }
  
  export interface LastMatchItem {
    tournamentId: string;
    playerA: string;
    playerB: string;
    score?: string;
    status: MatchInput["status"];
    date?: string;
    result: "W" | "L";
  }
  
  export interface ExtendedStandingRow extends StandingRow {
    setsWon: number;
    setsLost: number;
    gamesWon: number;
    gamesLost: number;
    position: number;
  }
  
  export interface AdvanceResult {
    direct: ExtendedStandingRow[];
    bestThirdsStub: ExtendedStandingRow[];
    repechageStub: ExtendedStandingRow[];
  }
  
  /**
   * Normaliza nombre de jugador:
   * - trim
   * - colapsa espacios múltiples
   * - opcionalmente pasa a minúsculas
   */
  export function normalizePlayerName(
    value: string,
    options?: { casefold?: boolean }
  ): string {
    const trimmed = value.trim().replace(/\s+/g, " ");
    return options?.casefold ? trimmed.toLocaleLowerCase("es-AR") : trimmed;
  }
  
  /**
   * Resuelve un alias contra un registry de jugadores.
   * Si no encuentra coincidencia, lanza UnknownPlayerError con sugerencias.
   */
  export function resolvePlayerAlias(
    input: string,
    registry: PlayerRegistry
  ): string {
    const target = normalizePlayerName(input, { casefold: true });
  
    for (const entry of registry) {
      const canonical = normalizePlayerName(entry.name, { casefold: true });
      if (canonical === target) {
        return entry.name;
      }
  
      const aliases = (entry.aliases ?? []).map((alias) =>
        normalizePlayerName(alias, { casefold: true })
      );
  
      if (aliases.includes(target)) {
        return entry.name;
      }
    }
  
    const suggestions = registry
      .map((entry) => entry.name)
      .filter((name) => {
        const normalized = normalizePlayerName(name, { casefold: true });
        return normalized.includes(target) || target.includes(normalized);
      })
      .slice(0, 5);
  
    throw new UnknownPlayerError(input, suggestions);
  }
  
  /**
   * Heurística:
   * - "WO" => walkover
   * - "RET" / "RET." => retiro
   * - separadores permitidos: espacio, coma, punto y coma
   * - tie-break: 7-6(5), 6-7(8)
   * - match tie-break: 10-7, 10-2, 7-10
   */
  export type ParseMatchScoreOptions = {
    /**
     * En panel admin: si hay tres segmentos numéricos, el último debe ser Super Tie-Break (≥10 puntos).
     * Desactivado por defecto para no invalidar marcadores legacy ya persistidos (ej. tercer set a games).
     */
    requireThirdSetSuperTiebreak?: boolean;
  };

  export function parseMatchScore(scoreRaw: string, options?: ParseMatchScoreOptions): ParsedScoreOutcome {
    const score = normalizePlayerName(scoreRaw, { casefold: false }).toUpperCase();
  
    if (!score) {
      throw new ParseError("El marcador está vacío.");
    }
  
    if (score === "WO") {
      throw new ParseError(
        'El valor "WO" requiere contexto externo para saber quién ganó. Usá status="walkover" y determiná el ganador por los jugadores cargados.'
      );
    }
  
    const isRetired = /\bRET\.?\b|\bABANDONO\b/.test(score);
    const cleaned = score.replace(/\bRET\.?\b|\bY\s+ABANDONO\b|\bABANDONO\b/g, "").trim();
  
    const rawSegments = cleaned
      .split(/[;,/]|\s+/)
      .map((segment) => segment.trim())
      .filter(Boolean);
  
    if (rawSegments.length === 0) {
      throw new ParseError("No se encontraron sets válidos en el marcador.");
    }
  
    if (rawSegments.length > 3) {
      throw new ParseError("El marcador tiene demasiados segmentos para un partido al mejor de tres.");
    }
  
    const sets: ParsedSet[] = rawSegments.map((segment, index) =>
      parseScoreSegment(segment, { allowPartialRegularSet: isRetired && index === rawSegments.length - 1 })
    );
  
    validateSetSequence(sets, { isRetired });
  
    let setsWonA = 0;
    let setsWonB = 0;
    let gamesWonA = 0;
    let gamesWonB = 0;
  
    for (const set of sets) {
      gamesWonA += set.gamesA;
      gamesWonB += set.gamesB;
  
      if (set.gamesA > set.gamesB) {
        setsWonA += 1;
      } else if (set.gamesB > set.gamesA) {
        setsWonB += 1;
      }
    }
  
    if (!isRetired) {
      if (setsWonA === setsWonB) {
        throw new InconsistentResultError("El resultado todavía no define un ganador.");
      }

      if (setsWonA < 2 && setsWonB < 2 && sets.length < 2) {
        throw new InconsistentResultError("Faltan sets para cerrar el partido (se necesitan 2 sets ganados o un tercer super tie-break).");
      }

      if (options?.requireThirdSetSuperTiebreak === true && sets.length === 3 && !sets[sets.length - 1]!.isMatchTiebreak) {
        throw new InconsistentResultError(
          "Si completás tres sets, el último debe ser Super Tie-Break (ej. 10-8).",
        );
      }
    }
  
    const winner = setsWonA > setsWonB ? "A" : "B";
  
    return {
      sets,
      setsWonA,
      setsWonB,
      gamesWonA,
      gamesWonB,
      winner,
      isWalkover: false,
      isRetired,
    };
  }
  
  /**
   * Parsea un segmento de set individual.
   * Ejemplos:
   * - 6-4
   * - 7-6(5)
   * - 10-2
   */
  export function parseScoreSegment(segmentRaw: string, options?: { allowPartialRegularSet?: boolean }): ParsedSet {
    const segment = segmentRaw.trim().toUpperCase();
  
    const tbMatch = segment.match(/^(\d+)-(\d+)\((\d+)\)$/);
    if (tbMatch) {
      const gamesA = Number(tbMatch[1]);
      const gamesB = Number(tbMatch[2]);
      const tiebreak = Number(tbMatch[3]);
  
      validateRegularSet(gamesA, gamesB, true);
  
      return {
        gamesA,
        gamesB,
        tiebreak,
        isMatchTiebreak: false,
      };
    }
  
    const plainMatch = segment.match(/^(\d+)-(\d+)$/);
    if (!plainMatch) {
      throw new ParseError(`Segmento inválido: "${segmentRaw}".`);
    }
  
    const gamesA = Number(plainMatch[1]);
    const gamesB = Number(plainMatch[2]);
  
    if (looksLikeMatchTiebreak(gamesA, gamesB)) {
      validateMatchTiebreak(gamesA, gamesB);
  
      return {
        gamesA,
        gamesB,
        isMatchTiebreak: true,
      };
    }
  
    if (options?.allowPartialRegularSet) {
      validatePartialRegularSet(gamesA, gamesB);
    } else {
      validateRegularSet(gamesA, gamesB, false);
    }
  
    return {
      gamesA,
      gamesB,
      isMatchTiebreak: false,
    };
  }
  
  function looksLikeMatchTiebreak(a: number, b: number): boolean {
    const max = Math.max(a, b);
    return max >= 10 && max <= 99;
  }
  
  function validateMatchTiebreak(a: number, b: number): void {
    if (a < 0 || b < 0) {
      throw new ParseError("No se permiten valores negativos.");
    }
    const max = Math.max(a, b);
    const min = Math.min(a, b);

    if (a === b) {
      throw new ParseError("No puede haber empate en el Super Tie-Break.");
    }

    if (max < 10) {
      throw new ParseError("El ganador del Super Tie-Break debe tener al menos 10 puntos.");
    }

    if (max - min < 2) {
      throw new ParseError("El Super Tie-Break debe ganarse por diferencia de 2.");
    }
  }

  function validateRegularSet(a: number, b: number, hasTiebreakInfo: boolean): void {
    if (a < 0 || b < 0) {
      throw new ParseError("No se permiten valores negativos.");
    }
    const max = Math.max(a, b);
    const min = Math.min(a, b);

    if (a === b) {
      throw new ParseError("No puede haber empate en un set.");
    }

    /** Ganador del set debe cerrar en 6 o 7 games (reglas típicas de set). */
    if (max !== 6 && max !== 7) {
      throw new ParseError("El ganador del set debe cerrar con 6 o con 7 games.");
    }

    if (max === 6) {
      if (min > 4) {
        throw new ParseError("Con 6 games el máximo rival es 4 (diferencia mínima de 2 games).");
      }
      return;
    }

    if (max === 7) {
      const validWithoutTb = min === 5;
      const validWithTb = min === 6;

      if (!validWithoutTb && !validWithTb) {
        throw new ParseError("Solo son válidos 7-5 o 7-6 en un set decidido por tie-break.");
      }

      if (min === 6 && !hasTiebreakInfo) {
        return;
      }

      return;
    }
  }

  function validatePartialRegularSet(a: number, b: number): void {
    if (a < 0 || b < 0) {
      throw new ParseError("No se permiten valores negativos.");
    }
    if (a === b) {
      throw new ParseError("No puede haber empate en el set parcial.");
    }
    if (Math.max(a, b) > 7) {
      throw new ParseError("El set parcial no puede superar 7 games.");
    }
  }

  /** Validación explicita para carga manual (Sets 1 y 2 en el grid admin). */
  export function assertValidRegularSetGames(gamesA: number, gamesB: number): void {
    validateRegularSet(gamesA, gamesB, false);
  }

  /** Validación explicita para la columna ST del grid admin. */
  export function assertValidSuperTiebreak(gamesA: number, gamesB: number): void {
    validateMatchTiebreak(gamesA, gamesB);
  }
  
  function validateSetSequence(
    sets: ParsedSet[],
    options?: { isRetired?: boolean }
  ): void {
    let matchTiebreakCount = 0;
  
    sets.forEach((set, index) => {
      if (set.isMatchTiebreak) {
        matchTiebreakCount += 1;
  
        if (index !== sets.length - 1) {
          throw new InconsistentResultError("El Super Tie-Break solo puede ir al final del marcador.");
        }

        if (index < 2 && !(options?.isRetired)) {
          if (sets.length < 3) {
            throw new InconsistentResultError("El Super Tie-Break debe ser el tercer set cuando jugás al mejor de tres.");
          }
        }
      }
    });

    if (matchTiebreakCount > 1) {
      throw new InconsistentResultError("No puede haber más de un Super Tie-Break en un partido.");
    }
  }
  
  /**
   * Determina el ganador de un MatchInput.
   * Para "played" y "retired" usa score.
   * Para "walkover" usa ganador explícito si se envía en score como "A" o "B".
   * Si no, asume que playerA ganó por defecto para no romper, pero conviene evitarlo.
   */
  export function parseMatch(match: MatchInput): ParsedMatch {
    if (match.status === "pending" || match.status === "suspended") {
      throw new InconsistentResultError(
        "No se puede parsear un partido pendiente o suspendido como partido jugado."
      );
    }
  
    if (match.status === "walkover") {
      const sc = (match.score ?? "").trim();
      if (
        sc.length > 0 &&
        !/^[AB]$/i.test(sc) &&
        sc.toUpperCase() !== "WO" &&
        sc.toUpperCase() !== "W.O."
      ) {
        const parsed = parseMatchScore(sc, { requireThirdSetSuperTiebreak: false });
        if (!parsed.isRetired && parsed.setsWonA === parsed.setsWonB) {
          throw new InconsistentResultError("Walkover con marcador numérico no puede terminar en empate de sets.");
        }
        return {
          playerA: match.playerA,
          playerB: match.playerB,
          sets: parsed.sets,
          winner: parsed.winner === "A" ? match.playerA : match.playerB,
          isWalkover: true,
          isRetired: false,
        };
      }
  
      const winner =
        sc.toUpperCase() === "B"
          ? match.playerB
          : match.playerA;
  
      return {
        playerA: match.playerA,
        playerB: match.playerB,
        sets: [],
        winner,
        isWalkover: true,
        isRetired: false,
      };
    }
  
    if (!match.score) {
      throw new ParseError("El partido requiere score para ser procesado.");
    }
  
    const parsed = parseMatchScore(match.score);
  
    return {
      playerA: match.playerA,
      playerB: match.playerB,
      sets: parsed.sets,
      winner: parsed.winner === "A" ? match.playerA : match.playerB,
      isWalkover: false,
      isRetired: match.status === "retired" || parsed.isRetired,
    };
  }
  
  /**
   * Calcula estadísticas agregadas por jugador.
   */
  export function aggregatePlayerStats(
    matches: MatchInput[],
    registry?: PlayerRegistry
  ): PlayerStats[] {
    const playedMatches = matches.filter(
      (match) => match.status !== "pending" && match.status !== "suspended",
    );
    const map = new Map<string, PlayerStats>();
  
    for (const match of playedMatches) {
      const playerA = registry ? resolvePlayerAlias(match.playerA, registry) : normalizePlayerName(match.playerA);
      const playerB = registry ? resolvePlayerAlias(match.playerB, registry) : normalizePlayerName(match.playerB);
  
      ensurePlayerStats(map, playerA);
      ensurePlayerStats(map, playerB);
  
      const parsed = parseMatch({
        ...match,
        playerA,
        playerB,
      });
  
      const statsA = map.get(playerA)!;
      const statsB = map.get(playerB)!;
  
      statsA.played += 1;
      statsB.played += 1;
  
      const winner = parsed.winner;
      if (!winner) {
        throw new InconsistentResultError("El partido no tiene ganador definido.");
      }
  
      const loser = winner === playerA ? playerB : playerA;
  
      if (winner === playerA) {
        statsA.won += 1;
        statsB.lost += 1;
      } else {
        statsB.won += 1;
        statsA.lost += 1;
      }
  
      if (parsed.isWalkover && (!parsed.sets || parsed.sets.length === 0)) {
        updateWinRate(statsA);
        updateWinRate(statsB);
        continue;
      }
  
      for (const set of parsed.sets) {
        statsA.gamesWon += set.gamesA;
        statsA.gamesLost += set.gamesB;
        statsB.gamesWon += set.gamesB;
        statsB.gamesLost += set.gamesA;
  
        if (set.gamesA > set.gamesB) {
          statsA.setsWon += 1;
          statsA.setsLost += 0;
          statsB.setsWon += 0;
          statsB.setsLost += 1;
        } else {
          statsA.setsWon += 0;
          statsA.setsLost += 1;
          statsB.setsWon += 1;
          statsB.setsLost += 0;
        }
      }
  
      updateWinRate(statsA);
      updateWinRate(statsB);
  
      // streak simple: positiva si ganó el último, negativa si perdió el último
      statsA.streak = computeNextStreak(statsA.streak, winner === playerA);
      statsB.streak = computeNextStreak(statsB.streak, winner === playerB);
  
      if (loser === playerA && statsA.streak > 0) {
        statsA.streak = -1;
      }
      if (loser === playerB && statsB.streak > 0) {
        statsB.streak = -1;
      }
    }
  
    return Array.from(map.values()).sort((a, b) => {
      if (b.won !== a.won) return b.won - a.won;
      return a.player.localeCompare(b.player, "es");
    });
  }
  
  /**
   * Historial cara a cara (un registro por partido jugado, en orden de `matches`).
   */
  export function buildHeadToHeadFromPlayedMatches(
    matches: MatchInput[],
    registry?: PlayerRegistry
  ): HeadToHeadRecord[] {
    const out: HeadToHeadRecord[] = [];
    for (const match of matches.filter((m) => m.status !== "pending" && m.status !== "suspended")) {
      const playerA = registry
        ? resolvePlayerAlias(match.playerA, registry)
        : normalizePlayerName(match.playerA);
      const playerB = registry
        ? resolvePlayerAlias(match.playerB, registry)
        : normalizePlayerName(match.playerB);
  
      const parsed = parseMatch({
        ...match,
        playerA,
        playerB,
      });
      if (!parsed.winner) continue;
      out.push({
        a: playerA,
        b: playerB,
        winner: parsed.winner,
      });
    }
    return out;
  }
  
  /**
   * Calcula tabla de posiciones de un grupo.
   */
  export function computeGroupStandings(
    matches: MatchInput[],
    config: RuleConfig = DEFAULT_RULE_CONFIG,
    registry?: PlayerRegistry
  ): ExtendedStandingRow[] {
    const playedMatches = matches.filter(
      (match) => match.status !== "pending" && match.status !== "suspended",
    );
    const rows = new Map<string, ExtendedStandingRow>();
  
    for (const match of playedMatches) {
      const playerA = registry ? resolvePlayerAlias(match.playerA, registry) : normalizePlayerName(match.playerA);
      const playerB = registry ? resolvePlayerAlias(match.playerB, registry) : normalizePlayerName(match.playerB);
  
      ensureStandingRow(rows, playerA);
      ensureStandingRow(rows, playerB);
  
      const parsed = parseMatch({
        ...match,
        playerA,
        playerB,
      });
  
      const rowA = rows.get(playerA)!;
      const rowB = rows.get(playerB)!;
  
      rowA.played += 1;
      rowB.played += 1;
  
      if (!parsed.winner) {
        throw new InconsistentResultError("No se pudo determinar el ganador del partido.");
      }
  
      const winner = parsed.winner;
      const loser = winner === playerA ? playerB : playerA;
  
      if (winner === playerA) {
        rowA.won += 1;
        rowB.lost += 1;
      } else {
        rowB.won += 1;
        rowA.lost += 1;
      }
  
      if (match.status === "walkover") {
        if (winner === playerA) {
          rowA.points += config.walkoverWinPoints;
          rowB.points += config.walkoverLossPoints;
        } else {
          rowB.points += config.walkoverWinPoints;
          rowA.points += config.walkoverLossPoints;
        }
      } else if (match.status === "retired") {
        if (winner === playerA) {
          rowA.points += config.retirementWinPoints;
          rowB.points += config.retirementLossPoints;
        } else {
          rowB.points += config.retirementWinPoints;
          rowA.points += config.retirementLossPoints;
        }
      } else {
        if (winner === playerA) {
          rowA.points += config.winPoints;
          rowB.points += config.lossPoints;
        } else {
          rowB.points += config.winPoints;
          rowA.points += config.lossPoints;
        }
      }
  
      for (const set of parsed.sets) {
        rowA.gamesWon += set.gamesA;
        rowA.gamesLost += set.gamesB;
        rowB.gamesWon += set.gamesB;
        rowB.gamesLost += set.gamesA;
  
        if (set.gamesA > set.gamesB) {
          rowA.setsWon += 1;
          rowA.setsLost += 0;
          rowB.setsWon += 0;
          rowB.setsLost += 1;
        } else {
          rowA.setsWon += 0;
          rowA.setsLost += 1;
          rowB.setsWon += 1;
          rowB.setsLost += 0;
        }
      }
  
      rowA.setsDiff = rowA.setsWon - rowA.setsLost;
      rowB.setsDiff = rowB.setsWon - rowB.setsLost;
      rowA.gamesDiff = rowA.gamesWon - rowA.gamesLost;
      rowB.gamesDiff = rowB.gamesWon - rowB.gamesLost;
    }
  
    const headToHead = buildHeadToHeadFromPlayedMatches(matches, registry);
  
    const sorted = Array.from(rows.values()).sort((a, b) =>
      compareStandingRows(a, b, config, headToHead)
    );
  
    return sorted.map((row, index) => ({
      ...row,
      position: index + 1,
    }));
  }
  
  /**
   * Devuelve los últimos N partidos jugados de un jugador.
   */
  export function lastNMatches(
    player: string,
    matches: MatchInput[],
    n: number,
    registry?: PlayerRegistry
  ): LastMatchItem[] {
    const canonicalPlayer = registry
      ? resolvePlayerAlias(player, registry)
      : normalizePlayerName(player);
  
    const relevant = matches
      .filter((match) => match.status !== "pending" && match.status !== "suspended")
      .map((match) => {
        const playerA = registry ? resolvePlayerAlias(match.playerA, registry) : normalizePlayerName(match.playerA);
        const playerB = registry ? resolvePlayerAlias(match.playerB, registry) : normalizePlayerName(match.playerB);
  
        return {
          ...match,
          playerA,
          playerB,
        };
      })
      .filter((match) => match.playerA === canonicalPlayer || match.playerB === canonicalPlayer)
      .sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      })
      .slice(0, n);
  
    return relevant.map((match) => {
      const parsed = parseMatch(match);
      const result = parsed.winner === canonicalPlayer ? "W" : "L";
  
      return {
        tournamentId: match.tournamentId,
        playerA: match.playerA,
        playerB: match.playerB,
        score: match.score,
        status: match.status,
        date: match.date,
        result,
      };
    });
  }
  
  /**
   * Determina quién clasifica desde un grupo.
   * Stub claro para mejores terceros y repechaje.
   */
  export function whoAdvancesFromGroup(
    standings: ExtendedStandingRow[],
    config: RuleConfig = DEFAULT_RULE_CONFIG
  ): AdvanceResult {
    return {
      direct: standings.slice(0, config.groupAdvanceCount),
      bestThirdsStub: standings.length >= 3 ? [standings[2]] : [],
      repechageStub: standings.slice(config.groupAdvanceCount),
    };
  }
  
  /**
   * Devuelve puntos de ranking según fase alcanzada.
   */
  export function awardPointsFromPlacement(
    placement: PlacementCode,
    pointsTable: RankingPointsTable = DEFAULT_POINTS_TABLE
  ): number {
    return pointsTable[placement] ?? 0;
  }
  
  /**
   * Asigna puntos a una lista simple de resultados de cuadro.
   * Esto es un helper opcional/manual.
   */
  export function awardPointsFromKnockoutPlacements(
    placements: Array<{ player: string; placement: PlacementCode }>,
    pointsTable: RankingPointsTable = DEFAULT_POINTS_TABLE
  ): Array<{ player: string; placement: PlacementCode; points: number }> {
    return placements.map((item) => ({
      ...item,
      points: awardPointsFromPlacement(item.placement, pointsTable),
    }));
  }
  
  function ensurePlayerStats(map: Map<string, PlayerStats>, player: string): void {
    if (!map.has(player)) {
      map.set(player, {
        player,
        played: 0,
        won: 0,
        lost: 0,
        setsWon: 0,
        setsLost: 0,
        gamesWon: 0,
        gamesLost: 0,
        winRate: 0,
        streak: 0,
      });
    }
  }
  
  function ensureStandingRow(map: Map<string, ExtendedStandingRow>, player: string): void {
    if (!map.has(player)) {
      map.set(player, {
        player,
        played: 0,
        won: 0,
        lost: 0,
        setsWon: 0,
        setsLost: 0,
        gamesWon: 0,
        gamesLost: 0,
        setsDiff: 0,
        gamesDiff: 0,
        points: 0,
        position: 0,
      });
    }
  }
  
  function updateWinRate(stats: PlayerStats): void {
    stats.winRate = stats.played === 0 ? 0 : Number(((stats.won / stats.played) * 100).toFixed(2));
  }
  
  function computeNextStreak(current: number, won: boolean): number {
    if (won) {
      return current >= 0 ? current + 1 : 1;
    }
  
    return current <= 0 ? current - 1 : -1;
  }
  
  export function compareStandingRows(
    a: ExtendedStandingRow,
    b: ExtendedStandingRow,
    config: RuleConfig,
    headToHead: HeadToHeadRecord[]
  ): number {
    if (b.won !== a.won) return b.won - a.won;
  
    if (config.useSetDifference && b.setsDiff !== a.setsDiff) {
      return b.setsDiff - a.setsDiff;
    }
  
    if (config.useGameDifference && b.gamesDiff !== a.gamesDiff) {
      return b.gamesDiff - a.gamesDiff;
    }
  
    if (config.useHeadToHead) {
      const h2h = resolveHeadToHead(a.player, b.player, headToHead);
      if (h2h) {
        return h2h === a.player ? -1 : 1;
      }
    }
  
    if (config.sortFallback === "alphabetical") {
      return a.player.localeCompare(b.player, "es");
    }
  
    return 0;
  }
  
  function resolveHeadToHead(
    playerA: string,
    playerB: string,
    records: HeadToHeadRecord[]
  ): string | null {
    const record = records.find(
      (item) =>
        (item.a === playerA && item.b === playerB) ||
        (item.a === playerB && item.b === playerA)
    );
  
    return record?.winner ?? null;
  }
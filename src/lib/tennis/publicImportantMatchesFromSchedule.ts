/**
 * Partidos importantes (home pública): solo agenda confirmada/programada con fecha y hora futura,
 * sin resultado cargado. Sin listas manuales.
 *
 * Orden: importancia deportiva (fase KO, etapa, torneo en curso, liga, estado de agenda, seeds, ranking)
 * y a igualdad fecha/hora más próxima primero.
 */

import type { MatchInput } from '@/types/tennisResults';
import type { LeagueNum, Player, ScheduledMatch, Tournament } from '@/lib/mockData';
import { categoryToLeague, isTournamentCurrent, leagueToCategory } from '@/lib/mockData';
import { effectiveTournamentCatalogType } from '@/lib/tennis/rankingPointsGreek500';
import type { MatchScheduleEntry } from '@/lib/tennis/matchScheduleStore';
import { matchInputDedupeKey } from '@/lib/tennis/matchDedupe';
import { buildSchedulableMatches, type SchedulableMatch } from '@/lib/tennis/schedulableMatchCatalog';
import type { KnockoutStage } from '@/lib/tennis/adminKnockoutCatalog';
import {
  getEffectiveGrupos,
  getTemplateForTournament,
  resolvePlayerId,
} from '@/lib/tennis/tournamentSnapshotBridge';
import { buildOfficialTournamentSeedMap } from '@/lib/tennis/tournamentSeeding';
import type { CalculatedRankingRow } from '@/lib/tennis/tournamentRanking';

export const MAX_IMPORTANT_MATCHES = 5;

/** Peso por etapa de eliminación (mayor = más relevante para la home). */
const KO_STAGE_WEIGHT: Record<KnockoutStage, number> = {
  repechaje: 2_600,
  octavos: 3_200,
  quarter: 3_800,
  semi: 4_400,
  final: 5_000,
};

/**
 * Contexto para puntuar importancia.
 * `player1` / `player2` se alinean con `schedulable.playerA` y `schedulable.playerB`.
 */
export type ImportantMatchScoreContext = {
  schedule: MatchScheduleEntry;
  schedulable: SchedulableMatch;
  tournament: Tournament;
  /** Instante local del partido (ms). */
  matchInstantMs: number;
  /** Reloj de referencia (típicamente `Date.now()`). */
  nowMs: number;
  /** Seed oficial del torneo para el jugador A (1 = mejor cabeza de serie). */
  player1Seed?: number | null;
  /** Seed oficial del torneo para el jugador B. */
  player2Seed?: number | null;
  /** Posición en el ranking de liga (1 = mejor) para el jugador A, si aplica. */
  player1RankingPosition?: number | null;
  /** Posición en el ranking de liga para el jugador B. */
  player2RankingPosition?: number | null;
};

export type ListImportantMatchesOptions = {
  /** Ranking por liga (p. ej. `useTennisLiveData().rankingsByLeague`) para ponderar cruces de jugadores fuertes. */
  rankingsByLeague?: ReadonlyMap<LeagueNum, readonly CalculatedRankingRow[]>;
};

function formatScheduleDateShort(isoDate: string): string {
  const t = isoDate.trim();
  const d = /^\d{4}-\d{2}-\d{2}$/.test(t) ? new Date(`${t}T12:00:00`) : new Date(t);
  if (!Number.isFinite(d.getTime())) return t || '—';
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Interpretación local de fecha (YYYY-MM-DD) + hora (HH:mm). */
function parseLocalScheduleInstant(dateStr: string | undefined, timeStr: string | undefined): number | null {
  const d = dateStr?.trim();
  const t = timeStr?.trim();
  if (!d || !t) return null;
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!dm) return null;
  const tm = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(t);
  if (!tm) return null;
  const y = Number(dm[1]);
  const mo = Number(dm[2]) - 1;
  const day = Number(dm[3]);
  const h = Number(tm[1]);
  const min = Number(tm[2]);
  const sec = tm[3] != null ? Number(tm[3]) : 0;
  const dt = new Date(y, mo, day, h, min, sec, 0);
  const ms = dt.getTime();
  return Number.isFinite(ms) ? ms : null;
}

function hasCompletedResultForSchedule(entry: MatchScheduleEntry, results: MatchInput[]): boolean {
  const hit = results.find((r) => r.tournamentId === entry.tournamentId && matchInputDedupeKey(r) === entry.dedupeKey);
  if (!hit) return false;
  if (hit.status === 'walkover') return true;
  if (hit.status === 'played' || hit.status === 'retired') return Boolean(hit.score?.trim());
  return false;
}

/** Solo agenda publicable: programado / confirmado / reprogramado (no cancelados, ni borrador sin fecha, etc.). */
function isAllowedScheduleStatus(st: MatchScheduleEntry['scheduleStatus']): boolean {
  return st === 'scheduled' || st === 'confirmed' || st === 'rescheduled';
}

function scheduleStatusWeight(st: MatchScheduleEntry['scheduleStatus']): number {
  if (st === 'confirmed') return 180;
  if (st === 'rescheduled') return 120;
  if (st === 'scheduled') return 60;
  return 0;
}

function leagueDisplayWeight(leagueNum: number): number {
  if (!Number.isFinite(leagueNum)) return 0;
  const clamped = Math.min(6, Math.max(1, leagueNum));
  return (7 - clamped) * 12;
}

/** Contribución al score por seed (1 = máximo; decae con cabezas más bajas). */
function scoreFromOfficialSeed(seed: number | null | undefined): number {
  if (seed == null || !Number.isFinite(seed)) return 0;
  const s = Math.floor(Number(seed));
  if (s < 1 || s > 128) return 0;
  return Math.max(0, 150 - (s - 1) * 9);
}

/** Contribución por puesto en ranking de liga (1 = máximo). */
function scoreFromLeagueRankingPosition(pos: number | null | undefined): number {
  if (pos == null || !Number.isFinite(pos)) return 0;
  const p = Math.floor(Number(pos));
  if (p < 1 || p > 400) return 0;
  return Math.max(0, 120 - (p - 1) * 2);
}

/**
 * Orden de prioridad para el **texto** del motivo (menor número = más importante como `mainReason`).
 * No coincide 1:1 con los pesos numéricos de `calculateImportantMatchScore`: aquí priman señales
 * deportivas frente a logística (sede, sellos de confirmación).
 */
const REASON_TIER = {
  FINAL: 1,
  SEMIFINAL: 2,
  CUARTOS: 3,
  OCTAVOS: 4,
  REPECHAJE: 5,
  TOP_SEEDS: 6,
  TOP_RANKING: 7,
  MASTERS_1000: 8,
  LIGA: 9,
  /** Partido “normal” de fecha 1 sin señales fuertes (ver `buildImportantMatchReasonLabels`). */
  PROXIMO: 10,
  FECHA_GRUPOS: 11,
  DESTACADO: 12,
  PROGRAMADO: 13,
  /** Solo secundario: no compite por `mainReason`. */
  MINOR: 100,
} as const;

type ReasonSlot = { tier: number; label: string; minor?: boolean };

function isDestacadoSchedulable(row: SchedulableMatch): boolean {
  const L = row.fixtureRoundLabel.toLowerCase();
  return L.includes('destacado') || L.includes('partido destacado');
}

/** Cruce de cabezas de serie relevante (ambos en top 4 del cuadro). */
function qualifiesTopSeeds(s1: number | null | undefined, s2: number | null | undefined): boolean {
  if (s1 == null || s2 == null) return false;
  const a = Math.floor(Number(s1));
  const b = Math.floor(Number(s2));
  if (a < 1 || b < 1 || a > 128 || b > 128) return false;
  return a <= 4 && b <= 4;
}

/** Ambos con posición en ranking de liga y dentro del top 8. */
function qualifiesTopRanking(p1: number | null | undefined, p2: number | null | undefined): boolean {
  if (p1 == null || p2 == null) return false;
  const a = Math.floor(Number(p1));
  const b = Math.floor(Number(p2));
  if (a < 1 || b < 1) return false;
  return a <= 8 && b <= 8;
}

function koPrimaryLabel(stage: KnockoutStage | null | undefined): { tier: number; label: string } {
  if (stage === 'final') return { tier: REASON_TIER.FINAL, label: 'FINAL' };
  if (stage === 'semi') return { tier: REASON_TIER.SEMIFINAL, label: 'SEMIFINAL' };
  if (stage === 'quarter') return { tier: REASON_TIER.CUARTOS, label: 'CUARTOS' };
  if (stage === 'octavos') return { tier: REASON_TIER.OCTAVOS, label: 'OCTAVOS' };
  if (stage === 'repechaje') return { tier: REASON_TIER.REPECHAJE, label: 'REPECHAJE' };
  return { tier: REASON_TIER.CUARTOS, label: 'ELIMINACIÓN' };
}

/**
 * Etiquetas públicas para la home. `mainReason` sigue la prioridad deportiva de `REASON_TIER`;
 * los motivos logísticos van como `minor` y no desplazan a los deportivos.
 */
export function buildImportantMatchReasonLabels(ctx: ImportantMatchScoreContext): {
  reasonLabels: string[];
  mainReason: string;
} {
  const slots: ReasonSlot[] = [];
  const { schedule, schedulable, tournament } = ctx;

  const s1 = ctx.player1Seed;
  const s2 = ctx.player2Seed;
  const p1 = ctx.player1RankingPosition;
  const p2 = ctx.player2RankingPosition;
  const isKo = schedulable.kind === 'ko';
  const topSeeds = qualifiesTopSeeds(s1, s2);
  const topRank = qualifiesTopRanking(p1, p2);
  const masters = effectiveTournamentCatalogType(tournament) === 'masters1000';
  const dest = isDestacadoSchedulable(schedulable);
  const hasSportSignal = isKo || topSeeds || topRank || masters || dest;

  if (isKo) {
    slots.push(koPrimaryLabel(schedulable.koStage));
  } else {
    const r = schedulable.fixtureRound ?? 1;
    if (!hasSportSignal && r === 1) {
      slots.push({ tier: REASON_TIER.PROXIMO, label: 'Próximo partido' });
    } else {
      slots.push({ tier: REASON_TIER.FECHA_GRUPOS, label: `FECHA ${r}` });
    }
  }

  if (topSeeds) {
    slots.push({ tier: REASON_TIER.TOP_SEEDS, label: 'TOP SEEDS' });
  }

  if (topRank) {
    slots.push({ tier: REASON_TIER.TOP_RANKING, label: 'TOP RANKING' });
  }

  if (masters) {
    slots.push({ tier: REASON_TIER.MASTERS_1000, label: 'MASTERS 1000' });
  }

  const leagueNum = tournament.league ?? categoryToLeague(tournament.category);
  if (hasSportSignal) {
    slots.push({ tier: REASON_TIER.LIGA, label: `LIGA ${leagueNum}` });
  } else {
    slots.push({ tier: REASON_TIER.MINOR, label: `LIGA ${leagueNum}`, minor: true });
  }

  if (dest) {
    slots.push({ tier: REASON_TIER.DESTACADO, label: 'DESTACADO' });
  }

  if (schedule.scheduleStatus === 'scheduled') {
    slots.push({ tier: REASON_TIER.PROGRAMADO, label: 'PROGRAMADO' });
  } else if (schedule.scheduleStatus === 'rescheduled') {
    slots.push({ tier: REASON_TIER.PROGRAMADO, label: 'REPROGRAMADO' });
  }

  if (isTournamentCurrent(tournament)) {
    slots.push({ tier: REASON_TIER.MINOR, label: 'Torneo en curso', minor: true });
  }
  /**
   * `confirmedAt` en score solo suma si el estado no es ya `confirmed` (ver `calculateImportantMatchScore`).
   * Misma regla aquí: la etiqueta evita redundancia con la agenda ya confirmada.
   */
  if (
    schedule.confirmedAt != null &&
    Number.isFinite(schedule.confirmedAt) &&
    schedule.scheduleStatus !== 'confirmed'
  ) {
    slots.push({ tier: REASON_TIER.MINOR, label: 'Confirmación registrada', minor: true });
  }

  const sorted = [...slots].sort((a, b) => a.tier - b.tier);
  const nonMinor = sorted.filter((s) => !s.minor);
  const mainReason = nonMinor[0]?.label ?? 'Próximo partido';

  const seen = new Set<string>();
  const reasonLabels: string[] = [];
  const pushLabel = (label: string) => {
    if (seen.has(label)) return;
    seen.add(label);
    reasonLabels.push(label);
  };

  pushLabel(mainReason);
  for (const s of sorted) {
    if (s.label === mainReason) continue;
    pushLabel(s.label);
  }

  return { reasonLabels, mainReason };
}

/**
 * Entero comparable: mayor = más importante para la sección "Partidos importantes".
 * No es una unidad física; solo define orden relativo.
 */
export function calculateImportantMatchScore(ctx: ImportantMatchScoreContext): number {
  const { schedule, schedulable, tournament, matchInstantMs, nowMs } = ctx;
  void matchInstantMs;
  void nowMs;

  let score = 0;

  if (schedulable.kind === 'ko') {
    const stage = schedulable.koStage;
    score += stage != null ? KO_STAGE_WEIGHT[stage] : 3_000;
  } else {
    score += 900;
    const r = schedulable.fixtureRound ?? 1;
    score += Math.min(280, Math.max(0, r - 1) * 35);
  }

  score += scheduleStatusWeight(schedule.scheduleStatus);

  if (isTournamentCurrent(tournament)) {
    score += 220;
  }

  const leagueNum = tournament.league ?? categoryToLeague(tournament.category);
  score += leagueDisplayWeight(leagueNum);

  /**
   * Refuerzo por sello `confirmedAt`: solo si el estado aún no es `confirmed`, para no duplicar
   * la señal de `scheduleStatusWeight('confirmed')` ni generar etiqueta redundante en
   * `buildImportantMatchReasonLabels`.
   */
  if (
    schedule.confirmedAt != null &&
    Number.isFinite(schedule.confirmedAt) &&
    schedule.scheduleStatus !== 'confirmed'
  ) {
    score += 15;
  }

  score += scoreFromOfficialSeed(ctx.player1Seed ?? undefined);
  score += scoreFromOfficialSeed(ctx.player2Seed ?? undefined);
  score += scoreFromLeagueRankingPosition(ctx.player1RankingPosition ?? undefined);
  score += scoreFromLeagueRankingPosition(ctx.player2RankingPosition ?? undefined);

  return score;
}

function tournamentParticipantIdsForSeeding(tournament: Tournament): string[] {
  const template = getTemplateForTournament(tournament);
  if (!template) return [];
  const effective = getEffectiveGrupos(tournament, template);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const names of Object.values(effective)) {
    for (const raw of names) {
      const id = resolvePlayerId(String(raw).trim(), tournament.id, tournament.category);
      if (!seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
  }
  return out;
}

function buildRankingPositionByPlayerId(
  rankingsByLeague: ReadonlyMap<LeagueNum, readonly CalculatedRankingRow[]> | undefined,
  league: LeagueNum,
): Map<string, number> {
  const m = new Map<string, number>();
  const rows = rankingsByLeague?.get(league);
  if (!rows?.length) return m;
  for (const r of rows) {
    if (r.playerId && !m.has(r.playerId)) m.set(r.playerId, r.position);
  }
  return m;
}

/**
 * Próximos partidos destacados para la home: mismos filtros que antes, ordenados por
 * `calculateImportantMatchScore` descendente y a igual puntaje por fecha/hora ascendente.
 * La UI recorta con `MAX_IMPORTANT_MATCHES`.
 */
export function listImportantMatchesFromSchedules(
  schedules: MatchScheduleEntry[],
  tournaments: Tournament[],
  players: Player[],
  results: MatchInput[],
  options?: ListImportantMatchesOptions,
): ScheduledMatch[] {
  const tournamentById = new Map(tournaments.map((x) => [x.id, x]));
  const schedulableCache = new Map<string, Map<string, SchedulableMatch>>();
  const seedMapByTournament = new Map<string, Map<string, number>>();
  const rankingPosByLeague = new Map<LeagueNum, Map<string, number>>();

  function seedMapFor(tournamentId: string, tournament: Tournament): Map<string, number> {
    let m = seedMapByTournament.get(tournamentId);
    if (m) return m;
    const participants = tournamentParticipantIdsForSeeding(tournament);
    const league = tournament.league ?? categoryToLeague(tournament.category);
    const rankingRows = options?.rankingsByLeague?.get(league) ?? [];
    m = buildOfficialTournamentSeedMap(tournament, participants, rankingRows);
    seedMapByTournament.set(tournamentId, m);
    return m;
  }

  function rowFor(tournamentId: string, dedupeKey: string): SchedulableMatch | undefined {
    let inner = schedulableCache.get(tournamentId);
    if (!inner) {
      const rows = buildSchedulableMatches(tournamentId, players);
      inner = new Map(rows.map((r) => [r.dedupeKey, r]));
      schedulableCache.set(tournamentId, inner);
    }
    return inner.get(dedupeKey);
  }

  const nowMs = Date.now();
  const items: Array<{ t: number; score: number; m: ScheduledMatch }> = [];

  for (const s of schedules) {
    if (!isAllowedScheduleStatus(s.scheduleStatus)) continue;
    const tour = tournamentById.get(s.tournamentId);
    if (!tour || tour.status === 'finished') continue;

    const slot = parseLocalScheduleInstant(s.date, s.time);
    if (slot == null || slot <= nowMs) continue;

    if (hasCompletedResultForSchedule(s, results)) continue;

    const row = rowFor(s.tournamentId, s.dedupeKey);
    if (!row) continue;

    const league = tour.league ?? categoryToLeague(tour.category);
    let rankingPosById = rankingPosByLeague.get(league);
    if (!rankingPosById) {
      rankingPosById = buildRankingPositionByPlayerId(options?.rankingsByLeague, league);
      rankingPosByLeague.set(league, rankingPosById);
    }
    const seeds = seedMapFor(tour.id, tour);
    const idA = resolvePlayerId(row.playerA, tour.id, tour.category);
    const idB = resolvePlayerId(row.playerB, tour.id, tour.category);

    const scoreCtx: ImportantMatchScoreContext = {
      schedule: s,
      schedulable: row,
      tournament: tour,
      matchInstantMs: slot,
      nowMs,
      player1Seed: seeds.get(idA) ?? null,
      player2Seed: seeds.get(idB) ?? null,
      player1RankingPosition: rankingPosById.get(idA) ?? null,
      player2RankingPosition: rankingPosById.get(idB) ?? null,
    };
    const score = calculateImportantMatchScore(scoreCtx);
    const { reasonLabels, mainReason } = buildImportantMatchReasonLabels(scoreCtx);

    const category = leagueToCategory(league);
    const label = `${row.fixtureRoundLabel} · ${tour.name}`;
    const dateRaw = s.date!.trim();
    const dateShort = formatScheduleDateShort(dateRaw);
    const timePart = s.time!.trim();
    const dateTime = `${dateShort} · ${timePart}`;

    items.push({
      t: slot,
      score,
      m: {
        id: s.dedupeKey,
        tournamentId: s.tournamentId,
        label,
        playerA: row.playerA,
        playerB: row.playerB,
        category,
        dateTime,
        round: row.fixtureRoundLabel,
        date: dateShort,
        time: timePart,
        reasonLabels,
        mainReason,
      },
    });
  }

  items.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.t - b.t;
  });
  return items.map((x) => x.m);
}

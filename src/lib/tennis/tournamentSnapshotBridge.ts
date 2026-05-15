/**
 * Integra computeTournamentSnapshot + resultsStore con la UI de detalle de torneo.
 */

import type { LigaTemplate, MatchInput, PlayerRegistry, TournamentMeta } from '../../types/tennisResults';
import type { Tournament, RankingRow, Player, GroupTableWithSets, GroupTableRowWithSets } from '../mockData';
import { categoryToLeague, getPlayerById } from '../mockData';
import { getClubSnapshot } from '../clubDataStore';
import { ligasData, type LigaNumKey } from './loadLigasFromDocs';
import { effectiveTournamentCatalogType } from './rankingPointsGreek500';
import { computeTournamentSnapshot, type TournamentSnapshot } from './computeTournamentSnapshot';
import {
  buildHeadToHeadFromPlayedMatches,
  compareStandingRows,
  computeGroupStandings,
  DEFAULT_RULE_CONFIG,
  normalizePlayerName,
  resolvePlayerAlias,
  type ExtendedStandingRow,
} from './matchStatsEngine';
import { getLiga3Id, getLiga3PlayerByName, LIGA3_PRECLASIFICACION } from '../liga3Data';

const LIGA3_ID = 't-novak-l3';

function mapTournamentStatus(t: Tournament): 'upcoming' | 'ongoing' | 'finished' {
  if (t.status === 'finished') return 'finished';
  return 'upcoming';
}

/** Plantilla mínima Masters: grupos A/B vacíos en doc; plantel y fixture salen de `groupRosterOverride` + RR. */
function mastersShellTemplate(league: LigaNumKey): LigaTemplate {
  return {
    torneo: 'Master Finals',
    liga: league,
    grupos: { A: [], B: [] },
    fechas: [],
  };
}

export function getTemplateForTournament(t: Tournament): LigaTemplate | null {
  const league = (t.league ?? categoryToLeague(t.category)) as LigaNumKey;
  if (effectiveTournamentCatalogType(t) === 'masters1000') {
    if (league < 1 || league > 6) return null;
    return mastersShellTemplate(league);
  }
  if (t.ligaDoc?.grupos && Object.keys(t.ligaDoc.grupos).length > 0) {
    return t.ligaDoc;
  }
  if (league < 1 || league > 6) return null;
  return ligasData[league];
}

/** Nombre de plantilla / motor a partir de id de plantel (`name:Norm` o id de jugador). */
export function rosterIdToTemplatePlayerName(id: string, tournament: Tournament): string {
  if (id.startsWith('name:')) {
    return id.slice('name:'.length).trim();
  }
  const p = getPlayerById(id);
  return (p?.name ?? id).trim();
}

/** Plantilla efectiva: override del torneo o nombres del doc (orden conservado en override). */
export function getEffectiveGrupos(tournament: Tournament, template: LigaTemplate): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const key of Object.keys(template.grupos)) {
    const ov = tournament.groupRosterOverride?.[key];
    if (ov !== undefined) {
      out[key] = ov.map((id) => rosterIdToTemplatePlayerName(id, tournament));
    } else {
      out[key] = sortTemplateNames(template.grupos[key] ?? [], tournament.id);
    }
  }
  return out;
}

export function templatePlayerNamesToRosterIds(names: string[], tournament: Tournament): string[] {
  return names.map((n) => resolvePlayerId(n, tournament.id, tournament.category));
}

/** Convierte etiqueta de tabla (`Grupo A`) en clave de plantilla (`A`). */
export function templateKeyFromGroupTableName(name: string): string {
  const m = /^Grupo\s+([A-Za-z0-9]+)$/i.exec(name.trim());
  return m ? m[1]!.toUpperCase() : name.trim();
}

/** ¿El plantel por id coincide con la plantilla (ignorando orden dentro del grupo)? */
export function groupRosterDraftMatchesTemplate(
  tournament: Tournament,
  template: LigaTemplate,
  draft: Record<string, string[]>,
): boolean {
  for (const key of Object.keys(template.grupos)) {
    const want = templatePlayerNamesToRosterIds(sortTemplateNames(template.grupos[key] ?? [], tournament.id), tournament);
    const got = draft[key] ?? want;
    if (want.length !== got.length) return false;
    const wa = [...want].sort().join('|');
    const wb = [...got].sort().join('|');
    if (wa !== wb) return false;
  }
  return true;
}

/** Etiqueta de grupo para la UI (docs usan "A", "B"; la pantalla muestra "Grupo A"). */
export function formatGroupLabel(templateKey: string): string {
  if (/^[A-Z]$/i.test(templateKey)) return `Grupo ${templateKey.toUpperCase()}`;
  return templateKey;
}

function normalizeEngineGroup(group: string | undefined, template: LigaTemplate): string | undefined {
  if (!group) return undefined;
  const g = group.trim();
  for (const key of Object.keys(template.grupos)) {
    if (g === key || g === `Grupo ${key}` || g.toLowerCase() === `grupo ${key.toLowerCase()}`) {
      return key;
    }
  }
  return g;
}

export function collectResultsForTournament(tournamentId: string, template: LigaTemplate, raw: MatchInput[]): MatchInput[] {
  return raw
    .filter((m) => m.tournamentId === tournamentId)
    .map((m) => ({
      ...m,
      group: normalizeEngineGroup(m.group, template) ?? m.group,
    }));
}

/** Meta + plantilla mínima para `computeTournamentSnapshot(meta, torneo, results)`. */
export function buildTournamentMetaForSnapshot(t: Tournament): TournamentMeta | null {
  const template = getTemplateForTournament(t);
  if (!template) return null;
  const league = (t.league ?? categoryToLeague(t.category)) as LigaNumKey;
  return {
    id: t.id,
    name: t.name,
    liga: league,
    status: mapTournamentStatus(t),
    startDate: t.startDate,
    endDate: t.endDate,
    slotsTotal: t.slotsTotal,
    slotsTaken: t.slotsTaken,
    phaseKind: 'groups',
  };
}

export function resolvePlayerId(name: string, tournamentId: string, category: Tournament['category']): string {
  const n = normalizePlayerName(name);
  if (tournamentId === LIGA3_ID) {
    return getLiga3PlayerByName(n)?.id ?? `name:${n}`;
  }
  const found = getClubSnapshot().players.find((p) => normalizePlayerName(p.name) === n);
  return found?.id ?? `name:${n}`;
}

function minimalPlayer(id: string, name: string, category: Tournament['category']): Player {
  const existing = getPlayerById(id);
  if (existing) return existing;
  return {
    id,
    name,
    category,
    points: 0,
    stats: { matchesPlayed: 0, wins: 0, losses: 0 },
  };
}

function sortTemplateNames(names: string[], tournamentId: string): string[] {
  const copy = [...names];
  if (tournamentId === LIGA3_ID) {
    copy.sort((a, b) => (LIGA3_PRECLASIFICACION[getLiga3Id(a)] ?? 999) - (LIGA3_PRECLASIFICACION[getLiga3Id(b)] ?? 999));
    return copy;
  }
  return copy.sort((a, b) => a.localeCompare(b, 'es'));
}

function standingRowToGroupRow(
  row: ExtendedStandingRow,
  tournament: Tournament,
): GroupTableRowWithSets {
  const name = row.player;
  const pid = resolvePlayerId(name, tournament.id, tournament.category);
  return {
    position: row.position,
    playerId: pid,
    PJ: row.played,
    PG: row.won,
    PP: row.lost,
    setsWon: row.setsWon,
    setsLost: row.setsLost,
    gamesWon: row.gamesWon,
    gamesLost: row.gamesLost,
    setDiff: row.setsDiff,
  };
}

function emptyRowsForGroup(
  templateKey: string,
  template: LigaTemplate,
  tournament: Tournament,
): GroupTableRowWithSets[] {
  const names = sortTemplateNames(template.grupos[templateKey] ?? [], tournament.id);
  return names.map((name, idx) => {
    const pid = resolvePlayerId(name, tournament.id, tournament.category);
    return {
      position: idx + 1,
      playerId: pid,
      PJ: 0,
      PG: 0,
      PP: 0,
      setsWon: 0,
      setsLost: 0,
      gamesWon: 0,
      gamesLost: 0,
      setDiff: 0,
    };
  });
}

/** Registry mínimo: una entrada por jugador del fixture (nombre canónico = plantilla). */
function rosterRegistryFromTemplateNames(names: string[]): PlayerRegistry {
  return names.map((name) => ({ name: normalizePlayerName(name) }));
}

function registryWithMatchParticipants(registry: PlayerRegistry, matches: MatchInput[]): PlayerRegistry {
  const out = [...registry];
  const seen = new Set(out.map((entry) => normalizePlayerName(entry.name, { casefold: true })));
  for (const match of matches) {
    for (const raw of [match.playerA, match.playerB]) {
      const name = normalizePlayerName(raw);
      const key = normalizePlayerName(name, { casefold: true });
      if (!name || seen.has(key)) continue;
      out.push({ name });
      seen.add(key);
    }
  }
  return out;
}

function extendedStandingRowEmpty(canonicalPlayer: string): ExtendedStandingRow {
  return {
    player: canonicalPlayer,
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
  };
}

/**
 * Siempre incluye todos los jugadores listados en la plantilla del grupo.
 * Orden/desempates: mismos que `computeGroupStandings` (PG / sets / games / H2H con `DEFAULT_RULE_CONFIG`).
 */
function mergeStandingsWithTemplateRoster(
  templateNamesSorted: string[],
  groupMatches: MatchInput[],
): ExtendedStandingRow[] {
  if (templateNamesSorted.length === 0) {
    return computeGroupStandings(groupMatches, DEFAULT_RULE_CONFIG);
  }

  const registry = registryWithMatchParticipants(rosterRegistryFromTemplateNames(templateNamesSorted), groupMatches);
  const computed = computeGroupStandings(groupMatches, DEFAULT_RULE_CONFIG, registry);

  const rosterCanonical = templateNamesSorted.map((p) =>
    resolvePlayerAlias(normalizePlayerName(p), registry),
  );

  const byPlayer = new Map(computed.map((r) => [r.player, { ...r }] as const));
  const mergedRoster = [...rosterCanonical];
  const rosterSet = new Set(mergedRoster);
  for (const row of computed) {
    if (rosterSet.has(row.player)) continue;
    mergedRoster.push(row.player);
    rosterSet.add(row.player);
  }
  const merged: ExtendedStandingRow[] = mergedRoster.map((canonical) => {
    const hit = byPlayer.get(canonical);
    return hit ? { ...hit } : extendedStandingRowEmpty(canonical);
  });

  const headToHead = buildHeadToHeadFromPlayedMatches(groupMatches);
  merged.sort((a, b) => compareStandingRows(a, b, DEFAULT_RULE_CONFIG, headToHead));

  return merged.map((row, i) => ({ ...row, position: i + 1 }));
}

/**
 * Construye el snapshot del motor para un torneo (plantilla liga 1–6 + resultados del store).
 */
export function buildTournamentSnapshotFromEngine(
  tournament: Tournament,
  allResults: MatchInput[],
): TournamentSnapshot | null {
  const meta = buildTournamentMetaForSnapshot(tournament);
  const template = getTemplateForTournament(tournament);
  if (!meta || !template) return null;
  const filtered = collectResultsForTournament(tournament.id, template, allResults);
  return computeTournamentSnapshot(meta, { grupos: getEffectiveGrupos(tournament, template) }, filtered);
}

/** Tablas de grupos en el formato que ya consume TournamentDetailScreen. */
export function snapshotToGroupTables(snapshot: TournamentSnapshot, tournament: Tournament): GroupTableWithSets[] {
  const template = getTemplateForTournament(tournament);
  if (!template) return [];

  const effectiveGrupos = getEffectiveGrupos(tournament, template);

  return Object.keys(template.grupos).map((key) => {
    const label = formatGroupLabel(key);
    const groupData = snapshot.groups[key];
    const matches = groupData?.matches ?? [];
    const templateNames = effectiveGrupos[key] ?? [];

    let fullStandings: ExtendedStandingRow[];
    if (templateNames.length > 0) {
      fullStandings = mergeStandingsWithTemplateRoster(templateNames, matches);
    } else {
      fullStandings = groupData?.standings?.length ? groupData.standings : [];
    }

    const rows: GroupTableRowWithSets[] =
      fullStandings.length > 0
        ? fullStandings.map((row) => standingRowToGroupRow(row, tournament))
        : emptyRowsForGroup(key, template, tournament);

    return { name: label, rows };
  });
}

/** Desempate solo deportivo (sin “puntos” de tabla de grupo). */
function tournamentStandingTiebreak(snapshot: TournamentSnapshot, playerName: string): number {
  const n = normalizePlayerName(playerName);
  for (const g of Object.values(snapshot.groups)) {
    const row = g.standings.find((s) => normalizePlayerName(s.player) === n);
    if (row) {
      return row.won * 1_000_000 + row.setsDiff * 1_000 + row.setsWon * 10 + row.gamesDiff;
    }
  }
  return 0;
}

/** Top ranking del torneo a partir de globalStats + desempate por rendimiento en tabla de grupo (sin PTS). */
export function snapshotToTournamentTopRanking(snapshot: TournamentSnapshot, tournament: Tournament, limit = 5): RankingRow[] {
  const list = [...snapshot.globalStats].sort((a, b) => {
    if (b.won !== a.won) return b.won - a.won;
    const sdB = b.setsWon - b.setsLost;
    const sdA = a.setsWon - a.setsLost;
    if (sdB !== sdA) return sdB - sdA;
    const pa = tournamentStandingTiebreak(snapshot, a.player);
    const pb = tournamentStandingTiebreak(snapshot, b.player);
    if (pb !== pa) return pb - pa;
    return a.player.localeCompare(b.player, 'es');
  });

  return list.slice(0, limit).map((stats, i) => {
    const pid = resolvePlayerId(stats.player, tournament.id, tournament.category);
    const player = minimalPlayer(pid, stats.player, tournament.category);
    return {
      position: i + 1,
      playerId: pid,
      player,
      points: stats.won,
      matchesPlayed: stats.played,
      wins: stats.won,
      losses: stats.lost,
      setsWon: stats.setsWon,
      setsLost: stats.setsLost,
    };
  });
}

export function shouldUseEngineSnapshot(tournament: Tournament): boolean {
  return getTemplateForTournament(tournament) != null;
}

/** Filas de “estructura del calendario” desde `ligaDoc` del torneo (sin semanas genéricas fijas). */
export function buildTournamentCalendarRowsFromLigaDoc(
  tournament: Tournament | null,
): { week: string; phase: string }[] {
  const fechas = tournament?.ligaDoc?.fechas;
  if (!fechas?.length) return [];
  const out = fechas.map((f, i) => ({
    week: `Semana ${i + 1}`,
    phase: typeof f.numero === 'number' ? `Fecha ${f.numero}` : `Fecha ${i + 1}`,
  }));
  out.push({ week: `Semana ${fechas.length + 1}`, phase: 'Eliminación' });
  out.push({ week: `Semana ${fechas.length + 2}`, phase: 'Final' });
  return out;
}

/**
 * Propuesta de cuartos desde tablas de grupos (clasificados + emparejamientos tipo cruce).
 */

import type { GroupTableRowWithSets, GroupTableWithSets } from '@/lib/mockData';
import { getPlayerById, getTournamentById } from '@/lib/mockData';
import { effectiveTournamentCatalogType } from '@/lib/tennis/rankingPointsGreek500';

export type ClassifiedOrigin =
  | { kind: 'direct'; label: string }
  | { kind: 'tercero'; label: string }
  | { kind: 'repechaje'; label: string };

export type ClassifiedPlayerChip = {
  playerId: string;
  displayName: string;
  groupLabel: string;
  position: number;
  /** Partidos ganados / perdidos en fase de grupos (criterio deportivo, no puntos ranking). */
  pg: number;
  pp: number;
  setsWon: number;
  setsLost: number;
  origin: ClassifiedOrigin;
};

export type EliminationCrossDraft = {
  id: string;
  label: string;
  slotA: string | null;
  slotB: string | null;
};

export function formatGroupLabelFromTableName(name: string): string {
  const m = /^Grupo\s+([A-Za-z0-9]+)$/i.exec(name.trim());
  return m ? m[1]!.toUpperCase() : name.trim();
}

function rowToChip(
  row: GroupTableRowWithSets,
  groupTableName: string,
  position: number,
  origin: ClassifiedOrigin,
): ClassifiedPlayerChip {
  const groupLabel = formatGroupLabelFromTableName(groupTableName);
  const p = getPlayerById(row.playerId);
  return {
    playerId: row.playerId,
    displayName: (p?.name ?? row.playerId).trim(),
    groupLabel,
    position,
    pg: row.PG ?? 0,
    pp: row.PP ?? 0,
    setsWon: row.setsWon ?? 0,
    setsLost: row.setsLost ?? 0,
    origin,
  };
}

export type EliminationProposalBundle = {
  direct: ClassifiedPlayerChip[];
  repechaje: ClassifiedPlayerChip[];
  eliminated: ClassifiedPlayerChip[];
  /** Fase previa (play-in) cuando hay más de 8 clasificados al cupo de cuartos. */
  preliminaryCrosses: EliminationCrossDraft[];
  crosses: EliminationCrossDraft[];
  warnings: string[];
};

/** Placeholder en slots de cuartos hasta que se cargue el ganador del repechaje `WAIT_RP_n` ↔ partido `*-rp-n`. */
export function isRepechajeWaitToken(id: string): boolean {
  return /^WAIT_RP_\d+$/i.test(id.trim());
}

function compareChipByGroupPerformance(a: ClassifiedPlayerChip, b: ClassifiedPlayerChip): number {
  if (b.pg !== a.pg) return b.pg - a.pg;
  const da = a.setsWon - a.setsLost;
  const db = b.setsWon - b.setsLost;
  if (db !== da) return db - da;
  if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
  if (a.pp !== b.pp) return a.pp - b.pp;
  return a.displayName.localeCompare(b.displayName, 'es');
}

function sortClassifiedByStrength(chips: ClassifiedPlayerChip[]): ClassifiedPlayerChip[] {
  return [...chips].sort(compareChipByGroupPerformance);
}

function sortThirds(rows: { row: GroupTableRowWithSets; groupName: string }[]): ClassifiedPlayerChip[] {
  const chips = rows.map(({ row, groupName }) =>
    rowToChip(row, groupName, 3, { kind: 'tercero', label: `3° ${formatGroupLabelFromTableName(groupName)}` }),
  );
  chips.sort(compareChipByGroupPerformance);
  return chips;
}

/** Master Finals: 2 grupos de 4 → semis 1°A vs 2°B y 1°B vs 2°A. */
function buildMastersEliminationProposalFromTwoGroups(tables: GroupTableWithSets[]): EliminationProposalBundle {
  const warnings: string[] = [];
  const direct: ClassifiedPlayerChip[] = [];
  const eliminated: ClassifiedPlayerChip[] = [];

  const ordered = [...tables].sort((a, b) =>
    formatGroupLabelFromTableName(a.name).localeCompare(formatGroupLabelFromTableName(b.name), 'es'),
  );
  const ga = ordered[0]!;
  const gb = ordered[1]!;

  for (const t of [ga, gb]) {
    const sorted = [...t.rows].sort((a, b) => a.position - b.position);
    for (const row of sorted) {
      if (row.position === 1) {
        direct.push(rowToChip(row, t.name, 1, { kind: 'direct', label: `1° ${formatGroupLabelFromTableName(t.name)}` }));
      } else if (row.position === 2) {
        direct.push(rowToChip(row, t.name, 2, { kind: 'direct', label: `2° ${formatGroupLabelFromTableName(t.name)}` }));
      } else if (row.position > 2) {
        eliminated.push(
          rowToChip(row, t.name, row.position, {
            kind: 'direct',
            label: `${row.position}° ${formatGroupLabelFromTableName(t.name)}`,
          }),
        );
      }
    }
  }

  const sortedA = [...ga.rows].sort((a, b) => a.position - b.position);
  const sortedB = [...gb.rows].sort((a, b) => a.position - b.position);
  const firstA = sortedA.find((r) => r.position === 1);
  const secondA = sortedA.find((r) => r.position === 2);
  const firstB = sortedB.find((r) => r.position === 1);
  const secondB = sortedB.find((r) => r.position === 2);

  if (!firstA || !secondA || !firstB || !secondB) {
    warnings.push(
      'En algún grupo falta el 1° o el 2° clasificado; revisá la tabla antes de confirmar semifinales.',
    );
  }

  const crosses: EliminationCrossDraft[] = [
    {
      id: 'draft-sf-0',
      label: 'Semifinal 1',
      slotA: firstA?.playerId ?? null,
      slotB: secondB?.playerId ?? null,
    },
    {
      id: 'draft-sf-1',
      label: 'Semifinal 2',
      slotA: firstB?.playerId ?? null,
      slotB: secondA?.playerId ?? null,
    },
  ];

  return { direct, repechaje: [], eliminated, preliminaryCrosses: [], crosses, warnings };
}

/** Construye listas y cruces de eliminación (4 cuartos Novak o 2 semis Masters). */
export function buildEliminationProposalFromGroupTables(
  tables: GroupTableWithSets[],
  tournamentId?: string,
): EliminationProposalBundle {
  const tour = tournamentId?.trim() ? getTournamentById(tournamentId.trim()) : undefined;
  if (
    tour &&
    effectiveTournamentCatalogType(tour) === 'masters1000' &&
    tables.length === 2
  ) {
    return buildMastersEliminationProposalFromTwoGroups(tables);
  }

  const warnings: string[] = [];
  const direct: ClassifiedPlayerChip[] = [];
  const thirds: { row: GroupTableRowWithSets; groupName: string }[] = [];
  const eliminated: ClassifiedPlayerChip[] = [];

  for (const t of tables) {
    const sorted = [...t.rows].sort((a, b) => a.position - b.position);
    for (const row of sorted) {
      if (row.position === 1) {
        direct.push(rowToChip(row, t.name, 1, { kind: 'direct', label: `1° ${formatGroupLabelFromTableName(t.name)}` }));
      } else if (row.position === 2) {
        direct.push(rowToChip(row, t.name, 2, { kind: 'direct', label: `2° ${formatGroupLabelFromTableName(t.name)}` }));
      } else if (row.position === 3) {
        thirds.push({ row, groupName: t.name });
      } else if (row.position > 3) {
        eliminated.push(
          rowToChip(row, t.name, row.position, { kind: 'direct', label: `${row.position}° ${formatGroupLabelFromTableName(t.name)}` }),
        );
      }
    }
  }

  const sortedThirdChips = sortThirds(thirds);
  const bestThird = sortedThirdChips[0];
  const restThirds = sortedThirdChips.slice(1);
  for (const c of restThirds) {
    eliminated.push(c);
  }

  const repechaje: ClassifiedPlayerChip[] = [];
  if (bestThird) {
    repechaje.push({ ...bestThird, origin: { kind: 'tercero', label: 'Mejor 3°' } });
  }

  const byGroup = new Map<string, ClassifiedPlayerChip[]>();
  for (const c of direct) {
    if (!byGroup.has(c.groupLabel)) byGroup.set(c.groupLabel, []);
    byGroup.get(c.groupLabel)!.push(c);
  }
  const groupKeys = [...byGroup.keys()].sort((a, b) => a.localeCompare(b, 'es'));
  const firsts = groupKeys
    .map((g) => byGroup.get(g)!.find((x) => x.position === 1))
    .filter(Boolean) as ClassifiedPlayerChip[];
  const seconds = groupKeys
    .map((g) => byGroup.get(g)!.find((x) => x.position === 2))
    .filter(Boolean) as ClassifiedPlayerChip[];

  let seeds: ClassifiedPlayerChip[] = [...firsts, ...seconds];
  if (bestThird && seeds.length < 8) {
    seeds.push({ ...bestThird, origin: { kind: 'tercero', label: 'Mejor 3°' } });
  }

  if (seeds.length < 8) {
    warnings.push(
      `Hay ${seeds.length} clasificados (1° y 2° de cada grupo${bestThird ? ' + mejor 3°' : ''}). Hacen falta 8 jugadores para armar cuatro cruces de cuartos; usá el armado manual o revisá los grupos.`,
    );
    const crosses: EliminationCrossDraft[] = [0, 1, 2, 3].map((i) => ({
      id: `draft-qf-${i}`,
      label: `Cruce ${i + 1}`,
      slotA: seeds[i * 2]?.playerId ?? null,
      slotB: seeds[i * 2 + 1]?.playerId ?? null,
    }));
    return { direct, repechaje, eliminated, preliminaryCrosses: [], crosses, warnings };
  }

  if (seeds.length > 8) {
    const sorted = sortClassifiedByStrength(seeds);
    const k = seeds.length - 8;
    const playIn = sorted.slice(-(2 * k));
    const byes = sorted.slice(0, sorted.length - 2 * k);
    const preliminaryCrosses: EliminationCrossDraft[] = Array.from({ length: k }, (_, j) => ({
      id: `draft-rp-${j}`,
      label: `Repechaje ${j + 1}`,
      slotA: playIn[j * 2]?.playerId ?? null,
      slotB: playIn[j * 2 + 1]?.playerId ?? null,
    }));
    const orderedEight: string[] = [...byes.map((c) => c.playerId)];
    for (let j = 0; j < k; j++) orderedEight.push(`WAIT_RP_${j}`);
    const crosses: EliminationCrossDraft[] = [0, 1, 2, 3].map((i) => ({
      id: `draft-qf-${i}`,
      label: `Cuartos ${i + 1}`,
      slotA: orderedEight[i * 2] ?? null,
      slotB: orderedEight[i * 2 + 1] ?? null,
    }));
    warnings.push(
      `Hay ${seeds.length} clasificados: se armaron ${k} partido(s) de repechaje/play-in entre los ${2 * k} peores clasificados; los otros ${byes.length} entran directo a cuartos (slots pendientes: WAIT_RP_n hasta cargar el repechaje).`,
    );
    return { direct, repechaje, eliminated, preliminaryCrosses, crosses, warnings };
  }

  seeds = seeds.slice(0, 8);
  /* Cruces cruzados: 1° grupo i vs 2° grupo (i+1) mod n cuando hay 4 grupos equilibrados */
  const reordered: ClassifiedPlayerChip[] = [...seeds];
  if (firsts.length === 4 && seconds.length === 4) {
    reordered.length = 0;
    for (let i = 0; i < 4; i++) {
      reordered.push(firsts[i]!, seconds[(i + 1) % 4]!);
    }
  }

  const crosses: EliminationCrossDraft[] = [0, 1, 2, 3].map((i) => ({
    id: `draft-qf-${i}`,
    label: `Cruce ${i + 1}`,
    slotA: reordered[i * 2]?.playerId ?? null,
    slotB: reordered[i * 2 + 1]?.playerId ?? null,
  }));

  return { direct, repechaje, eliminated, preliminaryCrosses: [], crosses, warnings };
}

export function emptyManualCrosses(elimCrossCount: 2 | 4 = 4): EliminationCrossDraft[] {
  return Array.from({ length: elimCrossCount }, (_, i) => ({
    id: elimCrossCount === 2 ? `draft-sf-${i}` : `draft-qf-${i}`,
    label: elimCrossCount === 2 ? `Semifinal ${i + 1}` : `Cruce ${i + 1}`,
    slotA: null,
    slotB: null,
  }));
}

export type CrossValidationIssue = { code: string; message: string };

export function validateEliminationCrosses(
  crosses: EliminationCrossDraft[],
  allowedIds: Set<string>,
  eliminatedIds: Set<string>,
  options?: { allowRepechajeWaitSlots?: boolean },
): CrossValidationIssue[] {
  const issues: CrossValidationIssue[] = [];
  const used = new Map<string, string>();
  const allowWait = options?.allowRepechajeWaitSlots === true;

  for (const c of crosses) {
    const slots = [c.slotA, c.slotB].filter((x): x is string => Boolean(x?.trim()));
    if (slots.length < 2) {
      issues.push({ code: 'incomplete', message: `${c.label} no tiene dos jugadores asignados.` });
    }
    for (const sid of slots) {
      if (allowWait && isRepechajeWaitToken(sid)) {
        const prev = used.get(sid);
        if (prev) {
          issues.push({ code: 'duplicate', message: `El cupo ${sid} está duplicado en ${prev} y en ${c.label}.` });
        } else {
          used.set(sid, c.label);
        }
        continue;
      }
      if (eliminatedIds.has(sid)) {
        issues.push({
          code: 'eliminated',
          message: `${getPlayerById(sid)?.name ?? sid} figura como eliminado. Confirmá si querés incluirlo manualmente.`,
        });
        continue;
      }
      if (!allowedIds.has(sid)) {
        issues.push({ code: 'unknown', message: `Hay un jugador no habilitado para este cuadro en ${c.label}.` });
      }
      const prev = used.get(sid);
      if (prev) {
        issues.push({
          code: 'duplicate',
          message: `${getPlayerById(sid)?.name ?? sid} está asignado en ${prev} y en ${c.label}.`,
        });
      } else {
        used.set(sid, c.label);
      }
    }
  }

  return issues;
}

/** Valida repechajes/play-in (solo jugadores reales permitidos). */
export function validatePreliminaryCrosses(
  crosses: EliminationCrossDraft[],
  allowedIds: Set<string>,
  eliminatedIds: Set<string>,
): CrossValidationIssue[] {
  return validateEliminationCrosses(crosses, allowedIds, eliminatedIds, { allowRepechajeWaitSlots: false });
}

export function validateFullEliminationDraft(
  preliminary: EliminationCrossDraft[],
  quarter: EliminationCrossDraft[],
  allowedIds: Set<string>,
  eliminatedIds: Set<string>,
): CrossValidationIssue[] {
  return [
    ...validatePreliminaryCrosses(preliminary, allowedIds, eliminatedIds),
    ...validateEliminationCrosses(quarter, allowedIds, eliminatedIds, { allowRepechajeWaitSlots: true }),
  ];
}

export function crossesSummaryLines(
  crosses: EliminationCrossDraft[],
  nameById: (id: string) => string,
): string[] {
  return crosses.map((c) => {
    const fmt = (id: string | null) => {
      if (!id?.trim()) return '—';
      if (isRepechajeWaitToken(id)) return `⏳ ${id} (pend. repechaje)`;
      return nameById(id);
    };
    return `${c.label}: ${fmt(c.slotA)} vs ${fmt(c.slotB)}`;
  });
}

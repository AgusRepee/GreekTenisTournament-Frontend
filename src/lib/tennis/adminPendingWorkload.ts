/**
 * Lista de partidos que aún necesitan carga útil para el admin (fixture + KO).
 */

import type { MatchInput } from '@/types/tennisResults';
import type { FixtureCatalogEntry } from '@/lib/tennis/buildFixtureCatalog';
import { buildFixtureCatalogEntriesForTournament } from '@/lib/tennis/buildFixtureCatalog';
import type { KnockoutAdminEntry } from '@/lib/tennis/adminKnockoutCatalog';
import { buildKnockoutAdminEntries } from '@/lib/tennis/adminKnockoutCatalog';
import { matchInputDedupeKey } from '@/lib/tennis/matchDedupe';
import type { Player } from '@/lib/mockData';
import { getTournamentById } from '@/lib/mockData';

export type PendingWorkloadKind = 'fixture' | 'ko';

/** Partido contable como pendiente de carga (no cargado útil ni suspendido; KO con ambos jugadores definidos). */
export interface PendingWorkloadItem {
  dedupeKey: string;
  kind: PendingWorkloadKind;
  tournamentId: string;
  fecha: number;
  groupKey: string;
  fechaLabel: string;
  grupoLabel: string;
  playerA: string;
  playerB: string;
  koStage: KnockoutAdminEntry['koStage'] | null;
  roundLabel: string;
}

/** True si falta cargar resultado “útil”: sin dato cargado completo ni suspendido. */
export function isPendingResultLoad(stored: MatchInput | undefined): boolean {
  if (!stored) return true;
  if (stored.status === 'suspended') return false;
  if (stored.status === 'walkover' || stored.status === 'retired') return false;
  if (stored.status === 'played' && !!stored.score?.trim()) return false;
  return true;
}

export const KO_MATCH_PENDING_PLAYERS_MESSAGE =
  'Todavía falta definir un jugador para este cruce.';

export function isPlaceholderPlayerLabel(name: string): boolean {
  const s = name.trim();
  if (!s) return true;
  /** Cupo en cuartos hasta resolver repechaje/play-in (ver `eliminationKnockoutPersist` + `knockoutBracketAdvance`). */
  if (/^WAIT_RP_\d+$/i.test(s)) return true;
  const low = s.toLowerCase();
  if (/^tbd$/i.test(s) || /^bye$/i.test(s)) return true;
  if (low.startsWith('tbd')) return true;
  if (/a confirmar|por definir|por determinar|pendiente/i.test(low)) return true;
  if (s === '—' || s === '-' || s === '?') return true;
  return false;
}

/** Partido de eliminación listo para cargar (no placeholders tipo TBD/libre). */
export function isKnockoutMatchPlayableNames(playerA: string, playerB: string): boolean {
  const a = playerA.trim();
  const b = playerB.trim();
  if (!a || !b) return false;
  if (isPlaceholderPlayerLabel(a) || isPlaceholderPlayerLabel(b)) return false;
  return true;
}

export function workloadItemFromFixtureCatalogEntry(e: FixtureCatalogEntry, tournamentId: string): PendingWorkloadItem {
  const fechaLabel = `Fecha ${e.round}`;
  const grupoLabel = e.group === 'Interzonal' ? 'Interzonal' : `Grupo ${e.group}`;
  return {
    dedupeKey: e.dedupeKey,
    kind: 'fixture',
    tournamentId,
    fecha: e.round,
    groupKey: e.group,
    fechaLabel,
    grupoLabel,
    playerA: e.playerA,
    playerB: e.playerB,
    koStage: null,
    roundLabel: fechaLabel,
  };
}

export function workloadItemFromKnockoutEntry(e: KnockoutAdminEntry): PendingWorkloadItem {
  const label = e.roundLabel?.trim() || e.koStage;
  const fechaLabel = 'Eliminación';
  const grupoLabel = label;
  return {
    dedupeKey: e.dedupeKey,
    kind: 'ko',
    tournamentId: e.tournamentId,
    fecha: e.round ?? 999,
    groupKey: 'KO',
    fechaLabel,
    grupoLabel,
    playerA: e.playerA,
    playerB: e.playerB,
    koStage: e.koStage,
    roundLabel: label,
  };
}

/** Partidos pendientes desde catálogo de fixture + KO del club. */
export function collectPendingWorkload(
  tournamentId: string,
  resultsList: MatchInput[],
  players: Player[],
): PendingWorkloadItem[] {
  const resultsByKey = new Map<string, MatchInput>();
  for (const m of resultsList) {
    resultsByKey.set(matchInputDedupeKey(m), m);
  }

  const out: PendingWorkloadItem[] = [];

  const tour = getTournamentById(tournamentId);
  const fixture = buildFixtureCatalogEntriesForTournament(tour, players);
  for (const e of fixture) {
    const stored = resultsByKey.get(e.dedupeKey);
    if (!isPendingResultLoad(stored)) continue;
    out.push(workloadItemFromFixtureCatalogEntry(e, tournamentId));
  }

  const kos = buildKnockoutAdminEntries(tournamentId, players);
  for (const k of kos) {
    if (!isKnockoutMatchPlayableNames(k.playerA, k.playerB)) continue;
    const stored = resultsByKey.get(k.dedupeKey);
    if (!isPendingResultLoad(stored)) continue;
    out.push(workloadItemFromKnockoutEntry(k));
  }

  return sortPendingWorkloadItems(out);
}

export function sortPendingWorkloadItems<T extends PendingWorkloadItem>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'fixture' ? -1 : 1;
    if (a.kind === 'fixture' && b.kind === 'fixture') {
      if (a.fecha !== b.fecha) return a.fecha - b.fecha;
      const ga = a.groupKey === 'Interzonal' ? 'ZZ' : a.groupKey;
      const gb = b.groupKey === 'Interzonal' ? 'ZZ' : b.groupKey;
      if (ga !== gb) return ga.localeCompare(gb, 'es');
      return a.playerA.localeCompare(b.playerA, 'es');
    }
    const order = { repechaje: 0, octavos: 1, quarter: 2, semi: 3, final: 4 } as const;
    const oa = a.koStage ? order[a.koStage] : 0;
    const ob = b.koStage ? order[b.koStage] : 0;
    if (oa !== ob) return oa - ob;
    return a.playerA.localeCompare(b.playerA, 'es');
  });
}

/**
 * Borradores de marcador del admin (Resultados) en sessionStorage por torneo.
 * Permite contar “pendiente por borrador” en Eliminación / Resumen sin levantar estado global React.
 */

import type { ScoreCells } from '@/lib/tennis/adminScoreValidation';
import { buildScoreStringIfValid, cloneGrid } from '@/lib/tennis/adminScoreValidation';
import { matchInputDedupeKey } from '@/lib/tennis/matchDedupe';
import type { MatchInput } from '@/types/tennisResults';

const STORAGE_KEY = 'greek-admin-result-drafts-v1';

type StoredCells = { a: string[]; b: string[] };

type Root = Record<string, Record<string, { cells: StoredCells; updatedAt: number }>>;

function safeParse(raw: string | null): Root {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as Root;
    return o && typeof o === 'object' ? o : {};
  } catch {
    return {};
  }
}

function readRoot(): Root {
  if (typeof sessionStorage === 'undefined') return {};
  return safeParse(sessionStorage.getItem(STORAGE_KEY));
}

function writeRoot(root: Root): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(root));
  } catch {
    /* quota */
  }
}

function toCells(s: StoredCells): ScoreCells {
  return {
    a: [(s.a[0] ?? '').slice(0, 2), (s.a[1] ?? '').slice(0, 2), (s.a[2] ?? '').slice(0, 2)] as ScoreCells['a'],
    b: [(s.b[0] ?? '').slice(0, 2), (s.b[1] ?? '').slice(0, 2), (s.b[2] ?? '').slice(0, 2)] as ScoreCells['b'],
  };
}

function fromCells(c: ScoreCells): StoredCells {
  return {
    a: [...c.a],
    b: [...c.b],
  };
}

/** Carga borradores del torneo como mapa dedupeKey → ScoreCells (solo claves presentes en storage). */
export function loadMatchDraftCellsForTournament(tournamentId: string): Record<string, ScoreCells> {
  const tid = tournamentId.trim();
  if (!tid) return {};
  const root = readRoot();
  const bucket = root[tid] ?? {};
  const out: Record<string, ScoreCells> = {};
  for (const k of Object.keys(bucket)) {
    out[k] = cloneGrid(toCells(bucket[k]!.cells));
  }
  return out;
}

/** Persiste un mapa completo de borradores del torneo (sustituye bucket). */
export function saveMatchDraftCellsForTournament(tournamentId: string, drafts: Record<string, ScoreCells>): void {
  const tid = tournamentId.trim();
  if (!tid) return;
  const root = readRoot();
  const nextBucket: Record<string, { cells: StoredCells; updatedAt: number }> = {};
  for (const [k, cells] of Object.entries(drafts)) {
    if (!k.trim()) continue;
    const fp = buildScoreStringIfValid(cells);
    const hasAny = cells.a.some((x) => x?.trim()) || cells.b.some((x) => x?.trim());
    if (!hasAny && !fp.ok) continue;
    nextBucket[k] = { cells: fromCells(cells), updatedAt: Date.now() };
  }
  root[tid] = nextBucket;
  writeRoot(root);
}

/** Limpia bucket del torneo (p. ej. al confirmar “descartar” global). */
export function clearMatchDraftSessionForTournament(tournamentId: string): void {
  const tid = tournamentId.trim();
  if (!tid) return;
  const root = readRoot();
  delete root[tid];
  writeRoot(root);
}

function storedFingerprint(cells: ScoreCells): string {
  const built = buildScoreStringIfValid(cells);
  if (built.ok) return `played:${built.value}`;
  const hasAny = cells.a.some((x) => x?.trim()) || cells.b.some((x) => x?.trim());
  if (hasAny) return 'incomplete:dirty';
  return '';
}

function storedResultFingerprint(m: MatchInput | undefined): string {
  if (!m) return '';
  if (m.status === 'suspended') return 'status:suspended';
  if (m.status === 'walkover' || m.status === 'retired') {
    return `status:${m.status}|score:${(m.score ?? 'A').toUpperCase()}`;
  }
  return `status:played|score:${m.score?.trim() ?? ''}`;
}

/** Dedupe keys con borrador distinto al persistido (o incompleto con celdas). */
export function listSessionDraftDirtyDedupeKeys(
  tournamentId: string,
  resultsByKey: Map<string, MatchInput>,
): string[] {
  const tid = tournamentId.trim();
  if (!tid) return [];
  const root = readRoot();
  const bucket = root[tid] ?? {};
  const out: string[] = [];
  for (const key of Object.keys(bucket)) {
    const cells = toCells(bucket[key]!.cells);
    const stored = resultsByKey.get(key);
    if (storedResultFingerprint(stored) !== storedFingerprint(cells)) {
      out.push(key);
    }
  }
  return out;
}

/** True si hay al menos un borrador de sesión distinto del servidor para este torneo. */
export function hasSessionDraftDirty(tournamentId: string, resultsByKey: Map<string, MatchInput>): boolean {
  return listSessionDraftDirtyDedupeKeys(tournamentId, resultsByKey).length > 0;
}

/** Dedupe key para un partido de fixture (nombres limpios). */
export function fixtureDraftDedupeKey(
  tournamentId: string,
  group: string,
  round: number,
  playerA: string,
  playerB: string,
): string {
  return matchInputDedupeKey({
    tournamentId,
    group,
    round,
    playerA,
    playerB,
  });
}

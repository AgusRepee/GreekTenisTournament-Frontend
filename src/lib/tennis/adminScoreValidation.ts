import type { ScoreCells } from './adminScoreTypes';
import {
  assertValidRegularSetGames,
  assertValidSuperTiebreak,
  parseMatchScore,
  parseScoreSegment,
} from './matchStatsEngine';

export type { ScoreCells } from './adminScoreTypes';
export { EMPTY_GRID, cloneGrid } from './adminScoreTypes';

/** @deprecated Prefer {@link columnErrorForCells} (usa el mismo motor que standings). */
export function validateRegularSetGames(a: number, b: number): string | null {
  try {
    parseScoreSegment(`${a}-${b}`);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Set inválido.';
  }
}

/** @deprecated Prefer {@link columnErrorForCells} para el tercer set. */
export function validateMatchTiebreak(a: number, b: number): string | null {
  try {
    parseScoreSegment(`${a}-${b}`);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Super tie-break inválido.';
  }
}

export function columnErrorForCells(cells: ScoreCells, col: 0 | 1 | 2): string | null {
  const sa = cells.a[col]?.trim() ?? '';
  const sb = cells.b[col]?.trim() ?? '';
  if (!sa && !sb) return null;
  if (!sa || !sb) return 'Completá ambos valores del set.';
  const a = Number(sa);
  const b = Number(sb);
  const label = col === 2 ? 'El Super Tie-Break' : `El Set ${col + 1}`;
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isInteger(a) || !Number.isInteger(b)) {
    return `${label} no es válido.`;
  }
  try {
    if (col === 2) {
      assertValidSuperTiebreak(a, b);
    } else {
      assertValidRegularSetGames(a, b);
    }
  } catch (e) {
    const detail = e instanceof Error ? e.message : '';
    return detail ? `${label} no es válido: ${detail}` : `${label} no es válido.`;
  }
  return null;
}

/** Columna con marcador completo y reglas de tenis cumplidas. */
export function isColumnScoreValid(cells: ScoreCells, col: 0 | 1 | 2): boolean {
  const sa = cells.a[col]?.trim() ?? '';
  const sb = cells.b[col]?.trim() ?? '';
  if (!sa || !sb) return false;
  return columnErrorForCells(cells, col) === null;
}

/**
 * Construye el string de marcador solo si las columnas están bien y el motor
 * valida el partido completo (Bo3, sin empate en sets ganados, ST al final, etc.).
 */
export function buildScoreStringIfValid(c: ScoreCells): { ok: true; value: string } | { ok: false; reason: string } {
  const parts: string[] = [];
  let ended = false;
  for (let i = 0; i < 3; i++) {
    const x = c.a[i]?.trim() ?? '';
    const y = c.b[i]?.trim() ?? '';
    const hasX = x !== '';
    const hasY = y !== '';
    if (hasX && hasY) {
      if (ended) {
        return { ok: false, reason: 'No dejés columnas vacías entre sets.' };
      }
      const err = columnErrorForCells(c, i as 0 | 1 | 2);
      if (err) return { ok: false, reason: err };
      parts.push(`${x}-${y}`);
    } else if (hasX || hasY) {
      return { ok: false, reason: 'En cada set completá los dos valores.' };
    } else {
      ended = true;
    }
  }
  if (parts.length === 0) {
    return { ok: false, reason: 'Completá al menos un set con ambos valores o usá walkover.' };
  }
  const joined = parts.join(' ');
  try {
    parseMatchScore(joined, { requireThirdSetSuperTiebreak: true });
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'Marcador inválido para un partido al mejor de tres.' };
  }
  return { ok: true, value: joined };
}

/** Inverso de la cadena guardada en el store (ej. `6-4 3-6 10-8`). */
export function parseScoreStringToCells(score: string | undefined | null): ScoreCells | null {
  if (!score?.trim()) return null;
  const parts = score.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  const out: ScoreCells = {
    a: ['', '', ''],
    b: ['', '', ''],
  };
  for (let i = 0; i < Math.min(3, parts.length); i++) {
    const m = parts[i]!.match(/^(\d+)-(\d+)$/);
    if (!m) return null;
    out.a[i] = m[1]!;
    out.b[i] = m[2]!;
  }
  return out;
}

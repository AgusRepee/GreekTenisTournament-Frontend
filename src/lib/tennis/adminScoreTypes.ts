/** Tres sets: fila superior = jugador A, fila inferior = jugador B. */
export type ScoreCells = { a: [string, string, string]; b: [string, string, string] };

export const EMPTY_GRID: ScoreCells = { a: ['', '', ''], b: ['', '', ''] };

export function cloneGrid(g: ScoreCells): ScoreCells {
  return { a: [...g.a] as [string, string, string], b: [...g.b] as [string, string, string] };
}

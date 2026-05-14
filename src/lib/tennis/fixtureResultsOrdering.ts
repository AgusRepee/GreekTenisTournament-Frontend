import type { FixtureCatalogEntry } from './buildFixtureCatalog';

export function isInterzonalGroupKey(g: string): boolean {
  const s = String(g).trim();
  return s === 'Interzonal' || /^interzonal$/i.test(s);
}

/** Bloques por grupo; interzonal al final. */
export function compareFixtureGroups(ga: string, gb: string): number {
  const aI = isInterzonalGroupKey(ga);
  const bI = isInterzonalGroupKey(gb);
  if (aI !== bI) return aI ? 1 : -1;
  return ga.localeCompare(gb, 'es', { numeric: true, sensitivity: 'base' });
}

/** Partidos de fixture: primero grupo, luego fecha, luego rivales. */
export function sortFixtureEntriesByGroupThenRound(entries: FixtureCatalogEntry[]): FixtureCatalogEntry[] {
  return [...entries].sort((x, y) => {
    const gcmp = compareFixtureGroups(x.group, y.group);
    if (gcmp !== 0) return gcmp;
    const rc = x.round - y.round;
    if (rc !== 0) return rc;
    const sa = `${x.playerA}\u0000${x.playerB}`;
    const sb = `${y.playerA}\u0000${y.playerB}`;
    return sa.localeCompare(sb, 'es', { sensitivity: 'base' });
  });
}

import type { LigaTemplate } from '../../types/tennisResults';
import { LIGA3_GROUP_FIXTURES } from '../mockData';

/** `docs/liga3.json` tiene `fechas: []`; se usa el fixture de mock hasta unificar JSON. */
export function buildLiga3SyntheticFechas(): LigaTemplate['fechas'] {
  const groupNameToKey: Record<string, string> = { 'Grupo A': 'A', 'Grupo B': 'B', 'Grupo C': 'C' };
  const numeros = [1, 2, 3, 4, 5];
  return numeros.map((numero) => {
    const grupos: Record<string, string[]> = { A: [], B: [], C: [] };
    for (const g of LIGA3_GROUP_FIXTURES) {
      const key = groupNameToKey[g.name];
      if (!key) continue;
      const fecha = g.fechas.find((x) => x.fecha === numero);
      if (!fecha) continue;
      for (const m of fecha.matches) {
        grupos[key].push(`${m.playerA} vs ${m.playerB}`);
      }
      if (fecha.libre) grupos[key].push(`Libre: ${fecha.libre}`);
    }
    return { numero, grupos };
  });
}

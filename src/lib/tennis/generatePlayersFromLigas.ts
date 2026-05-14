/**
 * Jugadores únicos por (liga, nombre) desde docs/ligaN.json.
 */

import { ligasData, LIGA_NUMBERS } from './loadLigasFromDocs';

export interface DocPlayerSeed {
  id: string;
  name: string;
  /** 1–6 */
  liga: number;
}

/**
 * Recorre todos los grupos de todas las ligas; deduplica por par liga+nombre.
 */
export function generatePlayersFromLigas(): DocPlayerSeed[] {
  const map = new Map<string, DocPlayerSeed>();
  let idx = 0;
  for (const n of LIGA_NUMBERS) {
    const liga = ligasData[n];
    for (const names of Object.values(liga.grupos)) {
      for (const name of names) {
        const key = `${n}::${name.trim()}`;
        if (!map.has(key)) {
          map.set(key, {
            id: `p-doc-${idx}`,
            name: name.trim(),
            liga: n,
          });
          idx += 1;
        }
      }
    }
  }
  return Array.from(map.values());
}

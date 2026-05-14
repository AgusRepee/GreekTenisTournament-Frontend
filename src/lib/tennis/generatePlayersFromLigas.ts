/**
 * Jugadores únicos por (liga, nombre) desde docs/ligaN.json.
 */

import { ligasData, LIGA_NUMBERS } from './loadLigasFromDocs';
import { DEFAULT_LIGA2_RESULTS } from './liga2DefaultResults';
import { DEFAULT_NOVAK_LIGA1_RESULTS } from './novakLiga1DefaultResults';

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
  function addPlayer(liga: number, name: string): void {
    const clean = name.trim();
    if (!clean) return;
    const key = `${liga}::${clean}`;
    if (map.has(key)) return;
    map.set(key, {
      id: `p-doc-${idx}`,
      name: clean,
      liga,
    });
    idx += 1;
  }

  for (const n of LIGA_NUMBERS) {
    const liga = ligasData[n];
    for (const names of Object.values(liga.grupos)) {
      for (const name of names) {
        addPlayer(n, name);
      }
    }
  }
  for (const result of DEFAULT_NOVAK_LIGA1_RESULTS) {
    addPlayer(1, result.playerA);
    addPlayer(1, result.playerB);
  }
  for (const result of DEFAULT_LIGA2_RESULTS) {
    addPlayer(2, result.playerA);
    addPlayer(2, result.playerB);
  }
  return Array.from(map.values());
}

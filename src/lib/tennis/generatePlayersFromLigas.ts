/**
 * Jugadores únicos por (liga, nombre) desde docs/ligaN.json.
 */

import { ligasData, LIGA_NUMBERS } from './loadLigasFromDocs';
import { DEFAULT_LIGA2_RESULTS } from './liga2DefaultResults';
import { DEFAULT_LIGA5_ND_RESULTS, LIGA5_ND_GROUPS } from './liga5Nd2026Data';
import { DEFAULT_LIGA6_ND_RESULTS, LIGA6_ND_GROUPS } from './liga6Nd2026Data';
import { RAFA_LIGA2_GROUPS, RAFA_LIGA2_LEAGUE_NUM } from './rafaNadalLiga2Nd2026Data';
import { RAFA_LIGA5_GROUPS, RAFA_LIGA5_LEAGUE_NUM } from './rafaNadalLiga5Nd2026Data';
import { RAFA_LIGA6_GROUPS, RAFA_LIGA6_LEAGUE_NUM } from './rafaNadalLiga6Nd2026Data';
import { RAFAEL_LIGA1_GROUPS, RAFAEL_LIGA1_LEAGUE_NUM } from './rafaelNadalLiga1Nd2026Data';
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
  for (const names of Object.values(LIGA5_ND_GROUPS)) {
    for (const name of names) addPlayer(5, name);
  }
  for (const result of DEFAULT_LIGA5_ND_RESULTS) {
    addPlayer(5, result.playerA);
    addPlayer(5, result.playerB);
  }
  for (const names of Object.values(LIGA6_ND_GROUPS)) {
    for (const name of names) addPlayer(6, name);
  }
  for (const result of DEFAULT_LIGA6_ND_RESULTS) {
    addPlayer(6, result.playerA);
    addPlayer(6, result.playerB);
  }
  for (const names of Object.values(RAFAEL_LIGA1_GROUPS)) {
    for (const name of names) addPlayer(RAFAEL_LIGA1_LEAGUE_NUM, name);
  }
  for (const names of Object.values(RAFA_LIGA2_GROUPS)) {
    for (const name of names) addPlayer(RAFA_LIGA2_LEAGUE_NUM, name);
  }
  for (const names of Object.values(RAFA_LIGA5_GROUPS)) {
    for (const name of names) addPlayer(RAFA_LIGA5_LEAGUE_NUM, name);
  }
  for (const names of Object.values(RAFA_LIGA6_GROUPS)) {
    for (const name of names) addPlayer(RAFA_LIGA6_LEAGUE_NUM, name);
  }
  return Array.from(map.values());
}

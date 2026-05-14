/**
 * Torneos Novak por liga a partir de plantillas JSON.
 */

import type { LigaTemplate } from '../../types/tennisResults';
import { ligasData, LIGA_NUMBERS, type LigaNumKey } from './loadLigasFromDocs';

export interface DocNovakTournamentSeed {
  id: string;
  liga: number;
  template: LigaTemplate;
}

export function novakTournamentId(ligaNum: number): string {
  return ligaNum === 1 ? 't-novak' : `t-novak-l${ligaNum}`;
}

/** Resuelve la liga (1–6) a partir del id de torneo Novak del sistema. */
export function ligaNumFromNovakTournamentId(tournamentId: string): LigaNumKey | null {
  if (tournamentId === 't-novak') return 1;
  const m = /^t-novak-l([1-6])$/.exec(tournamentId);
  if (!m) return null;
  return Number(m[1]) as LigaNumKey;
}

export function isNovakTournamentId(tournamentId: string): boolean {
  return ligaNumFromNovakTournamentId(tournamentId) != null;
}

/** Cuenta líneas de fixture (por grupo y/o lista interzonal) para estimar partidos. */
export function countFechasLines(template: LigaTemplate): number {
  let c = 0;
  for (const f of template.fechas) {
    if (f.grupos) {
      for (const lines of Object.values(f.grupos)) {
        c += lines.length;
      }
    }
    if (Array.isArray(f.partidos)) {
      c += f.partidos.length;
    }
  }
  return c;
}

export function countPlayersInGrupos(template: LigaTemplate): number {
  let s = 0;
  for (const g of Object.values(template.grupos)) {
    s += g.length;
  }
  return s;
}

export function generateTournamentsFromLigas(): DocNovakTournamentSeed[] {
  return LIGA_NUMBERS.map((n) => ({
    id: novakTournamentId(n),
    liga: n,
    template: ligasData[n],
  }));
}

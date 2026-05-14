import type { LeagueNum } from '@/lib/mockData';

/** Colores por liga (alineados con portadas Novak / leagueColors). */
export type LigaThemeTokens = {
  /** Hex principal — se expone como `--color-torneo` */
  primary: string;
  /** `R G B` separados por espacio — para `rgb(var(--color-torneo-rgb) / a)` */
  rgb: string;
  /** Texto sobre botón / chip sólido */
  foreground: string;
};

/**
 * Mapa central de tema por liga (1–6).
 * Alineado con `src/lib/leagueColors.ts` y portadas Novak (L3 azul / novakazul, L4 verde / novajverde…).
 */
export const coloresLiga: Record<LeagueNum, LigaThemeTokens> = {
  1: { primary: '#ef4444', rgb: '239 68 68', foreground: '#ffffff' },
  2: { primary: '#fb923c', rgb: '251 146 60', foreground: '#111318' },
  3: { primary: '#3b82f6', rgb: '59 130 246', foreground: '#ffffff' },
  4: { primary: '#22c55e', rgb: '34 197 94', foreground: '#ffffff' },
  5: { primary: '#171717', rgb: '23 23 23', foreground: '#ffffff' },
  6: { primary: '#9ca3af', rgb: '156 163 175', foreground: '#111318' },
};

/** Fallback si no se puede resolver la liga (azul sitio). */
export const coloresLigaDefault: LigaThemeTokens = {
  primary: '#0d3b8a',
  rgb: '13 59 138',
  foreground: '#ffffff',
};

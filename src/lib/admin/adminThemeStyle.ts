import type { CSSProperties } from 'react';
import type { LeagueNum } from '@/lib/mockData';
import { coloresLiga, coloresLigaDefault, type LigaThemeTokens } from './coloresLiga';

export function getLigaThemeTokens(league: LeagueNum | null | undefined): LigaThemeTokens {
  if (league == null || league < 1 || league > 6) return coloresLigaDefault;
  return coloresLiga[league];
}

/**
 * Variables CSS para contenedor `.admin-tournament-theme` (actualizar con JS).
 */
export function getAdminTournamentCssVariables(league: LeagueNum | null | undefined): CSSProperties {
  const t = getLigaThemeTokens(league);
  return {
    '--color-torneo': t.primary,
    '--color-torneo-rgb': t.rgb,
    '--color-torneo-foreground': t.foreground,
  } as CSSProperties;
}

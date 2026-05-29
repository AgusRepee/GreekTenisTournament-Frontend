import React from 'react';
import { getLeagueBadgeClasses } from '../src/lib/leagueColors';
import type { LeagueNum } from '../src/lib/mockData';

function normalizeLeague(league: LeagueNum | number | undefined): LeagueNum {
  const n = Number(league);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5 || n === 6) return n;
  return 1;
}

export interface LeagueBadgeProps {
  league: LeagueNum | number;
  className?: string;
}

/**
 * Badge de liga reutilizable (ranking, perfil, tarjetas de torneo).
 * Colores desde `leagueColors.ts` (L1 violeta, L5 negro, L6 gris, etc.).
 */
export const LeagueBadge: React.FC<LeagueBadgeProps> = ({ league, className = '' }) => {
  const L = normalizeLeague(league);
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap ${getLeagueBadgeClasses(L, 'lg')} ${className}`.trim()}
    >
      Liga {L}
    </span>
  );
};

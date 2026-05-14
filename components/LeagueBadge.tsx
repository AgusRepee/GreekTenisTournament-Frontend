import React from 'react';
import type { LeagueNum } from '../src/lib/mockData';

function normalizeLeague(league: LeagueNum | number | undefined): LeagueNum {
  const n = Number(league);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5 || n === 6) return n;
  return 1;
}

const LEAGUE_BADGE_CLASSES: Record<LeagueNum, string> = {
  1: 'bg-red-100 text-red-600 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
  2: 'bg-orange-100 text-orange-600 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
  3: 'bg-blue-100 text-blue-600 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  4: 'bg-green-100 text-green-600 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
  5: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/35 dark:text-rose-200 dark:border-rose-600',
  6: 'bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-600',
};

export interface LeagueBadgeProps {
  league: LeagueNum | number;
  className?: string;
}

/**
 * Reusable league badge. Use in ranking table, profile, tournament cards, player lists.
 */
export const LeagueBadge: React.FC<LeagueBadgeProps> = ({ league, className = '' }) => {
  const L = normalizeLeague(league);
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-lg px-3 py-1 text-xs font-semibold border ${LEAGUE_BADGE_CLASSES[L]} ${className}`.trim()}
    >
      Liga {L}
    </span>
  );
};

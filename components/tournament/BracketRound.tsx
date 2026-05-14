import React from 'react';
import type { MatchCardLeagueUi } from '../../src/lib/leagueColors';
import { MatchCard } from './MatchCard';
import type { Round } from './types';

const ROUND_LABELS: Record<Round['name'], string> = {
  quarterfinals: 'Cuartos de final',
  semifinals: 'Semifinales',
  final: 'Final',
};

interface BracketRoundProps {
  round: Round;
  className?: string;
  leagueUi?: MatchCardLeagueUi;
  /** Sobrescribe clases del título de ronda (p. ej. admin neutro). */
  roundTitleClassName?: string;
}

const DEFAULT_ROUND_TITLE =
  'text-center text-sm font-bold uppercase tracking-wider text-[#111318] dark:text-white md:text-left';

export function BracketRound({ round, className = '', leagueUi, roundTitleClassName }: BracketRoundProps) {
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <h3 className={roundTitleClassName ?? DEFAULT_ROUND_TITLE}>
        {ROUND_LABELS[round.name]}
      </h3>
      <div className="flex flex-col gap-4">
        {round.matches.map((match, i) => (
          <MatchCard key={i} match={match} leagueUi={leagueUi} />
        ))}
      </div>
    </div>
  );
}

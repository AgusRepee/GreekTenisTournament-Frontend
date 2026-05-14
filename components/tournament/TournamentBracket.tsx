import React from 'react';
import { getLeaguePublicTournamentTheme, type LeaguePublicTournamentTheme } from '../../src/lib/leagueColors';
import { BracketRound } from './BracketRound';
import { BracketConnector } from './BracketConnector';
import { MatchCard } from './MatchCard';
import type { Round } from './types';

const ROUND_LABELS: Record<Round['name'], string> = {
  quarterfinals: 'Cuartos de final',
  semifinals: 'Semifinales',
  final: 'Final',
};

export type { Round, Match, Player } from './types';
export { getBracketRoundsForUI } from './adapter';

export interface TournamentBracketProps {
  rounds: Round[];
  className?: string;
  /** Acento visual del cuadro (liga del torneo); por defecto Liga 3. */
  publicTheme?: LeaguePublicTournamentTheme;
  /** Admin: fases y tarjetas en gris/blanco sin acento de liga. */
  variant?: 'public' | 'admin-neutral';
}

/**
 * Custom tournament bracket: Quarterfinals → Semifinals → Final.
 * Desktop: horizontal layout with connectors. Mobile: stacked rounds.
 */
export function TournamentBracket({ rounds, className = '', publicTheme, variant = 'public' }: TournamentBracketProps) {
  const theme = publicTheme ?? getLeaguePublicTournamentTheme(3);
  const phaseTitleClass =
    variant === 'admin-neutral'
      ? 'text-center text-sm font-bold uppercase tracking-wider text-[#616f89] dark:text-gray-200 md:text-left'
      : 'text-sm font-bold uppercase tracking-wider text-[#111318] dark:text-white';
  if (!rounds.length) {
    return (
      <div
        className={`flex min-h-[200px] items-center justify-center rounded-2xl p-8 text-center text-sm text-[#616f89] dark:text-gray-400 ${theme.bracketEmpty}`}
      >
        No hay datos de cuadro para este torneo.
      </div>
    );
  }

  const qf = rounds.find((r) => r.name === 'quarterfinals');
  const sf = rounds.find((r) => r.name === 'semifinals');
  const fin = rounds.find((r) => r.name === 'final');

  return (
    <div className={`min-w-0 w-full max-w-full overflow-hidden rounded-2xl ${theme.bracketShell} ${className}`}>
      {/* Desktop: grid 4 filas — cuartos 4 celdas, semis centradas entre 2 cuartos, final centrada */}
      <div
        className="hidden md:grid gap-x-2 gap-y-2 px-3 py-4 md:px-4 min-w-0 w-full min-h-[420px]"
        style={{
          gridTemplateColumns: 'minmax(0, 1fr) 32px minmax(0, 1fr) 32px minmax(0, 1fr)',
          gridTemplateRows: 'auto repeat(4, minmax(90px, 1fr))',
        }}
      >
        {/* Títulos */}
        {qf && (
          <div
            className={phaseTitleClass}
            style={{ gridColumn: 1, gridRow: 1 }}
          >
            {ROUND_LABELS.quarterfinals}
          </div>
        )}
        {sf && (
          <div
            className={phaseTitleClass}
            style={{ gridColumn: 3, gridRow: 1 }}
          >
            {ROUND_LABELS.semifinals}
          </div>
        )}
        {fin && (
          <div
            className={phaseTitleClass}
            style={{ gridColumn: 5, gridRow: 1 }}
          >
            {ROUND_LABELS.final}
          </div>
        )}
        {/* Cuartos: 4 filas, 1 match por fila */}
        {qf?.matches.map((match, i) => (
          <div key={`qf-${i}`} style={{ gridColumn: 1, gridRow: i + 2 }} className="flex items-center min-w-0">
            <MatchCard match={match} className="w-full min-w-0" leagueUi={theme.matchCard} />
          </div>
        ))}
        {/* Conector 1: cuartos → semis */}
        <div style={{ gridColumn: 2, gridRow: '2 / 6' }} className="flex items-stretch">
          <BracketConnector variant={2} strokeClassName={theme.connectorStroke} />
        </div>
        {/* Semis: cada una centrada entre sus dos cuartos (filas 2-3 y 4-5) */}
        {sf?.matches.map((match, i) => (
          <div
            key={`sf-${i}`}
            style={{ gridColumn: 3, gridRow: `${i * 2 + 2} / span 2` }}
            className="flex items-center justify-center min-w-0"
          >
            <MatchCard match={match} className="w-full min-w-0 max-w-full" leagueUi={theme.matchCard} />
          </div>
        ))}
        {/* Conector 2: semis → final */}
        <div style={{ gridColumn: 4, gridRow: '2 / 6' }} className="flex items-stretch">
          <BracketConnector variant={1} strokeClassName={theme.connectorStroke} />
        </div>
        {/* Final: centrada en el medio (filas 2-5) */}
        {fin?.matches.map((match, i) => (
          <div
            key={`fin-${i}`}
            style={{ gridColumn: 5, gridRow: '2 / 6' }}
            className="flex items-center justify-center min-w-0"
          >
            <MatchCard match={match} className="w-full min-w-0 max-w-full" leagueUi={theme.matchCard} />
          </div>
        ))}
      </div>
      {/* Mobile: stacked */}
      <div className="md:hidden flex flex-col gap-8 p-4">
        {rounds.map((round) => (
          <BracketRound
            key={round.name}
            round={round}
            leagueUi={theme.matchCard}
            roundTitleClassName={variant === 'admin-neutral' ? phaseTitleClass : undefined}
          />
        ))}
      </div>
    </div>
  );
}

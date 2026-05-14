import React from 'react';
import { Check } from 'lucide-react';
import { getLeaguePublicTournamentTheme, type MatchCardLeagueUi } from '../../src/lib/leagueColors';
import { resolvePlayerAvatarFallback, useSiteSettings } from '../../src/lib/siteSettings';
import type { Match } from './types';

function getImageUrl(filename: string): string {
  if (!filename) return '';
  try {
    return new URL(`../../img/${filename}`, import.meta.url).href;
  } catch {
    return '';
  }
}

interface MatchCardProps {
  match: Match;
  className?: string;
  /** Si es false, no se muestra la foto (útil en el cuadro de eliminación) */
  showPhoto?: boolean;
  /** Tinte del cuadro acorde a la liga; por defecto Liga 3 (azul). */
  leagueUi?: MatchCardLeagueUi;
}

export function MatchCard({ match, className = '', showPhoto = true, leagueUi }: MatchCardProps) {
  const site = useSiteSettings();
  const fallbackAvatar = resolvePlayerAvatarFallback(site.branding);
  const ui = leagueUi ?? getLeaguePublicTournamentTheme(3).matchCard;
  const { player1, player2, winner } = match;
  const p1Won = winner === 'player1';
  const p2Won = winner === 'player2';

  const renderPlayer = (player: Match['player1'], isWinner: boolean) => (
    <div
      className={`flex w-full min-w-0 items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
        isWinner ? ui.winnerRow : ui.loserRow
      }`}
    >
      {/* Foto (reemplaza el "–" / código de país cuando se muestra) */}
      {showPhoto ? (
        <div className={`size-9 shrink-0 overflow-hidden rounded-full ${ui.avatarRing}`}>
          {player.image ? (
            <img
              src={getImageUrl(player.image)}
              alt=""
              className="w-full h-full object-cover object-top"
            />
          ) : fallbackAvatar ? (
            <img
              src={fallbackAvatar}
              alt=""
              className="w-full h-full object-contain p-0.5"
            />
          ) : (
            <div className={`flex h-full w-full items-center justify-center text-xs font-bold ${ui.avatarInitials}`}>
              {player.name.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
      ) : (
        /* Sin foto: mismo espacio con iniciales (en lugar de "–") */
        <div className={ui.avatarNoPhotoShell}>
          {player.flag && player.flag !== '–' ? player.flag : player.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      {/* Nombre + ranking */}
      <div className="flex-1 min-w-0">
        <span
          className={`block truncate text-sm font-medium ${isWinner ? 'font-semibold text-[#111318] dark:text-white' : ui.loserName}`}
        >
          {player.name}
          {player.ranking != null && player.ranking > 0 && (
            <span className={`ml-0.5 text-sm font-normal ${ui.rankingMuted}`}>({player.ranking})</span>
          )}
        </span>
      </div>
      {/* Check ganador */}
      {isWinner && (
        <span className={`shrink-0 ${ui.checkWinner}`} aria-hidden>
          <Check className="h-4 w-4" />
        </span>
      )}
      {/* Resultado (sets) alineado a la derecha */}
      <div className="flex gap-1.5 shrink-0 tabular-nums">
        {player.sets.length > 0 ? (
          player.sets.map((s, i) => (
            <span key={i} className="w-5 text-center text-sm font-medium text-[#111318] dark:text-white">
              {s}
            </span>
          ))
        ) : (
          <span className={`text-xs ${ui.scorePlaceholder}`}>–</span>
        )}
      </div>
    </div>
  );

  return (
    <div className={`min-w-0 ${className}`.trim()}>
      <div className={ui.outerCard}>
        <div className="flex flex-col gap-1 p-2">
          {renderPlayer(player1, p1Won)}
          {renderPlayer(player2, p2Won)}
        </div>
      </div>
    </div>
  );
}

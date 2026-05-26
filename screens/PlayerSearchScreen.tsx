import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { categoryToLeague, isPlayerProfileListingVisible } from '../src/lib/mockData';
import { readIsAdmin } from '../src/lib/adminAuth';
import { useClubData } from '../src/lib/clubDataStore';
import { getDataSourceMode } from '../src/lib/data/tournamentRepository';
import { useTennisLiveData } from '../src/lib/tennis/useTennisLiveData';
import {
  searchPlayersWithPositionFromLeagueMap,
  searchPlayersWithPositionFromResults,
} from '../src/lib/tennis/derivedTennisData';
import { LeagueBadge } from '../components/LeagueBadge';
import { resolvePlayerAvatarFallback, useSiteSettings } from '../src/lib/siteSettings';
import { isSeasonStatsPending, uiPlayerPoints } from '../src/lib/playerUiFormat';

function bundledProfileImg(filename: string): string {
  try {
    return new URL(`../img/${filename}`, import.meta.url).href;
  } catch {
    return '';
  }
}

interface PlayerSearchScreenProps {
  setScreen: (screen: string) => void;
  setSelectedPlayerId: (id: string | null) => void;
  initialQuery?: string;
  /** Preferir esto al abrir perfil: actualiza jugador y pantalla en el mismo ciclo. */
  openPlayerProfile?: (playerId: string) => void;
}

export const PlayerSearchScreen: React.FC<PlayerSearchScreenProps> = ({
  setScreen,
  setSelectedPlayerId,
  initialQuery,
  openPlayerProfile,
}) => {
  const [query, setQuery] = useState(initialQuery ?? '');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const club = useClubData();
  const site = useSiteSettings();
  const fallbackAvatar = resolvePlayerAvatarFallback(site.branding);
  const apiMode = getDataSourceMode() === 'api';
  const { results: matchResults, knockoutMerged, rankingsByLeague } = useTennisLiveData();
  const roster = useMemo(() => {
    const list = Array.isArray(club.players) ? club.players : [];
    const admin = readIsAdmin();
    return list.filter((p) => isPlayerProfileListingVisible(p, admin));
  }, [club.players]);

  useEffect(() => {
    setQuery(initialQuery ?? '');
  }, [initialQuery]);

  const searchResults = useMemo(() => {
    if (roster.length === 0) return [];
    try {
      if (apiMode) {
        return searchPlayersWithPositionFromLeagueMap(query, roster, rankingsByLeague);
      }
      return searchPlayersWithPositionFromResults(query, roster, club.tournaments, matchResults, knockoutMerged);
    } catch (e) {
      console.warn('[PlayerSearchScreen] búsqueda de jugadores', e);
      return [];
    }
  }, [apiMode, query, roster, rankingsByLeague, club.tournaments, matchResults, knockoutMerged]);

  const handlePlayerClick = (playerId: string) => {
    if (openPlayerProfile) {
      openPlayerProfile(playerId);
    } else {
      setSelectedPlayerId(playerId);
      setScreen('profile');
    }
  };

  return (
    <main className="flex-1 w-full max-w-[800px] mx-auto px-4 md:px-10 py-10 md:py-12">
      <section className="app-glass-panel p-8 shadow-sport-card dark:shadow-sport-card-dark md:p-10">
        <div className="flex flex-col gap-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#616f89] dark:text-gray-500 mb-2">Plantel</p>
            <h1 className="text-[#111318] dark:text-white text-3xl md:text-4xl font-bold leading-tight tracking-tight">Buscar jugador</h1>
            <p className="text-[#616f89] dark:text-gray-400 text-base mt-2 leading-relaxed">Introduce el nombre para ver categoría, posición y puntos.</p>
          </div>
          <div className="relative flex items-center h-12 w-full rounded-md bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-600 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 overflow-hidden shadow-sm transition-all">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-[#616f89]">
            <Search className="w-6 h-6" />
          </span>
          <input
            type="text"
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-full bg-transparent border-none text-[#111318] dark:text-white placeholder:text-[#616f89] pl-12 pr-4 text-base outline-none"
            placeholder="Escribe el nombre del jugador..."
          />
        </div>
        <div className="app-glass-panel overflow-hidden shadow-sport-card dark:shadow-sport-card-dark">
          {roster.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#616f89] dark:text-gray-400">
              No hay jugadores cargados.
            </div>
          ) : query.trim() === '' ? (
            <div className="p-8 text-center text-[#616f89] dark:text-gray-400 text-sm">
              Escribe al menos un carácter para buscar.
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-8 text-center text-[#616f89] dark:text-gray-400 text-sm">
              No se encontraron jugadores con &quot;{query}&quot;.
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {searchResults.map((player) => {
                const pending = isSeasonStatsPending(player);
                const fromBundled =
                  !pending && player.profileImage ? bundledProfileImg(player.profileImage) : '';
                const displayAv =
                  !pending && player.displayAvatar?.trim() ? player.displayAvatar.trim() : '';
                const avatarSrc = displayAv || fromBundled || fallbackAvatar;
                const isPhotoAvatar = Boolean(displayAv || fromBundled);
                const displayLabel = String(player.displayName ?? player.name ?? '??').trim() || '??';
                const initials = displayLabel
                  .split(/\s+/)
                  .map((n) => n[0])
                  .filter(Boolean)
                  .join('')
                  .slice(0, 2);
                return (
                <li
                  key={player.id}
                  onClick={() => handlePlayerClick(player.id)}
                  className="flex cursor-pointer items-center justify-between p-4 transition-colors odd:bg-white even:bg-gray-50/50 hover:bg-black/[0.04] dark:odd:bg-gray-900 dark:even:bg-gray-800/30 dark:hover:bg-white/[0.06]"
                >
                  <div className="flex items-center gap-3">
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt=""
                        className={`size-12 rounded-full ring-2 ring-gray-200 dark:ring-gray-600 shrink-0 ${
                          isPhotoAvatar ? 'object-cover object-top' : 'object-contain bg-white/90 dark:bg-gray-800 p-1'
                        }`}
                      />
                    ) : (
                      <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 ring-2 ring-gray-200 dark:ring-gray-600">
                        {initials}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-[#111318] dark:text-white">{displayLabel}</p>
                      <LeagueBadge league={categoryToLeague(player.category)} className="mt-1" />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">Pos. {pending ? '—' : player.position}</p>
                    <p className="text-xs text-[#616f89] dark:text-gray-400">{uiPlayerPoints(player)} pts</p>
                  </div>
                </li>
              );
              })}
            </ul>
          )}
        </div>
      </div>
      </section>
    </main>
  );
};

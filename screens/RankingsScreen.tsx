import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { LEAGUES_RANKING, type LeagueNum, type RankingRow } from '../src/lib/mockData';
import { useTennisLiveData } from '../src/lib/tennis/useTennisLiveData';
import { LeagueBadge } from '../components/LeagueBadge';
import { resolvePlayerAvatarFallback, useSiteSettings } from '../src/lib/siteSettings';
import { isRankingRowPending, uiFormatPointsCell, uiFormatTournamentsPlayed } from '../src/lib/playerUiFormat';
import { resolvePlayerForPublicRanking } from '../src/lib/tennis/rankingPlayerResolve';
import { getDataSourceMode } from '../src/lib/data/tournamentRepository';

/** Bandera de nacionalidad: imagen (Argentina = arg.webp) o emoji. */
function getFlagImageUrl(filename: string): string {
  try {
    return new URL(`../img/${filename}`, import.meta.url).href;
  } catch {
    return '';
  }
}
const FLAG_IMAGE_BY_NATIONALITY: Record<string, string> = {
  Argentina: 'arg.webp',
};
const FLAG_EMOJI_BY_NATIONALITY: Record<string, string> = {
  Uruguay: '🇺🇾',
  Chile: '🇨🇱',
  Paraguay: '🇵🇾',
  Brasil: '🇧🇷',
  España: '🇪🇸',
  Suiza: '🇨🇭',
  Italia: '🇮🇹',
  Noruega: '🇳🇴',
  Croacia: '🇭🇷',
  Francia: '🇫🇷',
  'Reino Unido': '🇬🇧',
};
function getFlagDisplay(nationality: string | undefined): { image?: string; emoji?: string } {
  if (!nationality) return { emoji: '🏳️' };
  const image = FLAG_IMAGE_BY_NATIONALITY[nationality];
  if (image) return { image };
  return { emoji: FLAG_EMOJI_BY_NATIONALITY[nationality] ?? '🏳️' };
}

function getRankingRowDisplay(
  row: RankingRow,
  fallbackAvatar: string,
): { displayName: string; avatarSrc: string; avatarIsPhoto: boolean; initials: string } {
  const pending = isRankingRowPending(row);
  const rd = row.rankingDisplay;
  if (rd) {
    const hasPhoto = !pending && Boolean(rd.avatarUrl?.trim());
    return {
      displayName: rd.name,
      avatarSrc: hasPhoto ? rd.avatarUrl! : fallbackAvatar,
      avatarIsPhoto: hasPhoto,
      initials: rd.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2),
    };
  }
  const displayName = row.player.name;
  const fromBundled = !pending && row.player.profileImage ? getFlagImageUrl(row.player.profileImage) : '';
  const avatarSrc = fromBundled || fallbackAvatar;
  const avatarIsPhoto = Boolean(fromBundled);
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2);
  return { displayName, avatarSrc, avatarIsPhoto, initials };
}

interface RankingsScreenProps {
  setScreen: (screen: string) => void;
  setSelectedPlayerId?: (id: string | null) => void;
  openPlayerProfile?: (playerId: string) => void;
}

export const RankingsScreen: React.FC<RankingsScreenProps> = ({ setScreen, setSelectedPlayerId, openPlayerProfile }) => {
  const [leagueFilter, setLeagueFilter] = useState<LeagueNum>(1);
  const autoSelectedInitialLeague = useRef(false);
  const site = useSiteSettings();
  const fallbackAvatar = resolvePlayerAvatarFallback(site.branding);
  const { club, rankingsByLeague, rankingsPublicFetchDone } = useTennisLiveData();
  const apiRankingLoading = getDataSourceMode() === 'api' && !rankingsPublicFetchDone;

  const calculated = useMemo(
    () => rankingsByLeague.get(leagueFilter) ?? [],
    [rankingsByLeague, leagueFilter],
  );

  useEffect(() => {
    if (autoSelectedInitialLeague.current) return;
    if (apiRankingLoading) return;
    if ((rankingsByLeague.get(leagueFilter) ?? []).length > 0) {
      autoSelectedInitialLeague.current = true;
      return;
    }
    const firstWithRows = LEAGUES_RANKING.find((league) => (rankingsByLeague.get(league) ?? []).length > 0);
    if (firstWithRows != null) {
      autoSelectedInitialLeague.current = true;
      setLeagueFilter(firstWithRows);
    }
  }, [apiRankingLoading, rankingsByLeague, leagueFilter]);

  const rows = useMemo((): RankingRow[] => {
    return calculated.map((cr) => {
      const player = resolvePlayerForPublicRanking(cr, club.players);
      const age = player.birthDate
        ? new Date().getFullYear() - new Date(player.birthDate).getFullYear()
        : undefined;
      let avatarUrl = '';
      if (player.profileImage) {
        const rawImg = player.profileImage.trim();
        if (rawImg.startsWith('data:') || /^https?:\/\//i.test(rawImg)) {
          avatarUrl = rawImg;
        } else {
          try {
            avatarUrl = new URL(`../img/${rawImg}`, import.meta.url).href;
          } catch {
            avatarUrl = '';
          }
        }
      }
      return {
        position: cr.position,
        playerId: cr.playerId,
        player,
        points: cr.points,
        matchesPlayed: cr.matchesPlayedResults,
        wins: cr.wins,
        losses: cr.losses,
        rankingChange: cr.rankingPositionChange ?? 0,
        pointsChange: cr.pointsChange ?? 0,
        tournamentsPlayed: cr.tournamentsPlayed,
        leagueNum: cr.league,
        age,
        rankingDisplay: {
          name: player.name,
          avatarUrl,
          nationality: player.nationality,
        },
      };
    });
  }, [calculated, club.players]);

  const handleRowClick = (row: RankingRow) => {
    if (openPlayerProfile) {
      openPlayerProfile(row.playerId);
    } else {
      setSelectedPlayerId?.(row.playerId);
      setScreen('profile');
    }
  };

  return (
    <div className="flex flex-grow justify-center px-3 sm:px-4 md:px-10 lg:px-20 py-10 md:py-12">
      <div className="flex w-full min-w-0 max-w-[1024px] flex-col gap-10 md:gap-12">
        <section className="app-glass-panel p-5 shadow-sport-card dark:shadow-sport-card-dark sm:p-7 md:p-10">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#616f89] dark:text-gray-500">Clasificación</p>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight text-[#111318] dark:text-white">Rankings</h1>
              <p className="text-[#616f89] dark:text-[#9ca3af] text-base font-normal leading-relaxed max-w-2xl">
                Ranking por liga recalculado en vivo desde resultados: puntos por fase alcanzada en cada torneo (campeón, final, semis, cuartos, grupos). Sin datos guardados de clasificación: todo se deriva de los partidos.
              </p>
            </div>
            <div className="mb-8 overflow-visible border-b border-gray-300 pb-2 dark:border-gray-700 md:mb-10">
              <div className="flex min-h-[46px] max-md:flex-wrap flex-wrap items-end gap-4 overflow-visible pb-px">
                {LEAGUES_RANKING.map((tab) => {
                  const label = `Liga ${tab}`;
                  const isActive = leagueFilter === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setLeagueFilter(tab)}
                      className={`flex flex-col items-center justify-center border-b-[3px] border-t-0 border-x-0 border-solid pb-3 pt-2 min-w-[4.5rem] whitespace-nowrap transition-colors ${
                        isActive
                          ? 'border-b-primary text-[#111318] dark:text-white'
                          : 'border-b-transparent text-[#616f89] dark:text-[#9ca3af] hover:text-primary'
                      }`}
                    >
                      <span className="text-sm font-bold leading-normal">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="app-glass-panel mt-2 flex min-w-0 w-full flex-col overflow-hidden shadow-sport-card dark:shadow-sport-card-dark md:mt-0">
            {apiRankingLoading && rows.length === 0 ? (
              <div className="px-4 py-12 text-center text-[#616f89] dark:text-[#9ca3af] text-sm" role="status">
                Cargando ranking…
              </div>
            ) : rows.length === 0 ? (
              <div className="px-4 py-12 text-center text-[#616f89] dark:text-[#9ca3af] text-sm">
                Temporada aún no iniciada: todavía no hay resultados cargados para esta liga.
              </div>
            ) : null}
            {/* Mobile: position, photo, name, points only — no horizontal scroll */}
            <div className="flex w-full min-w-0 flex-col md:hidden">
              {rows.map((row, index) => {
                const { displayName, avatarSrc, avatarIsPhoto, initials } = getRankingRowDisplay(row, fallbackAvatar);
                const pending = isRankingRowPending(row);
                const isEven = index % 2 === 0;
                const flag = getFlagDisplay(row.player.nationality);
                return (
                  <div
                    key={row.playerId}
                    onClick={() => handleRowClick(row)}
                    className={`flex cursor-pointer items-center gap-3 overflow-visible border-b border-gray-200 px-4 py-3 transition-colors dark:border-gray-700 ${isEven ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'} hover:bg-black/[0.04] active:bg-black/[0.06] dark:hover:bg-white/[0.06] dark:active:bg-white/[0.08]`}
                  >
                    <span className="inline-flex w-10 shrink-0 items-center justify-center text-center text-base font-semibold tabular-nums text-[#616f89] dark:text-gray-400">
                      {pending ? (
                        '—'
                      ) : row.position <= 3 ? (
                        <span className={row.position === 1 ? 'text-amber-600 dark:text-amber-400' : row.position === 2 ? 'text-gray-600 dark:text-gray-400' : 'text-orange-600 dark:text-orange-400'}>
                          #{row.position}
                        </span>
                      ) : (
                        `#${row.position}`
                      )}
                    </span>
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt=""
                        className={`size-12 rounded-full shrink-0 ring-2 ring-gray-200 dark:ring-gray-600 ${
                          avatarIsPhoto ? 'object-cover object-top' : 'object-contain bg-white/90 dark:bg-gray-800 p-1'
                        }`}
                      />
                    ) : (
                      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-bold text-primary ring-2 ring-gray-200 dark:ring-gray-600">
                        {initials}
                      </div>
                    )}
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="shrink-0 text-lg leading-none" title={row.player.nationality}>
                        {flag.image ? (
                          <img
                            src={getFlagImageUrl(flag.image)}
                            alt=""
                            className="inline-block h-5 w-7 rounded border border-gray-200 object-cover dark:border-gray-600"
                          />
                        ) : (
                          <span aria-hidden>{flag.emoji}</span>
                        )}
                      </span>
                      <span className="min-w-0 truncate text-base font-bold text-[#111318] dark:text-white">{displayName}</span>
                    </div>
                    <span className="font-bold text-[#111318] dark:text-white text-base shrink-0 tabular-nums">
                      {uiFormatPointsCell(row.points, pending)} pts
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Desktop: tabla a ancho completo del recuadro; scroll solo si hace falta */}
            <div className="hidden min-w-0 w-full md:block md:overflow-x-auto">
              <table className="app-data-table w-full min-w-0 table-fixed border-collapse text-left lg:min-w-[720px]">
                <colgroup>
                  <col className="w-[52px]" />
                  <col className="w-[76px]" />
                  <col />
                  <col className="w-[52px]" />
                  <col className="w-[80px]" />
                  <col className="w-[88px]" />
                  <col className="w-[72px]" />
                  <col className="hidden w-[88px] lg:table-column" />
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/80">
                    <th className="px-2 py-4 text-center text-xs font-bold uppercase tracking-wider text-[#616f89] dark:text-[#9ca3af]">#</th>
                    <th className="px-2 py-4 text-center text-xs font-bold uppercase tracking-wider text-[#616f89] dark:text-[#9ca3af]">Cambio</th>
                    <th className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#616f89] dark:text-[#9ca3af]">Jugador</th>
                    <th className="px-2 py-4 text-center text-xs font-bold uppercase tracking-wider text-[#616f89] dark:text-[#9ca3af]">Edad</th>
                    <th className="px-3 py-4 text-right text-xs font-bold uppercase tracking-wider text-[#616f89] dark:text-[#9ca3af]">Puntos</th>
                    <th className="px-2 py-4 text-center text-xs font-bold uppercase tracking-wider text-[#616f89] dark:text-[#9ca3af]">Δ pts</th>
                    <th className="px-2 py-4 text-center text-xs font-bold uppercase tracking-wider text-[#616f89] dark:text-[#9ca3af]">Tor.</th>
                    <th className="hidden px-2 py-4 text-center text-xs font-bold uppercase tracking-wider text-[#616f89] dark:text-[#9ca3af] lg:table-cell">Liga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {rows.map((row, index) => {
                    const { displayName, avatarSrc, avatarIsPhoto, initials } = getRankingRowDisplay(row, fallbackAvatar);
                    const pending = isRankingRowPending(row);
                    const rankChange = row.rankingChange ?? 0;
                    const pointsChange = row.pointsChange ?? 0;
                    const leagueNum = row.leagueNum ?? 1;
                    const isEven = index % 2 === 0;
                    const flag = getFlagDisplay(row.player.nationality);
                    return (
                      <tr
                        key={row.playerId}
                        onClick={() => handleRowClick(row)}
                        className={`group cursor-pointer transition-colors ${isEven ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'} hover:bg-black/[0.04] dark:hover:bg-white/[0.06]`}
                      >
                        <td className="px-2 py-3 text-center align-middle">
                          <div className="mx-auto flex h-10 w-10 items-center justify-center">
                            {pending ? (
                              <span className="text-base font-medium tabular-nums text-[#616f89] dark:text-[#9ca3af]">—</span>
                            ) : row.position <= 3 ? (
                              <div
                                className={`flex size-10 shrink-0 items-center justify-center rounded-full text-base font-bold ${
                                  row.position === 1
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                    : row.position === 2
                                      ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                      : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                                }`}
                              >
                                {row.position}
                              </div>
                            ) : (
                              <span className="text-base font-medium tabular-nums text-[#616f89] dark:text-[#9ca3af]">{row.position}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center align-middle">
                          <div className="flex min-h-[28px] items-center justify-center">
                            {pending ? (
                              <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                            ) : rankChange > 0 ? (
                              <span className="inline-flex items-center justify-center gap-0.5 text-sm font-medium text-green-600 dark:text-green-400 tabular-nums">
                                <ChevronUp className="size-5 shrink-0" aria-hidden />
                                {rankChange}
                              </span>
                            ) : rankChange < 0 ? (
                              <span className="inline-flex items-center justify-center gap-0.5 text-sm font-medium text-red-500 dark:text-red-400 tabular-nums">
                                <ChevronDown className="size-5 shrink-0" aria-hidden />
                                {rankChange}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                            )}
                          </div>
                        </td>
                        <td className="min-w-0 px-3 py-3 align-middle">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="shrink-0" title={row.player.nationality}>
                              {flag.image ? (
                                <img
                                  src={getFlagImageUrl(flag.image)}
                                  alt=""
                                  className="inline-block h-6 w-8 rounded border border-gray-200 object-cover dark:border-gray-600"
                                />
                              ) : (
                                <span className="text-xl leading-none" aria-hidden>
                                  {flag.emoji}
                                </span>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center justify-center">
                              {avatarSrc ? (
                                <img
                                  src={avatarSrc}
                                  alt=""
                                  className={`size-12 shrink-0 rounded-full ring-2 ring-gray-200 dark:ring-gray-600 sm:size-14 ${
                                    avatarIsPhoto ? 'object-cover object-top' : 'object-contain bg-white/90 p-1 dark:bg-gray-800'
                                  }`}
                                />
                              ) : (
                                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary ring-2 ring-gray-200 dark:ring-gray-600 sm:size-14">
                                  {initials}
                                </div>
                              )}
                            </div>
                            <p className="min-w-0 truncate text-base font-bold text-[#111318] dark:text-white" title={displayName}>
                              {displayName}
                            </p>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center align-middle text-base tabular-nums text-[#616f89] dark:text-[#9ca3af]">
                          {row.age != null ? row.age : '—'}
                        </td>
                        <td className="px-3 py-3 text-right align-middle">
                          <span className="text-base font-bold tabular-nums text-[#111318] dark:text-white">
                            {uiFormatPointsCell(row.points, pending)}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-center align-middle">
                          <div className="flex min-h-[24px] items-center justify-center">
                            {pending ? (
                              <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                            ) : pointsChange > 0 ? (
                              <span className="text-sm font-medium text-green-600 dark:text-green-400 tabular-nums">+{pointsChange}</span>
                            ) : pointsChange < 0 ? (
                              <span className="text-sm font-medium text-red-500 dark:text-red-400 tabular-nums">{pointsChange}</span>
                            ) : (
                              <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center align-middle text-base tabular-nums text-[#616f89] dark:text-[#9ca3af]">
                          {uiFormatTournamentsPlayed(row.tournamentsPlayed ?? row.matchesPlayed, pending)}
                        </td>
                        <td className="hidden px-2 py-3 align-middle lg:table-cell">
                          <div className="flex justify-center">
                            <LeagueBadge league={leagueNum} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
              <p className="text-sm text-[#616f89] dark:text-[#9ca3af]">
                {rows.length === 0 ? (
                  <>0 jugadores</>
                ) : (
                  <>
                    Mostrando <span className="font-medium text-[#111318] dark:text-white">1-{rows.length}</span> de{' '}
                    <span className="font-medium text-[#111318] dark:text-white">{rows.length}</span> jugadores
                  </>
                )}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

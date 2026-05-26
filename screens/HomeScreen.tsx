import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Calendar, CalendarCheck, Trophy, Star, Flame, Circle, Newspaper, ChevronRight } from 'lucide-react';
import {
  getUpcomingTournamentsForHome,
  CATEGORIES,
  isTournamentCurrent,
  getTournamentIdForImportantMatchCategory,
  categoryToLeague,
  type Tournament,
  type LeagueNum,
  type CategoryKey,
} from '../src/lib/mockData';
import { useClubData } from '../src/lib/clubDataStore';
import { useTennisLiveData } from '../src/lib/tennis/useTennisLiveData';
import {
  MAX_IMPORTANT_MATCHES,
  listImportantMatchesFromSchedules,
} from '../src/lib/tennis/publicImportantMatchesFromSchedule';
import { useMatchSchedules, mergeMatchScheduleRows } from '../src/lib/tennis/matchScheduleStore';
import { scheduleEntryFromApiRow } from '../src/data/services/contracts/matchSchedulePort';
import { getDataSourceMode } from '../src/lib/data/tournamentRepository';
import { getPublicScheduleByTournamentId } from '../src/lib/api/apiClient';
import type { MatchInput } from '../src/types/tennisResults';
import { matchInputDedupeKey } from '../src/lib/tennis/matchDedupe';
import { uiFormatPointsCell } from '../src/lib/playerUiFormat';
import { TOURNAMENT_CARD_SHADOW_NEUTRAL } from '../src/lib/leagueColors';
import { whatsAppUrl, whatsAppMessages } from '../src/lib/whatsapp';
import { resolvePlayerForPublicRanking } from '../src/lib/tennis/rankingPlayerResolve';
import { UpcomingTournamentModal } from '../components/UpcomingTournamentModal';
import { useNewsFeedSorted } from '../src/lib/useNewsFeed';
import { formatNewsPublishedDate } from '../src/lib/newsData';
import { resolveNewsImageUrl } from '../src/lib/newsImageResolve';
import { orderedPublicLeagues, useSiteSettings } from '../src/lib/siteSettings';

/** Bloques del inicio: borde fino + sombra deportiva (alineada con el resto del sitio). */
const HOME_PANEL_SURFACE =
  'border border-gray-200/90 dark:border-gray-600/70 shadow-sport-card dark:shadow-sport-card-dark';

/** Icon + color by match type for Partidos importantes */
function getMatchTypeIcon(
  label: string,
  mainReason?: string | undefined,
): { Icon: React.ComponentType<{ className?: string; size?: number }>; iconClass: string } {
  const tag = `${label} ${mainReason ?? ''}`.toLowerCase();
  if (tag.includes('semifinal') || /\bsemis\b/.test(tag)) return { Icon: Star, iconClass: 'text-blue-400' };
  if (tag.includes('final') && !tag.includes('cuartos') && !tag.includes('semifinal')) return { Icon: Trophy, iconClass: 'text-yellow-400' };
  if (tag.includes('cuartos')) return { Icon: Circle, iconClass: 'text-green-400' };
  if (tag.includes('destacado')) return { Icon: Flame, iconClass: 'text-orange-400' };
  return { Icon: Circle, iconClass: 'text-gray-400' };
}

/** Final de copa (no semifinal ni cuartos). */
function isFinalMatch(label: string): boolean {
  const lower = label.toLowerCase();
  if (lower.includes('semi')) return false;
  if (lower.includes('cuartos')) return false;
  return lower.includes('final');
}

function isDestacadoMatch(label: string): boolean {
  return label.toLowerCase().includes('partido destacado') || label.toLowerCase().includes('destacado del fin');
}

/** Map category string to league number for badge */
function categoryToLeagueNum(category: string): LeagueNum {
  const map: Record<string, LeagueNum> = {
    Primera: 1, Segunda: 2, Tercera: 3, Cuarta: 4, 'Quinta A': 5, 'Quinta B': 6,
  };
  return map[category] ?? 1;
}

/** Compact league badge: rounded-md px-2 py-1 text-xs font-semibold + league colors */
const LEAGUE_BADGE_CLASSES: Record<LeagueNum, string> = {
  1: 'rounded-md px-2 py-1 text-xs font-semibold bg-red-50 text-red-600 border border-red-500 dark:bg-red-900/30 dark:text-red-300 dark:border-red-500',
  2: 'rounded-md px-2 py-1 text-xs font-semibold bg-orange-50 text-orange-600 border border-orange-400 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-400',
  3: 'rounded-md px-2 py-1 text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-400 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-400',
  4: 'rounded-md px-2 py-1 text-xs font-semibold bg-green-50 text-green-600 border border-green-400 dark:bg-green-900/30 dark:text-green-300 dark:border-green-400',
  5: 'rounded-md px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-400 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500',
  6: 'rounded-md px-2 py-1 text-xs font-semibold bg-violet-100 text-violet-700 border border-violet-400 dark:bg-violet-900/35 dark:text-violet-200 dark:border-violet-600',
};

/** Próximos partidos: solo borde de color; el fondo es liso (blanco) abajo. */
const CARD_BORDER_FINAL = 'border-2 border-yellow-400 dark:border-yellow-500';

const CARD_BORDER_DESTACADO = 'border-2 border-orange-400 dark:border-orange-500';

const LEAGUE_CARD_BORDER: Record<LeagueNum, string> = {
  1: 'border-2 border-red-300 dark:border-red-500/55',
  2: 'border-2 border-orange-300 dark:border-orange-400/60',
  3: 'border-2 border-blue-300 dark:border-blue-400/60',
  4: 'border-2 border-green-300 dark:border-green-400/60',
  5: 'border-2 border-gray-300 dark:border-gray-500/55',
  6: 'border-2 border-violet-300 dark:border-violet-500/55',
};

function importantMatchCardClass(isDestacado: boolean, isFinal: boolean, leagueNum: LeagueNum): string {
  if (isDestacado) return CARD_BORDER_DESTACADO;
  if (isFinal) return CARD_BORDER_FINAL;
  return LEAGUE_CARD_BORDER[leagueNum];
}

/** Base tournament name for display (e.g. "Novak Djokovic - Liga 1" → "Novak Djokovic") */
function getCurrentTournamentDisplayName(name: string): string {
  const match = name.match(/^(.+?)\s*-\s*Liga\s*\d+$/i);
  return match ? match[1].trim() : name;
}

const heroBgUrl = (() => {
  try {
    return new URL('../img/fondo.webp', import.meta.url).href;
  } catch {
    return '';
  }
})();

const pelotaImg = (() => {
  try {
    return new URL('../img/pelota.webp', import.meta.url).href;
  } catch {
    return '';
  }
})();

function getTournamentCardHeaderImageUrl(coverImage?: string | null, dataUrlFallback?: string): string {
  const cov = coverImage?.trim();
  if (cov) {
    try {
      return new URL(`../img/${cov}`, import.meta.url).href;
    } catch {
      /* seguir */
    }
  }
  const fb = dataUrlFallback?.trim();
  if (fb) return fb;
  try {
    return new URL(`../img/nadal.webp`, import.meta.url).href;
  } catch {
    return '';
  }
}

const HOME_UPCOMING_TOURNAMENT_ORDER = ['t-nadal', 't-federer', 't-masters'];

const DATE_LABEL_OVERRIDES: Record<string, { start?: string; end?: string }> = {
  't-nadal': { start: '22 mayo 2026', end: '9 agosto 2026' },
  't-federer': { start: 'A confirmar', end: 'A confirmar' },
  't-masters': { start: 'A confirmar', end: 'A confirmar' },
};

function formatTournamentDateLabel(tournament: Tournament, kind: 'start' | 'end'): string {
  const override = DATE_LABEL_OVERRIDES[tournament.id]?.[kind];
  if (override) return override;
  const value = kind === 'start' ? tournament.startDate : tournament.endDate;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'A confirmar';
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function upcomingBadgeLabel(tournament: Tournament): string {
  const start = new Date(`${tournament.startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 'Próximamente';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilStart = Math.ceil((start.getTime() - today.getTime()) / 86_400_000);
  return daysUntilStart >= 0 && daysUntilStart <= 7 ? 'Por iniciar' : 'Próximamente';
}

function isPublicWalkoverScore(score: string): boolean {
  return /^[AB]$/i.test(score.trim()) || /\bW\.?O\.?\b/i.test(score);
}

function publicApiMatchToResult(row: Record<string, unknown>): MatchInput | null {
  const tournamentId = typeof row.tournamentId === 'string' ? row.tournamentId.trim() : '';
  const stage = typeof row.stage === 'string' ? row.stage.trim().toLowerCase() : '';
  if (!tournamentId || stage !== 'group') return null;
  const player1 = row.player1 && typeof row.player1 === 'object' ? (row.player1 as Record<string, unknown>) : null;
  const player2 = row.player2 && typeof row.player2 === 'object' ? (row.player2 as Record<string, unknown>) : null;
  const playerA = typeof player1?.name === 'string' ? player1.name.trim() : '';
  const playerB = typeof player2?.name === 'string' ? player2.name.trim() : '';
  if (!playerA || !playerB) return null;
  const roundLabel = typeof row.roundLabel === 'string' ? row.roundLabel : '';
  const group = /grupo\s+([A-Za-z0-9]+)/i.exec(roundLabel)?.[1]?.toUpperCase();
  const roundText = /fecha\s+(\d+)/i.exec(roundLabel)?.[1];
  const score = typeof row.score === 'string' ? row.score.trim() : '';
  const completed = row.completed === true || Boolean(score);
  if (!completed) return null;
  return {
    tournamentId,
    group,
    round: roundText ? Number(roundText) : 0,
    playerA,
    playerB,
    score,
    status: isPublicWalkoverScore(score)
      ? 'walkover'
      : /\bRET\.?\b|\bABANDONO\b/i.test(score)
        ? 'retired'
        : 'played',
  };
}

interface HomeScreenProps {
  setScreen: (screen: string) => void;
  setSelectedTournamentId?: (id: string | null) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ setScreen, setSelectedTournamentId }) => {
  const [inscriptionModalTournament, setInscriptionModalTournament] = useState<Tournament | null>(null);
  const [publicApiResults, setPublicApiResults] = useState<MatchInput[]>([]);
  const club = useClubData();
  const site = useSiteSettings();
  const schedules = useMatchSchedules();
  const { rankingsByLeague, results } = useTennisLiveData();

  useEffect(() => {
    if (getDataSourceMode() !== 'api') return;
    let cancelled = false;
    const upcoming = club.tournaments.filter((t) => t.status === 'upcoming');
    void (async () => {
      await Promise.all(
        upcoming.map(async (t) => {
          try {
            const data = await getPublicScheduleByTournamentId(t.id);
            if (cancelled || !data || typeof data !== 'object') return;
            const rawMatches = (data as { matches?: unknown }).matches;
            if (Array.isArray(rawMatches)) {
              setPublicApiResults((prev) => {
                const byKey = new Map(prev.map((m) => [matchInputDedupeKey(m), m] as const));
                for (const item of rawMatches) {
                  if (!item || typeof item !== 'object') continue;
                  const mapped = publicApiMatchToResult(item as Record<string, unknown>);
                  if (mapped) byKey.set(matchInputDedupeKey(mapped), mapped);
                }
                return Array.from(byKey.values());
              });
            }

            const raw = (data as { schedules?: unknown }).schedules;
            if (!Array.isArray(raw)) return;
            const rows = raw
              .map((r) => scheduleEntryFromApiRow(r as Record<string, unknown>))
              .filter((e): e is NonNullable<typeof e> => e != null);
            mergeMatchScheduleRows(rows);
          } catch {
            /* torneo no publicado en API */
          }
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [club.tournaments]);
  const latestNews = useNewsFeedSorted().slice(0, 3);
  const publicLeagues = useMemo(() => orderedPublicLeagues(site), [site]);
  const heroBgEffective = site.branding.heroBackgroundDataUrl.trim() || heroBgUrl;
  const tourCoverFallback = site.branding.tournamentCoverFallbackDataUrl.trim();

  const homeRankingPreview = useMemo(() => {
    const cats = CATEGORIES.filter((c) => publicLeagues.includes(categoryToLeague(c as CategoryKey)));
    const slice = (cats.length ? cats : CATEGORIES).slice(0, 3);
    return slice.map((cat) => {
      const league = categoryToLeague(cat as CategoryKey);
      const rows = rankingsByLeague.get(league) ?? [];
      return {
        cat,
        rows: rows.slice(0, 2).map((cr) => {
          const player = resolvePlayerForPublicRanking(cr, club.players);
          return {
            playerId: cr.playerId,
            name: player.name,
            points: cr.points,
          };
        }),
      };
    });
  }, [rankingsByLeague, club.players, publicLeagues]);

  const effectiveResults = useMemo(() => {
    if (publicApiResults.length === 0) return results;
    const byKey = new Map(results.map((m) => [matchInputDedupeKey(m), m] as const));
    for (const m of publicApiResults) byKey.set(matchInputDedupeKey(m), m);
    return Array.from(byKey.values());
  }, [results, publicApiResults]);

  const allUpcomingMatchesForHome = useMemo(
    () =>
      listImportantMatchesFromSchedules(schedules, club.tournaments, club.players, effectiveResults, {
        rankingsByLeague,
      }),
    [schedules, club.tournaments, club.players, effectiveResults, rankingsByLeague],
  );

  const importantMatchesSidebar = useMemo(
    () => allUpcomingMatchesForHome.slice(0, MAX_IMPORTANT_MATCHES),
    [allUpcomingMatchesForHome],
  );
  const hasMoreImportantMatches = allUpcomingMatchesForHome.length > MAX_IMPORTANT_MATCHES;

  const currentTournament = useMemo(() => {
    const upcoming = club.tournaments.filter((t) => t.status === 'upcoming');
    return upcoming.find(isTournamentCurrent) ?? null;
  }, [club.tournaments]);

  const upcomingTournamentsCards = useMemo(() => {
    const announced = HOME_UPCOMING_TOURNAMENT_ORDER
      .map((id) => club.tournaments.find((t) => t.id === id))
      .filter((t): t is Tournament => Boolean(t));
    if (announced.length > 0) return announced;

    const fromHome = getUpcomingTournamentsForHome();
    if (fromHome.length > 0) return fromHome.slice(0, 3);
    return club.tournaments
      .filter((t) => t.status === 'upcoming')
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 3);
  }, [club.tournaments]);

  const handleModalVerInfo = (tournamentId: string) => {
    setSelectedTournamentId?.(tournamentId);
    setScreen('tournament_detail');
  };

  return (
    <div className="layout-container flex grow flex-col">
      <div className="mx-auto w-full max-w-[1440px] px-4 md:px-10 lg:px-20 py-10 md:py-12">
        <div className="flex flex-col gap-10 lg:grid lg:grid-cols-12 lg:gap-12">
          <div className="flex flex-col gap-12 max-lg:order-1 lg:order-none lg:col-span-8 xl:col-span-9">
            {/* Current tournament hero */}
            <section className={`rounded-xl overflow-hidden transition duration-200 ${HOME_PANEL_SURFACE}`}>
              <div
                className="flex min-h-[400px] md:min-h-[480px] flex-col gap-6 bg-cover bg-center bg-no-repeat rounded-xl overflow-hidden relative"
                style={{
                  backgroundImage: heroBgEffective
                    ? `linear-gradient(105deg, rgba(0, 0, 0, 0.82) 0%, rgba(13, 59, 138, 0.55) 42%, rgba(13, 59, 138, 0.2) 72%, rgba(0, 0, 0, 0.25) 100%), linear-gradient(to top, rgba(0, 0, 0, 0.75) 0%, transparent 55%), url("${heroBgEffective}")`
                    : 'linear-gradient(135deg, #0d3b8a 0%, #1a4a9e 60%, #0d3b8a 100%)',
                }}
              >
                <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-12 pb-12 md:pb-14">
                  <div className="relative z-10 flex flex-col gap-4 max-w-2xl">
                    {currentTournament ? (
                      <>
                        <span className="inline-flex w-fit items-center gap-1.5 px-3 py-1.5 rounded-md bg-orange-500 text-white text-xs font-bold uppercase tracking-wider shadow-sm">
                          En curso
                        </span>
                        <h1 className="font-display text-white text-3xl md:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight drop-shadow-md">
                          Torneo {getCurrentTournamentDisplayName(currentTournament.name)}
                        </h1>
                        <p className="text-gray-200/95 text-sm md:text-base font-normal leading-relaxed max-w-xl">
                          El torneo se está disputando en distintas ligas.
                          <br />
                          Consultá tu liga para ver partidos y resultados.
                        </p>
                        <button
                          onClick={() => setScreen('directory')}
                          className="mt-1 w-fit flex items-center justify-center rounded-md h-11 px-7 bg-white text-primary hover:bg-gray-100 font-bold text-sm uppercase tracking-wide transition-colors shadow-sport-card dark:shadow-sport-card-dark"
                        >
                          Ver torneos
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">GREEK TENNIS</p>
                        <h1 className="font-display text-white text-3xl md:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight drop-shadow-md">
                          Torneos del club
                        </h1>
                        <p className="text-gray-200/95 text-sm md:text-base">Consultá el calendario de torneos.</p>
                        <button
                          onClick={() => setScreen('directory')}
                          className="mt-1 w-fit flex items-center justify-center rounded-md h-11 px-7 bg-white text-primary hover:bg-gray-100 font-bold text-sm uppercase tracking-wide transition-colors shadow-sport-card dark:shadow-sport-card-dark"
                        >
                          Ver torneos
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Últimas noticias */}
            {site.home.showLatestNews && latestNews.length > 0 ? (
              <section className={`app-glass-panel p-8 md:p-10 ${HOME_PANEL_SURFACE}`}>
                <div className="flex flex-wrap items-end justify-between gap-4 border-b border-primary/35 dark:border-primary/40 pb-4 mb-6">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#616f89] dark:text-gray-500 mb-1 flex items-center gap-2">
                      <Newspaper className="w-4 h-4 text-primary" aria-hidden />
                      Novedades
                    </p>
                    <h2 className="text-2xl md:text-3xl font-bold text-[#111318] dark:text-white tracking-tight">Últimas noticias</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScreen('news')}
                    className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-hover uppercase tracking-wide"
                  >
                    Ver todas
                    <ChevronRight className="w-4 h-4" aria-hidden />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {latestNews.map((item) => {
                    const imgUrl = resolveNewsImageUrl(item.image);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setScreen('news')}
                        className="app-glass-panel app-interactive-card flex min-h-[11rem] flex-col overflow-hidden text-left shadow-sport-card transition-colors dark:shadow-sport-card-dark"
                      >
                        {imgUrl ? (
                          <div className="aspect-[2/1] w-full overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                            <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                          </div>
                        ) : null}
                        <div className="p-4 flex flex-col gap-2 flex-1">
                          <time className="text-[11px] font-medium text-[#616f89] dark:text-gray-500" dateTime={item.publishedAt}>
                            {formatNewsPublishedDate(item.publishedAt)}
                          </time>
                          <h3 className="text-sm font-bold text-[#111318] dark:text-white leading-snug line-clamp-2">{item.title}</h3>
                          <p className="text-xs text-[#616f89] dark:text-gray-400 line-clamp-2 leading-relaxed">{item.excerpt}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {/* Próximos torneos — abiertos a todas las ligas */}
            {site.home.showUpcomingTournaments ? (
            <section className={`app-glass-panel mb-2 p-8 md:p-10 ${HOME_PANEL_SURFACE}`}>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#616f89] dark:text-gray-500 mb-1">Calendario</p>
              <h2 className="text-2xl md:text-3xl font-bold text-[#111318] dark:text-white tracking-tight border-b border-primary/35 dark:border-primary/40 pb-4 mb-8">Próximos torneos</h2>
              {upcomingTournamentsCards.length === 0 ? (
                <p className="text-sm text-[#616f89] dark:text-gray-400">
                  Cuando el club publique torneos con fecha de inicio, aparecerán aquí automáticamente.
                </p>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
                {upcomingTournamentsCards.map((t) => {
                  const headerImg = getTournamentCardHeaderImageUrl(t.coverImage, tourCoverFallback);
                  return (
                  <div
                    key={t.id}
                    className={`app-glass-panel flex flex-col overflow-hidden ${TOURNAMENT_CARD_SHADOW_NEUTRAL}`}
                  >
                    {/* Cabecera: imagen difuminada + overlay oscuro (solo hasta el título) */}
                    <div className="relative min-h-[132px] flex flex-col justify-end">
                      {headerImg ? (
                        <>
                          <div
                            aria-hidden
                            className="absolute inset-0 bg-cover bg-top"
                            style={{ backgroundImage: `url("${headerImg}")` }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/35 to-slate-950/10" />
                        </>
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-slate-900" />
                      )}
                      <div className="relative z-10 p-6 pb-4 flex flex-col gap-2">
                        <h3 className="text-blue-400 font-bold text-lg leading-tight drop-shadow-sm tracking-tight dark:text-blue-300">
                          {t.name}
                        </h3>
                        <span className="inline-flex w-fit items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/18 text-white border border-white/25 backdrop-blur-sm shadow-sm">
                          {upcomingBadgeLabel(t)}
                        </span>
                      </div>
                    </div>
                    <div className="p-6 flex flex-col gap-4 flex-1 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-[#616f89] dark:text-gray-400 flex items-center gap-1">
                      <Calendar className="w-4 h-4 shrink-0" />
                      Inicio: {formatTournamentDateLabel(t, 'start')}
                    </p>
                    <p className="text-sm text-[#616f89] dark:text-gray-400 flex items-center gap-1">
                      <CalendarCheck className="w-4 h-4 shrink-0" />
                      Fin: {formatTournamentDateLabel(t, 'end')}
                    </p>
                    <div>
                      <p className="text-xs font-semibold text-[#616f89] dark:text-gray-400 uppercase tracking-wider mb-1.5">Categorías</p>
                      <div className="flex flex-wrap gap-1.5">
                        {publicLeagues.map((n) => (
                          <span key={n} className="inline-flex px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                            {site.leagues[n]?.visibleName?.trim() || `Liga ${n}`}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-auto pt-3 flex gap-3">
                      <button
                        onClick={() => {
                          setSelectedTournamentId?.(t.id);
                          setScreen('tournament_detail');
                        }}
                        className={`flex items-center justify-center rounded-md h-11 border border-gray-300 dark:border-gray-600 text-[#111318] dark:text-white text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${site.home.showEnrollmentButton ? 'flex-1' : 'w-full'}`}
                      >
                        Ver torneo
                      </button>
                      {site.home.showEnrollmentButton ? (
                        <button
                          type="button"
                          onClick={() => setInscriptionModalTournament(t)}
                          className="flex-1 flex items-center justify-center rounded-md h-11 bg-primary hover:bg-primary-hover text-white text-sm font-bold transition-colors"
                        >
                          Inscribirse
                        </button>
                      ) : null}
                    </div>
                    </div>
                  </div>
                  );
                })}
              </div>
              )}
            </section>
            ) : null}
          </div>

          {/* Sidebar: Rankings + contacto + partidos importantes (compacto) */}
          <div className="flex flex-col gap-6 max-lg:order-2 lg:order-none lg:col-span-4 xl:col-span-3">
            {site.home.showRankings ? (
            <section className="order-3 lg:order-none app-glass-panel p-6 shadow-sport-card dark:shadow-sport-card-dark md:p-7">
              {/* Rankings por categoría */}
              <div className={`app-glass-panel p-6 shadow-sm`}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#616f89] dark:text-gray-500">Posiciones</p>
                  <h3 className="text-[#111318] dark:text-white text-lg font-bold tracking-tight">Rankings</h3>
                </div>
                <button onClick={() => setScreen('rankings')} className="text-primary text-xs font-bold uppercase tracking-wide hover:underline">
                  Ver todos
                </button>
              </div>
              <div className="space-y-4">
                {homeRankingPreview.map(({ cat, rows }) => (
                  <div key={cat}>
                    <p className="text-xs font-bold text-[#616f89] dark:text-gray-400 uppercase mb-1">{cat}</p>
                    {rows.map((r) => (
                      <div
                        key={r.playerId}
                        className="-mx-1 flex cursor-pointer items-center justify-between rounded px-1 py-1.5 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                        onClick={() => setScreen('rankings')}
                      >
                        <span className="text-sm font-medium text-[#111318] dark:text-white">{r.name}</span>
                        <span className="text-xs font-bold text-[#616f89] dark:text-gray-400">
                          {uiFormatPointsCell(r.points, false)} pts
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            </section>
            ) : null}

            {/* Más información sobre el club */}
            {site.home.showSideContact ? (
            <div
              className={`order-1 lg:order-none bg-gradient-to-br from-primary to-primary-hover rounded-xl p-8 md:p-9 text-center text-white border border-white/10 flex flex-col gap-5 shadow-sport-card dark:shadow-sport-card-dark`}
            >
              <div className="flex justify-center">
                {pelotaImg && (
                  <img src={pelotaImg} alt="" className="w-12 h-12 object-contain" width={48} height={48} aria-hidden />
                )}
              </div>
              <h3 className="text-xl font-bold leading-tight tracking-tight">¿Querés más información sobre nosotros?</h3>
              <p className="text-sm text-blue-100/95 leading-relaxed">
                Escribinos por WhatsApp y te contamos sobre el club, torneos y actividades.
              </p>
              <a
                href={whatsAppUrl(whatsAppMessages.moreInfoAboutUs(), site.club.whatsappDigits)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-md h-11 bg-white/20 hover:bg-white/30 text-white text-sm font-bold uppercase tracking-wide transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                Contactar
              </a>
            </div>
            ) : null}

            {/* Partidos importantes — columna derecha, compacto */}
            {site.home.showImportantMatches ? (
            <section className={`order-2 lg:order-none app-glass-panel p-5 md:p-6 ${HOME_PANEL_SURFACE}`}>
              <div className="mb-4 border-b border-primary/35 pb-3 dark:border-primary/40">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#616f89] dark:text-gray-500">Agenda</p>
                <h2 className="mt-0.5 text-lg font-bold tracking-tight text-[#111318] dark:text-white md:text-xl">
                  Partidos importantes
                </h2>
              </div>
              {importantMatchesSidebar.length === 0 ? (
                <p className="text-sm text-[#616f89] dark:text-gray-400">No hay partidos destacados próximos.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {importantMatchesSidebar.map((m) => {
                    const { Icon, iconClass } = getMatchTypeIcon(m.label, m.mainReason);
                    const isFinal = isFinalMatch(m.label);
                    const isDestacado = isDestacadoMatch(m.label);
                    const leagueNum = categoryToLeagueNum(m.category);
                    const dateDisplay = m.date ?? m.dateTime;
                    const timeDisplay = m.time ? ` · ${m.time}` : '';
                    const targetTournamentId = m.tournamentId ?? getTournamentIdForImportantMatchCategory(m.category);
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          disabled={!targetTournamentId}
                          aria-label={
                            targetTournamentId
                              ? `Abrir torneo de la liga ${leagueNum}: ${m.label}`
                              : undefined
                          }
                          onClick={() => {
                            if (!targetTournamentId) return;
                            setSelectedTournamentId?.(targetTournamentId);
                            setScreen('tournament_detail');
                          }}
                          className={`app-interactive-card flex w-full flex-col gap-2 rounded-lg p-3.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-sport-card-dark ${importantMatchCardClass(isDestacado, isFinal, leagueNum)}`}
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`inline-flex shrink-0 ${iconClass}`}>
                              <Icon className="size-4" aria-hidden />
                            </span>
                            <span className="min-w-0 flex-1 text-xs font-bold leading-snug text-[#111318] dark:text-white sm:text-sm">
                              {m.label}
                            </span>
                            <span className={`shrink-0 scale-90 origin-right ${LEAGUE_BADGE_CLASSES[leagueNum]}`}>
                              Liga {leagueNum}
                            </span>
                            {isDestacado ? (
                              <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-orange-500/20 text-orange-600 dark:text-orange-300">
                                Dest.
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs font-medium leading-snug text-[#616f89] dark:text-gray-300 sm:text-sm">
                            {m.playerA} <span className="text-[#616f89]/80">vs</span> {m.playerB}
                          </p>
                          {m.mainReason ? (
                            <span className="inline-flex max-w-full items-center rounded-md border border-primary/45 bg-primary/[0.09] px-2 py-0.5 text-[10px] font-bold uppercase leading-tight tracking-wide text-primary dark:border-primary/50 dark:bg-primary/15 dark:text-primary/95">
                              {m.mainReason}
                            </span>
                          ) : null}
                          {m.reasonLabels && m.reasonLabels.length > 1 ? (
                            <p className="text-[9px] leading-snug text-[#616f89]/90 line-clamp-2 dark:text-gray-500">
                              {m.reasonLabels.slice(1, 4).join(' · ')}
                            </p>
                          ) : null}
                          <p className="text-[11px] font-medium tabular-nums text-[#616f89] dark:text-gray-400">
                            {dateDisplay}
                            {timeDisplay}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {hasMoreImportantMatches ? (
                <button
                  type="button"
                  onClick={() => setScreen('directory')}
                  className="mt-4 w-full rounded-md border border-gray-200/90 py-2.5 text-center text-xs font-bold uppercase tracking-wide text-primary transition-colors hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800/80"
                >
                  Ver agenda completa
                </button>
              ) : null}
            </section>
            ) : null}
          </div>
        </div>
      </div>

      <UpcomingTournamentModal
        tournament={inscriptionModalTournament ? { id: inscriptionModalTournament.id, name: inscriptionModalTournament.name, slotsTotal: inscriptionModalTournament.slotsTotal, slotsTaken: inscriptionModalTournament.slotsTaken } : null}
        onClose={() => setInscriptionModalTournament(null)}
        onVerInfo={handleModalVerInfo}
      />
    </div>
  );
};

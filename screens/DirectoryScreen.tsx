import React, { useMemo, useState } from 'react';
import { Flame, Calendar, CalendarCheck } from 'lucide-react';
import {
  getTournamentsByStatus,
  getTournamentsByLeague,
  LEAGUES,
  categoryToLeague,
  isTournamentCurrent,
  type LeagueNum,
  type Tournament,
} from '../src/lib/mockData';
import { useClubData } from '../src/lib/clubDataStore';
import { getLeagueColor, getLeagueSubtleCardShadowClasses, TOURNAMENT_CARD_SHADOW_NEUTRAL } from '../src/lib/leagueColors';
import { LeagueBadge } from '../components/LeagueBadge';
import { UpcomingTournamentModal } from '../components/UpcomingTournamentModal';

const pelotaImg = (() => {
  try {
    return new URL('../img/pelota.webp', import.meta.url).href;
  } catch {
    return '';
  }
})();

function getTournamentCardHeaderImageUrl(coverImage?: string): string {
  const file = coverImage || 'nadal.webp';
  try {
    return new URL(`../img/${file}`, import.meta.url).href;
  } catch {
    return '';
  }
}

interface DirectoryScreenProps {
  setScreen: (screen: string) => void;
  setSelectedTournamentId?: (id: string | null) => void;
}



interface TournamentCardProps {
  key?: React.Key;
  tournament: Tournament;
  onVerTorneo: (t: Tournament) => void;
  /** When provided, upcoming card shows "Inscribirse" that opens this (modal). */
  onInscribirse?: (t: Tournament) => void;
}

function TournamentCard({ tournament, onVerTorneo, onInscribirse }: TournamentCardProps) {
  const leagueNum = tournament.league ?? categoryToLeague(tournament.category);
  const leagueColor = getLeagueColor(leagueNum);
  const isCurrent = isTournamentCurrent(tournament);
  const isUpcoming = !isCurrent;
  const headerImg = getTournamentCardHeaderImageUrl(tournament.coverImage);
  const cardShell = `app-glass-panel flex flex-col overflow-hidden ${TOURNAMENT_CARD_SHADOW_NEUTRAL}`;

  if (isUpcoming) {
    return (
      <div className={cardShell}>
        <div className="relative min-h-[132px] flex flex-col justify-end">
          {headerImg ? (
            <>
              <div
                aria-hidden
                className="absolute inset-0 bg-cover bg-top"
                style={{ backgroundImage: `url("${headerImg}")` }}
              />
              <div className="absolute inset-0 bg-slate-950/88" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-slate-900" />
          )}
          <div className="relative z-10 p-5 pb-4 flex flex-col gap-2">
            <h3 className="text-blue-400 font-bold text-lg leading-tight drop-shadow-sm tracking-tight dark:text-blue-300">
              {tournament.name}
            </h3>
            <span className="inline-flex w-fit items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/18 text-white border border-white/25 backdrop-blur-sm shadow-sm">
              Todas las categorías
            </span>
          </div>
        </div>
        <div className="p-6 flex flex-col gap-4 flex-1 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-[#616f89] dark:text-gray-400 flex items-center gap-1">
            <Calendar className="w-4 h-4 shrink-0" />
            Inicio: {new Date(tournament.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          <p className="text-sm text-[#616f89] dark:text-gray-400 flex items-center gap-1">
            <CalendarCheck className="w-4 h-4 shrink-0" />
            Fin: {new Date(tournament.endDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          <div>
            <p className="text-xs font-semibold text-[#616f89] dark:text-gray-400 uppercase tracking-wider mb-1.5">Categorías</p>
            <div className="flex flex-wrap gap-1.5">
              {LEAGUES.map((n) => (
                <span
                  key={n}
                  className="inline-flex px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                >
                  Liga {n}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-auto pt-2 flex gap-2">
            <button
              type="button"
              onClick={() => onVerTorneo(tournament)}
              className="flex-1 flex items-center justify-center rounded-md h-11 border border-gray-300 dark:border-gray-600 text-[#111318] dark:text-white text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Ver torneo
            </button>
            {onInscribirse && (
              <button
                type="button"
                onClick={() => onInscribirse(tournament)}
                className="flex-1 flex items-center justify-center rounded-md h-11 bg-primary hover:bg-primary-hover text-white text-sm font-bold transition-colors"
              >
                Inscribirse
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`app-glass-panel flex flex-col overflow-hidden ${getLeagueSubtleCardShadowClasses(leagueNum)}`}
    >
      <div className={`h-1 shrink-0 rounded-t-xl ${leagueColor.topBar}`} aria-hidden />
      <div className="relative isolate min-h-[100px] overflow-hidden">
        {headerImg ? (
          <>
            <div
              aria-hidden
              className="absolute inset-0 bg-slate-800 bg-cover bg-top"
              style={{ backgroundImage: `url("${headerImg}")` }}
            />
            <div className="absolute inset-0 bg-slate-950/88" aria-hidden />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-slate-900" aria-hidden />
        )}
        <div className="relative z-[1] flex min-h-[100px] flex-col justify-end p-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <LeagueBadge league={leagueNum} />
            <div className="flex items-center gap-1.5">
              {pelotaImg && (
                <img src={pelotaImg} alt="" className="h-5 w-5 shrink-0 object-contain" width={20} height={20} aria-hidden />
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                <Flame className="h-4 w-4" />
                En curso
              </span>
            </div>
          </div>
          <h3 className="mt-2 text-lg font-bold leading-tight tracking-tight text-blue-400 drop-shadow-sm dark:text-blue-300">
            {tournament.name}
          </h3>
        </div>
      </div>
      <div className="p-6 flex flex-col flex-1 gap-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-[#616f89] dark:text-gray-400 flex items-center gap-1">
          <Calendar className="w-4 h-4 shrink-0" />
          Inicio: {new Date(tournament.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
        <p className="text-sm text-[#616f89] dark:text-gray-400 flex items-center gap-1">
          <CalendarCheck className="w-4 h-4 shrink-0" />
          Fin: {new Date(tournament.endDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
        <div className="mt-auto pt-2">
          <button
            type="button"
            onClick={() => onVerTorneo(tournament)}
            className="w-full flex items-center justify-center rounded-md h-11 px-4 bg-primary hover:bg-primary-hover text-white text-sm font-bold uppercase tracking-wide transition-colors"
          >
            Ver torneo
          </button>
        </div>
      </div>
    </div>
  );
}

export const DirectoryScreen: React.FC<DirectoryScreenProps> = ({ setScreen, setSelectedTournamentId }) => {
  const [selectedLeague, setSelectedLeague] = useState<LeagueNum | 'all'>('all');
  const [modalTournament, setModalTournament] = useState<Tournament | null>(null);
  const club = useClubData();

  const leagueTournaments = useMemo(() => {
    if (selectedLeague === 'all') {
      return getTournamentsByStatus('upcoming');
    }
    return getTournamentsByLeague(selectedLeague, 'upcoming');
  }, [selectedLeague, club]);

  const currentTournaments = useMemo(
    () => leagueTournaments.filter(isTournamentCurrent),
    [leagueTournaments]
  );

  /** Upcoming tournaments are general (all leagues); always show all. */
  const upcomingTournaments = useMemo(
    () => getTournamentsByStatus('upcoming').filter((t) => !isTournamentCurrent(t)),
    [club],
  );

  const handleVerTorneo = (t: Tournament) => {
    setSelectedTournamentId?.(t.id);
    setScreen('tournament_detail');
  };

  const handleInscribirse = (t: Tournament) => {
    setModalTournament(t);
  };

  const handleModalVerInfo = (tournamentId: string) => {
    setSelectedTournamentId?.(tournamentId);
    setScreen('tournament_detail');
  };

  return (
    <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 md:px-10 py-10 md:py-12">
      {/* League selector */}
      <div className="flex flex-wrap items-center gap-3 mb-10">
        <span className="text-[11px] font-bold text-[#616f89] dark:text-gray-400 uppercase tracking-[0.14em] mr-1">
          Liga:
        </span>
        <button
          type="button"
          onClick={() => setSelectedLeague('all')}
          className={`px-5 py-2.5 rounded-md text-sm font-bold min-h-[2.75rem] transition-all border ${
            selectedLeague === 'all'
              ? 'bg-primary text-white border-primary shadow-sport-card dark:shadow-sport-card-dark'
              : 'bg-white dark:bg-gray-800 border-gray-200/90 dark:border-gray-600 text-[#111318] dark:text-white hover:border-primary/40 shadow-sm'
          }`}
        >
          Todas
        </button>
        {LEAGUES.map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => setSelectedLeague(num)}
            className={`px-5 py-2.5 rounded-md text-sm font-bold min-h-[2.75rem] transition-all border ${
              selectedLeague === num
                ? 'bg-primary text-white border-primary shadow-sport-card dark:shadow-sport-card-dark'
                : 'bg-white dark:bg-gray-800 border-gray-200/90 dark:border-gray-600 text-[#111318] dark:text-white hover:border-primary/40 shadow-sm'
            }`}
          >
            Liga {num}
          </button>
        ))}
      </div>

      {/* Page header: title + subtitle (no logo) */}
      <div className="mb-10 flex flex-col gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#616f89] dark:text-gray-500">Directorio</p>
        <h1 className="text-3xl md:text-4xl font-bold text-[#111318] dark:text-white tracking-tight">
          Torneos
        </h1>
        <p className="text-[#616f89] dark:text-gray-400 text-base leading-relaxed">Greek Tenis Series</p>
      </div>

      {/* Section 1: Torneos actuales */}
      <section className="app-glass-panel mb-12 p-8 shadow-sport-card dark:shadow-sport-card-dark md:p-10">
        <h2 className="text-2xl md:text-3xl font-bold text-[#111318] dark:text-white tracking-tight border-b border-primary/35 dark:border-primary/40 pb-4 mb-8">
          Torneos actuales
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 md:gap-8">
          {currentTournaments.length === 0 ? (
            <p className="col-span-full text-[#616f89] dark:text-gray-400 text-sm py-4">
              No hay torneos en curso para esta liga.
            </p>
          ) : (
            currentTournaments.map((t) => (
              <TournamentCard key={t.id} tournament={t} onVerTorneo={handleVerTorneo} />
            ))
          )}
        </div>
      </section>

      {/* Section 2: Próximos torneos */}
      <section className="app-glass-panel p-8 shadow-sport-card dark:shadow-sport-card-dark md:p-10">
        <h2 className="text-2xl md:text-3xl font-bold text-[#111318] dark:text-white tracking-tight border-b border-primary/35 dark:border-primary/40 pb-4 mb-8">
          Próximos torneos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 md:gap-8">
          {upcomingTournaments.length === 0 ? (
            <p className="col-span-full text-[#616f89] dark:text-gray-400 text-sm py-4">
              No hay próximos torneos.
            </p>
          ) : (
            upcomingTournaments.map((t) => (
              <TournamentCard key={t.id} tournament={t} onVerTorneo={handleVerTorneo} onInscribirse={handleInscribirse} />
            ))
          )}
        </div>
      </section>

      <UpcomingTournamentModal
        tournament={modalTournament}
        onClose={() => setModalTournament(null)}
        onVerInfo={handleModalVerInfo}
      />
    </main>
  );
};

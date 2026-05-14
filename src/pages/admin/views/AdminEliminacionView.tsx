import { useMemo } from 'react';
import { GitBranch } from 'lucide-react';
import type { LigaNumKey } from '@/lib/tennis/loadLigasFromDocs';
import type { GroupTableWithSets } from '@/lib/mockData';
import type { MatchInput } from '@/types/tennisResults';
import { TournamentBracket, type Round } from '../../../../components/tournament/TournamentBracket';
import { getBracketRounds, getMatchesByTournament, getPlayerById, getTournamentById, type Match } from '@/lib/mockData';
import { effectiveTournamentCatalogType } from '@/lib/tennis/rankingPointsGreek500';
import { getAdminEliminationBracketTheme } from '@/lib/leagueColors';
import { useClubData } from '@/lib/clubDataStore';
import { AdminBracketQuarterEditor } from '../bracket/AdminBracketQuarterEditor';
import { AdminEliminacionSetupPanel } from '../elimination/AdminEliminacionSetupPanel';
import { useOptionalAdminTournamentSeed } from '../AdminTournamentSeedContext';

type Props = {
  tournamentId: string;
  tournamentName: string;
  ligaNum: LigaNumKey;
  rounds: Round[];
  groupTables: GroupTableWithSets[];
  results: MatchInput[];
  resetDraftSignal: number;
  readOnly?: boolean;
  /** Resultados de grupos confirmados oficialmente en admin (habilita armado de cruces). */
  groupStageOfficiallyConfirmed?: boolean;
  /** Id Prisma `TournamentLeague` (modo API). */
  tournamentLeagueId?: string;
  onBracketDirtyChange?: (dirty: boolean) => void;
  onNavigateResultados: () => void;
};

const PLAYOFF_ROUND_RE = /repechaje|play-?off|play-?in|previo|clasificatorio|pre-?cuadro/i;

function isPlayoffSideMatch(m: Match): boolean {
  const r = m.round ?? '';
  if (!r.trim()) return false;
  if (PLAYOFF_ROUND_RE.test(r)) return true;
  const lower = r.toLowerCase();
  if (lower.includes('cuarto') || lower.includes('semifinal') || lower === 'final') return false;
  if (/^fecha\s*\d/i.test(r)) return false;
  return /play|repech|previo|clasif/i.test(r);
}

function sortQuarterMatches(list: Match[]): Match[] {
  return [...list].sort((a, b) => {
    const da = a.scheduledDate ?? '';
    const db = b.scheduledDate ?? '';
    if (da !== db) return da.localeCompare(db);
    return a.id.localeCompare(b.id);
  });
}

export function AdminEliminacionView({
  tournamentId,
  tournamentName,
  ligaNum,
  rounds,
  groupTables,
  results,
  resetDraftSignal,
  readOnly = false,
  groupStageOfficiallyConfirmed = false,
  tournamentLeagueId,
  onBracketDirtyChange,
  onNavigateResultados,
}: Props) {
  const club = useClubData();
  const seedFmt = useOptionalAdminTournamentSeed();

  const isLiga3 = tournamentId === 't-novak-l3';
  const isMasters1000 = useMemo(() => {
    const t = getTournamentById(tournamentId);
    return t != null && effectiveTournamentCatalogType(t) === 'masters1000';
  }, [tournamentId, club.tournaments]);

  const quarterMatches = useMemo(() => {
    const { quarterfinals } = getBracketRounds(tournamentId);
    return sortQuarterMatches(quarterfinals);
  }, [tournamentId, club.matches]);

  const playoffMatches = useMemo(() => {
    return getMatchesByTournament(tournamentId).filter(isPlayoffSideMatch);
  }, [tournamentId, club.matches]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200/90 pb-2 dark:border-gray-700">
        <GitBranch className="h-5 w-5 shrink-0 admin-theme-icon" aria-hidden />
        <h2 className="text-lg font-bold text-[#111318] dark:text-white">Eliminación</h2>
      </div>

      <p className="text-xs leading-relaxed text-[#616f89] dark:text-gray-500">
        {isMasters1000 ? (
          <>
            Los <strong className="font-bold text-[#111318] dark:text-gray-300">marcadores</strong> de semifinales y final se cargan en la pestaña{' '}
            <strong className="font-bold text-[#111318] dark:text-gray-300">Resultados</strong>, con el mismo editor que la fase de grupos. Acá se
            visualiza el bracket y el armado de cruces a semifinales.
          </>
        ) : (
          <>
            Los <strong className="font-bold text-[#111318] dark:text-gray-300">marcadores</strong> de cuadro (repechaje,
            cuartos, semis y final) se cargan en la pestaña <strong className="font-bold text-[#111318] dark:text-gray-300">Resultados</strong>
            , con el mismo editor que la fase de grupos. Acá se visualiza el bracket y, si aplica, el armado de cuartos.
          </>
        )}
      </p>

      {!isLiga3 ? (
        <AdminEliminacionSetupPanel
          tournamentId={tournamentId}
          tournamentName={tournamentName}
          ligaNum={ligaNum}
          groupTables={groupTables}
          results={results}
          players={club.players}
          readOnly={readOnly}
          groupStageOfficiallyConfirmed={groupStageOfficiallyConfirmed}
          tournamentLeagueId={tournamentLeagueId}
          onNavigateResultados={onNavigateResultados}
        />
      ) : null}

      <TournamentBracket rounds={rounds} publicTheme={getAdminEliminationBracketTheme()} variant="admin-neutral" />

      {readOnly ? (
        <div className="rounded-xl border border-slate-300/60 bg-slate-100/80 px-4 py-3 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100">
          {isMasters1000
            ? 'Torneo en solo lectura: no se puede editar el cuadro de eliminación desde aquí.'
            : 'Torneo en solo lectura: no se puede editar el cuadro de cuartos desde aquí.'}
        </div>
      ) : isLiga3 ? (
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          Liga 3 usa un cuadro y datos de eliminación fijos en el sistema. La edición manual del cuadro no aplica aquí.
        </div>
      ) : isMasters1000 ? (
        <div className="rounded-xl border border-gray-200/90 bg-white/85 px-4 py-3 text-sm text-[#616f89] dark:border-gray-600 dark:bg-gray-900/55 dark:text-gray-300">
          Masters 1000: los cruces de semifinales se arman con el panel superior. No hay cuartos ni repechaje; la final se completa al avanzar los
          ganadores de cada semifinal.
        </div>
      ) : (
        <AdminBracketQuarterEditor
          tournamentId={tournamentId}
          quarterMatches={quarterMatches}
          resetSignal={resetDraftSignal}
          onDirtyChange={onBracketDirtyChange}
          auditContext={{ tournamentId, tournamentName, league: ligaNum }}
        />
      )}

      {!isMasters1000 && playoffMatches.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-base font-bold text-[#111318] dark:text-white">Previos / repechaje</h3>
          <p className="text-[11px] text-[#616f89] dark:text-gray-500">Partidos del club con ronda de repechaje o clasificatorio.</p>
          <ul className="flex flex-col gap-3">
            {playoffMatches.map((m) => {
              const n1 = seedFmt?.formatMatchSide(m.playerA) ?? getPlayerById(m.playerA)?.name ?? m.playerA;
              const n2 = seedFmt?.formatMatchSide(m.playerB) ?? getPlayerById(m.playerB)?.name ?? m.playerB;
              return (
                <li
                  key={m.id}
                  className="rounded-xl border border-gray-200/90 bg-white/85 px-4 py-3 text-sm dark:border-gray-600 dark:bg-gray-900/55"
                >
                  <p className="text-[11px] font-bold uppercase tracking-wide text-primary dark:text-primary/90">
                    {m.round ?? 'Ronda'}
                  </p>
                  <p className="mt-1 font-medium text-[#111318] dark:text-gray-100">
                    {n1} <span className="text-[#616f89] dark:text-gray-500">vs</span> {n2}
                  </p>
                  {m.scheduledDate ? (
                    <p className="mt-1 text-xs text-[#616f89] dark:text-gray-500">Fecha: {m.scheduledDate}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

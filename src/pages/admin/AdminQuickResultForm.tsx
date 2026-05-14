import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { useClubData } from '@/lib/clubDataStore';
import { categoryToLeague, getTournamentById } from '@/lib/mockData';
import { cleanPlayerName, matchInputDedupeKey } from '@/lib/tennis/matchDedupe';
import { upsertResult } from '@/lib/tennis/resultsStore';
import { recalculateTournament } from '@/lib/tennis/recalculateTournament';
import { getMatchScheduleByKey } from '@/lib/tennis/matchScheduleStore';
import {
  matchScheduleHasDateTimeForPlayedResult,
  normalPlayedMatchRequiresSchedule,
  SCHEDULE_REQUIRED_FOR_PLAYED_MESSAGE,
} from '@/lib/tennis/matchScheduleForResultGuard';
import type { MatchInput } from '@/types/tennisResults';
import {
  buildScoreStringIfValid,
  cloneGrid,
  EMPTY_GRID,
  type ScoreCells,
} from '@/lib/tennis/adminScoreValidation';
import {
  groupMatchRankingPointsForCatalog,
  effectiveTournamentCatalogType,
} from '@/lib/tennis/rankingPointsGreek500';
import { AdminMatchScoreGrid } from './AdminMatchScoreGrid';
import { AdminConfirmDialog } from './AdminConfirmDialog';

const inputBase =
  'w-full rounded-md bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-600 text-[#111318] dark:text-white placeholder:text-[#616f89] dark:placeholder:text-gray-500 outline-none transition-all px-3 py-2.5 text-sm';

const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-bold border shadow-sm transition-opacity disabled:opacity-50 disabled:pointer-events-none admin-theme-btn';

type AdminQuickResultFormProps = {
  /** Torneo de la liga actual (pestaña superior); se preselecciona al abrir la pestaña. */
  suggestedTournamentId?: string;
  /** Para tema visual del admin al elegir otro torneo en el desplegable. */
  onTournamentThemeChange?: (tournamentId: string | null) => void;
};

/**
 * Carga rápida: dos jugadores (select) + grilla de sets (misma validación que el fixture).
 */
export function AdminQuickResultForm({ suggestedTournamentId, onTournamentThemeChange }: AdminQuickResultFormProps) {
  const navigate = useNavigate();
  const { players, tournaments } = useClubData();
  const [tournamentId, setTournamentId] = useState(suggestedTournamentId ?? '');
  const [playerA, setPlayerA] = useState('');
  const [playerB, setPlayerB] = useState('');
  const [cells, setCells] = useState<ScoreCells>(() => cloneGrid(EMPTY_GRID));
  const [round, setRound] = useState(1);
  const [group, setGroup] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [scheduleProgramarTarget, setScheduleProgramarTarget] = useState<{ tournamentId: string; dedupeKey: string } | null>(
    null,
  );

  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [players],
  );

  const sortedTournaments = useMemo(
    () => [...tournaments].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [tournaments],
  );

  useEffect(() => {
    if (suggestedTournamentId) setTournamentId(suggestedTournamentId);
  }, [suggestedTournamentId]);

  useEffect(() => {
    onTournamentThemeChange?.(tournamentId.trim() ? tournamentId : null);
  }, [tournamentId, onTournamentThemeChange]);

  const setOkFlash = useCallback((msg: string) => {
    setOkMsg(msg);
    window.setTimeout(() => setOkMsg(null), 4000);
  }, []);

  const canSubmit = useMemo(() => buildScoreStringIfValid(cells).ok === true, [cells]);

  const quickRankingPreview = useMemo((): { winnerPts: number; loserPts: number } | null => {
    const g = group.trim();
    const catalog = effectiveTournamentCatalogType(getTournamentById(tournamentId));
    const gm = groupMatchRankingPointsForCatalog(catalog);
    if (!g || (!/^interzonal$/i.test(g) && !/^KO-/i.test(g))) return { winnerPts: gm.win, loserPts: gm.loss };
    return null;
  }, [group, tournamentId]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!tournamentId.trim()) {
      setError('Elegí un torneo.');
      return;
    }
    if (!playerA || !playerB) {
      setError('Elegí ambos jugadores.');
      return;
    }
    if (playerA === playerB) {
      setError('Los jugadores deben ser distintos.');
      return;
    }

    const built = buildScoreStringIfValid(cells);
    if (built.ok === false) {
      setError(built.reason || 'Completá un marcador válido.');
      return;
    }
    const score = built.value;

    const pa = cleanPlayerName(sortedPlayers.find((p) => p.id === playerA)?.name ?? '');
    const pb = cleanPlayerName(sortedPlayers.find((p) => p.id === playerB)?.name ?? '');
    if (!pa || !pb) {
      setError('No se pudieron resolver los nombres de jugador.');
      return;
    }

    const tour = getTournamentById(tournamentId.trim());
    const leagueNum = tour ? (tour.league ?? categoryToLeague(tour.category)) : 1;
    const next: MatchInput = {
      tournamentId: tournamentId.trim(),
      group: group.trim() || undefined,
      round: Number.isFinite(round) ? round : 1,
      playerA: pa,
      playerB: pb,
      score,
      status: 'played',
      date: new Date().toISOString().slice(0, 10),
    };
    const sched = getMatchScheduleByKey(matchInputDedupeKey(next));
    if (normalPlayedMatchRequiresSchedule(next) && !matchScheduleHasDateTimeForPlayedResult(sched)) {
      setScheduleProgramarTarget({ tournamentId: tournamentId.trim(), dedupeKey: matchInputDedupeKey(next) });
      return;
    }

    upsertResult(next);

    const rec = recalculateTournament({ tournamentId: next.tournamentId, league: leagueNum });
    if (!rec.ok) {
      setError(rec.error ?? 'No se pudo recalcular el torneo tras guardar.');
      return;
    }

    setCells(cloneGrid(EMPTY_GRID));
    setOkFlash('Resultado guardado. Las tablas se actualizan automáticamente.');
  };

  return (
    <section className="rounded-xl border border-gray-200/90 dark:border-gray-600/70 bg-[#f0f2f6] dark:bg-gray-800/90 p-4 md:p-6 shadow-sport-card dark:shadow-sport-card-dark">
      <div className="flex items-start gap-3 mb-4">
        <ClipboardList className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden />
        <div>
          <h3 className="font-bold text-[#111318] dark:text-white text-base">Carga rápida de resultado</h3>
          <p className="text-sm text-[#616f89] dark:text-gray-400 mt-1 leading-relaxed">
            Elegí torneo y jugadores, completá los games por set en la grilla. Al guardar se persiste el partido y el motor
            recalcula posiciones en el sitio.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
        <div>
          <label htmlFor="qr-torneo" className="block text-xs font-bold uppercase tracking-wider text-[#616f89] dark:text-gray-500 mb-1.5">
            Torneo
          </label>
          <select
            id="qr-torneo"
            className={inputBase}
            value={tournamentId}
            onChange={(e) => setTournamentId(e.target.value)}
            required
          >
            <option value="">— Seleccionar —</option>
            {sortedTournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="qr-p1" className="block text-xs font-bold uppercase tracking-wider text-[#616f89] dark:text-gray-500 mb-1.5">
              Jugador 1
            </label>
            <select
              id="qr-p1"
              className={inputBase}
              value={playerA}
              onChange={(e) => {
                setPlayerA(e.target.value);
                setError(null);
              }}
              required
            >
              <option value="">— Seleccionar —</option>
              {sortedPlayers.map((p) => (
                <option key={p.id} value={p.id} disabled={p.id === playerB}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="qr-p2" className="block text-xs font-bold uppercase tracking-wider text-[#616f89] dark:text-gray-500 mb-1.5">
              Jugador 2
            </label>
            <select
              id="qr-p2"
              className={inputBase}
              value={playerB}
              onChange={(e) => {
                setPlayerB(e.target.value);
                setError(null);
              }}
              required
            >
              <option value="">— Seleccionar —</option>
              {sortedPlayers.map((p) => (
                <option key={p.id} value={p.id} disabled={p.id === playerA}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {playerA && playerB && playerA !== playerB ? (
          <div className="max-w-md">
            <p className="text-xs font-bold uppercase tracking-wider text-[#616f89] dark:text-gray-500 mb-2">Marcador</p>
            <AdminMatchScoreGrid
              playerA={cleanPlayerName(sortedPlayers.find((p) => p.id === playerA)?.name ?? 'Jugador 1')}
              playerB={cleanPlayerName(sortedPlayers.find((p) => p.id === playerB)?.name ?? 'Jugador 2')}
              cells={cells}
              rankingPointsPreview={quickRankingPreview}
              onChange={(next) => {
                setCells(cloneGrid(next));
                setError(null);
              }}
            />
          </div>
        ) : (
          <p className="text-sm text-[#616f89] dark:text-gray-500">Elegí dos jugadores distintos para ingresar el marcador.</p>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="qr-round" className="block text-xs font-bold uppercase tracking-wider text-[#616f89] dark:text-gray-500 mb-1.5">
              Fecha / ronda (número)
            </label>
            <input
              id="qr-round"
              type="number"
              min={0}
              className={inputBase}
              value={round}
              onChange={(e) => setRound(Number(e.target.value))}
            />
          </div>
          <div>
            <label htmlFor="qr-group" className="block text-xs font-bold uppercase tracking-wider text-[#616f89] dark:text-gray-500 mb-1.5">
              Grupo (opcional)
            </label>
            <input
              id="qr-group"
              type="text"
              className={inputBase}
              placeholder="Ej: A"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
            />
          </div>
        </div>

        {error ? (
          <p className="text-sm font-medium text-red-600 dark:text-red-400 rounded-md border border-red-500/40 bg-red-50 dark:bg-red-950/40 px-3 py-2" role="alert">
            {error}
          </p>
        ) : null}
        {okMsg ? (
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 rounded-md border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">
            {okMsg}
          </p>
        ) : null}

        <button type="submit" className={btnPrimary} disabled={!canSubmit}>
          Guardar resultado
        </button>
      </form>

      <AdminConfirmDialog
        open={scheduleProgramarTarget != null}
        title="Fecha requerida"
        description={
          <p className="text-sm leading-relaxed text-[#616f89] dark:text-gray-400">{SCHEDULE_REQUIRED_FOR_PLAYED_MESSAGE}</p>
        }
        confirmLabel="Programar ahora"
        cancelLabel="Cancelar"
        onClose={() => setScheduleProgramarTarget(null)}
        onConfirm={() => {
          const t = scheduleProgramarTarget;
          setScheduleProgramarTarget(null);
          if (t) {
            navigate(`/admin/torneos/${encodeURIComponent(t.tournamentId)}?programar=${encodeURIComponent(t.dedupeKey)}`);
          }
          return true;
        }}
      />
    </section>
  );
}

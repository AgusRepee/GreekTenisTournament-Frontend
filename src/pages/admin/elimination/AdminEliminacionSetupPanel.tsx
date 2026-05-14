import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, GripVertical } from 'lucide-react';
import type { GroupTableWithSets, Player } from '@/lib/mockData';
import { getPlayerById, getTournamentById } from '@/lib/mockData';
import { effectiveTournamentCatalogType } from '@/lib/tennis/rankingPointsGreek500';
import { appendAdminAuditEntry, auditActionLabel } from '@/lib/admin/tournamentAuditLog';
import {
  buildEliminationProposalFromGroupTables,
  crossesSummaryLines,
  emptyManualCrosses,
  isRepechajeWaitToken,
  validateFullEliminationDraft,
  type EliminationCrossDraft,
} from '@/lib/tennis/eliminationBracketProposal';
import { replaceKnockoutShellMatches } from '@/lib/tennis/eliminationKnockoutPersist';
import {
  buildResultsDedupeMap,
  hasPlayableQuarterBracket,
  isGroupPhaseCompleteForEliminationSetup,
  summarizeGroupPhaseBlockingWithMap,
} from '@/lib/tennis/adminGroupPhaseCompletion';
import { recalculateTournament } from '@/lib/tennis/recalculateTournament';
import type { MatchInput } from '@/types/tennisResults';
import type { LigaNumKey } from '@/lib/tennis/loadLigasFromDocs';
import { AdminConfirmDialog } from '../AdminConfirmDialog';
import { useOptionalAdminTournamentSeed } from '../AdminTournamentSeedContext';
import { getDataSourceMode } from '@/lib/data/tournamentRepository';
import { getEliminationBracketPort } from '@/data/services/registry';
import { syncTournamentMatchesFromAdminApi } from '@/lib/api/syncTournamentMatchesFromAdmin';

const MIME = 'application/x-admin-elim-pool';

type DragPayload =
  | { kind: 'pool'; playerId: string }
  | { kind: 'slot'; crossId: string; side: 'a' | 'b'; board?: 'quarter' | 'preliminary' };

function dragSlotBoard(payload: DragPayload): 'quarter' | 'preliminary' | null {
  if (payload.kind !== 'slot') return null;
  return payload.board ?? 'quarter';
}

const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold border shadow-sm transition-opacity admin-theme-btn';
const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-[#111318] dark:text-white admin-theme-btn-secondary transition-colors';

function parseDrag(dt: DataTransfer): DragPayload | null {
  try {
    const raw = dt.getData(MIME) || dt.getData('text/plain');
    if (!raw) return null;
    return JSON.parse(raw) as DragPayload;
  } catch {
    return null;
  }
}

const DRAFT_KEY = 'greek-admin-elim-cross-draft-v1';

export type ElimCrossDraftPersist = { preliminary: EliminationCrossDraft[]; quarter: EliminationCrossDraft[] };

function eliminationCrossCountForTournament(tournamentId: string): 2 | 4 {
  const t = getTournamentById(tournamentId.trim());
  return t && effectiveTournamentCatalogType(t) === 'masters1000' ? 2 : 4;
}

function loadDraft(tournamentId: string): ElimCrossDraftPersist | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const root = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}') as Record<string, unknown>;
    const raw = root[tournamentId.trim()];
    if (raw && typeof raw === 'object' && raw !== null && 'quarter' in raw) {
      const v = raw as ElimCrossDraftPersist;
      if (Array.isArray(v.quarter) && (v.quarter.length === 4 || v.quarter.length === 2)) {
        return {
          preliminary: Array.isArray(v.preliminary) ? v.preliminary : [],
          quarter: v.quarter,
        };
      }
    }
    if (Array.isArray(raw) && (raw.length === 4 || raw.length === 2)) {
      return { preliminary: [], quarter: raw as EliminationCrossDraft[] };
    }
  } catch {
    /* */
  }
  return null;
}

function saveDraft(tournamentId: string, draft: ElimCrossDraftPersist) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const root = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}') as Record<string, EliminationCrossDraftPersist>;
    root[tournamentId.trim()] = draft;
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(root));
  } catch {
    /* quota */
  }
}

function clearDraft(tournamentId: string) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const root = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}') as Record<string, unknown>;
    delete root[tournamentId.trim()];
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(root));
  } catch {
    /* */
  }
}

type Props = {
  tournamentId: string;
  tournamentName: string;
  ligaNum: LigaNumKey;
  groupTables: GroupTableWithSets[];
  results: MatchInput[];
  players: Player[];
  readOnly?: boolean;
  groupStageOfficiallyConfirmed?: boolean;
  /** Id Prisma `TournamentLeague` (persistencia KO en MySQL). */
  tournamentLeagueId?: string;
  onNavigateResultados: () => void;
};

export function AdminEliminacionSetupPanel({
  tournamentId,
  tournamentName,
  ligaNum,
  groupTables,
  results,
  players,
  readOnly = false,
  groupStageOfficiallyConfirmed = false,
  tournamentLeagueId,
  onNavigateResultados,
}: Props) {
  const seedFmt = useOptionalAdminTournamentSeed();
  const resultsByDedupe = useMemo(() => buildResultsDedupeMap(results), [results]);
  const blocking = useMemo(
    () => summarizeGroupPhaseBlockingWithMap(tournamentId, results, players, resultsByDedupe),
    [tournamentId, results, players, resultsByDedupe],
  );
  const groupsComplete = useMemo(
    () => isGroupPhaseCompleteForEliminationSetup(tournamentId, results, players, resultsByDedupe),
    [tournamentId, results, players, resultsByDedupe],
  );
  const hasQuarter = useMemo(() => hasPlayableQuarterBracket(tournamentId), [tournamentId]);

  const isMasters = useMemo(() => eliminationCrossCountForTournament(tournamentId) === 2, [tournamentId]);

  const proposal = useMemo(
    () => buildEliminationProposalFromGroupTables(groupTables, tournamentId),
    [groupTables, tournamentId],
  );
  const allowedIds = useMemo(() => {
    const s = new Set<string>();
    for (const c of proposal.direct) s.add(c.playerId);
    for (const c of proposal.repechaje) s.add(c.playerId);
    return s;
  }, [proposal]);
  const eliminatedIds = useMemo(() => new Set(proposal.eliminated.map((c) => c.playerId)), [proposal]);

  const [preliminaryCrosses, setPreliminaryCrosses] = useState<EliminationCrossDraft[]>([]);
  const [quarterCrosses, setQuarterCrosses] = useState<EliminationCrossDraft[]>(() => {
    const want = eliminationCrossCountForTournament(tournamentId);
    const d = loadDraft(tournamentId);
    if (d && d.quarter.length === want) return d.quarter;
    return emptyManualCrosses(want);
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [eliminatedOpen, setEliminatedOpen] = useState(false);

  useEffect(() => {
    if (hasQuarter) {
      clearDraft(tournamentId);
      return;
    }
    const want = eliminationCrossCountForTournament(tournamentId);
    const d = loadDraft(tournamentId);
    if (d && d.quarter.length === want) {
      setPreliminaryCrosses(d.preliminary);
      setQuarterCrosses(d.quarter);
    } else {
      setPreliminaryCrosses([]);
      setQuarterCrosses(emptyManualCrosses(want));
    }
  }, [tournamentId, hasQuarter, groupsComplete]);

  useEffect(() => {
    if (hasQuarter || !groupsComplete) return;
    saveDraft(tournamentId, { preliminary: preliminaryCrosses, quarter: quarterCrosses });
  }, [tournamentId, hasQuarter, groupsComplete, preliminaryCrosses, quarterCrosses]);

  const nameById = useCallback(
    (id: string) => seedFmt?.formatPlayerId(id) ?? getPlayerById(id)?.name ?? id,
    [seedFmt],
  );

  const validation = useMemo(
    () => validateFullEliminationDraft(preliminaryCrosses, quarterCrosses, allowedIds, eliminatedIds),
    [preliminaryCrosses, quarterCrosses, allowedIds, eliminatedIds],
  );

  const setQuarterSlot = (crossId: string, side: 'a' | 'b', playerId: string | null) => {
    setQuarterCrosses((prev) =>
      prev.map((c) => (c.id === crossId ? { ...c, [side === 'a' ? 'slotA' : 'slotB']: playerId } : c)),
    );
  };

  const setPreliminarySlot = (crossId: string, side: 'a' | 'b', playerId: string | null) => {
    setPreliminaryCrosses((prev) =>
      prev.map((c) => (c.id === crossId ? { ...c, [side === 'a' ? 'slotA' : 'slotB']: playerId } : c)),
    );
  };

  const onDragStartPool = (e: React.DragEvent, playerId: string) => {
    e.dataTransfer.setData(MIME, JSON.stringify({ kind: 'pool', playerId } satisfies DragPayload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragStartQuarterSlot = (e: React.DragEvent, crossId: string, side: 'a' | 'b') => {
    const payload: DragPayload = { kind: 'slot', crossId, side, board: 'quarter' };
    e.dataTransfer.setData(MIME, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragStartPreliminarySlot = (e: React.DragEvent, crossId: string, side: 'a' | 'b') => {
    const payload: DragPayload = { kind: 'slot', crossId, side, board: 'preliminary' };
    e.dataTransfer.setData(MIME, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDropQuarterSlot = (e: React.DragEvent, crossId: string, side: 'a' | 'b') => {
    e.preventDefault();
    const src = parseDrag(e.dataTransfer);
    if (!src) return;
    if (src.kind === 'pool') {
      setQuarterSlot(crossId, side, src.playerId);
      return;
    }
    if (src.kind === 'slot') {
      const fromBoard = dragSlotBoard(src);
      if (fromBoard === 'quarter') {
        if (src.crossId === crossId && src.side === side) return;
        const prev = quarterCrosses;
        const a = prev.find((x) => x.id === src.crossId)?.[src.side === 'a' ? 'slotA' : 'slotB'] ?? null;
        const b = prev.find((x) => x.id === crossId)?.[side === 'a' ? 'slotA' : 'slotB'] ?? null;
        setQuarterCrosses(
          prev.map((c) => {
            if (c.id === src.crossId) return { ...c, [src.side === 'a' ? 'slotA' : 'slotB']: b };
            if (c.id === crossId) return { ...c, [side === 'a' ? 'slotA' : 'slotB']: a };
            return c;
          }),
        );
        return;
      }
      if (fromBoard === 'preliminary') {
        const pid =
          preliminaryCrosses.find((x) => x.id === src.crossId)?.[
            src.side === 'a' ? 'slotA' : 'slotB'
          ] ?? null;
        setQuarterSlot(crossId, side, pid);
        setPreliminarySlot(src.crossId, src.side, null);
      }
    }
  };

  const onDropPreliminarySlot = (e: React.DragEvent, crossId: string, side: 'a' | 'b') => {
    e.preventDefault();
    const src = parseDrag(e.dataTransfer);
    if (!src) return;
    if (src.kind === 'pool') {
      setPreliminarySlot(crossId, side, src.playerId);
      return;
    }
    if (src.kind === 'slot') {
      const prevPre = preliminaryCrosses;
      const prevQ = quarterCrosses;
      const fromBoard = dragSlotBoard(src);
      if (fromBoard === 'preliminary') {
        if (src.crossId === crossId && src.side === side) return;
        const a =
          prevPre.find((x) => x.id === src.crossId)?.[src.side === 'a' ? 'slotA' : 'slotB'] ?? null;
        const slotB =
          prevPre.find((x) => x.id === crossId)?.[side === 'a' ? 'slotA' : 'slotB'] ?? null;
        setPreliminaryCrosses(
          prevPre.map((c) => {
            if (c.id === src.crossId) return { ...c, [src.side === 'a' ? 'slotA' : 'slotB']: slotB };
            if (c.id === crossId) return { ...c, [side === 'a' ? 'slotA' : 'slotB']: a };
            return c;
          }),
        );
        return;
      }
      if (fromBoard === 'quarter') {
        const a = prevQ.find((x) => x.id === src.crossId)?.[src.side === 'a' ? 'slotA' : 'slotB'] ?? null;
        const bCur =
          prevPre.find((x) => x.id === crossId)?.[side === 'a' ? 'slotA' : 'slotB'] ?? null;
        setQuarterCrosses(
          prevQ.map((c) =>
            c.id === src.crossId ? { ...c, [src.side === 'a' ? 'slotA' : 'slotB']: bCur } : c,
          ),
        );
        setPreliminaryCrosses(
          prevPre.map((c) => (c.id === crossId ? { ...c, [side === 'a' ? 'slotA' : 'slotB']: a } : c)),
        );
      }
    }
  };

  const generateAuto = () => {
    const b = buildEliminationProposalFromGroupTables(groupTables, tournamentId);
    setPreliminaryCrosses(b.preliminaryCrosses.map((c) => ({ ...c })));
    setQuarterCrosses(b.crosses.map((c) => ({ ...c })));
    if (getDataSourceMode() === 'api' && tournamentLeagueId) {
      void getEliminationBracketPort()
        .generateDraft(tournamentLeagueId, { preliminary: b.preliminaryCrosses, quarter: b.crosses })
        .catch((e) => console.warn('[elim] generate API', e));
    }
    appendAdminAuditEntry({
      action: 'eliminacion_cruces_autogenerados',
      actionLabel: auditActionLabel('eliminacion_cruces_autogenerados'),
      tournamentId,
      tournamentName,
      league: ligaNum,
      detail: isMasters
        ? `Propuesta automática de semifinales (${b.warnings.join(' ') || 'sin avisos'}).`
        : `Propuesta automática de cuartos (${b.warnings.join(' ') || 'sin avisos'}).`,
    });
  };

  const startManual = () => {
    const want = eliminationCrossCountForTournament(tournamentId);
    setPreliminaryCrosses([]);
    setQuarterCrosses(emptyManualCrosses(want));
    appendAdminAuditEntry({
      action: 'eliminacion_armado_manual',
      actionLabel: auditActionLabel('eliminacion_armado_manual'),
      tournamentId,
      tournamentName,
      league: ligaNum,
      detail: isMasters ? 'Inicio de armado manual de semifinales.' : 'Inicio de armado manual de cruces de cuartos.',
    });
  };

  const confirmPersist = () => {
    const lines = [
      ...crossesSummaryLines(preliminaryCrosses, nameById),
      ...crossesSummaryLines(quarterCrosses, nameById),
    ];
    if (getDataSourceMode() === 'api' && !tournamentLeagueId) {
      window.alert('No hay id de liga en MySQL (TournamentLeague). No se puede confirmar la eliminación por API.');
      return;
    }
    if (getDataSourceMode() === 'api' && tournamentLeagueId) {
      void (async () => {
        try {
          const bracket = { preliminary: preliminaryCrosses, quarter: quarterCrosses };
          await getEliminationBracketPort().saveDraft(tournamentLeagueId, bracket);
          await getEliminationBracketPort().confirmBracket(tournamentLeagueId);
          await syncTournamentMatchesFromAdminApi(tournamentId);
          clearDraft(tournamentId);
          appendAdminAuditEntry({
            action: 'eliminacion_cruces_confirmados',
            actionLabel: auditActionLabel('eliminacion_cruces_confirmados'),
            tournamentId,
            tournamentName,
            league: ligaNum,
            detail: `${lines.join(' · ')} (API/MySQL)`,
          });
          const rec = recalculateTournament({ tournamentId, league: ligaNum });
          if (!rec.ok) console.warn(rec.error);
        } catch (e) {
          console.error(e);
          window.alert(e instanceof Error ? e.message : 'No se pudo confirmar la eliminación en el servidor.');
        } finally {
          setConfirmOpen(false);
        }
      })();
      return;
    }
    replaceKnockoutShellMatches(tournamentId, quarterCrosses, preliminaryCrosses);
    clearDraft(tournamentId);
    appendAdminAuditEntry({
      action: 'eliminacion_cruces_confirmados',
      actionLabel: auditActionLabel('eliminacion_cruces_confirmados'),
      tournamentId,
      tournamentName,
      league: ligaNum,
      detail: lines.join(' · '),
    });
    const rec = recalculateTournament({ tournamentId, league: ligaNum });
    if (!rec.ok) {
      console.warn(rec.error);
    }
    setConfirmOpen(false);
  };

  if (readOnly) {
    return (
      <div className="rounded-xl border border-slate-300/60 bg-slate-100/80 px-4 py-3 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100">
        Solo lectura: no se puede armar la eliminación desde aquí.
      </div>
    );
  }

  if (hasQuarter) {
    return (
      <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-950 dark:text-emerald-100">
        El cuadro de eliminación ya está configurado con cruces jugables. Cargá marcadores en{' '}
        <strong>Resultados</strong>
        {isMasters ? (
          <>
            {' '}
            o usá <strong>Editar cuadro</strong> en semifinales si necesitás ajustar nombres.
          </>
        ) : (
          <>
            {' '}
            o usá <strong>Editar cuadro</strong> en cuartos si necesitás ajustar nombres.
          </>
        )}
      </div>
    );
  }

  if (!groupsComplete) {
    return (
      <div className="space-y-3 rounded-xl border border-amber-500/40 bg-amber-50/90 px-4 py-4 dark:border-amber-700/50 dark:bg-amber-950/35">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-800 dark:text-amber-200" aria-hidden />
          <div>
            <p className="font-bold text-amber-950 dark:text-amber-100">Todavía faltan resultados para armar la eliminación.</p>
            <p className="mt-1 text-sm text-amber-900/95 dark:text-amber-100/90">
              Faltan <strong>{blocking.uniqueBlockingCount}</strong> partido(s) pendiente(s) de grupos (incluye borradores sin
              guardar en Resultados).
            </p>
            <button type="button" className={`${btnPrimary} mt-3 text-xs`} onClick={onNavigateResultados}>
              Ir a Resultados
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!groupStageOfficiallyConfirmed) {
    return (
      <div className="space-y-3 rounded-xl border border-sky-500/40 bg-sky-50/90 px-4 py-4 dark:border-sky-700/50 dark:bg-sky-950/35">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-sky-800 dark:text-sky-200" aria-hidden />
          <div>
            <p className="font-bold text-sky-950 dark:text-sky-100">Resultados de grupos listos, pendiente de confirmación oficial.</p>
            <p className="mt-1 text-sm text-sky-900/95 dark:text-sky-100/90">
              En <strong>Resultados</strong> usá el botón <strong>Confirmar resultados</strong> para cerrar la fase de grupos. Recién
              después podés armar los cruces de eliminación acá.
            </p>
            <button type="button" className={`${btnPrimary} mt-3 text-xs`} onClick={onNavigateResultados}>
              Ir a Resultados
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-xl border border-gray-200/90 bg-white/90 p-4 dark:border-gray-600 dark:bg-gray-900/50 md:p-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">Fase de grupos completa</p>
        <h3 className="mt-1 text-lg font-bold text-[#111318] dark:text-white">Armado de eliminación</h3>
        <p className="mt-1 text-sm text-[#616f89] dark:text-gray-400">
          {isMasters
            ? 'Ya podés armar las semifinales (1° vs 2° del otro grupo). La propuesta no crea partidos hasta que confirmés.'
            : 'Ya podés armar los cruces de cuartos. La propuesta no crea partidos hasta que confirmés.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} onClick={generateAuto}>
          Generar cruces automáticos
        </button>
        <button type="button" className={btnSecondary} onClick={startManual}>
          Armar manualmente
        </button>
      </div>

      {proposal.warnings.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-xs text-amber-900 dark:text-amber-100/90">
          {proposal.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}

      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[#616f89] dark:text-gray-500">
          {isMasters ? 'Clasificados a semifinales' : 'Clasificados directos'}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {proposal.direct.map((c) => (
            <button
              key={c.playerId}
              type="button"
              draggable
              onDragStart={(e) => onDragStartPool(e, c.playerId)}
              className="inline-flex max-w-[14rem] items-center gap-2 rounded-lg border border-gray-200/90 bg-[#f8f9fb] px-2.5 py-2 text-left text-xs font-semibold text-[#111318] shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <GripVertical className="h-4 w-4 shrink-0 text-[#616f89]" aria-hidden />
              <span className="min-w-0 truncate">{c.displayName}</span>
              <span className="shrink-0 rounded bg-white/80 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#616f89] dark:bg-gray-900/60">
                {c.origin.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {proposal.repechaje.length > 0 ? (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#616f89] dark:text-gray-500">Repechaje / terceros</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {proposal.repechaje.map((c) => (
              <button
                key={c.playerId}
                type="button"
                draggable
                onDragStart={(e) => onDragStartPool(e, c.playerId)}
                className="inline-flex max-w-[14rem] items-center gap-2 rounded-lg border border-sky-500/35 bg-sky-500/10 px-2.5 py-2 text-left text-xs font-semibold text-sky-950 dark:text-sky-100"
              >
                <GripVertical className="h-4 w-4 shrink-0" aria-hidden />
                <span className="min-w-0 truncate">{c.displayName}</span>
                <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase">{c.origin.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {proposal.eliminated.length > 0 ? (
        <div>
          <button
            type="button"
            className="text-xs font-bold uppercase tracking-wide text-[#616f89] underline dark:text-gray-400"
            onClick={() => setEliminatedOpen((o) => !o)}
          >
            {eliminatedOpen ? 'Ocultar eliminados' : `Ver eliminados (${proposal.eliminated.length})`}
          </button>
          {eliminatedOpen ? (
            <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-auto pl-5 text-xs text-[#616f89] dark:text-gray-400">
              {proposal.eliminated.map((c) => (
                <li key={`${c.playerId}-${c.origin.label}`}>
                  {c.displayName} · {c.origin.label}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {preliminaryCrosses.length > 0 ? (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">Fase previa / repechaje</p>
          <p className="mt-1 text-[11px] text-[#616f89] dark:text-gray-500">
            Estos partidos se crean antes que los cuartos. Al cargar el ganador, se completa el cupo <code className="text-[10px]">WAIT_RP_n</code> en
            cuartos.
          </p>
          <div className="mt-3 flex flex-col gap-4">
            {preliminaryCrosses.map((c) => (
              <div key={c.id} className="rounded-lg border border-amber-500/35 bg-amber-50/50 p-3 dark:border-amber-700/40 dark:bg-amber-950/25">
                <p className="text-xs font-bold text-[#111318] dark:text-white">{c.label}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <div
                    className="flex min-h-[44px] min-w-[10rem] flex-1 items-center gap-2 rounded-md border border-dashed border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-900"
                    onDragOver={onDragOver}
                    onDrop={(e) => onDropPreliminarySlot(e, c.id, 'a')}
                  >
                    <span
                      draggable={!!c.slotA}
                      onDragStart={(e) => c.slotA && onDragStartPreliminarySlot(e, c.id, 'a')}
                      className="min-w-0 flex-1 truncate text-sm font-semibold text-[#111318] dark:text-white"
                    >
                      {c.slotA ? nameById(c.slotA) : 'Slot jugador 1'}
                    </span>
                    {c.slotA ? (
                      <button type="button" className="text-xs text-red-600" onClick={() => setPreliminarySlot(c.id, 'a', null)}>
                        Quitar
                      </button>
                    ) : null}
                  </div>
                  <span className="text-xs font-bold text-[#616f89]">vs</span>
                  <div
                    className="flex min-h-[44px] min-w-[10rem] flex-1 items-center gap-2 rounded-md border border-dashed border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-900"
                    onDragOver={onDragOver}
                    onDrop={(e) => onDropPreliminarySlot(e, c.id, 'b')}
                  >
                    <span
                      draggable={!!c.slotB}
                      onDragStart={(e) => c.slotB && onDragStartPreliminarySlot(e, c.id, 'b')}
                      className="min-w-0 flex-1 truncate text-sm font-semibold text-[#111318] dark:text-white"
                    >
                      {c.slotB ? nameById(c.slotB) : 'Slot jugador 2'}
                    </span>
                    {c.slotB ? (
                      <button type="button" className="text-xs text-red-600" onClick={() => setPreliminarySlot(c.id, 'b', null)}>
                        Quitar
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[#616f89] dark:text-gray-500">
          {isMasters ? 'Semifinales (borrador)' : 'Cuartos de final (borrador)'}
        </p>
        <p className="mt-1 text-[11px] text-[#616f89] dark:text-gray-500">
          Arrastrá fichas desde clasificados a cada casilla. Podés intercambiar entre casillas arrastrando desde una casilla a otra.
        </p>
        <div className="mt-3 flex flex-col gap-4">
          {quarterCrosses.map((c) => (
            <div key={c.id} className="rounded-lg border border-gray-200/90 bg-gray-50/60 p-3 dark:border-gray-600 dark:bg-gray-950/40">
              <p className="text-xs font-bold text-[#111318] dark:text-white">{c.label}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div
                  className="flex min-h-[44px] min-w-[10rem] flex-1 items-center gap-2 rounded-md border border-dashed border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-900"
                  onDragOver={onDragOver}
                  onDrop={(e) => onDropQuarterSlot(e, c.id, 'a')}
                >
                  <span
                    draggable={!!c.slotA && !isRepechajeWaitToken(c.slotA)}
                    onDragStart={(e) => c.slotA && !isRepechajeWaitToken(c.slotA) && onDragStartQuarterSlot(e, c.id, 'a')}
                    className={`min-w-0 flex-1 truncate text-sm font-semibold ${
                      c.slotA && isRepechajeWaitToken(c.slotA)
                        ? 'text-amber-800 dark:text-amber-200'
                        : 'text-[#111318] dark:text-white'
                    }`}
                  >
                    {c.slotA
                      ? isRepechajeWaitToken(c.slotA)
                        ? `⏳ ${c.slotA} (tras repechaje)`
                        : nameById(c.slotA)
                      : 'Slot jugador 1'}
                  </span>
                  {c.slotA && !isRepechajeWaitToken(c.slotA) ? (
                    <button type="button" className="text-xs text-red-600" onClick={() => setQuarterSlot(c.id, 'a', null)}>
                      Quitar
                    </button>
                  ) : null}
                </div>
                <span className="text-xs font-bold text-[#616f89]">vs</span>
                <div
                  className="flex min-h-[44px] min-w-[10rem] flex-1 items-center gap-2 rounded-md border border-dashed border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-900"
                  onDragOver={onDragOver}
                  onDrop={(e) => onDropQuarterSlot(e, c.id, 'b')}
                >
                  <span
                    draggable={!!c.slotB && !isRepechajeWaitToken(c.slotB)}
                    onDragStart={(e) => c.slotB && !isRepechajeWaitToken(c.slotB) && onDragStartQuarterSlot(e, c.id, 'b')}
                    className={`min-w-0 flex-1 truncate text-sm font-semibold ${
                      c.slotB && isRepechajeWaitToken(c.slotB)
                        ? 'text-amber-800 dark:text-amber-200'
                        : 'text-[#111318] dark:text-white'
                    }`}
                  >
                    {c.slotB
                      ? isRepechajeWaitToken(c.slotB)
                        ? `⏳ ${c.slotB} (tras repechaje)`
                        : nameById(c.slotB)
                      : 'Slot jugador 2'}
                  </span>
                  {c.slotB && !isRepechajeWaitToken(c.slotB) ? (
                    <button type="button" className="text-xs text-red-600" onClick={() => setQuarterSlot(c.id, 'b', null)}>
                      Quitar
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {validation.length > 0 ? (
        <div className="rounded-lg border border-red-400/50 bg-red-50/90 px-3 py-2 dark:border-red-700/50 dark:bg-red-950/40">
          <p className="text-xs font-bold text-red-900 dark:text-red-100">Revisá antes de confirmar</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-red-900 dark:text-red-100/95">
            {validation.map((v, i) => (
              <li key={`${v.code}-${i}`}>{v.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} disabled={validation.length > 0} onClick={() => setConfirmOpen(true)}>
          Confirmar cruces
        </button>
      </div>

      <AdminConfirmDialog
        open={confirmOpen}
        title="Confirmar fase de eliminación"
        description={
          <div className="space-y-3 text-sm leading-relaxed text-[#616f89] dark:text-gray-400">
            <p>
              Se crearán los partidos pendientes de eliminación con estos cruces. Luego aparecerán en{' '}
              <strong>Fechas</strong> y <strong>Resultados</strong> para cargar sus marcadores.
            </p>
            <ul className="max-h-48 list-disc space-y-1 overflow-auto rounded-lg border border-gray-200/90 px-4 py-2 dark:border-gray-600">
              {[...crossesSummaryLines(preliminaryCrosses, nameById), ...crossesSummaryLines(quarterCrosses, nameById)].map((line) => (
                <li key={line} className="text-[#111318] dark:text-gray-200">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        }
        confirmLabel="Confirmar cruces"
        cancelLabel="Cancelar"
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          confirmPersist();
          return true;
        }}
      />
    </div>
  );
}

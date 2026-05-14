import { useEffect, useMemo, useRef, useState } from 'react';
import { Pencil, Save, Users, X } from 'lucide-react';
import type { GroupStandingEntry } from '@/lib/tennis/groupStandings';
import { normalizePlayerName } from '@/lib/tennis/matchStatsEngine';
import { getQualifiedPlayers, type GroupStandingsInput } from '@/lib/tennis/playoffQualification';
import { categoryToLeague, getPlayerById, type Tournament } from '@/lib/mockData';
import type { GroupTableWithSets } from '@/lib/mockData';
import type { LigaTemplate } from '@/types/tennisResults';
import type { LigaNumKey } from '@/lib/tennis/loadLigasFromDocs';
import type { AdminGroupRow } from '@/lib/admin/adminTournamentBuilderTypes';
import { refreshClubDataFromStorage, useClubData } from '@/lib/clubDataStore';
import { persistTournamentToStorage } from '@/lib/dataService';
import { getDataSourceMode } from '@/lib/data/tournamentRepository';
import { pushTournamentPreclasificacionToApi } from '@/lib/api/tournamentPreclasificacionApi';
import { groupRosterDraftMatchesTemplate } from '@/lib/tennis/tournamentSnapshotBridge';
import {
  computeRosterGroupMoves,
  migrateTournamentResultsForGroupChange,
} from '@/lib/tennis/migrateTournamentGroupRoster';
import { recalculateTournament } from '@/lib/tennis/recalculateTournament';
import { appendAdminAuditEntry, auditActionLabel } from '@/lib/admin/tournamentAuditLog';
import { useTennisLiveData } from '@/lib/tennis/useTennisLiveData';
import { effectiveTournamentCatalogType } from '@/lib/tennis/rankingPointsGreek500';
import { proposeMastersGroupRosterFromRankingRows } from '@/lib/tennis/masters1000Qualification';
import { createPreclasificacionSnapshot } from '@/lib/tennis/tournamentSeeding';
import { AdminTablaGroupBoard, type TablaBoardPlayer } from './AdminTablaGroupBoard';
import { AdminConfirmDialog } from '../AdminConfirmDialog';
import { AdminGlobalModal } from '../AdminGlobalModal';
import { useOptionalAdminTournamentSeed } from '../AdminTournamentSeedContext';

type Props = {
  groupTables: GroupTableWithSets[];
  templateHasGrupos: boolean;
  tournament: Tournament;
  ligaNum: LigaNumKey;
  template: LigaTemplate | null;
  readOnly?: boolean;
};

function playerLabel(playerId: string): string {
  return getPlayerById(playerId)?.name?.trim() ?? playerId.replace(/^name:/, '');
}

function groupTablesToStandingsInputs(groupTables: GroupTableWithSets[]): GroupStandingsInput[] {
  return groupTables.map((gt) => ({
    groupName: gt.name,
    rows: gt.rows.map((row): GroupStandingEntry => {
      const nm = normalizePlayerName(playerLabel(row.playerId));
      return {
        player: nm,
        position: row.position,
        played: row.PJ,
        won: row.PG ?? 0,
        lost: row.PP ?? 0,
        setsWon: row.setsWon,
        setsLost: row.setsLost,
        setsDifference: row.setDiff,
      };
    }),
  }));
}

function qualificationKey(groupName: string, playerNorm: string): string {
  return `${groupName}\x00${playerNorm}`;
}

function groupsFromTables(groupTables: GroupTableWithSets[]): AdminGroupRow[] {
  return groupTables.map((gt) => ({
    label: gt.name,
    playerIds: gt.rows.map((r) => r.playerId),
  }));
}

function draftRecordFromGroups(template: LigaTemplate, groups: AdminGroupRow[]): Record<string, string[]> {
  const keys = Object.keys(template.grupos);
  const out: Record<string, string[]> = {};
  keys.forEach((k, i) => {
    out[k] = [...(groups[i]?.playerIds ?? [])];
  });
  return out;
}

function idsInDraft(record: Record<string, string[]>): Set<string> {
  const s = new Set<string>();
  for (const ids of Object.values(record)) {
    for (const id of ids) s.add(id);
  }
  return s;
}

function groupPretty(templateKey: string): string {
  const t = templateKey.trim();
  if (t.length === 1 && /^[A-Za-z0-9]$/.test(t)) return `Grupo ${t.toUpperCase()}`;
  return t;
}

const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-bold shadow-sm transition-opacity admin-theme-btn';
const btnSecondary =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-[#111318] shadow-sm transition-colors dark:border-gray-600 dark:bg-gray-800 dark:text-white admin-theme-btn-secondary';

/** Números de estadísticas: mismo tono que cabeceras `app-data-table` en admin (sin verde/rojo). */
const adminTablaStatCell = 'text-[#616f89] dark:text-gray-400';

export function AdminTablaView({ groupTables, templateHasGrupos, tournament, ligaNum, template, readOnly = false }: Props) {
  const { players } = useClubData();
  const { rankingsByLeague } = useTennisLiveData();
  const seedFmt = useOptionalAdminTournamentSeed();
  const [groupEditOpen, setGroupEditOpen] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [proposeConfirmOpen, setProposeConfirmOpen] = useState(false);
  const [avail, setAvail] = useState<string[]>([]);
  const [groupsState, setGroupsState] = useState<AdminGroupRow[]>(() => groupsFromTables(groupTables));
  const [provisionalName, setProvisionalName] = useState('');
  const [saveBanner, setSaveBanner] = useState<{ text: string; error?: boolean } | null>(null);
  const initialDraftRef = useRef<Record<string, string[]> | null>(null);

  useEffect(() => {
    if (!groupEditOpen) {
      setGroupsState(groupsFromTables(groupTables));
    }
  }, [groupTables, groupEditOpen]);

  const isMasters1000 = effectiveTournamentCatalogType(tournament) === 'masters1000';

  const { directKeys, repechajeKeys } = useMemo(() => {
    const directKeys = new Set<string>();
    const repechajeKeys = new Set<string>();
    if (groupTables.length === 0) return { directKeys, repechajeKeys };

    if (isMasters1000) {
      for (const gt of groupTables) {
        for (const row of gt.rows) {
          if (row.position !== 1 && row.position !== 2) continue;
          directKeys.add(
            qualificationKey(gt.name, normalizePlayerName(playerLabel(row.playerId))),
          );
        }
      }
      return { directKeys, repechajeKeys };
    }

    try {
      const inputs = groupTablesToStandingsInputs(groupTables);
      const q = getQualifiedPlayers(inputs);
      for (const d of q.directQualified) {
        directKeys.add(qualificationKey(d.groupName, normalizePlayerName(d.player)));
      }
      for (const r of q.repechagePlayers) {
        repechajeKeys.add(qualificationKey(r.groupName, normalizePlayerName(r.player)));
      }
    } catch {
      /* vacío */
    }

    return { directKeys, repechajeKeys };
  }, [groupTables, isMasters1000]);

  const assignedIds = useMemo(() => {
    const s = new Set<string>();
    for (const g of groupsState) for (const id of g.playerIds) s.add(id);
    for (const id of avail) s.add(id);
    return s;
  }, [groupsState, avail]);

  const playerMap = useMemo(() => {
    const m = new Map<string, TablaBoardPlayer>();
    for (const p of players) {
      m.set(p.id, {
        id: p.id,
        displayName: seedFmt?.formatPlayerId(p.id) ?? p.name,
        leagueNum: categoryToLeague(p.category),
      });
    }
    for (const id of assignedIds) {
      if (!m.has(id)) {
        const nm = id.startsWith('name:') ? id.slice(5) : id;
        m.set(id, {
          id,
          displayName: seedFmt?.formatPlayerId(id) ?? nm,
          leagueNum: ligaNum,
        });
      }
    }
    return m;
  }, [players, assignedIds, ligaNum, seedFmt]);

  const clubCandidates = useMemo(() => {
    return players.filter((p) => categoryToLeague(p.category) === ligaNum && !assignedIds.has(p.id));
  }, [players, ligaNum, assignedIds]);

  const isDirty = useMemo(() => {
    if (!template || !initialDraftRef.current) return false;
    const cur = draftRecordFromGroups(template, groupsState);
    return JSON.stringify(cur) !== JSON.stringify(initialDraftRef.current);
  }, [template, groupsState]);

  const openGroupEdit = () => {
    if (!template || readOnly) return;
    setAvail([]);
    const gr = groupsFromTables(groupTables);
    setGroupsState(gr);
    initialDraftRef.current = draftRecordFromGroups(template, gr);
    setGroupEditOpen(true);
    setSaveBanner(null);
  };

  const cancelGroupEdit = () => {
    setGroupEditOpen(false);
    initialDraftRef.current = null;
    setSaveBanner(null);
  };

  const addCandidate = (playerId: string) => {
    setAvail((a) => (a.includes(playerId) ? a : [...a, playerId]));
  };

  const addProvisional = () => {
    const n = normalizePlayerName(provisionalName.trim());
    if (!n) return;
    const id = `name:${n}`;
    if (assignedIds.has(id)) return;
    setAvail((a) => [...a, id]);
    setProvisionalName('');
  };

  const applyRosterDraftAndPersist = (
    prevDraft: Record<string, string[]>,
    nextDraft: Record<string, string[]>,
    opts?: {
      closeGroupEdit?: boolean;
      successMsg?: string;
      extra?: Partial<Pick<Tournament, 'preclasificacion'>>;
    },
  ) => {
    if (!template) return;
    const prevIds = idsInDraft(prevDraft);
    const nextIds = idsInDraft(nextDraft);
    const tn = tournament.name;
    const moves = computeRosterGroupMoves(prevDraft, nextDraft);
    for (const mv of moves) {
      const reassigned = migrateTournamentResultsForGroupChange(tournament.id, mv.playerId, mv.from, mv.to);
      const pl = playerLabel(mv.playerId);
      const fromL = groupPretty(mv.from);
      const toL = groupPretty(mv.to);
      appendAdminAuditEntry({
        action: 'jugador_movido_grupo',
        actionLabel: auditActionLabel('jugador_movido_grupo'),
        tournamentId: tournament.id,
        tournamentName: tn,
        league: ligaNum,
        group: `${mv.from}→${mv.to}`,
        playersInvolved: pl,
        prevValue: fromL,
        newValue: toL,
        detail: `${pl} pasó de ${fromL} a ${toL}.`,
      });
      if (reassigned > 0) {
        appendAdminAuditEntry({
          action: 'resultado_reasignado_grupo',
          actionLabel: auditActionLabel('resultado_reasignado_grupo'),
          tournamentId: tournament.id,
          tournamentName: tn,
          league: ligaNum,
          group: toL,
          playersInvolved: pl,
          prevValue: String(reassigned),
          newValue: fromL,
          detail: `Por el movimiento de ${pl} (${fromL} → ${toL}), se reasignaron ${reassigned} resultado(s) guardado(s) al nuevo grupo.`,
        });
      }
    }
    for (const id of prevIds) {
      if (!nextIds.has(id)) {
        appendAdminAuditEntry({
          action: 'jugador_baja_plantel',
          actionLabel: auditActionLabel('jugador_baja_plantel'),
          tournamentId: tournament.id,
          tournamentName: tn,
          league: ligaNum,
          playersInvolved: playerLabel(id),
          detail: `${playerLabel(id)} salió del plantel de grupos (ya no figura en ningún grupo).`,
        });
      }
    }
    let newProvisionalCount = 0;
    for (const id of nextIds) {
      if (!prevIds.has(id) && id.startsWith('name:')) {
        newProvisionalCount += 1;
        appendAdminAuditEntry({
          action: 'jugador_provisorio_creado',
          actionLabel: auditActionLabel('jugador_provisorio_creado'),
          tournamentId: tournament.id,
          tournamentName: tn,
          league: ligaNum,
          playersInvolved: playerLabel(id),
          detail: `Jugador provisorio incorporado al plantel: ${playerLabel(id)}.`,
        });
      }
    }
    const bajasCount = [...prevIds].filter((id) => !nextIds.has(id)).length;
    if (moves.length > 0 || bajasCount > 0 || newProvisionalCount > 0) {
      appendAdminAuditEntry({
        action: 'plantel_grupos_guardado',
        actionLabel: auditActionLabel('plantel_grupos_guardado'),
        tournamentId: tournament.id,
        tournamentName: tn,
        league: ligaNum,
        detail: `Plantel de grupos guardado: ${moves.length} traslado(s) entre grupos, ${bajasCount} baja(s) del plantel, ${newProvisionalCount} provisorio(s) nuevo(s).`,
      });
    }
    const clearOverride = groupRosterDraftMatchesTemplate(tournament, template, nextDraft);
    const nextTournament: Tournament = {
      ...tournament,
      ...(opts?.extra ?? {}),
      groupRosterOverride: clearOverride ? undefined : nextDraft,
    };
    persistTournamentToStorage(nextTournament);
    if (getDataSourceMode() === 'api') {
      const prevKey =
        tournament.preclasificacion == null ? null : JSON.stringify(tournament.preclasificacion);
      const nextKey =
        nextTournament.preclasificacion == null ? null : JSON.stringify(nextTournament.preclasificacion);
      if (prevKey !== nextKey) {
        void pushTournamentPreclasificacionToApi(tournament.id, nextTournament.preclasificacion).catch(() => {});
      }
    }
    refreshClubDataFromStorage();
    const rec = recalculateTournament({ tournamentId: tournament.id, league: ligaNum });
    if (rec.ok) {
      setSaveBanner({
        text:
          opts?.successMsg ??
          'Plantel de grupos guardado. Los marcadores se movieron de grupo cuando correspondía. Torneo recalculado correctamente.',
      });
    } else {
      console.warn('[recalculateTournament] Tras guardar plantel:', rec.error);
      setSaveBanner({
        error: true,
        text: 'Plantel guardado, pero no se pudo recalcular. Revisá partidos incompletos o datos inconsistentes.',
      });
    }
    if (opts?.closeGroupEdit) {
      setGroupEditOpen(false);
      initialDraftRef.current = null;
    }
    window.setTimeout(() => setSaveBanner(null), 6500);
  };

  const saveGroupEdit = () => {
    if (!template || !initialDraftRef.current) return;
    applyRosterDraftAndPersist(initialDraftRef.current, draftRecordFromGroups(template, groupsState), {
      closeGroupEdit: true,
    });
  };

  if (!templateHasGrupos) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-12 text-left dark:border-gray-600">
        <p className="text-sm text-[#616f89] dark:text-gray-400">Esta liga no tiene grupos en la plantilla.</p>
      </div>
    );
  }

  if (groupTables.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-amber-500/40 bg-amber-50/50 px-6 py-12 dark:bg-amber-950/20">
        <p className="text-sm font-semibold text-[#111318] dark:text-white">Sin tabla aún</p>
        <p className="mt-2 text-xs text-[#616f89] dark:text-gray-400">Cargá marcadores en Resultados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-200/90 pb-2 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 shrink-0 admin-theme-icon" aria-hidden />
          <h2 className="text-lg font-bold text-[#111318] dark:text-white md:text-xl">Tabla</h2>
        </div>
        {!readOnly && template ? (
          <div className="flex flex-wrap gap-2">
            {effectiveTournamentCatalogType(tournament) === 'masters1000' ? (
              <button type="button" className={btnSecondary} onClick={() => setProposeConfirmOpen(true)}>
                Proponer top 8 (ranking)
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (groupEditOpen) {
                  if (isDirty) {
                    setDiscardDialogOpen(true);
                    return;
                  }
                  cancelGroupEdit();
                } else openGroupEdit();
              }}
              className={groupEditOpen ? btnSecondary : btnPrimary}
            >
              {groupEditOpen ? (
                <>
                  <X className="h-4 w-4" aria-hidden />
                  Cerrar edición
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4" aria-hidden />
                  Editar grupos
                </>
              )}
            </button>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-wide text-[#616f89] dark:text-gray-500">
        {isMasters1000 ? (
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 ring-2 ring-emerald-500/35"
              aria-hidden
            />{' '}
            Clasifican a semifinales
          </span>
        ) : (
          <>
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 ring-2 ring-emerald-500/35"
                aria-hidden
              />{' '}
              Cupo directo al playoff
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400 ring-2 ring-amber-400/45"
                aria-hidden
              />{' '}
              Repechaje (terceros)
            </span>
          </>
        )}
      </div>

      {saveBanner ? (
        <p
          className={
            saveBanner.error
              ? 'rounded-lg border border-red-500/45 bg-red-50 px-3 py-2 text-sm font-medium text-red-900 dark:border-red-800 dark:bg-red-950/35 dark:text-red-100'
              : 'rounded-lg border border-emerald-500/40 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100'
          }
        >
          {saveBanner.text}
        </p>
      ) : null}

      {groupEditOpen && template ? (
        <AdminGlobalModal
          open={groupEditOpen}
          onClose={() => {
            if (isDirty) {
              setDiscardDialogOpen(true);
              return;
            }
            cancelGroupEdit();
          }}
          labelledBy="admin-tabla-edicion-grupos-title"
          panelClassName="max-w-6xl"
        >
          <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p id="admin-tabla-edicion-grupos-title" className="text-sm font-bold text-[#111318] dark:text-white">
              Modo edición de grupos
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={btnSecondary}
                onClick={() => {
                  if (isDirty) {
                    setDiscardDialogOpen(true);
                    return;
                  }
                  cancelGroupEdit();
                }}
              >
                Cancelar
              </button>
              <button type="button" className={btnPrimary} disabled={!isDirty} onClick={saveGroupEdit}>
                <Save className="h-4 w-4" aria-hidden />
                Guardar plantel
              </button>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-[#616f89] dark:text-gray-400">
            Arrastrá fichas entre grupos o hacia «disponibles». Al guardar, los resultados ya cargados del jugador se
            reasignan al nuevo grupo cuando corresponde. El calendario del documento no se reescribe: revisá Fechas si
            hace falta.
          </p>
          <div className="flex flex-wrap items-end gap-2 border-b border-gray-200/80 pb-3 dark:border-gray-700">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wide text-[#616f89] dark:text-gray-500">
                Jugador provisorio (no está en el club)
              </label>
              <input
                value={provisionalName}
                onChange={(e) => setProvisionalName(e.target.value)}
                placeholder="Apellido Nombre"
                className="admin-input-editable w-full max-w-xs rounded-md border px-2 py-1.5 text-sm dark:bg-gray-900"
              />
            </div>
            <button type="button" className={btnSecondary} onClick={addProvisional}>
              Agregar provisorio
            </button>
          </div>
          {clubCandidates.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#616f89] dark:text-gray-500">
                Agregar del club a disponibles
              </p>
              <div className="flex flex-wrap gap-1.5">
                {clubCandidates.slice(0, 24).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addCandidate(p.id)}
                    className="rounded-md border border-gray-200/90 bg-white px-2 py-1 text-[11px] font-semibold text-[#111318] hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
                  >
                    + {p.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <AdminTablaGroupBoard
            leagueNum={ligaNum}
            availablePlayerIds={avail}
            groups={groupsState}
            playerMap={playerMap}
            disabled={readOnly}
            onChange={({ availablePlayerIds, groups }) => {
              setAvail(availablePlayerIds);
              setGroupsState(groups);
            }}
          />
          </div>
        </AdminGlobalModal>
      ) : null}

      <div className={groupEditOpen ? 'pointer-events-none opacity-40 transition-opacity' : ''}>
        {groupTables.map((gt) => (
          <section key={gt.name} className="admin-theme-card app-glass-panel overflow-hidden rounded-xl shadow-sm">
            <div className="border-b border-gray-200/90 bg-gray-50 px-4 py-3 dark:border-gray-600/70 dark:bg-gray-800/50">
              <h3 className="font-bold text-[#111318] dark:text-white">{gt.name}</h3>
            </div>
            <div className="overflow-x-auto p-4 md:p-6">
              <table className="app-data-table w-full min-w-0 table-fixed border-collapse text-sm">
                <colgroup>
                  <col className="w-[3.25rem]" />
                  <col className="min-w-0" />
                  <col className="hidden md:table-column md:w-[2.75rem]" />
                  <col className="w-9 md:w-[2.75rem]" />
                  <col className="w-9 md:w-[2.75rem]" />
                  {/* Móvil: solo sets (fila); desktop: S+, S−, gam+, gam− */}
                  <col className="w-[2.125rem] max-md:table-column md:hidden" />
                  <col className="hidden w-11 md:table-column" />
                  <col className="hidden w-11 md:table-column" />
                  <col className="hidden w-11 md:table-column" />
                  <col className="hidden w-11 md:table-column" />
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-200 text-left text-[11px] uppercase tracking-wider text-[#616f89] dark:border-gray-600 dark:text-gray-500">
                    <th className="py-2 pr-2">Pos.</th>
                    <th className="min-w-0 py-2 pr-2">Jugador</th>
                    <th className="hidden py-2 pr-2 text-center tabular-nums md:table-cell">PJ</th>
                    <th className="py-2 pl-1 pr-0 text-right tabular-nums md:px-2 md:text-center">PG</th>
                    <th className="py-2 pl-1 pr-0 text-right tabular-nums md:px-2 md:text-center">PP</th>
                    <th className="py-2 pl-1 pr-0 text-right text-[10px] tabular-nums normal-case md:hidden">Sets</th>
                    <th className="hidden py-2 pr-2 text-center tabular-nums md:table-cell">S+</th>
                    <th className="hidden py-2 pr-2 text-center tabular-nums md:table-cell">S−</th>
                    <th className="hidden py-2 pr-2 text-center tabular-nums normal-case whitespace-nowrap md:table-cell">
                      gam+
                    </th>
                    <th className="hidden py-2 pr-2 text-center tabular-nums normal-case whitespace-nowrap md:table-cell">
                      gam−
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {gt.rows.map((row) => {
                    const label = seedFmt?.formatPlayerId(row.playerId) ?? playerLabel(row.playerId);
                    // Misma clave que `groupTablesToStandingsInputs` / `getQualifiedPlayers` (no el alias de semilla).
                    const qKey = qualificationKey(gt.name, normalizePlayerName(playerLabel(row.playerId)));
                    const isDirect = directKeys.has(qKey);
                    const isRepechaje = !isMasters1000 && repechajeKeys.has(qKey);
                    const posBadgeClass = isDirect
                      ? 'bg-emerald-500/20 dark:bg-emerald-500/25 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/45 dark:ring-emerald-400/45'
                      : isRepechaje
                        ? 'bg-amber-400/25 dark:bg-amber-500/15 text-amber-950 dark:text-amber-100 ring-2 ring-amber-400/50 dark:ring-amber-400/40'
                        : 'bg-slate-200/90 dark:bg-slate-700/70 text-[#616f89] dark:text-slate-200 ring-1 ring-slate-300/70 dark:ring-slate-600';
                    const qTitle = isDirect
                      ? isMasters1000
                        ? 'Clasifican a semifinales'
                        : 'Cupo directo al playoff'
                      : isRepechaje
                        ? 'Repechaje entre terceros'
                        : undefined;
                    return (
                      <tr key={row.playerId} className="border-b border-gray-100 transition-colors admin-theme-hover-row dark:border-gray-700/80">
                        <td className="py-2 pr-2">
                          <span
                            title={qTitle}
                            className={`inline-flex min-h-7 min-w-[1.75rem] items-center justify-center rounded-full px-1 tabular-nums text-sm font-semibold leading-none shrink-0 ${posBadgeClass}`}
                          >
                            {row.position}
                          </span>
                        </td>
                        <td className="min-w-0 overflow-hidden py-2 pr-2 font-medium text-[#111318] dark:text-gray-100">
                          <span className="block truncate" title={label}>
                            {label}
                          </span>
                        </td>
                        <td className={`hidden py-2 pr-2 text-center tabular-nums md:table-cell ${adminTablaStatCell}`}>
                          {row.PJ}
                        </td>
                        <td className={`py-2 pl-1 pr-0 text-right tabular-nums md:px-2 md:text-center ${adminTablaStatCell}`}>
                          {row.PG ?? '—'}
                        </td>
                        <td className={`py-2 pl-1 pr-0 text-right tabular-nums md:px-2 md:text-center ${adminTablaStatCell}`}>
                          {row.PP ?? '—'}
                        </td>
                        <td className={`py-2 pl-1 pr-0 text-right text-xs tabular-nums leading-none md:hidden ${adminTablaStatCell}`}>
                          {row.setsWon}-{row.setsLost}
                        </td>
                        <td className={`hidden py-2 pr-2 text-center tabular-nums md:table-cell ${adminTablaStatCell}`}>
                          {row.setsWon}
                        </td>
                        <td className={`hidden py-2 pr-2 text-center tabular-nums md:table-cell ${adminTablaStatCell}`}>
                          {row.setsLost}
                        </td>
                        <td className={`hidden py-2 pr-2 text-center tabular-nums md:table-cell ${adminTablaStatCell}`}>
                          {row.gamesWon}
                        </td>
                        <td className={`hidden py-2 pr-2 text-center tabular-nums md:table-cell ${adminTablaStatCell}`}>
                          {row.gamesLost}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      <AdminConfirmDialog
        open={discardDialogOpen}
        title="Descartar cambios en grupos"
        description="¿Descartar los cambios? No se guardará el plantel editado."
        confirmLabel="Descartar"
        variant="danger"
        onClose={() => setDiscardDialogOpen(false)}
        onConfirm={() => {
          cancelGroupEdit();
          return true;
        }}
      />

      <AdminConfirmDialog
        open={proposeConfirmOpen}
        title="Proponer clasificados desde ranking"
        description={
          <>
            Se asignarán los 8 mejores posicionados del ranking de esta liga a los grupos A y B (reparto serpiente: A ={' '}
            posiciones 1, 4, 5 y 8; B = 2, 3, 6 y 7). Se reemplaza el plantel actual del torneo.
          </>
        }
        confirmLabel="Aplicar"
        onClose={() => setProposeConfirmOpen(false)}
        onConfirm={() => {
          if (!template) return true;
          const rows = rankingsByLeague.get(ligaNum) ?? [];
          const res = proposeMastersGroupRosterFromRankingRows(rows);
          if (!res.ok) {
            setSaveBanner({ error: true, text: res.message });
            window.setTimeout(() => setSaveBanner(null), 8000);
            setProposeConfirmOpen(false);
            return true;
          }
          const prevDraft =
            tournament.groupRosterOverride ?? draftRecordFromGroups(template, groupsFromTables(groupTables));
          applyRosterDraftAndPersist(prevDraft, res.override, {
            successMsg:
              'Plantel Master Finals actualizado desde el ranking (top 8, grupos A/B). Torneo recalculado correctamente.',
            extra: {
              preclasificacion: createPreclasificacionSnapshot(
                res.rankingOrderedTopEight,
                'Top 8 ranking (Master Finals)',
              ),
            },
          });
          setProposeConfirmOpen(false);
          return true;
        }}
      />
    </div>
  );
}

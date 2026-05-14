import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Search, Users } from 'lucide-react';
import { useClubData } from '@/lib/clubDataStore';
import type { AdminTournamentProject, BuilderWizardStep } from '@/lib/admin/adminTournamentBuilderTypes';
import {
  ELIMINATION_START_LABELS,
  type AdminLeagueBuilderSlice,
  type AdminLeagueGroupConfig,
  type AdminReplacementEntry,
  type AdminSyntheticPlayer,
} from '@/lib/admin/adminTournamentBuilderTypes';
import {
  buildEmptyGroups,
  defaultLeagueConfig,
  leagueKey,
  mergePoolIds,
  validateGroupsForLeague,
} from '@/lib/admin/adminTournamentBuilderDomain';
import {
  loadAdminTournamentProjects,
  saveAdminTournamentProjects,
  upsertProject,
} from '@/lib/admin/adminTournamentBuilderStorage';
import { getLeagueColor } from '@/lib/leagueColors';
import type { LeagueNum, Player } from '@/lib/mockData';
import { LEAGUES, categoryToLeague, leagueToCategory } from '@/lib/mockData';
import { showAdminPlayerMutationsUi } from '@/config/adminFeatures';
import { persistWizardQuickPlayer } from '../players/AdminPlayersAbm';
import { useAdminRequestNavigate, useSafeAdminNavigate } from '../AdminUnsavedChangesContext';
import { UnsavedChangesGuard } from '../UnsavedChangesGuard';
import { AdminConfirmDialog } from '../AdminConfirmDialog';
import { AdminGlobalModal } from '../AdminGlobalModal';
import { AdminCmsEditorLayout } from '../components/AdminCmsEditorLayout';
import { TournamentGroupsBoard, type BoardPlayer } from './TournamentGroupsBoard';

const inputBase =
  'w-full rounded-md admin-input-editable dark:bg-gray-900 text-[#111318] dark:text-white placeholder:text-[#616f89] dark:placeholder:text-gray-500 outline-none transition-all px-3 py-2.5 text-sm';
const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-bold border shadow-sm transition-opacity admin-theme-btn';
const btnSecondary =
  'inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-bold border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-[#111318] dark:text-white admin-theme-btn-secondary transition-colors';

const LIFECYCLE_LABEL: Record<AdminTournamentProject['lifecycle'], string> = {
  draft: 'Borrador',
  groups_configured: 'Grupos configurados',
  fixture_generated: 'Fixture generado',
  active: 'Activo',
  finished: 'Finalizado',
};

function newReplId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `repl-${crypto.randomUUID()}`;
  return `repl-${Date.now()}`;
}

function emptySlice(ln: LeagueNum): AdminLeagueBuilderSlice {
  return {
    leagueNum: ln,
    config: null,
    availablePlayerIds: [],
    groups: [],
    groupsLocked: false,
    groupsCommitted: null,
  };
}

export function AdminTournamentBuilderWizard({
  project,
  onProjectUpdated,
}: {
  project: AdminTournamentProject;
  onProjectUpdated: () => void;
}) {
  const club = useClubData();
  const safeNav = useSafeAdminNavigate();
  const requestNavigate = useAdminRequestNavigate();
  const [draft, setDraft] = useState<AdminTournamentProject>(project);
  const [step, setStep] = useState<BuilderWizardStep>('meta');
  const [leagueIndex, setLeagueIndex] = useState(0);
  const [summaryLeague, setSummaryLeague] = useState<LeagueNum>(1);
  const [error, setError] = useState<string | null>(null);
  const [groupIssues, setGroupIssues] = useState<string[]>([]);
  const [subOpen, setSubOpen] = useState(false);
  const [subQuery, setSubQuery] = useState('');
  const [subCreate, setSubCreate] = useState(false);
  const [subFirst, setSubFirst] = useState('');
  const [subLast, setSubLast] = useState('');
  const [fixtureWarn, setFixtureWarn] = useState(false);

  useEffect(() => {
    if (!showAdminPlayerMutationsUi) setSubCreate(false);
  }, [showAdminPlayerMutationsUi]);

  useEffect(() => {
    setDraft(project);
  }, [project.id, project.updatedAt]);

  const builderDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(project), [draft, project]);

  const discardBuilder = useCallback(() => {
    setDraft(project);
    setStep('meta');
    setLeagueIndex(0);
    const sorted = [...project.selectedLeagues].sort((a, b) => a - b);
    setSummaryLeague(sorted[0] ?? 1);
    setError(null);
    setGroupIssues([]);
    setSubOpen(false);
    setSubQuery('');
    setSubCreate(false);
    setSubFirst('');
    setSubLast('');
    setFixtureWarn(false);
  }, [project]);

  const guardStep = useCallback((fn: () => void) => requestNavigate(fn), [requestNavigate]);

  const patchProject = useCallback(
    (mutator: (cur: AdminTournamentProject) => AdminTournamentProject) => {
      const list = loadAdminTournamentProjects();
      const cur = list.find((x) => x.id === project.id);
      if (!cur) return;
      const next = mutator(cur);
      saveAdminTournamentProjects(upsertProject(list, next));
      setDraft(next);
      onProjectUpdated();
    },
    [project.id, onProjectUpdated],
  );

  const leaguesSorted = useMemo(() => [...draft.selectedLeagues].sort((a, b) => a - b), [draft.selectedLeagues]);
  const currentLeague: LeagueNum | undefined = leaguesSorted[leagueIndex];

  useEffect(() => {
    if (leaguesSorted.length && !leaguesSorted.includes(summaryLeague)) {
      setSummaryLeague(leaguesSorted[0]);
    }
  }, [leaguesSorted, summaryLeague]);

  const playerBoardMap = useMemo(() => {
    const m = new Map<string, BoardPlayer>();
    for (const p of club.players) {
      m.set(p.id, {
        id: p.id,
        displayName: p.name,
        leagueNum: categoryToLeague(p.category),
      });
    }
    for (const s of draft.syntheticPlayers) {
      m.set(s.id, {
        id: s.id,
        displayName: `${s.firstName} ${s.lastName}`.trim(),
        leagueNum: s.leagueNum,
        tag: 'Reemplazante / nuevo',
      });
    }
    return m;
  }, [club.players, draft.syntheticPlayers]);

  const patchLeague = (ln: LeagueNum, patch: Partial<AdminLeagueBuilderSlice>) => {
    patchProject((d) => {
      const k = leagueKey(ln);
      const prev = d.leagues[k] ?? emptySlice(ln);
      return { ...d, leagues: { ...d.leagues, [k]: { ...prev, ...patch, leagueNum: ln } } };
    });
  };

  const saveDraft = () => {
    setError(null);
    patchProject((d) => ({ ...d, lifecycle: d.lifecycle === 'finished' ? 'finished' : 'draft' }));
  };

  const onMetaNext = () => {
    setError(null);
    if (!draft.name.trim()) {
      setError('Indicá el nombre del torneo.');
      return;
    }
    if (!draft.startDate || !draft.endDate) {
      setError('Completá fechas de inicio y fin.');
      return;
    }
    patchProject((d) => ({ ...d, name: d.name.trim(), shortDescription: d.shortDescription.trim() }));
    setStep('leagues');
  };

  const toggleLeague = (n: LeagueNum) => {
    patchProject((d) => {
      const set = new Set(d.selectedLeagues);
      if (set.has(n)) set.delete(n);
      else set.add(n);
      return { ...d, selectedLeagues: Array.from(set) as LeagueNum[] };
    });
  };

  const onLeaguesNext = () => {
    if (draft.selectedLeagues.length === 0) {
      setError('Elegí al menos una liga.');
      return;
    }
    setLeagueIndex(0);
    const first = [...draft.selectedLeagues].sort((a, b) => a - b)[0];
    const nk = leagueKey(first);
    patchProject((d) => {
      if (d.leagues[nk]?.config) return d;
      const prev = d.leagues[nk] ?? emptySlice(first);
      return { ...d, leagues: { ...d.leagues, [nk]: { ...prev, config: defaultLeagueConfig(), leagueNum: first } } };
    });
    setStep('league_config');
  };

  const goGroupsFromConfig = () => {
    if (!currentLeague) return;
    patchProject((d) => {
      const k = leagueKey(currentLeague);
      const slice = d.leagues[k];
      if (!slice?.config) return d;
      const cfg = { ...slice.config };
      let groups = slice.groups;
      let avail = slice.availablePlayerIds;
      if (groups.length === 0 || groups.length !== cfg.groupCount) {
        groups = buildEmptyGroups(cfg);
        avail = mergePoolIds(
          club.players,
          currentLeague,
          d.syntheticPlayers.filter((s) => s.leagueNum === currentLeague).map((s) => s.id),
        );
      }
      return {
        ...d,
        leagues: {
          ...d.leagues,
          [k]: { ...slice, config: cfg, groups, availablePlayerIds: avail, groupsLocked: false, leagueNum: currentLeague },
        },
      };
    });
    setStep('league_groups');
    setGroupIssues([]);
  };

  const afterLeagueGroupsNext = () => {
    if (leagueIndex + 1 < leaguesSorted.length) {
      const nextL = leaguesSorted[leagueIndex + 1];
      setLeagueIndex((i) => i + 1);
      const nk = leagueKey(nextL);
      patchProject((d) => {
        if (d.leagues[nk]?.config) return d;
        const prev = d.leagues[nk] ?? emptySlice(nextL);
        return { ...d, leagues: { ...d.leagues, [nk]: { ...prev, config: defaultLeagueConfig(), leagueNum: nextL } } };
      });
      setStep('league_config');
    } else {
      setStep('summary');
    }
  };

  const confirmGroups = () => {
    if (!currentLeague) return;
    const k = leagueKey(currentLeague);
    const slice = draft.leagues[k];
    if (!slice?.config) return;
    const allowed = new Set(
      mergePoolIds(
        club.players,
        currentLeague,
        draft.syntheticPlayers.filter((s) => s.leagueNum === currentLeague).map((s) => s.id),
      ),
    );
    const issues = validateGroupsForLeague(slice);
    const msgs = issues.map((i) => i.message);
    for (const g of slice.groups) {
      for (const pid of g.playerIds) {
        if (!allowed.has(pid)) msgs.push(`Hay un jugador que no pertenece a la liga ${currentLeague}.`);
      }
    }
    for (const pid of slice.availablePlayerIds) {
      if (!allowed.has(pid)) msgs.push('Hay jugadores en disponibles que no corresponden a esta liga.');
    }
    if (msgs.length) {
      setGroupIssues(msgs);
      return;
    }
    setGroupIssues([]);
    const committed = slice.groups.map((g) => ({ ...g, playerIds: [...g.playerIds] }));
    patchProject((d) => {
      const cur = d.leagues[k];
      if (!cur) return d;
      return {
        ...d,
        lifecycle: d.lifecycle === 'draft' ? 'groups_configured' : d.lifecycle,
        leagues: {
          ...d.leagues,
          [k]: {
            ...cur,
            groupsLocked: true,
            groupsCommitted: committed,
            groups: cur.groups.map((g) => ({ ...g, playerIds: [...g.playerIds] })),
          },
        },
      };
    });
  };

  const unlockGroups = () => {
    if (draft.resultsCommitted) {
      setError('Con resultados cargados solo se permiten reemplazos controlados desde el resumen.');
      return;
    }
    if (draft.fixtureGenerated) {
      setFixtureWarn(true);
      return;
    }
    if (!currentLeague) return;
    patchLeague(currentLeague, { groupsLocked: false });
  };

  const doUnlockAfterFixture = () => {
    setFixtureWarn(false);
    if (!currentLeague) return;
    patchLeague(currentLeague, { groupsLocked: false });
  };

  const generateFixture = () => {
    patchProject((d) => ({ ...d, fixtureGenerated: true, lifecycle: 'fixture_generated' }));
  };

  const openSubstitute = () => {
    setSubQuery('');
    setSubCreate(false);
    setSubFirst('');
    setSubLast('');
    setSubOpen(true);
  };

  const addSynthetic = () => {
    if (!showAdminPlayerMutationsUi) return;
    if (!currentLeague) return;
    const fn = subFirst.trim();
    const ln = subLast.trim();
    if (!fn || !ln) {
      setError('Completá nombre y apellido.');
      return;
    }
    const id = `p-admin-${Date.now()}`;
    persistWizardQuickPlayer({ id, firstName: fn, lastName: ln, leagueNum: currentLeague });
    const syn: AdminSyntheticPlayer = {
      id,
      firstName: fn,
      lastName: ln,
      leagueNum: currentLeague,
      createdAt: new Date().toISOString(),
    };
    patchProject((d) => {
      const k = leagueKey(currentLeague);
      const slice = d.leagues[k] ?? emptySlice(currentLeague);
      const avail = slice.availablePlayerIds.includes(syn.id) ? slice.availablePlayerIds : [...slice.availablePlayerIds, syn.id];
      return {
        ...d,
        syntheticPlayers: [...d.syntheticPlayers, syn],
        leagues: { ...d.leagues, [k]: { ...slice, availablePlayerIds: avail, leagueNum: currentLeague } },
      };
    });
    setSubOpen(false);
    setError(null);
  };

  const pickExistingForSubstitute = (p: Player) => {
    if (!currentLeague) return;
    const k = leagueKey(currentLeague);
    patchProject((d) => {
      const slice = d.leagues[k] ?? emptySlice(currentLeague);
      const avail = slice.availablePlayerIds.includes(p.id) ? slice.availablePlayerIds : [...slice.availablePlayerIds, p.id];
      return { ...d, leagues: { ...d.leagues, [k]: { ...slice, availablePlayerIds: avail, leagueNum: currentLeague } } };
    });
    setSubOpen(false);
  };

  const applyReplacement = (outId: string, inId: string, reason: string) => {
    patchProject((d) => {
      const k = leagueKey(summaryLeague);
      const slice = d.leagues[k];
      if (!slice) return d;
      const entry: AdminReplacementEntry = {
        id: newReplId(),
        at: new Date().toISOString(),
        leagueNum: summaryLeague,
        outgoingPlayerId: outId,
        incomingPlayerId: inId,
        reason: reason.trim() || undefined,
      };
      const groups = slice.groups.map((g) => ({
        ...g,
        playerIds: g.playerIds.map((id) => (id === outId ? inId : id)),
      }));
      const avail = slice.availablePlayerIds.filter((id) => id !== inId);
      return {
        ...d,
        replacementHistory: [...d.replacementHistory, entry],
        leagues: { ...d.leagues, [k]: { ...slice, groups, availablePlayerIds: avail, leagueNum: summaryLeague } },
      };
    });
  };

  const statusPill = (
    <span className="inline-flex rounded-full border border-gray-300 bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#111318] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
      {LIFECYCLE_LABEL[draft.lifecycle]}
    </span>
  );

  const headerSubtitle =
    step === 'meta'
      ? 'Paso 1 · Datos generales del torneo'
      : step === 'leagues'
        ? 'Elegí qué ligas se van a jugar'
        : step === 'league_config'
          ? `Paso configuración · Liga ${currentLeague ?? '—'}`
          : step === 'league_groups'
            ? `Paso armado de grupos · Liga ${currentLeague ?? '—'}`
            : 'Resumen del proyecto';

  const sliceForBoard: AdminLeagueBuilderSlice | null =
    currentLeague != null ? draft.leagues[leagueKey(currentLeague)] ?? null : null;

  return (
    <div className="space-y-6">
      <UnsavedChangesGuard
        isDirty={builderDirty}
        canSaveDraft
        onSaveDraft={async () => {
          saveDraft();
        }}
        onDiscard={discardBuilder}
      />
      <button
        type="button"
        onClick={() => safeNav('/admin/torneos')}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#616f89] hover:text-[#111318] dark:text-gray-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver al listado de torneos
      </button>

      <AdminCmsEditorLayout breadcrumb={<>Torneos › Constructor</>} title={draft.name.trim() || 'Torneo sin nombre'} subtitle={headerSubtitle} statusBadge={statusPill}>
        {error ? (
          <p className="mb-3 text-sm font-medium text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        {step === 'meta' && (
          <div className="app-glass-panel space-y-5 rounded-xl border border-gray-200/90 p-5 dark:border-gray-600 md:p-7">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-[#111318] dark:text-gray-200">Nombre del torneo</label>
                <input
                  className={inputBase}
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="Ej. Copa Primavera"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-[#111318] dark:text-gray-200">Imagen principal</label>
                <input
                  type="file"
                  accept="image/*"
                  className="text-sm text-[#616f89]"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (!f || !f.type.startsWith('image/')) return;
                    const r = new FileReader();
                    r.onload = () => {
                      const url = typeof r.result === 'string' ? r.result : '';
                      if (url) setDraft((d) => ({ ...d, coverImageDataUrl: url }));
                    };
                    r.readAsDataURL(f);
                  }}
                />
                {draft.coverImageDataUrl ? (
                  <img src={draft.coverImageDataUrl} alt="" className="mt-2 max-h-36 rounded-lg border object-cover" />
                ) : null}
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-[#111318] dark:text-gray-200">Descripción corta</label>
                <textarea
                  className={`${inputBase} min-h-[88px]`}
                  value={draft.shortDescription}
                  onChange={(e) => setDraft((d) => ({ ...d, shortDescription: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#111318] dark:text-gray-200">Fecha inicio</label>
                <input type="date" className={inputBase} value={draft.startDate} onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#111318] dark:text-gray-200">Fecha fin</label>
                <input type="date" className={inputBase} value={draft.endDate} onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#111318] dark:text-gray-200">Estado del proyecto</label>
                <select
                  className={inputBase}
                  value={draft.lifecycle}
                  onChange={(e) => setDraft((d) => ({ ...d, lifecycle: e.target.value as AdminTournamentProject['lifecycle'] }))}
                >
                  {(Object.keys(LIFECYCLE_LABEL) as AdminTournamentProject['lifecycle'][]).map((k) => (
                    <option key={k} value={k}>
                      {LIFECYCLE_LABEL[k]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-gray-200/80 pt-4 dark:border-gray-600">
              <button type="button" className={btnPrimary} onClick={onMetaNext}>
                Siguiente: ligas
              </button>
              <button type="button" className={btnSecondary} onClick={() => patchProject(() => draft)}>
                Guardar borrador
              </button>
            </div>
          </div>
        )}

        {step === 'leagues' && (
          <div className="app-glass-panel space-y-5 rounded-xl border border-gray-200/90 p-5 dark:border-gray-600 md:p-7">
            <p className="text-sm text-[#616f89] dark:text-gray-400">Marcá las ligas que participan. Los colores son los del sistema.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {LEAGUES.map((n) => {
                const active = draft.selectedLeagues.includes(n);
                const c = getLeagueColor(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => toggleLeague(n)}
                    className={`rounded-xl border-2 px-4 py-4 text-left transition-all ${
                      active ? `${c.border} ${c.bg} shadow-sm` : 'border-gray-200/90 bg-white dark:border-gray-600 dark:bg-gray-900/40'
                    }`}
                  >
                    <span className={`text-sm font-bold ${active ? 'text-[#111318] dark:text-white' : 'text-[#616f89]'}`}>Liga {n}</span>
                    <p className="mt-1 text-xs text-[#616f89] dark:text-gray-500">Toca para incluir o quitar</p>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-gray-200/80 pt-4 dark:border-gray-600">
              <button type="button" className={btnSecondary} onClick={() => guardStep(() => setStep('meta'))}>
                Atrás
              </button>
              <button type="button" className={btnPrimary} onClick={onLeaguesNext}>
                Siguiente: configurar ligas
              </button>
              <button type="button" className={btnSecondary} onClick={saveDraft}>
                Guardar borrador
              </button>
            </div>
          </div>
        )}

        {step === 'league_config' && currentLeague != null && (
          <>
            <LeagueConfigForm
              leagueNum={currentLeague}
              config={draft.leagues[leagueKey(currentLeague)]?.config ?? defaultLeagueConfig()}
              onChange={(cfg) => patchLeague(currentLeague, { config: cfg })}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className={btnSecondary}
                onClick={() =>
                  guardStep(() => {
                    if (leagueIndex > 0) {
                      setLeagueIndex((i) => i - 1);
                      setStep('league_groups');
                    } else {
                      setStep('leagues');
                    }
                  })
                }
              >
                Atrás
              </button>
              <button type="button" className={btnPrimary} onClick={goGroupsFromConfig}>
                Ir a armar grupos
              </button>
              <button type="button" className={btnSecondary} onClick={saveDraft}>
                Guardar borrador
              </button>
            </div>
          </>
        )}

        {step === 'league_groups' && currentLeague != null && sliceForBoard?.config && (
          <div className="space-y-4">
            <div className="app-glass-panel rounded-xl border border-gray-200/90 p-4 text-sm text-[#616f89] dark:border-gray-600 dark:text-gray-400">
              <p className="font-semibold text-[#111318] dark:text-white">Resumen · Liga {currentLeague}</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>{sliceForBoard.config.groupCount} grupos</li>
                <li>~{sliceForBoard.config.playersPerGroupExpected} jugadores por grupo</li>
                <li>Clasifican los {sliceForBoard.config.qualifyTopN} primeros</li>
                <li>Repechaje mejores terceros: {sliceForBoard.config.repechajeMejoresTerceros ? 'Sí' : 'No'}</li>
                <li>Eliminación desde: {ELIMINATION_START_LABELS[sliceForBoard.config.eliminationStart]}</li>
              </ul>
            </div>

            {groupIssues.length ? (
              <div className="rounded-lg border border-red-200 bg-red-50/90 p-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100">
                <p className="font-bold">Revisá antes de confirmar</p>
                <ul className="mt-2 list-inside list-disc">
                  {groupIssues.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <TournamentGroupsBoard
              leagueNum={currentLeague}
              availablePlayerIds={sliceForBoard.availablePlayerIds}
              groups={sliceForBoard.groups}
              playerMap={playerBoardMap}
              expectedPerGroup={sliceForBoard.config.playersPerGroupExpected}
              disabled={sliceForBoard.groupsLocked}
              onChange={({ availablePlayerIds, groups }) => patchLeague(currentLeague, { availablePlayerIds, groups })}
            />

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={btnSecondary} onClick={() => guardStep(() => setStep('league_config'))}>
                Atrás a configuración
              </button>
              <button type="button" className={btnSecondary} onClick={openSubstitute}>
                <Plus className="h-4 w-4" aria-hidden />
                Agregar reemplazante
              </button>
              {!sliceForBoard.groupsLocked ? (
                <button type="button" className={btnPrimary} onClick={confirmGroups}>
                  Confirmar grupos
                </button>
              ) : (
                <button type="button" className={btnPrimary} onClick={unlockGroups}>
                  Editar grupos
                </button>
              )}
              <span className="text-xs font-semibold text-[#616f89] dark:text-gray-500">
                {sliceForBoard.groupsLocked ? 'Grupos confirmados' : 'Edición temporal (arrastrá y soltá)'}
              </span>
              <button type="button" className={`${btnSecondary} ml-auto`} onClick={afterLeagueGroupsNext} disabled={!sliceForBoard.groupsLocked}>
                {leagueIndex + 1 < leaguesSorted.length ? 'Siguiente liga' : 'Ir a resumen'}
              </button>
            </div>
            {!sliceForBoard.groupsLocked ? (
              <p className="text-xs text-amber-800 dark:text-amber-200/90">Confirmá los grupos para desbloquear el paso a la siguiente liga o al resumen.</p>
            ) : null}
          </div>
        )}

        {step === 'summary' && (
          <div className="app-glass-panel space-y-5 rounded-xl border border-gray-200/90 p-5 dark:border-gray-600 md:p-7">
            <div className="flex items-center gap-2 text-[#111318] dark:text-white">
              <Users className="h-5 w-5" aria-hidden />
              <h3 className="text-lg font-bold">Resumen</h3>
            </div>
            <p className="text-sm text-[#616f89] dark:text-gray-400">
              El proyecto se guarda en el navegador (clave dedicada). No modifica el catálogo de torneos del sitio ni el workspace operativo actual.
            </p>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#616f89]">Liga para reemplazos</label>
              <select className={inputBase} value={summaryLeague} onChange={(e) => setSummaryLeague(Number(e.target.value) as LeagueNum)}>
                {leaguesSorted.map((n) => (
                  <option key={n} value={n}>
                    Liga {n}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.fixtureGenerated}
                onChange={(e) =>
                  patchProject((d) => ({
                    ...d,
                    fixtureGenerated: e.target.checked,
                    lifecycle: e.target.checked ? 'fixture_generated' : d.lifecycle === 'fixture_generated' ? 'groups_configured' : d.lifecycle,
                  }))
                }
              />
              Fixture generado (simulación)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.resultsCommitted}
                onChange={(e) => patchProject((d) => ({ ...d, resultsCommitted: e.target.checked }))}
              />
              Hay resultados cargados (bloquea edición de grupos; permite reemplazos)
            </label>
            <div className="flex flex-wrap gap-2 border-t border-gray-200/80 pt-4 dark:border-gray-600">
              <button
                type="button"
                className={btnSecondary}
                onClick={() =>
                  guardStep(() => {
                    setLeagueIndex(Math.max(0, leaguesSorted.length - 1));
                    setStep('league_groups');
                  })
                }
              >
                Volver a última liga
              </button>
              <button type="button" className={btnPrimary} onClick={generateFixture} disabled={draft.fixtureGenerated}>
                Generar fixture
              </button>
              <button type="button" className={btnSecondary} onClick={saveDraft}>
                Guardar borrador
              </button>
            </div>
            {draft.replacementHistory.length > 0 ? (
              <div>
                <p className="text-sm font-bold text-[#111318] dark:text-white">Historial de reemplazos</p>
                <ul className="mt-2 max-h-48 overflow-auto text-xs text-[#616f89] dark:text-gray-400">
                  {draft.replacementHistory.map((r) => (
                    <li key={r.id}>
                      {r.at.slice(0, 10)} · Liga {r.leagueNum}: {r.outgoingPlayerId} → {r.incomingPlayerId}
                      {r.reason ? ` · ${r.reason}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {draft.resultsCommitted ? (
              <ReplacementMiniForm players={[...club.players, ...draft.syntheticPlayers.map(synToPseudoPlayer)]} leagueNum={summaryLeague} onApply={applyReplacement} />
            ) : null}
          </div>
        )}
      </AdminCmsEditorLayout>

      <AdminConfirmDialog
        open={fixtureWarn}
        title="Editar grupos con fixture generado"
        description={<p>Cambiar grupos puede afectar el fixture ya armado. ¿Querés desbloquear el armado visual de todas formas?</p>}
        confirmLabel="Sí, desbloquear"
        cancelLabel="Cancelar"
        onClose={() => setFixtureWarn(false)}
        onConfirm={doUnlockAfterFixture}
      />

      {subOpen && currentLeague != null ? (
        <AdminGlobalModal
          open={subOpen}
          onClose={() => setSubOpen(false)}
          labelledBy="admin-builder-substitute-title"
          panelClassName="max-w-lg"
        >
            <h3 id="admin-builder-substitute-title" className="text-lg font-bold text-[#111318] dark:text-white">Agregar reemplazante · Liga {currentLeague}</h3>
            <div className="mt-3 flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[#616f89]" aria-hidden />
                <input className={`${inputBase} pl-9`} placeholder="Buscar jugador…" value={subQuery} onChange={(e) => setSubQuery(e.target.value)} />
              </div>
            </div>
            {showAdminPlayerMutationsUi ? (
              <>
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={subCreate} onChange={(e) => setSubCreate(e.target.checked)} />
                  Crear jugador nuevo
                </label>
                {subCreate ? (
                  <p className="mt-1 text-xs text-[#616f89] dark:text-gray-500">
                    Se guarda en el catálogo del club (mismo listado que Jugadores en el panel) y queda disponible para este torneo.
                  </p>
                ) : null}
                {subCreate ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <input className={inputBase} placeholder="Nombre" value={subFirst} onChange={(e) => setSubFirst(e.target.value)} />
                    <input className={inputBase} placeholder="Apellido" value={subLast} onChange={(e) => setSubLast(e.target.value)} />
                    <button type="button" className={`${btnPrimary} sm:col-span-2`} onClick={addSynthetic}>
                      Crear y sumar a disponibles
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
            {!subCreate || !showAdminPlayerMutationsUi ? (
              <ul className="mt-3 max-h-52 space-y-1 overflow-auto text-sm">
                {club.players
                  .filter((p) => categoryToLeague(p.category) === currentLeague)
                  .filter((p) => p.name.toLowerCase().includes(subQuery.toLowerCase()))
                  .slice(0, 40)
                  .map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="w-full rounded-md px-2 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => pickExistingForSubstitute(p)}
                      >
                        {p.name}
                      </button>
                    </li>
                  ))}
              </ul>
            ) : null}
            <button type="button" className={`${btnSecondary} mt-4 w-full`} onClick={() => setSubOpen(false)}>
              Cerrar
            </button>
        </AdminGlobalModal>
      ) : null}
    </div>
  );
}

function synToPseudoPlayer(s: AdminSyntheticPlayer): Player {
  return {
    id: s.id,
    name: `${s.firstName} ${s.lastName}`.trim(),
    category: leagueToCategory(s.leagueNum),
  };
}

function LeagueConfigForm({
  leagueNum,
  config,
  onChange,
}: {
  leagueNum: LeagueNum;
  config: AdminLeagueGroupConfig;
  onChange: (c: AdminLeagueGroupConfig) => void;
}) {
  const c = getLeagueColor(leagueNum);
  return (
    <div className={`app-glass-panel space-y-4 rounded-xl border border-gray-200/90 p-5 dark:border-gray-600 md:p-7 ${c.borderTop}`}>
      <h3 className="text-base font-bold text-[#111318] dark:text-white">
        Liga {leagueNum} · <span className={c.badge}>colores del sistema</span>
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#616f89]">Cantidad de grupos</label>
          <input
            type="number"
            min={1}
            max={26}
            className={inputBase}
            value={config.groupCount}
            onChange={(e) => onChange({ ...config, groupCount: Math.max(1, Math.min(26, Number(e.target.value) || 1)) })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#616f89]">Jugadores por grupo (esperado)</label>
          <input
            type="number"
            min={1}
            max={64}
            className={inputBase}
            value={config.playersPerGroupExpected}
            onChange={(e) => onChange({ ...config, playersPerGroupExpected: Math.max(1, Number(e.target.value) || 1) })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#616f89]">Clasifican por grupo (primeros N)</label>
          <input
            type="number"
            min={1}
            max={16}
            className={inputBase}
            value={config.qualifyTopN}
            onChange={(e) => onChange({ ...config, qualifyTopN: Math.max(1, Number(e.target.value) || 1) })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#616f89]">Fase inicial de eliminación</label>
          <select
            className={inputBase}
            value={config.eliminationStart}
            onChange={(e) => onChange({ ...config, eliminationStart: e.target.value as AdminLeagueGroupConfig['eliminationStart'] })}
          >
            {(Object.keys(ELIMINATION_START_LABELS) as AdminLeagueGroupConfig['eliminationStart'][]).map((k) => (
              <option key={k} value={k}>
                {ELIMINATION_START_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 sm:col-span-2 text-sm">
          <input type="checkbox" checked={config.repechajeMejoresTerceros} onChange={(e) => onChange({ ...config, repechajeMejoresTerceros: e.target.checked })} />
          Mejores terceros juegan repechaje
        </label>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-[#616f89]">Reglas de clasificación (texto libre)</label>
          <textarea className={`${inputBase} min-h-[100px]`} value={config.classificationRulesText} onChange={(e) => onChange({ ...config, classificationRulesText: e.target.value })} />
        </div>
      </div>
    </div>
  );
}

function ReplacementMiniForm({
  players,
  leagueNum,
  onApply,
}: {
  players: Player[];
  leagueNum: LeagueNum;
  onApply: (outId: string, inId: string, reason: string) => void;
}) {
  const [outId, setOutId] = useState('');
  const [inId, setInId] = useState('');
  const [reason, setReason] = useState('');
  const pool = players.filter((p) => categoryToLeague(p.category) === leagueNum);
  return (
    <div className="rounded-lg border border-amber-200/80 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
      <p className="text-sm font-bold text-amber-950 dark:text-amber-100">Reemplazo controlado</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold">Jugador que sale</label>
          <select className={inputBase} value={outId} onChange={(e) => setOutId(e.target.value)}>
            <option value="">Elegir…</option>
            {pool.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold">Reemplazante</label>
          <select className={inputBase} value={inId} onChange={(e) => setInId(e.target.value)}>
            <option value="">Elegir…</option>
            {pool.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold">Motivo (opcional)</label>
          <input className={inputBase} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <button
          type="button"
          className={btnPrimary}
          disabled={!outId || !inId || outId === inId}
          onClick={() => {
            onApply(outId, inId, reason);
            setOutId('');
            setInId('');
            setReason('');
          }}
        >
          Confirmar reemplazo
        </button>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useId, useMemo, useState, type ChangeEvent } from 'react';
import { Pencil, Plus, Power, PowerOff, Save, Trash2, X } from 'lucide-react';
import { LeagueBadge } from '../../../../components/LeagueBadge';
import { refreshClubDataFromStorage, useClubData } from '@/lib/clubDataStore';
import { getData, saveData, PERSISTENCE_KEYS } from '@/lib/localPersistence';
import type { CategoryKey, LeagueNum, Match, Player } from '@/lib/mockData';
import { CATEGORIES, LEAGUES, categoryToLeague, leagueToCategory } from '@/lib/mockData';
import { uiFormatPointsCell } from '@/lib/playerUiFormat';
import { useTennisLiveData } from '@/lib/tennis/useTennisLiveData';
import type { MatchInput } from '@/data/types';
import { useAdminRequestNavigate } from '../AdminUnsavedChangesContext';
import { UnsavedChangesGuard } from '../UnsavedChangesGuard';
import { AdminConfirmDialog } from '../AdminConfirmDialog';
import { AdminGlobalModal } from '../AdminGlobalModal';
import { appendAdminAuditEntry, auditActionLabel, DEFAULT_AUDIT_USER } from '@/lib/admin/tournamentAuditLog';
import { showAdminPlayerMutationsUi } from '@/config/adminFeatures';
import { AdminCmsEditorLayout } from '../components/AdminCmsEditorLayout';

const inputBase =
  'w-full rounded-md admin-input-editable dark:bg-gray-900 text-[#111318] dark:text-white placeholder:text-[#616f89] dark:placeholder:text-gray-500 outline-none transition-all px-3 py-2.5 text-sm disabled:opacity-55';

const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-bold border shadow-sm transition-opacity admin-theme-btn';
const btnSecondary =
  'inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-bold border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-[#111318] dark:text-white admin-theme-btn-secondary transition-colors';
const btnDanger =
  'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-bold border border-red-500/50 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors';
const btnMuted =
  'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold border border-gray-200 text-[#616f89] hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800/80 transition-colors';

type LeagueTab = 'all' | LeagueNum;

type PlayerFormState = {
  id: string;
  firstName: string;
  lastName: string;
  category: CategoryKey;
  nationality: string;
  playingHand: 'Derecha' | 'Zurdo' | '';
  birthDate: string;
  heightCmInput: string;
  rosterActive: boolean;
  profileVisibility: 'visible' | 'hidden';
  profileImage: string | undefined;
  nickname: string;
  profileBio: string;
  internalNotes: string;
};

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: '', last: parts[0]! };
  const last = parts[parts.length - 1]!;
  const first = parts.slice(0, -1).join(' ');
  return { first, last };
}

function emptyForm(id: string): PlayerFormState {
  return {
    id,
    firstName: '',
    lastName: '',
    category: 'Primera',
    nationality: 'Argentina',
    playingHand: '',
    birthDate: '',
    heightCmInput: '',
    rosterActive: true,
    profileVisibility: 'visible',
    profileImage: undefined,
    nickname: '',
    profileBio: '',
    internalNotes: '',
  };
}

function formFromPlayer(p: Player): PlayerFormState {
  const { first, last } = splitName(p.name);
  return {
    id: p.id,
    firstName: first,
    lastName: last || p.name.trim(),
    category: p.category,
    nationality: p.nationality?.trim() ?? '',
    playingHand: p.playingHand ?? '',
    birthDate: p.birthDate?.slice(0, 10) ?? '',
    heightCmInput: p.heightCm != null && p.heightCm > 0 ? String(Math.round(p.heightCm)) : '',
    rosterActive: p.rosterActive !== false,
    profileVisibility: p.profileVisibility === 'hidden' ? 'hidden' : 'visible',
    profileImage: p.profileImage,
    nickname: p.nickname?.trim() ?? '',
    profileBio: p.profileBio?.trim() ?? '',
    internalNotes: p.internalNotes?.trim() ?? '',
  };
}

function serializeForm(f: PlayerFormState): string {
  return JSON.stringify(f);
}

function parseHeightCmInput(input: string): { cm?: number; error?: string } {
  const t = input.trim().replace(',', '.');
  if (!t) return {};
  if (/^\d+$/.test(t)) {
    const n = Number.parseInt(t, 10);
    if (n < 100 || n > 250) return { error: 'Altura entre 100 y 250 cm.' };
    return { cm: n };
  }
  const fnum = Number.parseFloat(t);
  if (!Number.isFinite(fnum)) return { error: 'Formato inválido.' };
  if (fnum > 0 && fnum < 3) {
    const cm = Math.round(fnum * 100);
    if (cm >= 100 && cm <= 250) return { cm };
  }
  return { error: 'Usá cm (185) o metros (1,85).' };
}

function validateForm(f: PlayerFormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.firstName.trim()) e.firstName = 'El nombre es obligatorio.';
  if (!f.lastName.trim()) e.lastName = 'El apellido es obligatorio.';
  if (!f.category) e.category = 'Elegí una liga / categoría.';
  const h = parseHeightCmInput(f.heightCmInput);
  if (h.error) e.heightCmInput = h.error;
  if (f.birthDate.trim()) {
    const d = new Date(f.birthDate);
    if (Number.isNaN(d.getTime())) e.birthDate = 'Fecha inválida.';
    else {
      const y = d.getFullYear();
      if (y < 1920 || y > new Date().getFullYear()) e.birthDate = 'Revisá el año.';
    }
  }
  return e;
}

function buildPlayerRow(base: Player | undefined, f: PlayerFormState): Player {
  const name = `${f.firstName.trim()} ${f.lastName.trim()}`.trim();
  const h = parseHeightCmInput(f.heightCmInput);
  const merged: Player = {
    ...(base ?? { id: f.id, name, category: f.category }),
    id: f.id.trim(),
    name,
    category: f.category,
    nationality: f.nationality.trim() || 'Argentina',
    birthDate: f.birthDate.trim() || undefined,
    heightCm: h.cm,
    playingHand: f.playingHand === 'Derecha' || f.playingHand === 'Zurdo' ? f.playingHand : undefined,
    rosterActive: f.rosterActive,
    profileVisibility: f.profileVisibility,
    profileImage: f.profileImage?.trim() || undefined,
    nickname: f.nickname.trim() || undefined,
    profileBio: f.profileBio.trim() || undefined,
    internalNotes: f.internalNotes.trim() || undefined,
  };
  return merged;
}

function readPersistedPlayers(key: string): Player[] {
  const raw = getData<unknown>(key);
  return Array.isArray(raw) ? (raw as Player[]) : [];
}

function persistPlayers(key: string, list: Player[]): void {
  saveData(key, list);
  refreshClubDataFromStorage();
}

function playerLeague(p: Player): LeagueNum {
  return categoryToLeague(p.category);
}

function resolvePhotoSrc(raw: string | undefined): string {
  if (!raw?.trim()) return '';
  const t = raw.trim();
  if (t.startsWith('data:') || /^https?:\/\//i.test(t)) return t;
  try {
    return new URL(`../../../../img/${t}`, import.meta.url).href;
  } catch {
    return '';
  }
}

function playerHasMatchHistory(playerId: string, matches: Match[], knockout: Match[], results: MatchInput[]): boolean {
  for (const m of matches) {
    if (m.playerA === playerId || m.playerB === playerId) return true;
  }
  for (const m of knockout) {
    if (m.playerA === playerId || m.playerB === playerId) return true;
  }
  for (const m of results) {
    if (m.playerA === playerId || m.playerB === playerId) return true;
  }
  return false;
}

function isPersistedOverride(playerId: string, key: string): boolean {
  return readPersistedPlayers(key).some((p) => p.id === playerId);
}

/** Alta mínima desde el constructor (reemplazantes): mismo almacenamiento que el ABM de jugadores. */
export function persistWizardQuickPlayer(input: {
  id: string;
  firstName: string;
  lastName: string;
  leagueNum: LeagueNum;
}): void {
  if (!showAdminPlayerMutationsUi) return;
  const fn = input.firstName.trim();
  const ln = input.lastName.trim();
  if (!fn || !ln) return;
  const key = PERSISTENCE_KEYS.jugadores;
  const category = leagueToCategory(input.leagueNum);
  const row: Player = {
    id: input.id.trim(),
    name: `${fn} ${ln}`.trim(),
    category,
    nationality: 'Argentina',
    rosterActive: true,
    profileVisibility: 'visible',
  };
  const persisted = readPersistedPlayers(key);
  const next = [...persisted.filter((p) => p.id !== row.id), row];
  persistPlayers(key, next);
  appendAdminAuditEntry({
    userLabel: DEFAULT_AUDIT_USER,
    action: 'jugador_catalogo_creado',
    actionLabel: auditActionLabel('jugador_catalogo_creado'),
    tournamentId: null,
    league: input.leagueNum,
    playersInvolved: row.name,
    detail: `Alta rápida desde constructor: ${row.name} (liga ${input.leagueNum}).`,
  });
}

export function AdminPlayersCrud() {
  const key = PERSISTENCE_KEYS.jugadores;
  const club = useClubData();
  const { results, knockoutMerged, rankingsByLeague } = useTennisLiveData();
  const requestNavigate = useAdminRequestNavigate();

  const [leagueTab, setLeagueTab] = useState<LeagueTab>('all');
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'idle' | 'create' | 'edit'>('idle');
  const [form, setForm] = useState<PlayerFormState>(emptyForm(''));
  const [baseline, setBaseline] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Player | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Player | null>(null);
  const photoInputId = useId();

  const matches = useMemo(() => (Array.isArray(club.matches) ? club.matches : []), [club.matches]);

  const onPickPhoto = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file?.type.startsWith('image/')) {
      setBanner('Elegí un archivo de imagen.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const r = typeof reader.result === 'string' ? reader.result : '';
      if (r) setForm((f) => ({ ...f, profileImage: r }));
    };
    reader.readAsDataURL(file);
  }, []);

  const isDirty = mode !== 'idle' && serializeForm(form) !== baseline;

  const leagueTabs = useMemo(() => [{ id: 'all' as const, label: 'Todas' }, ...LEAGUES.map((n) => ({ id: n, label: `Liga ${n}` }))], []);

  const filteredByLeague = useMemo(() => {
    const all = [...club.players];
    if (leagueTab === 'all') {
      return all.sort((a, b) => {
        const la = playerLeague(a);
        const lb = playerLeague(b);
        if (la !== lb) return la - lb;
        return a.name.localeCompare(b.name, 'es');
      });
    }
    const L = leagueTab;
    return all
      .filter((p) => playerLeague(p) === L)
      .sort((a, b) => {
        const ra = rankingsByLeague.get(L)?.find((r) => r.playerId === a.id);
        const rb = rankingsByLeague.get(L)?.find((r) => r.playerId === b.id);
        const pa = ra?.position ?? 9999;
        const pb = rb?.position ?? 9999;
        if (pa !== pb) return pa - pb;
        return a.name.localeCompare(b.name, 'es');
      });
  }, [club.players, leagueTab, rankingsByLeague]);

  const q = search.trim().toLowerCase();
  const filteredPlayers = useMemo(() => {
    if (!q) return filteredByLeague;
    return filteredByLeague.filter((p) => {
      const { first, last } = splitName(p.name);
      const nick = (p.nickname ?? '').toLowerCase();
      const league = String(playerLeague(p));
      const cat = p.category.toLowerCase();
      const hay = [p.name, first, last, nick, league, cat].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [filteredByLeague, q]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const cancelForm = useCallback(() => {
    setMode('idle');
    setForm(emptyForm(''));
    setBaseline('');
    setFieldErrors({});
    setBanner(null);
  }, []);

  useEffect(() => {
    if (!showAdminPlayerMutationsUi && mode !== 'idle') {
      cancelForm();
      setDeleteTarget(null);
      setDeactivateTarget(null);
    }
  }, [showAdminPlayerMutationsUi, mode, cancelForm]);

  const startCreate = () => {
    if (!showAdminPlayerMutationsUi) return;
    setBanner(null);
    const id = `p-admin-${Date.now()}`;
    const next = emptyForm(id);
    setForm(next);
    setBaseline(serializeForm(next));
    setFieldErrors({});
    setMode('create');
  };

  const startEdit = (row: Player) => {
    if (!showAdminPlayerMutationsUi) return;
    setBanner(null);
    const next = formFromPlayer(row);
    setForm(next);
    setBaseline(serializeForm(next));
    setFieldErrors({});
    setMode('edit');
  };

  const persistUpsert = (row: Player) => {
    const persisted = readPersistedPlayers(key);
    const next = [...persisted.filter((x) => x.id !== row.id), row];
    persistPlayers(key, next);
  };

  const submitForm = useCallback((): boolean => {
    if (!showAdminPlayerMutationsUi) return false;
    const errs = validateForm(form);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setBanner('Revisá los campos obligatorios.');
      return false;
    }
    const base = club.players.find((p) => p.id === form.id);
    const row = buildPlayerRow(base, form);
    const persisted = readPersistedPlayers(key);
    if (mode === 'create') {
      if (persisted.some((x) => x.id === row.id)) {
        setBanner('No se pudo crear: probá de nuevo.');
        return false;
      }
      persistPlayers(key, [...persisted, row]);
      appendAdminAuditEntry({
        userLabel: DEFAULT_AUDIT_USER,
        action: 'jugador_catalogo_creado',
        actionLabel: auditActionLabel('jugador_catalogo_creado'),
        tournamentId: null,
        league: playerLeague(row),
        playersInvolved: row.name,
        detail: `Alta en catálogo de jugadores: ${row.name} (liga ${playerLeague(row)}).`,
      });
      setToast('Jugador creado correctamente.');
    } else {
      const without = persisted.filter((x) => x.id !== row.id);
      persistPlayers(key, [...without, row]);
      setToast('Cambios guardados correctamente.');
    }
    cancelForm();
    return true;
  }, [form, mode, club.players, key, cancelForm, showAdminPlayerMutationsUi]);

  const applyDeactivate = (row: Player) => {
    if (!showAdminPlayerMutationsUi) return;
    const base = club.players.find((p) => p.id === row.id) ?? row;
    const next = { ...base, rosterActive: false };
    persistUpsert(next);
    appendAdminAuditEntry({
      userLabel: DEFAULT_AUDIT_USER,
      action: 'jugador_catalogo_desactivado',
      actionLabel: auditActionLabel('jugador_catalogo_desactivado'),
      tournamentId: null,
      league: playerLeague(next),
      playersInvolved: next.name,
      prevValue: 'activo',
      newValue: 'desactivado',
      detail: `Jugador dado de baja (desactivado en catálogo): ${next.name} (liga ${playerLeague(next)}).`,
    });
    setDeactivateTarget(null);
    setToast('Jugador desactivado. Conserva historial y estadísticas.');
    if (mode === 'edit' && form.id === row.id) cancelForm();
  };

  const applyActivate = (row: Player) => {
    if (!showAdminPlayerMutationsUi) return;
    const base = club.players.find((p) => p.id === row.id) ?? row;
    const next = { ...base, rosterActive: true };
    persistUpsert(next);
    setToast('Jugador activado correctamente.');
  };

  const applyDelete = (row: Player) => {
    if (!showAdminPlayerMutationsUi) return;
    const persisted = readPersistedPlayers(key);
    if (!persisted.some((x) => x.id === row.id)) {
      setBanner('Solo se eliminan del almacenamiento local jugadores agregados o ya guardados desde el panel.');
      setDeleteTarget(null);
      return;
    }
    persistPlayers(
      key,
      persisted.filter((x) => x.id !== row.id),
    );
    setDeleteTarget(null);
    setToast('Jugador eliminado del almacenamiento local.');
  };

  const deleteHasHistory = deleteTarget ? playerHasMatchHistory(deleteTarget.id, matches, knockoutMerged, results) : false;

  const initials = `${form.firstName[0] ?? ''}${form.lastName[0] ?? ''}`.toUpperCase() || '?';
  const photoPreview = resolvePhotoSrc(form.profileImage);

  const editorFooter = (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => submitForm()} className={btnPrimary}>
          <Save className="h-4 w-4 shrink-0" aria-hidden />
          {mode === 'create' ? 'Guardar jugador' : 'Guardar cambios'}
        </button>
        <button type="button" onClick={() => requestNavigate(() => cancelForm())} className={btnSecondary}>
          Cancelar
        </button>
      </div>
      {mode === 'edit' && showAdminPlayerMutationsUi ? (
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => setDeactivateTarget(club.players.find((p) => p.id === form.id) ?? null)}
            className={`${btnSecondary} border-amber-500/40 text-amber-900 dark:text-amber-200`}
          >
            <PowerOff className="h-4 w-4 shrink-0" aria-hidden />
            Desactivar jugador
          </button>
          <button type="button" onClick={() => setDeleteTarget(club.players.find((p) => p.id === form.id) ?? null)} className={btnMuted}>
            <Trash2 className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            Eliminar definitivamente
          </button>
        </div>
      ) : null}
    </div>
  );

  if (mode !== 'idle') {
    return (
      <>
        <UnsavedChangesGuard
          isDirty={isDirty}
          canSaveDraft={false}
          onSaveDraft={() => {}}
          onDiscard={cancelForm}
          bodyHint="Si salís ahora, las modificaciones del jugador pueden perderse."
          onCommitSave={() => submitForm()}
        />
        <AdminGlobalModal
          open={mode !== 'idle'}
          onClose={() => requestNavigate(() => cancelForm())}
          panelClassName="max-w-6xl"
        >
          <AdminCmsEditorLayout
            breadcrumb={<>Datos › Jugadores</>}
            onBack={() => requestNavigate(() => cancelForm())}
            backLabel="← Volver al listado"
            title={mode === 'create' ? 'Nuevo jugador' : 'Editar jugador'}
            subtitle={
              mode === 'create'
                ? 'Cargá los datos básicos del jugador para incorporarlo al club.'
                : 'Modificá solo datos básicos; ranking y estadísticas se calculan solos desde partidos y torneos.'
            }
            footer={editorFooter}
          >
            {banner ? (
              <p className="mb-4 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100" role="status">
                {banner}
              </p>
            ) : null}
          <div className="space-y-6 rounded-xl border border-gray-200/90 p-5 dark:border-gray-600/70 md:p-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-[#111318] dark:text-gray-200">Nombre</label>
                    <input
                      className={inputBase}
                      value={form.firstName}
                      onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    />
                    {fieldErrors.firstName ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.firstName}</p> : null}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-[#111318] dark:text-gray-200">Apellido</label>
                    <input
                      className={inputBase}
                      value={form.lastName}
                      onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    />
                    {fieldErrors.lastName ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.lastName}</p> : null}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-[#111318] dark:text-gray-200">Liga / categoría</label>
                    <select
                      className={inputBase}
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as CategoryKey }))}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.category ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.category}</p> : null}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-[#111318] dark:text-gray-200">Nacionalidad</label>
                    <input
                      className={inputBase}
                      value={form.nationality}
                      onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))}
                      placeholder="Vacío = Argentina"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-[#111318] dark:text-gray-200">Mano hábil</label>
                    <select
                      className={inputBase}
                      value={form.playingHand}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          playingHand: e.target.value === 'Zurdo' || e.target.value === 'Derecha' ? e.target.value : '',
                        }))
                      }
                    >
                      <option value="">—</option>
                      <option value="Derecha">Derecha</option>
                      <option value="Zurdo">Zurdo</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-[#111318] dark:text-gray-200">Fecha de nacimiento</label>
                    <input
                      type="date"
                      className={inputBase}
                      value={form.birthDate}
                      onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
                    />
                    {fieldErrors.birthDate ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.birthDate}</p> : null}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#111318] dark:text-gray-200">Altura (cm o metros)</label>
                  <input
                    className={inputBase}
                    value={form.heightCmInput}
                    onChange={(e) => setForm((f) => ({ ...f, heightCmInput: e.target.value }))}
                    placeholder="Ej. 185 o 1,85"
                  />
                  {fieldErrors.heightCmInput ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.heightCmInput}</p> : null}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-[#111318] dark:text-white">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-gray-300 text-primary focus:ring-primary/40"
                      checked={form.rosterActive}
                      onChange={(e) => setForm((f) => ({ ...f, rosterActive: e.target.checked }))}
                    />
                    Activo en plantel
                  </label>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-[#111318] dark:text-gray-200">Visibilidad del perfil</label>
                    <select
                      className={inputBase}
                      value={form.profileVisibility}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, profileVisibility: e.target.value === 'hidden' ? 'hidden' : 'visible' }))
                      }
                    >
                      <option value="visible">Visible</option>
                      <option value="hidden">Oculto</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#111318] dark:text-gray-200">Apodo (opcional)</label>
                  <input className={inputBase} value={form.nickname} onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#111318] dark:text-gray-200">Descripción corta (opcional)</label>
                  <textarea
                    className={`${inputBase} min-h-[88px] resize-y`}
                    rows={3}
                    maxLength={400}
                    value={form.profileBio}
                    onChange={(e) => setForm((f) => ({ ...f, profileBio: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#111318] dark:text-gray-200">Observaciones internas (opcional)</label>
                  <textarea
                    className={`${inputBase} min-h-[72px] resize-y`}
                    rows={2}
                    value={form.internalNotes}
                    onChange={(e) => setForm((f) => ({ ...f, internalNotes: e.target.value }))}
                    placeholder="Solo visible en este panel."
                  />
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-[#616f89] dark:text-gray-500">Foto</p>
                <div className="overflow-hidden rounded-xl border border-gray-200/90 dark:border-gray-600">
                  <div className="aspect-square w-full max-w-[220px] overflow-hidden bg-gray-100 dark:bg-gray-900/50">
                    {photoPreview ? (
                      <img src={photoPreview} alt="" className="h-full w-full object-cover object-top" />
                    ) : (
                      <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-1">
                        <span className="text-4xl font-bold text-[#111318] dark:text-white">{initials}</span>
                        <span className="text-[10px] uppercase tracking-wider text-[#616f89]">Sin foto</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 border-t border-gray-200/90 p-3 dark:border-gray-600">
                    <input id={photoInputId} type="file" accept="image/*" className="sr-only" onChange={onPickPhoto} />
                    <label htmlFor={photoInputId} className={`${btnSecondary} cursor-pointer justify-center text-center text-xs`}>
                      Cambiar foto
                    </label>
                    {form.profileImage ? (
                      <button type="button" onClick={() => setForm((f) => ({ ...f, profileImage: undefined }))} className={btnMuted}>
                        <X className="h-3.5 w-3.5" aria-hidden />
                        Eliminar foto
                      </button>
                    ) : null}
                    <p className="text-[10px] leading-snug text-[#616f89] dark:text-gray-500">
                      {/* Reemplazar por upload al servidor cuando exista backend. */}
                      La imagen se guarda en este navegador (Base64). Más adelante se puede sustituir por subida real.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </AdminCmsEditorLayout>
        </AdminGlobalModal>
        {toast ? (
          <div className="fixed bottom-6 left-1/2 z-[240] -translate-x-1/2 rounded-full border border-emerald-500/40 bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg">
            {toast}
          </div>
        ) : null}
        <AdminConfirmDialog
          open={showAdminPlayerMutationsUi && !!deactivateTarget}
          title="Desactivar jugador"
          description={
            deactivateTarget ? (
              <p>
                ¿Querés desactivar a <strong>{deactivateTarget.name}</strong>? Ya no estará disponible para nuevos torneos, pero conservará su
                historial.
              </p>
            ) : null
          }
          confirmLabel="Sí, desactivar"
          cancelLabel="Cancelar"
          variant="default"
          onClose={() => setDeactivateTarget(null)}
          onConfirm={() => {
            if (deactivateTarget) applyDeactivate(deactivateTarget);
          }}
        />
        {showAdminPlayerMutationsUi && deleteTarget ? (
          <AdminGlobalModal
            open={!!deleteTarget}
            onClose={() => setDeleteTarget(null)}
            labelledBy="del-pl-editor-title"
            panelClassName="max-w-lg"
          >
              <h2 id="del-pl-editor-title" className={`text-lg font-bold ${deleteHasHistory ? 'text-red-800 dark:text-red-200' : 'text-[#111318] dark:text-white'}`}>
                {deleteHasHistory ? 'Eliminar jugador con historial' : 'Eliminar jugador'}
              </h2>
              <div className="mt-3 text-sm leading-relaxed text-[#616f89] dark:text-gray-400">
                {deleteHasHistory ? (
                  <p className="font-medium text-red-700 dark:text-red-300">
                    Este jugador tiene partidos o torneos asociados. Eliminarlo puede afectar el historial. Se recomienda desactivarlo.
                  </p>
                ) : (
                  <p>
                    ¿Seguro que querés eliminar a <strong className="text-[#111318] dark:text-white">{deleteTarget.name}</strong>? Esta acción no se puede
                    deshacer.
                  </p>
                )}
                {!isPersistedOverride(deleteTarget.id, key) ? (
                  <p className="mt-3 text-xs text-amber-800 dark:text-amber-200">
                    Este jugador forma parte del catálogo base: no se puede eliminar desde acá. Desactivalo para ocultarlo del plantel activo.
                  </p>
                ) : null}
              </div>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                <button type="button" onClick={() => setDeleteTarget(null)} className={btnSecondary}>
                  Cancelar
                </button>
                {deleteHasHistory ? (
                  <button
                    type="button"
                    onClick={() => {
                      const t = deleteTarget;
                      setDeleteTarget(null);
                      if (t) setDeactivateTarget(t);
                    }}
                    className={btnSecondary}
                  >
                    Desactivar en su lugar
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={!isPersistedOverride(deleteTarget.id, key)}
                  onClick={() => applyDelete(deleteTarget)}
                  className={btnDanger}
                >
                  Eliminar definitivamente
                </button>
              </div>
          </AdminGlobalModal>
        ) : null}
      </>
    );
  }

  return (
    <div className="admin-content-stack">
      <UnsavedChangesGuard
        isDirty={isDirty}
        canSaveDraft={false}
        onSaveDraft={() => {}}
        onDiscard={cancelForm}
        bodyHint="Si salís ahora, las modificaciones del jugador pueden perderse."
        onCommitSave={() => submitForm()}
      />
      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-[240] -translate-x-1/2 rounded-full border border-emerald-500/40 bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 border-b border-gray-200/90 pb-6 dark:border-gray-600/80 sm:flex-row sm:items-center sm:justify-between sm:pb-8">
        <div className="min-w-0 space-y-1">
          <h3 className="text-base font-bold text-[#111318] dark:text-white">Jugadores del club</h3>
          <p className="text-sm text-[#616f89] dark:text-gray-400">
            {showAdminPlayerMutationsUi
              ? 'Gestioná el plantel sin tocar rankings ni resultados: desactivá en lugar de borrar cuando haya historial.'
              : 'Listado de solo lectura. Alta, edición y baja de jugadores no están disponibles en este entorno.'}
          </p>
        </div>
        {showAdminPlayerMutationsUi ? (
          <button type="button" onClick={startCreate} className={`${btnPrimary} shrink-0`}>
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            Nuevo jugador
          </button>
        ) : null}
      </div>

      <div className="mb-4">
        <label className="sr-only" htmlFor="admin-players-search">
          Buscar jugador
        </label>
        <input
          id="admin-players-search"
          type="search"
          placeholder="Buscar jugador…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={inputBase}
        />
      </div>

      <div className="overflow-visible border-b border-gray-200 pb-2 dark:border-gray-700">
        <div className="flex min-h-[46px] max-w-full flex-wrap items-end gap-2 overflow-x-auto pb-px md:gap-4" role="tablist" aria-label="Filtrar por liga">
          {leagueTabs.map((tab) => {
            const isActive = leagueTab === tab.id;
            return (
              <button
                key={String(tab.id)}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => requestNavigate(() => setLeagueTab(tab.id))}
                className={`flex min-w-[4.25rem] flex-col items-center justify-center whitespace-nowrap border-b-[3px] border-x-0 border-t-0 border-solid pb-3 pt-2 text-sm font-bold transition-colors ${
                  isActive
                    ? 'border-b-primary text-[#111318] dark:text-white'
                    : 'border-b-transparent text-[#616f89] dark:text-gray-400 hover:text-primary'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {banner ? (
        <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">
          {banner}
        </p>
      ) : null}

      <div className="app-glass-panel overflow-hidden rounded-xl border border-gray-200/90 shadow-sport-card dark:border-gray-600/70 dark:shadow-sport-card-dark">
        <div className="overflow-x-auto">
          <table className="app-data-table w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-[11px] font-bold uppercase tracking-wider text-[#616f89] dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-500">
                <th className="w-12 p-3">#</th>
                <th className="min-w-[200px] p-3">Nombre completo</th>
                <th className="p-3">Liga / categoría</th>
                <th className="p-3">Ranking / puntos</th>
                <th className="p-3">Estado</th>
                {showAdminPlayerMutationsUi ? <th className="min-w-[280px] p-3 text-right">Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={showAdminPlayerMutationsUi ? 6 : 5} className="p-10 text-center text-[#616f89] dark:text-gray-400">
                    {q ? 'No encontramos jugadores con ese criterio.' : 'No hay jugadores en esta liga.'}
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((row, idx) => {
                  const league = playerLeague(row);
                  const rrow = rankingsByLeague.get(league)?.find((r) => r.playerId === row.id);
                  const rankLabel = rrow ? `#${rrow.position}` : '—';
                  const ptsLabel = rrow ? uiFormatPointsCell(rrow.points, false) : '—';
                  const active = row.rosterActive !== false;
                  const vis = row.profileVisibility === 'hidden' ? 'Oculto' : 'Visible';
                  return (
                    <tr key={row.id} className="border-b border-gray-100 dark:border-gray-700/80">
                      <td className="p-3 tabular-nums text-[#616f89] dark:text-gray-400">{idx + 1}</td>
                      <td className="p-3">
                        <p className="font-medium text-[#111318] dark:text-white">{row.name}</p>
                        {row.nickname?.trim() ? (
                          <p className="text-xs text-[#616f89] dark:text-gray-500">&ldquo;{row.nickname.trim()}&rdquo;</p>
                        ) : null}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                          <LeagueBadge league={league} />
                          <span className="text-xs text-[#616f89] dark:text-gray-400">{row.category}</span>
                        </div>
                      </td>
                      <td className="p-3 tabular-nums text-[#111318] dark:text-gray-200">
                        {rankLabel} · {ptsLabel} pts
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              active
                                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/35 dark:text-emerald-200'
                                : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                            }`}
                          >
                            {active ? 'Activo' : 'Inactivo'}
                          </span>
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#616f89] dark:text-gray-500">{vis}</span>
                        </div>
                      </td>
                      {showAdminPlayerMutationsUi ? (
                        <td className="p-3">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <button type="button" onClick={() => startEdit(row)} className={`${btnSecondary} shrink-0 px-3 py-2 text-xs`}>
                              <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
                              Editar
                            </button>
                            {active ? (
                              <button
                                type="button"
                                onClick={() => setDeactivateTarget(row)}
                                className={`${btnSecondary} shrink-0 border-amber-500/40 px-3 py-2 text-xs text-amber-950 dark:text-amber-100`}
                              >
                                <PowerOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                Desactivar
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => applyActivate(row)}
                                className={`${btnSecondary} shrink-0 border-emerald-500/40 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-100`}
                              >
                                <Power className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                Activar
                              </button>
                            )}
                            <button type="button" onClick={() => setDeleteTarget(row)} className={`${btnMuted} shrink-0`}>
                              <Trash2 className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                              Eliminar
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminConfirmDialog
        open={showAdminPlayerMutationsUi && !!deactivateTarget}
        title="Desactivar jugador"
        description={
          deactivateTarget ? (
            <p>
              ¿Querés desactivar a <strong>{deactivateTarget.name}</strong>? Ya no estará disponible para nuevos torneos, pero conservará su
              historial.
            </p>
          ) : null
        }
        confirmLabel="Sí, desactivar"
        cancelLabel="Cancelar"
        variant="default"
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => {
          if (deactivateTarget) applyDeactivate(deactivateTarget);
        }}
      />

      {showAdminPlayerMutationsUi && deleteTarget ? (
        <AdminGlobalModal
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          labelledBy="del-pl-title"
          panelClassName="max-w-lg"
        >
            <h2 id="del-pl-title" className={`text-lg font-bold ${deleteHasHistory ? 'text-red-800 dark:text-red-200' : 'text-[#111318] dark:text-white'}`}>
              {deleteHasHistory ? 'Eliminar jugador con historial' : 'Eliminar jugador'}
            </h2>
            <div className="mt-3 text-sm leading-relaxed text-[#616f89] dark:text-gray-400">
              {deleteHasHistory ? (
                <p className="font-medium text-red-700 dark:text-red-300">
                  Este jugador tiene partidos o torneos asociados. Eliminarlo puede afectar el historial. Se recomienda desactivarlo.
                </p>
              ) : (
                <p>
                  ¿Seguro que querés eliminar a <strong className="text-[#111318] dark:text-white">{deleteTarget.name}</strong>? Esta acción no se puede
                  deshacer.
                </p>
              )}
              {!isPersistedOverride(deleteTarget.id, key) ? (
                <p className="mt-3 text-xs text-amber-800 dark:text-amber-200">
                  Este jugador forma parte del catálogo base: no se puede eliminar desde acá. Desactivalo para ocultarlo del plantel activo.
                </p>
              ) : null}
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <button type="button" onClick={() => setDeleteTarget(null)} className={btnSecondary}>
                Cancelar
              </button>
              {deleteHasHistory ? (
                <button
                  type="button"
                  onClick={() => {
                    const t = deleteTarget;
                    setDeleteTarget(null);
                    if (t) setDeactivateTarget(t);
                  }}
                  className={btnSecondary}
                >
                  Desactivar en su lugar
                </button>
              ) : null}
              <button
                type="button"
                disabled={!isPersistedOverride(deleteTarget.id, key)}
                onClick={() => applyDelete(deleteTarget)}
                className={btnDanger}
              >
                Eliminar definitivamente
              </button>
            </div>
        </AdminGlobalModal>
      ) : null}
    </div>
  );
}

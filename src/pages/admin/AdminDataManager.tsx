import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { AdminPlayersCrud } from './players/AdminPlayersAbm';
import { useAdminRequestNavigate } from './AdminUnsavedChangesContext';
import { UnsavedChangesGuard } from './UnsavedChangesGuard';
import { AdminGlobalModal } from './AdminGlobalModal';
import { AdminConfirmDialog } from './AdminConfirmDialog';
import { Database, Pencil, Plus, Trash2 } from 'lucide-react';
import { refreshClubDataFromStorage, useClubData } from '@/lib/clubDataStore';
import { getTorneos } from '@/lib/dataService';
import { getData, saveData, PERSISTENCE_KEYS } from '@/lib/localPersistence';
import type { Match, Tournament } from '@/lib/mockData';
import { isTournamentCurrent } from '@/lib/mockData';

const inputBase =
  'w-full rounded-md admin-input-editable dark:bg-gray-900 text-[#111318] dark:text-white placeholder:text-[#616f89] dark:placeholder:text-gray-500 outline-none transition-all px-3 py-2.5 text-sm disabled:opacity-55';

const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-bold border shadow-sm transition-opacity admin-theme-btn';
const btnSecondary =
  'inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-bold border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-[#111318] dark:text-white admin-theme-btn-secondary transition-colors';
const btnDanger =
  'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-bold border border-red-500/50 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors';
const btnGhost = 'inline-flex items-center gap-1 text-sm font-semibold admin-theme-accent-text hover:underline';

function readPersistedList<T>(key: string): T[] {
  const raw = getData<unknown>(key);
  return Array.isArray(raw) ? (raw as T[]) : [];
}

function persistClubList<T>(key: string, list: T[]): void {
  saveData(key, list);
  refreshClubDataFromStorage();
}

type AdminDataTab = 'torneos' | 'jugadores' | 'partidos';

function emptyMatchForm(): Partial<Match> & { id: string } {
  return {
    id: '',
    tournamentId: '',
    playerA: '',
    playerB: '',
    score: '',
    winnerId: null,
    round: '',
    scheduledDate: '',
    scheduledTime: '',
  };
}

export function AdminDataManager() {
  const requestNavigate = useAdminRequestNavigate();
  const [tab, setTab] = useState<AdminDataTab>('torneos');

  return (
    <div className="admin-content-stack">
      <section className="admin-readonly-panel max-w-3xl rounded-xl border border-gray-200/90 p-5 dark:border-gray-600/60 md:p-6">
        <div className="mb-3 flex items-center gap-2">
          <Database className="h-4 w-4 shrink-0 admin-theme-icon" aria-hidden />
          <h3 className="text-base font-bold text-[#111318] dark:text-white">Gestión de datos</h3>
        </div>
        <p className="text-sm leading-relaxed text-[#616f89] dark:text-gray-400">
          Los <strong className="text-[#111318] dark:text-gray-200">torneos</strong> son de solo lectura (los define el sistema). Desde acá podés
          sumar o ajustar <strong className="text-[#111318] dark:text-gray-200">jugadores</strong> y <strong className="text-[#111318] dark:text-gray-200">partidos</strong> guardados en este navegador; al guardar, el sitio público se actualiza.
        </p>
      </section>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Secciones de datos">
        {(['torneos', 'jugadores', 'partidos'] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => requestNavigate(() => setTab(id))}
            className={`min-h-[2.75rem] px-4 py-2 rounded-md text-sm font-bold transition-all border ${
              tab === id
                ? 'admin-theme-tab-active shadow-sport-card dark:shadow-sport-card-dark'
                : 'border-gray-200/90 bg-white/60 text-[#111318] admin-theme-tab-inactive dark:border-gray-600 dark:bg-white/[0.06] dark:text-white'
            }`}
          >
            {id === 'torneos' ? 'Torneos' : id === 'jugadores' ? 'Jugadores' : 'Partidos'}
          </button>
        ))}
      </div>

      {tab === 'torneos' && <TournamentsReadOnly />}
      {tab === 'jugadores' && <AdminPlayersCrud />}
      {tab === 'partidos' && <MatchesCrud />}
    </div>
  );
}

function tournamentVisualState(row: Tournament): 'En curso' | 'Finalizado' | 'Próximo' {
  if (row.status === 'finished') return 'Finalizado';
  if (row.status === 'upcoming' && isTournamentCurrent(row)) return 'En curso';
  return 'Próximo';
}

function TournamentsReadOnly() {
  const [list, setList] = useState<Tournament[]>([]);

  const refresh = useCallback(() => setList(getTorneos()), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-dashed border-primary/35 bg-primary/5 dark:bg-primary/10 px-4 py-3 text-sm text-[#111318] dark:text-gray-200">
        <p className="font-semibold text-primary dark:text-primary">Torneos definidos por el sistema</p>
        <p className="mt-1 text-[#616f89] dark:text-gray-400 leading-relaxed">
          No se pueden crear ni editar torneos, grupos ni fixture desde aquí. Gestioná resultados y operación en las demás secciones del panel.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#616f89] dark:text-gray-400">{list.length} torneo(s) visibles (catálogo + localStorage)</p>
        <button type="button" onClick={refresh} className={btnSecondary}>
          Actualizar lista
        </button>
      </div>

      <div className="app-glass-panel overflow-x-auto rounded-xl shadow-sport-card dark:shadow-sport-card-dark">
        <table className="app-data-table w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-[#616f89] dark:text-gray-500 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50">
              <th className="p-3 font-bold">Id</th>
              <th className="p-3 font-bold">Nombre</th>
              <th className="p-3 font-bold">Cat.</th>
              <th className="p-3 font-bold">Estado</th>
              <th className="p-3 font-bold">Inicio</th>
              <th className="p-3 font-bold">Fin</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-[#616f89] dark:text-gray-400">
                  No hay torneos en el snapshot del club.
                </td>
              </tr>
            ) : (
              list.map((row) => {
                const visual = tournamentVisualState(row);
                return (
                  <tr key={row.id} className="border-b border-gray-100 dark:border-gray-700/80 admin-theme-hover-row">
                    <td className="p-3 font-mono text-xs">{row.id}</td>
                    <td className="p-3 font-medium text-[#111318] dark:text-white">{row.name}</td>
                    <td className="p-3">{row.category}</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                          visual === 'Finalizado'
                            ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100'
                            : visual === 'Próximo'
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
                              : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/35 dark:text-emerald-200'
                        }`}
                      >
                        {visual}
                      </span>
                    </td>
                    <td className="p-3 tabular-nums text-[#616f89] dark:text-gray-400">{row.startDate}</td>
                    <td className="p-3 tabular-nums text-[#616f89] dark:text-gray-400">{row.endDate}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function serializeMatchForm(f: Partial<Match> & { id: string }) {
  return JSON.stringify({
    id: f.id,
    tournamentId: f.tournamentId,
    playerA: f.playerA,
    playerB: f.playerB,
    score: f.score,
    winnerId: f.winnerId,
    round: f.round,
    scheduledDate: f.scheduledDate,
    scheduledTime: f.scheduledTime,
  });
}

function MatchesCrud() {
  const club = useClubData();
  const key = PERSISTENCE_KEYS.partidos;
  const [list, setList] = useState<Match[]>([]);
  const [mode, setMode] = useState<'idle' | 'create' | 'edit'>('idle');
  const [form, setForm] = useState(emptyMatchForm());
  const [formBaseline, setFormBaseline] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const tournamentOptions = useMemo(
    () => club.tournaments.map((t) => ({ id: t.id, label: `${t.name} (${t.id})` })),
    [club],
  );
  const playerOptions = useMemo(() => club.players.map((p) => ({ id: p.id, label: `${p.name} (${p.id})` })), [club]);

  const refresh = useCallback(() => setList(readPersistedList<Match>(key)), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const startCreate = () => {
    setError(null);
    setMode('create');
    const next = {
      ...emptyMatchForm(),
      id: `m-admin-${Date.now()}`,
      tournamentId: tournamentOptions[0]?.id ?? '',
      playerA: playerOptions[0]?.id ?? '',
      playerB: playerOptions[1]?.id ?? playerOptions[0]?.id ?? '',
    };
    setForm(next);
    setFormBaseline(serializeMatchForm(next));
  };

  const startEdit = (row: Match) => {
    setError(null);
    setMode('edit');
    const next = {
      id: row.id,
      tournamentId: row.tournamentId,
      playerA: row.playerA,
      playerB: row.playerB,
      score: row.score ?? '',
      winnerId: row.winnerId,
      round: row.round ?? '',
      scheduledDate: row.scheduledDate ?? '',
      scheduledTime: row.scheduledTime ?? '',
    };
    setForm(next);
    setFormBaseline(serializeMatchForm(next));
  };

  const cancelForm = () => {
    setMode('idle');
    setForm(emptyMatchForm());
    setFormBaseline('');
    setError(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.id?.trim() || !form.tournamentId || !form.playerA || !form.playerB || form.playerA === form.playerB) {
      setError('Completá id, torneo y dos jugadores distintos.');
      return;
    }
    const winnerRaw = form.winnerId;
    const winnerId: string | null =
      winnerRaw === '' || winnerRaw === '__none__' || winnerRaw == null ? null : String(winnerRaw);
    const row: Match = {
      id: form.id.trim(),
      tournamentId: form.tournamentId,
      playerA: form.playerA,
      playerB: form.playerB,
      score: (form.score ?? '').trim(),
      winnerId,
      round: form.round?.trim() || undefined,
      scheduledDate: form.scheduledDate?.trim() || undefined,
      scheduledTime: form.scheduledTime?.trim() || undefined,
    };
    let next: Match[];
    if (mode === 'create') {
      if (list.some((x) => x.id === row.id)) {
        setError('Ya existe un partido con ese id.');
        return;
      }
      next = [...list, row];
    } else {
      if (!list.some((x) => x.id === row.id)) {
        setError('No se encontró el registro a editar.');
        return;
      }
      next = list.map((x) => (x.id === row.id ? row : x));
    }
    persistClubList(key, next);
    setList(next);
    cancelForm();
  };

  const matchFormDirty = mode !== 'idle' && serializeMatchForm(form) !== formBaseline;

  const removeDeleteTarget = () => {
    if (!deleteTargetId) return;
    const next = list.filter((x) => x.id !== deleteTargetId);
    persistClubList(key, next);
    setList(next);
    setDeleteTargetId(null);
  };

  return (
    <div className="space-y-6">
      <UnsavedChangesGuard isDirty={matchFormDirty} canSaveDraft={false} onSaveDraft={() => {}} onDiscard={cancelForm} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#616f89] dark:text-gray-400">{list.length} partido(s) en localStorage</p>
        <button type="button" onClick={startCreate} className={btnPrimary} disabled={tournamentOptions.length === 0 || playerOptions.length < 1}>
          <Plus className="w-4 h-4" aria-hidden />
          Nuevo partido
        </button>
      </div>

      {error ? (
        <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <div className="app-glass-panel overflow-x-auto rounded-xl shadow-sport-card dark:shadow-sport-card-dark">
        <table className="app-data-table w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-[#616f89] dark:text-gray-500 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50">
              <th className="p-3 font-bold">Id</th>
              <th className="p-3 font-bold">Torneo</th>
              <th className="p-3 font-bold">A</th>
              <th className="p-3 font-bold">B</th>
              <th className="p-3 font-bold">Marcador</th>
              <th className="p-3 font-bold">Ganador</th>
              <th className="p-3 font-bold w-[140px]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-[#616f89] dark:text-gray-400">
                  No hay partidos guardados.
                </td>
              </tr>
            ) : (
              list.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 dark:border-gray-700/80 admin-theme-hover-row">
                  <td className="p-3 font-mono text-xs">{row.id}</td>
                  <td className="p-3 max-w-[140px] truncate" title={row.tournamentId}>
                    {row.tournamentId}
                  </td>
                  <td className="p-3 font-mono text-xs max-w-[100px] truncate">{row.playerA}</td>
                  <td className="p-3 font-mono text-xs max-w-[100px] truncate">{row.playerB}</td>
                  <td className="p-3">{row.score || '—'}</td>
                  <td className="p-3 font-mono text-xs">{row.winnerId ?? '—'}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => startEdit(row)} className={btnGhost}>
                        <Pencil className="w-3.5 h-3.5" aria-hidden />
                        Editar
                      </button>
                      <button type="button" onClick={() => setDeleteTargetId(row.id)} className={btnDanger}>
                        <Trash2 className="w-3.5 h-3.5" aria-hidden />
                        Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {mode !== 'idle' && (
        <AdminGlobalModal
          open={mode !== 'idle'}
          onClose={cancelForm}
          labelledBy="admin-data-match-form-title"
          panelClassName="max-w-3xl"
        >
        <form onSubmit={submit} className="space-y-4">
          <h4 id="admin-data-match-form-title" className="text-xs font-bold uppercase tracking-[0.12em] text-[#616f89] dark:text-gray-400">
            {mode === 'create' ? 'Alta de partido' : 'Editar partido'}
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold mb-1">Id</label>
              <input
                className={inputBase}
                value={form.id}
                onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                required
                disabled={mode === 'edit'}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1">Torneo</label>
              <select
                className={inputBase}
                value={form.tournamentId}
                onChange={(e) => setForm((f) => ({ ...f, tournamentId: e.target.value }))}
                required
              >
                {tournamentOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Jugador A</label>
              <select className={inputBase} value={form.playerA} onChange={(e) => setForm((f) => ({ ...f, playerA: e.target.value }))} required>
                {playerOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Jugador B</label>
              <select className={inputBase} value={form.playerB} onChange={(e) => setForm((f) => ({ ...f, playerB: e.target.value }))} required>
                {playerOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Marcador</label>
              <input className={inputBase} value={form.score ?? ''} onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))} placeholder="6-4 6-3" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Ganador</label>
              <select
                className={inputBase}
                value={form.winnerId === null || form.winnerId === undefined ? '__none__' : form.winnerId}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    winnerId: e.target.value === '__none__' ? null : e.target.value,
                  }))
                }
              >
                <option value="__none__">Sin definir</option>
                {playerOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Ronda / etiqueta</label>
              <input className={inputBase} value={form.round ?? ''} onChange={(e) => setForm((f) => ({ ...f, round: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Fecha programada</label>
              <input className={inputBase} type="date" value={form.scheduledDate ?? ''} onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Hora</label>
              <input className={inputBase} type="time" value={form.scheduledTime ?? ''} onChange={(e) => setForm((f) => ({ ...f, scheduledTime: e.target.value }))} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="submit" className={btnPrimary}>
              Guardar
            </button>
            <button type="button" onClick={cancelForm} className={btnSecondary}>
              Cancelar
            </button>
          </div>
        </form>
        </AdminGlobalModal>
      )}
      <AdminConfirmDialog
        open={deleteTargetId != null}
        title="Eliminar partido local"
        description="Se eliminará este partido del almacenamiento local del navegador."
        confirmLabel="Eliminar"
        variant="danger"
        irreversible
        onConfirm={removeDeleteTarget}
        onClose={() => setDeleteTargetId(null)}
      />
    </div>
  );
}

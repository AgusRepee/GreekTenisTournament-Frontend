import { useCallback, useEffect, useMemo, useState } from 'react';
import { GripVertical, X } from 'lucide-react';
import { getPlayerById, type Match } from '@/lib/mockData';
import { mergePersistedMatches } from '@/lib/tennis/bracketPersist';
import { appendAdminAuditEntry, auditActionLabel } from '@/lib/admin/tournamentAuditLog';
import { AdminConfirmDialog } from '../AdminConfirmDialog';
import { useOptionalAdminTournamentSeed } from '../AdminTournamentSeedContext';

const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold border shadow-sm transition-opacity admin-theme-btn';
const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-[#111318] dark:text-white admin-theme-btn-secondary transition-colors';

type DragPayload = { matchId: string; side: 'a' | 'b' };

const MIME = 'application/x-admin-bracket-slot';

function parsePayload(dt: DataTransfer): DragPayload | null {
  try {
    const raw = dt.getData(MIME) || dt.getData('text/plain');
    if (!raw) return null;
    return JSON.parse(raw) as DragPayload;
  } catch {
    return null;
  }
}

function cloneQuarter(list: Match[]): Match[] {
  return list.map((m) => ({ ...m }));
}

function snapshotPlayers(list: Match[]): string {
  return JSON.stringify(list.map((m) => [m.id, m.playerA, m.playerB]));
}

function swapSlots(draft: Match[], src: DragPayload, tgt: DragPayload): Match[] {
  const next = draft.map((m) => ({ ...m }));
  const i = next.findIndex((m) => m.id === src.matchId);
  const j = next.findIndex((m) => m.id === tgt.matchId);
  if (i < 0 || j < 0) return draft;
  const get = (m: Match, side: 'a' | 'b') => (side === 'a' ? m.playerA : m.playerB);
  const set = (m: Match, side: 'a' | 'b', id: string): Match =>
    side === 'a' ? { ...m, playerA: id } : { ...m, playerB: id };
  const pa = get(next[i]!, src.side);
  const pb = get(next[j]!, tgt.side);
  next[i] = set(next[i]!, src.side, pb);
  next[j] = set(next[j]!, tgt.side, pa);
  return next;
}

type Props = {
  tournamentId: string;
  /** Partidos de cuartos persistidos para este torneo (ordenados). */
  quarterMatches: Match[];
  /** Sincroniza con el guard global al descartar. */
  resetSignal: number;
  onDirtyChange?: (dirty: boolean) => void;
  auditContext?: { tournamentId: string; tournamentName: string; league: number };
};

export function AdminBracketQuarterEditor({
  tournamentId,
  quarterMatches,
  resetSignal,
  onDirtyChange,
  auditContext,
}: Props) {
  const seedFmt = useOptionalAdminTournamentSeed();
  const displaySlot = useCallback(
    (id: string) => {
      if (!id || id.startsWith('tbd') || id.startsWith('q') || id.startsWith('s')) return 'TBD';
      return seedFmt?.formatPlayerId(id) ?? getPlayerById(id)?.name ?? id;
    },
    [seedFmt],
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Match[]>(() => cloneQuarter(quarterMatches));
  const [baseline, setBaseline] = useState(() => snapshotPlayers(quarterMatches));
  const [saveOpen, setSaveOpen] = useState(false);

  useEffect(() => {
    if (!editing) {
      setDraft(cloneQuarter(quarterMatches));
      setBaseline(snapshotPlayers(quarterMatches));
    }
  }, [quarterMatches, editing]);

  const dirty = useMemo(() => snapshotPlayers(draft) !== baseline, [draft, baseline]);

  useEffect(() => {
    onDirtyChange?.(editing && dirty);
  }, [editing, dirty, onDirtyChange]);

  useEffect(() => {
    if (resetSignal <= 0) return;
    setEditing(false);
    const next = cloneQuarter(quarterMatches);
    setDraft(next);
    setBaseline(snapshotPlayers(next));
    setSaveOpen(false);
  }, [resetSignal, quarterMatches]);

  const startEdit = () => {
    const next = cloneQuarter(quarterMatches);
    setDraft(next);
    setBaseline(snapshotPlayers(next));
    setEditing(true);
  };

  const cancelEdit = () => {
    const next = cloneQuarter(quarterMatches);
    setDraft(next);
    setBaseline(snapshotPlayers(next));
    setEditing(false);
    setSaveOpen(false);
  };

  const applyPersist = useCallback(() => {
    const ac = auditContext;
    if (ac) {
      const beforeLines = quarterMatches
        .map((m) => `${displaySlot(m.playerA)} vs ${displaySlot(m.playerB)}`)
        .join(' | ');
      const afterLines = draft.map((m) => `${displaySlot(m.playerA)} vs ${displaySlot(m.playerB)}`).join(' | ');
      if (beforeLines !== afterLines) {
        appendAdminAuditEntry({
          action: 'cuadro_eliminacion_editado',
          actionLabel: auditActionLabel('cuadro_eliminacion_editado'),
          tournamentId: ac.tournamentId,
          tournamentName: ac.tournamentName,
          league: ac.league,
          group: 'Cuartos de final',
          prevValue: beforeLines,
          newValue: afterLines,
          detail: `Cuadro de eliminación (cuartos) editado. Antes: ${beforeLines}. Ahora: ${afterLines}.`,
        });
      }
    }
    const draftById = new Map(draft.map((m) => [m.id, m]));
    mergePersistedMatches((all) =>
      all.map((m) => {
        const d = draftById.get(m.id);
        if (!d || m.tournamentId !== tournamentId) return m;
        const isQf = m.round === 'Cuartos de final' || m.round === 'Cuartos';
        if (!isQf) return m;
        return { ...m, playerA: d.playerA, playerB: d.playerB };
      }),
    );
    setEditing(false);
    setSaveOpen(false);
  }, [draft, tournamentId, auditContext, quarterMatches, displaySlot]);

  const onDragStart = (e: React.DragEvent, payload: DragPayload) => {
    e.dataTransfer.setData(MIME, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (e: React.DragEvent, target: DragPayload) => {
    e.preventDefault();
    const src = parsePayload(e.dataTransfer);
    if (!src) return;
    if (src.matchId === target.matchId && src.side === target.side) return;
    setDraft((prev) => swapSlots(prev, src, target));
  };

  if (quarterMatches.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-400/50 bg-white/40 px-4 py-6 text-sm text-[#616f89] dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-400">
        No hay partidos de <strong className="text-[#111318] dark:text-gray-200">cuartos de final</strong> guardados para
        este torneo. Cuando existan en el calendario del club, podrás colocar jugadores arrastrando las fichas.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[#111318] dark:text-white">Cuartos · modo edición</h3>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-[#616f89] dark:text-gray-400">
            Arrastrá una ficha de jugador a otra casilla para intercambiar. Semifinal y final siguen según los resultados
            cargados.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!editing ? (
            <button type="button" className={btnPrimary} onClick={startEdit}>
              Editar cuadro
            </button>
          ) : (
            <>
              <button type="button" className={btnPrimary} onClick={() => setSaveOpen(true)} disabled={!dirty}>
                Guardar cuadro
              </button>
              <button type="button" className={btnSecondary} onClick={cancelEdit}>
                <X className="h-4 w-4" aria-hidden />
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <div className="flex flex-col gap-4">
          {draft.map((m, idx) => (
            <div
              key={m.id}
              className="rounded-2xl border border-gray-200/90 bg-white/90 p-4 shadow-sm dark:border-gray-600 dark:bg-gray-900/60 md:p-5"
            >
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[#616f89] dark:text-gray-500">
                Llave cuartos {idx + 1}
              </p>
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-stretch sm:gap-4">
                <Slot
                  label="Jugador 1"
                  display={displaySlot(m.playerA)}
                  onDragStart={(e) => onDragStart(e, { matchId: m.id, side: 'a' })}
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, { matchId: m.id, side: 'a' })}
                />
                <div className="flex shrink-0 items-center justify-center">
                  <span className="rounded-md bg-gray-200/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#111318] dark:bg-gray-700 dark:text-white">
                    vs
                  </span>
                </div>
                <Slot
                  label="Jugador 2"
                  display={displaySlot(m.playerB)}
                  onDragStart={(e) => onDragStart(e, { matchId: m.id, side: 'b' })}
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, { matchId: m.id, side: 'b' })}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <AdminConfirmDialog
        open={saveOpen}
        title="Guardar posiciones en cuartos"
        description={
          <p className="text-sm text-[#616f89] dark:text-gray-400">
            Se van a guardar las posiciones actuales en los partidos de cuartos de este torneo. Las siguientes rondas se
            actualizan cuando cargás resultados en la sección Resultados.
          </p>
        }
        confirmLabel="Guardar"
        onClose={() => setSaveOpen(false)}
        onConfirm={() => {
          applyPersist();
        }}
      />
    </div>
  );
}

function Slot({
  label,
  display,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  label: string;
  display: string;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  return (
    <div
      role="listitem"
      className="flex min-h-[4.5rem] flex-1 flex-col rounded-xl border-2 border-dashed border-gray-300/90 bg-[#f4f6fa] p-3 dark:border-gray-600 dark:bg-gray-800/80"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <span className="text-[10px] font-bold uppercase tracking-wide text-[#616f89] dark:text-gray-500">{label}</span>
      <div
        draggable
        onDragStart={onDragStart}
        className="mt-2 flex cursor-grab items-center gap-2 rounded-lg border border-gray-200/90 bg-white px-3 py-2.5 text-sm font-semibold text-[#111318] shadow-sm active:cursor-grabbing dark:border-gray-600 dark:bg-gray-900 dark:text-white"
      >
        <GripVertical className="h-4 w-4 shrink-0 text-[#616f89] dark:text-gray-500" aria-hidden />
        <span className="line-clamp-2">{display}</span>
      </div>
    </div>
  );
}

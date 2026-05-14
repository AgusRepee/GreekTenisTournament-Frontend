import { useMemo } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { AdminGroupRow } from '@/lib/admin/adminTournamentBuilderTypes';
import { getLeagueColor } from '@/lib/leagueColors';
import type { LeagueNum } from '@/lib/mockData';

export type BoardPlayer = {
  id: string;
  displayName: string;
  leagueNum: LeagueNum;
  rankingLabel?: string;
  tag?: string;
};

function slotId(containerKey: string, playerId: string): string {
  return `${containerKey}::${playerId}`;
}

function parseSlot(id: UniqueIdentifier): { containerKey: string; playerId: string } | null {
  const s = String(id);
  const idx = s.indexOf('::');
  if (idx <= 0) return null;
  return { containerKey: s.slice(0, idx), playerId: s.slice(idx + 2) };
}

const AVAIL = 'avail';

function SortPlayerRow({
  containerKey,
  player,
  leagueNum,
}: {
  containerKey: string;
  player: BoardPlayer;
  leagueNum: LeagueNum;
}) {
  const id = slotId(containerKey, player.id);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const league = getLeagueColor(leagueNum);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg border border-gray-200/90 bg-white px-2.5 py-2 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-900/80 ${league.border}`}
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded p-1 text-[#616f89] hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Arrastrar"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-[#111318] dark:text-white">{player.displayName}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#616f89] dark:text-gray-500">
          <span className={league.badge}>Liga {player.leagueNum}</span>
          {player.rankingLabel ? <span>Ranking {player.rankingLabel}</span> : <span>Ranking —</span>}
          {player.tag ? <span className="font-bold text-amber-700 dark:text-amber-300">{player.tag}</span> : null}
        </div>
      </div>
    </div>
  );
}

function ColumnDropZone({ columnKey, children }: { columnKey: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `drop-${columnKey}` });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[120px] flex-col gap-2 rounded-lg ${isOver ? 'bg-primary/5 ring-2 ring-primary/30' : ''}`}
    >
      {children}
    </div>
  );
}

function ColumnShell({
  title,
  subtitle,
  leagueNum,
  children,
}: {
  title: string;
  subtitle: string;
  leagueNum: LeagueNum;
  children: React.ReactNode;
}) {
  const c = getLeagueColor(leagueNum);
  return (
    <section className={`flex min-h-[220px] flex-1 flex-col rounded-xl border border-gray-200/90 bg-gray-50/60 dark:border-gray-600 dark:bg-gray-900/30 ${c.borderTop}`}>
      <header className={`border-b border-gray-200/80 px-3 py-2 dark:border-gray-700 ${c.bg}`}>
        <h4 className="text-sm font-bold text-[#111318] dark:text-white">{title}</h4>
        <p className="text-[11px] font-medium text-[#616f89] dark:text-gray-400">{subtitle}</p>
      </header>
      <div className="flex flex-1 flex-col gap-2 p-2">{children}</div>
    </section>
  );
}

export interface TournamentGroupsBoardProps {
  leagueNum: LeagueNum;
  availablePlayerIds: string[];
  groups: AdminGroupRow[];
  playerMap: Map<string, BoardPlayer>;
  expectedPerGroup: number;
  disabled?: boolean;
  onChange: (next: { availablePlayerIds: string[]; groups: AdminGroupRow[] }) => void;
}

export function TournamentGroupsBoard({
  leagueNum,
  availablePlayerIds,
  groups,
  playerMap,
  expectedPerGroup,
  disabled,
  onChange,
}: TournamentGroupsBoardProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const containers = useMemo(() => {
    const m = new Map<string, string[]>();
    m.set(AVAIL, [...availablePlayerIds]);
    groups.forEach((g, i) => {
      m.set(`g${i}`, [...g.playerIds]);
    });
    return m;
  }, [availablePlayerIds, groups]);

  const emitFromMap = (next: Map<string, string[]>) => {
    const avail = next.get(AVAIL) ?? [];
    const nextGroups = groups.map((g, i) => ({
      ...g,
      playerIds: [...(next.get(`g${i}`) ?? [])],
    }));
    onChange({ availablePlayerIds: avail, groups: nextGroups });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (disabled) return;
    const { active, over } = event;
    if (!over) return;
    const a = parseSlot(active.id);
    if (!a) return;
    const activePid = a.playerId;
    const from = a.containerKey;

    const overStr = String(over.id);
    let to = '';
    let overPid: string | null = null;
    if (overStr.startsWith('drop-')) {
      to = overStr.replace('drop-', '');
    } else {
      const o = parseSlot(over.id);
      if (o) {
        to = o.containerKey;
        overPid = o.playerId;
      }
    }
    if (!to) return;

    if (from === to) {
      if (!overPid || overPid === activePid) return;
      const list = [...(containers.get(from) ?? [])];
      const oldIndex = list.indexOf(activePid);
      const newIndex = list.indexOf(overPid);
      if (oldIndex < 0 || newIndex < 0) return;
      const next = new Map(containers);
      next.set(from, arrayMove(list, oldIndex, newIndex));
      emitFromMap(next);
      return;
    }

    const next = new Map<string, string[]>();
    containers.forEach((v, k) => next.set(k, [...v]));
    const fromList = [...(next.get(from) ?? [])];
    const fi = fromList.indexOf(activePid);
    if (fi < 0) return;
    fromList.splice(fi, 1);
    next.set(from, fromList);
    const toList = [...(next.get(to) ?? [])];
    if (overPid && toList.includes(overPid)) {
      const ti = toList.indexOf(overPid);
      toList.splice(ti, 0, activePid);
    } else {
      toList.push(activePid);
    }
    next.set(to, toList);
    emitFromMap(next);
  };

  const renderColumn = (key: string, title: string, ids: string[]) => {
    const sortIds = ids.map((pid) => slotId(key, pid));
    const subtitle =
      key === AVAIL
        ? `${ids.length} disponible(s)`
        : `${ids.length}${expectedPerGroup > 0 ? ` / ~${expectedPerGroup}` : ''} · ${
            expectedPerGroup > 0 && ids.length >= expectedPerGroup ? 'Completo' : 'Incompleto'
          }`;
    return (
      <ColumnShell key={key} title={title} subtitle={subtitle} leagueNum={leagueNum}>
        <SortableContext items={sortIds} strategy={verticalListSortingStrategy}>
          <ColumnDropZone columnKey={key}>
            {ids.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300/90 py-6 text-center text-xs text-[#616f89] dark:border-gray-600 dark:text-gray-500">
                Soltá jugadores acá
              </div>
            ) : null}
            {ids.map((pid) => {
              const p = playerMap.get(pid);
              if (!p) return null;
              return <SortPlayerRow key={slotId(key, pid)} containerKey={key} player={p} leagueNum={leagueNum} />;
            })}
          </ColumnDropZone>
        </SortableContext>
      </ColumnShell>
    );
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="min-w-0 flex-1 xl:max-w-[320px]">{renderColumn(AVAIL, 'Jugadores disponibles', availablePlayerIds)}</div>
        <div className="grid min-w-0 flex-[2] gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g, i) => renderColumn(`g${i}`, g.label, g.playerIds))}
        </div>
      </div>
    </DndContext>
  );
}

import { useMemo } from 'react';
import { useOptionalAdminTournamentSeed } from '../AdminTournamentSeedContext';
import { ClipboardList } from 'lucide-react';
import type { PendingWorkloadItem } from '@/lib/tennis/adminPendingWorkload';

export type PendienteRowVM = PendingWorkloadItem & {
  draftBadge?: boolean;
};

type Props = {
  items: PendienteRowVM[];
  readOnly: boolean;
  variant: 'resumen' | 'resultados';
  onCargar: (dedupeKey: string) => void;
  /** Texto cuando no hay partidos pendientes ni borradores listados */
  footerNote?: string;
};

const btnCargar =
  'inline-flex shrink-0 items-center justify-center rounded-md border border-[rgba(var(--color-torneo-rgb)/0.45)] bg-[rgba(var(--color-torneo-rgb)/0.12)] px-2.5 py-1 text-[11px] font-bold text-[#111318] shadow-sm transition-colors hover:bg-[rgba(var(--color-torneo-rgb)/0.2)] dark:text-white dark:hover:bg-[rgba(var(--color-torneo-rgb)/0.28)]';

function groupDraftLabel(n: number): string {
  if (n <= 1) return 'borrador sin guardar';
  return `borradores sin guardar`;
}

export function AdminPendientesCargaSection({
  items,
  readOnly,
  variant,
  onCargar,
  footerNote,
}: Props) {
  const seedFmt = useOptionalAdminTournamentSeed();
  const { fechaBlocks, koBlocks, totals } = useMemo(() => {
    const fixtureItems = items.filter((i) => i.kind === 'fixture');
    const koItems = items.filter((i) => i.kind === 'ko');

    const byFecha = new Map<number, Map<string, PendienteRowVM[]>>();
    for (const it of fixtureItems) {
      if (!byFecha.has(it.fecha)) byFecha.set(it.fecha, new Map());
      const gm = byFecha.get(it.fecha)!;
      if (!gm.has(it.grupoLabel)) gm.set(it.grupoLabel, []);
      gm.get(it.grupoLabel)!.push(it);
    }

    const fechaSorted = [...byFecha.entries()].sort(([a], [b]) => a - b);
    const fechaBlocks = fechaSorted.map(([fecha, gm]) => {
      const grupoSorted = [...gm.entries()].sort(([ga], [gb]) => ga.localeCompare(gb, 'es'));
      return { fecha, grupos: grupoSorted.map(([label, rows]) => ({ label, rows })) };
    });

    const koMap = new Map<string, PendienteRowVM[]>();
    for (const it of koItems) {
      const rk = it.roundLabel;
      if (!koMap.has(rk)) koMap.set(rk, []);
      koMap.get(rk)!.push(it);
    }
    const koBlocks = [...koMap.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'));

    const total = items.length;
    const drafts = items.filter((i) => i.draftBadge).length;

    const byFechaAgg = new Map<number, number>();
    for (const it of fixtureItems) {
      byFechaAgg.set(it.fecha, (byFechaAgg.get(it.fecha) ?? 0) + 1);
    }

    return {
      fechaBlocks,
      koBlocks,
      totals: {
        total,
        drafts,
        koCount: koItems.length,
        byFechaAgg,
      },
    };
  }, [items]);

  if (items.length === 0) {
    return (
      <section className="admin-theme-card app-glass-panel rounded-xl border border-gray-200/85 p-4 shadow-sm dark:border-gray-600/55 md:p-5">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 shrink-0 admin-theme-icon" aria-hidden />
          <h2 className="text-lg font-bold text-[#111318] dark:text-white">Pendientes de carga</h2>
        </div>
        <p className="mt-3 text-sm text-[#616f89] dark:text-gray-400">
          No hay partidos pendientes en el fixture ni en eliminación (excluye cargados, suspendidos y libres).
          {variant === 'resumen'
            ? ' Los borradores sin guardar se listan solo en Resultados cuando abrís esa sección.'
            : null}{' '}
          {footerNote ?? ''}
        </p>
      </section>
    );
  }

  return (
    <section className="admin-theme-card app-glass-panel rounded-xl border border-amber-500/35 bg-amber-50/30 p-4 shadow-sm dark:border-amber-900/35 dark:bg-amber-950/15 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <ClipboardList className="h-5 w-5 shrink-0 admin-theme-icon mt-0.5" aria-hidden />
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[#111318] dark:text-white">Pendientes de carga</h2>
            <p className="mt-1 text-xs leading-relaxed text-[#616f89] dark:text-gray-400">
              Total listado: <strong className="text-[#111318] dark:text-gray-200">{totals.total}</strong>
              {totals.koCount > 0 ? (
                <>
                  {' '}
                  · Eliminación: <strong>{totals.koCount}</strong>
                </>
              ) : null}
              {totals.drafts > 0 ? (
                <>
                  {' '}
                  · Incluye {totals.drafts} {groupDraftLabel(totals.drafts)}
                </>
              ) : null}
              {variant === 'resumen' ? (
                <span className="block mt-1 text-[11px] text-[#616f89] dark:text-gray-500">
                  En Resumen solo se cuentan partidos sin resultado guardado. Los marcadores sin guardar aparecen al
                  abrir Resultados.
                </span>
              ) : null}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-6 text-sm">
        {fechaBlocks.map(({ fecha, grupos }) => (
          <div key={`fecha-${fecha}`} className="space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200/95">
              Fecha {fecha}
              {totals.byFechaAgg.has(fecha) ? (
                <span className="ml-2 font-semibold tabular-nums opacity-85">
                  ({totals.byFechaAgg.get(fecha)} pendientes)
                </span>
              ) : null}
            </p>
            <div className="space-y-4 border-l-2 border-amber-500/35 pl-3 dark:border-amber-800/55">
              {grupos.map(({ label, rows }) => (
                <div key={`${fecha}-${label}`}>
                  <p className="text-[13px] font-bold text-[#111318] dark:text-gray-100">
                    {label}
                    <span className="ml-2 text-xs font-semibold tabular-nums text-[#616f89] dark:text-gray-400">
                      ({rows.length} {rows.length === 1 ? 'pendiente' : 'pendientes'})
                    </span>
                  </p>
                  <ul className="mt-2 space-y-2">
                    {rows.map((r) => (
                      <li
                        key={r.dedupeKey}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200/90 bg-white/90 px-3 py-2 dark:border-gray-600 dark:bg-gray-900/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate font-semibold text-[#111318] dark:text-gray-100"
                            title={seedFmt?.formatVs(r.playerA, r.playerB) ?? `${r.playerA} vs ${r.playerB}`}
                          >
                            {seedFmt?.formatVs(r.playerA, r.playerB) ?? (
                              <>
                                {r.playerA} <span className="font-normal text-[#616f89] dark:text-gray-500">vs</span> {r.playerB}
                              </>
                            )}
                          </p>
                          {r.draftBadge ? (
                            <span className="mt-1 inline-flex rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-900 dark:bg-sky-900/35 dark:text-sky-100">
                              Borrador
                            </span>
                          ) : null}
                        </div>
                        {!readOnly ? (
                          <button type="button" className={btnCargar} onClick={() => onCargar(r.dedupeKey)}>
                            Cargar
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold uppercase text-slate-500">Solo lectura</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}

        {koBlocks.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-violet-900 dark:text-violet-200/90">
              Eliminación
            </p>
            <div className="space-y-4 border-l-2 border-violet-400/35 pl-3 dark:border-violet-800/50">
              {koBlocks.map(([roundLabel, rows]) => (
                <div key={roundLabel}>
                  <p className="text-[13px] font-bold text-[#111318] dark:text-gray-100">
                    {roundLabel}
                    <span className="ml-2 text-xs font-semibold tabular-nums text-[#616f89] dark:text-gray-400">
                      ({rows.length} {rows.length === 1 ? 'pendiente' : 'pendientes'})
                    </span>
                  </p>
                  <ul className="mt-2 space-y-2">
                    {rows.map((r) => (
                      <li
                        key={r.dedupeKey}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200/90 bg-white/90 px-3 py-2 dark:border-gray-600 dark:bg-gray-900/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate font-semibold text-[#111318] dark:text-gray-100"
                            title={seedFmt?.formatVs(r.playerA, r.playerB) ?? `${r.playerA} vs ${r.playerB}`}
                          >
                            {seedFmt?.formatVs(r.playerA, r.playerB) ?? (
                              <>
                                {r.playerA} <span className="font-normal text-[#616f89] dark:text-gray-500">vs</span> {r.playerB}
                              </>
                            )}
                          </p>
                          {r.draftBadge ? (
                            <span className="mt-1 inline-flex rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-900 dark:bg-sky-900/35 dark:text-sky-100">
                              Borrador
                            </span>
                          ) : null}
                        </div>
                        {!readOnly ? (
                          <button type="button" className={btnCargar} onClick={() => onCargar(r.dedupeKey)}>
                            Cargar
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold uppercase text-slate-500">Solo lectura</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

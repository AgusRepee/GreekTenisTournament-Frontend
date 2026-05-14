import { LABEL_PLAYED } from '@/lib/tennis/matchDisplayState';

type LegendProps = {
  className?: string;
  /** Una sola fila compacta (p. ej. bajo el banner del torneo). */
  variant?: 'default' | 'compact';
};

/**
 * Leyenda de estados en listas de partidos / wizard (colores unificados).
 */
export function AdminStatusLegend({ className = '', variant = 'default' }: LegendProps) {
  const isCompact = variant === 'compact';
  const row = isCompact
    ? 'flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] font-semibold text-[#616f89] dark:text-gray-400'
    : 'flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-semibold text-[#616f89] dark:text-gray-400';
  const dot = isCompact ? 'h-2 w-2' : 'h-2.5 w-2.5';
  const gap = isCompact ? 'gap-1.5' : 'gap-2';
  return (
    <div className={`${row} ${className}`} role="note" aria-label="Leyenda de colores">
      <span className={`inline-flex items-center ${gap}`}>
        <span className={`${dot} shrink-0 rounded-sm bg-amber-400 ring-1 ring-amber-600/30`} aria-hidden />
        Pendiente
      </span>
      <span className={`inline-flex items-center ${gap}`}>
        <span className={`${dot} shrink-0 rounded-sm bg-sky-500 ring-1 ring-sky-700/25`} aria-hidden />
        Borrador
      </span>
      <span className={`inline-flex items-center ${gap}`}>
        <span className={`${dot} shrink-0 rounded-sm bg-emerald-500 ring-1 ring-emerald-700/25`} aria-hidden />
        {LABEL_PLAYED}
      </span>
      <span className={`inline-flex items-center ${gap}`}>
        <span className={`${dot} shrink-0 rounded-sm bg-red-500 ring-1 ring-red-700/30`} aria-hidden />
        W.O.
      </span>
      <span className={`inline-flex items-center ${gap}`}>
        <span className={`${dot} shrink-0 rounded-sm bg-violet-500 ring-1 ring-violet-700/25`} aria-hidden />
        Suspendido
      </span>
      <span className={`inline-flex items-center ${gap}`}>
        <span className={`${dot} shrink-0 rounded-sm bg-blue-500 ring-1 ring-blue-700/25`} aria-hidden />
        Editado (sin guardar)
      </span>
    </div>
  );
}

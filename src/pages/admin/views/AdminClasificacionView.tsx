import { Trophy } from 'lucide-react';
import { getPlayerById } from '@/lib/mockData';
import type { GroupTable } from '@/lib/mockData';

type Props = {
  groupTables: GroupTable[];
  tournamentName: string;
};

/**
 * Clasificación por grupo (posiciones y rendimiento). Misma fuente que Tabla, presentación enfocada en ranking.
 */
export function AdminClasificacionView({ groupTables, tournamentName }: Props) {
  if (groupTables.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 px-6 py-12 text-left space-y-3">
        <div className="flex items-start gap-3">
          <Trophy className="w-10 h-10 shrink-0 text-[#616f89] opacity-70" aria-hidden />
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-medium text-[#111318] dark:text-white">Sin clasificación aún</p>
            <p className="text-xs text-[#616f89] dark:text-gray-400 leading-relaxed" title="Cargá resultados en Resultados.">
              Resultados en <strong className="text-[#111318] dark:text-gray-200">{tournamentName}</strong> → posiciones por grupo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-gray-200/90 pb-2 dark:border-gray-700">
        <Trophy className="h-5 w-5 shrink-0 admin-theme-icon" aria-hidden />
        <h2 className="text-lg font-bold text-[#111318] dark:text-white">Clasificación</h2>
      </div>

      {groupTables.map((gt) => (
        <section key={gt.name} className="rounded-xl border border-gray-200/90 dark:border-gray-600/70 bg-gradient-to-b from-white to-[#f8f9fb] dark:from-gray-900 dark:to-gray-800/80 p-5 md:p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold admin-theme-section-title">{gt.name}</h3>
          <ol className="space-y-3">
            {gt.rows.map((row, idx) => {
              const label = getPlayerById(row.playerId)?.name ?? row.playerId.replace(/^name:/, '');
              const highlight = idx === 0;
              return (
                <li
                  key={row.playerId}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2.5 ${
                    highlight
                      ? 'border-emerald-500/50 bg-emerald-50/70 dark:bg-emerald-950/25'
                      : 'border-gray-200/90 dark:border-gray-600/60 bg-white/80 dark:bg-gray-900/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg font-black tabular-nums w-8 text-[#616f89] dark:text-gray-500">{row.position}</span>
                    <span className="font-semibold text-[#111318] dark:text-gray-100 truncate">{label}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm tabular-nums text-[#616f89] dark:text-gray-400">
                    <span>
                      PJ <strong className="text-[#111318] dark:text-white">{row.PJ}</strong>
                    </span>
                    <span>
                      {row.PG ?? 0}W · {row.PP ?? 0}L
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

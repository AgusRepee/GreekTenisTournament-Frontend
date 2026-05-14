import { useMemo, useState } from 'react';
import { History } from 'lucide-react';
import {
  filterAuditLogByTournament,
  filterAuditLogLeagueOnly,
  type AdminAuditLogEntry,
} from '@/lib/admin/tournamentAuditLog';
import type { LigaNumKey } from '@/lib/tennis/loadLigasFromDocs';

type Props = {
  tournamentId: string;
  /** Nombre del torneo solo para subtítulo / contexto. */
  tournamentName: string;
  ligaNum: LigaNumKey;
};

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function AuditTable({ entries, empty }: { entries: AdminAuditLogEntry[]; empty: string }) {
  if (entries.length === 0) {
    return <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-sm text-[#616f89] dark:border-gray-600 dark:text-gray-400">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200/90 dark:border-gray-600">
      <table className="app-data-table w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/95 text-left text-[11px] uppercase tracking-wide text-[#616f89] dark:border-gray-600 dark:bg-gray-800/90 dark:text-gray-400">
            <th className="px-3 py-2 font-bold">Fecha</th>
            <th className="px-3 py-2 font-bold">Acción</th>
            <th className="min-w-[220px] px-3 py-2 font-bold">Detalle</th>
            <th className="px-3 py-2 font-bold">Usuario</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-gray-100 dark:border-gray-700/85">
              <td className="whitespace-nowrap px-3 py-2 align-top tabular-nums text-xs text-[#616f89] dark:text-gray-400">
                {formatWhen(e.at)}
              </td>
              <td className="max-w-[10rem] px-3 py-2 align-top text-xs font-bold text-[#111318] dark:text-gray-100">{e.actionLabel}</td>
              <td className="px-3 py-2 align-top text-xs leading-relaxed text-[#111318] dark:text-gray-200">{e.detail}</td>
              <td className="whitespace-nowrap px-3 py-2 align-top text-xs text-[#616f89] dark:text-gray-400">{e.userLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminHistorialView({ tournamentId, tournamentName, ligaNum }: Props) {
  const [tick, setTick] = useState(0);
  const tournamentEntries = useMemo(() => {
    void tick;
    return filterAuditLogByTournament(tournamentId);
  }, [tournamentId, tick]);

  const leagueEntries = useMemo(() => {
    void tick;
    return filterAuditLogLeagueOnly(ligaNum).filter((e) => e.action === 'jugador_catalogo_creado' || e.action === 'jugador_catalogo_desactivado');
  }, [ligaNum, tick]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200/90 pb-3 dark:border-gray-700">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <History className="h-5 w-5 shrink-0 admin-theme-icon mt-0.5" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-[#111318] dark:text-white md:text-xl">Historial</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#616f89] dark:text-gray-400">
              Cambios registrados en este navegador para <strong className="font-semibold text-[#111318] dark:text-gray-200">{tournamentName}</strong>.
              Solo incluye las acciones que ya están cableadas en el panel.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-[11px] font-bold text-[#111318] shadow-sm transition-colors hover:bg-gray-50 sm:w-auto dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
          onClick={() => setTick((n) => n + 1)}
        >
          Actualizar
        </button>
      </div>

      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[#616f89] dark:text-gray-500">Este torneo</h3>
        <AuditTable
          entries={tournamentEntries}
          empty="Todavía no hay registros para este torneo. Al guardar resultados, plantel o cuadro, aparecerán aquí."
        />
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[#616f89] dark:text-gray-500">
          Jugadores (liga {ligaNum}, catálogo del club)
        </h3>
        <p className="text-[11px] leading-relaxed text-[#616f89] dark:text-gray-400">
          Altas y bajas desde <strong className="font-semibold text-[#111318] dark:text-gray-200">Jugadores</strong> del panel (sin torneo fijo).
        </p>
        <AuditTable
          entries={leagueEntries}
          empty="Sin altas/desactivaciones recientes desde el ABM para esta liga."
        />
      </section>

      <p className="text-[10px] leading-relaxed text-[#616f89] dark:text-gray-500">
        El historial muestra cambios operativos guardados desde el panel. Usalo para revisar correcciones, confirmaciones y movimientos importantes.
      </p>
    </div>
  );
}

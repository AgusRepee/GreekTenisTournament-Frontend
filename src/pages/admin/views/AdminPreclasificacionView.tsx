import { useMemo, useState } from 'react';
import { Info, ListOrdered } from 'lucide-react';
import type { GroupTableWithSets, Tournament } from '@/lib/mockData';
import { getPlayerById } from '@/lib/mockData';
import type { LigaNumKey } from '@/lib/tennis/loadLigasFromDocs';
import { refreshClubDataFromStorage } from '@/lib/clubDataStore';
import { persistTournamentToStorage } from '@/lib/dataService';
import { pushTournamentPreclasificacionToApi } from '@/lib/api/tournamentPreclasificacionApi';
import { useTennisLiveData } from '@/lib/tennis/useTennisLiveData';
import {
  buildOfficialTournamentSeedMap,
  createPreclasificacionFromLeagueRanking,
} from '@/lib/tennis/tournamentSeeding';
import { appendAdminAuditEntry, auditActionLabel } from '@/lib/admin/tournamentAuditLog';
import { AdminConfirmDialog } from '../AdminConfirmDialog';
import { useOptionalAdminTournamentSeed } from '../AdminTournamentSeedContext';

const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-bold shadow-sm transition-opacity admin-theme-btn';
const btnSecondary =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-[#111318] shadow-sm transition-colors dark:border-gray-600 dark:bg-gray-800 dark:text-white admin-theme-btn-secondary';

type Props = {
  tournament: Tournament;
  ligaNum: LigaNumKey;
  groupTables: GroupTableWithSets[];
  readOnly?: boolean;
};

const LIGA3_ID = 't-novak-l3';

function fmtCaptured(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export function AdminPreclasificacionView({ tournament, ligaNum, groupTables, readOnly = false }: Props) {
  const { rankingsByLeague } = useTennisLiveData();
  const seedFmt = useOptionalAdminTournamentSeed();
  const rows = rankingsByLeague.get(ligaNum) ?? [];
  const [captureOpen, setCaptureOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  const participantIds = useMemo(() => {
    const ids = [...new Set(groupTables.flatMap((g) => g.rows.map((r) => r.playerId)))];
    return ids.filter(Boolean);
  }, [groupTables]);

  const seedMapParticipants = useMemo(
    () => buildOfficialTournamentSeedMap(tournament, participantIds, rows),
    [tournament, participantIds, rows],
  );

  const snapRowsPreview = useMemo(() => {
    const ord = tournament.preclasificacion?.orderedPlayerIds ?? [];
    return ord.map((id, i) => ({
      seedInSnap: i + 1,
      id,
      name: getPlayerById(id)?.name?.trim() ?? id.replace(/^name:/, ''),
    }));
  }, [tournament.preclasificacion]);

  const participantSeedRows = useMemo(() => {
    const ranked = [...participantIds].sort((a, b) => {
      const sa = seedMapParticipants.get(a) ?? 999;
      const sb = seedMapParticipants.get(b) ?? 999;
      if (sa !== sb) return sa - sb;
      return a.localeCompare(b);
    });
    return ranked.map((id) => ({
      seed: seedMapParticipants.get(id),
      id,
      name: getPlayerById(id)?.name?.trim() ?? id.replace(/^name:/, ''),
    }));
  }, [participantIds, seedMapParticipants]);

  const persistCapture = () => {
    const snap = createPreclasificacionFromLeagueRanking(rows);
    persistTournamentToStorage({ ...tournament, preclasificacion: snap });
    void pushTournamentPreclasificacionToApi(tournament.id, snap).catch(() => {
      /* API opcional / sin sesión */
    });
    refreshClubDataFromStorage();
    appendAdminAuditEntry({
      action: 'plantel_grupos_guardado',
      actionLabel: auditActionLabel('plantel_grupos_guardado'),
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      league: ligaNum,
      detail: `Preclasificación actualizada desde ranking de liga (${snap.orderedPlayerIds.length} jugador(es) ordenados).`,
    });
    setCaptureOpen(false);
  };

  const persistClear = () => {
    const { preclasificacion: _p, ...rest } = tournament;
    persistTournamentToStorage(rest as Tournament);
    void pushTournamentPreclasificacionToApi(tournament.id, undefined).catch(() => {});
    refreshClubDataFromStorage();
    appendAdminAuditEntry({
      action: 'plantel_grupos_guardado',
      actionLabel: auditActionLabel('plantel_grupos_guardado'),
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      league: ligaNum,
      detail: 'Preclasificación oficial eliminada: los seeds vuelven a calcularse solo con el ranking vivo.',
    });
    setClearOpen(false);
  };

  if (tournament.id === LIGA3_ID) {
    return (
      <div className="rounded-xl border border-sky-500/35 bg-sky-50/80 px-4 py-4 text-sm text-sky-950 dark:border-sky-700/45 dark:bg-sky-950/30 dark:text-sky-100">
        <p className="font-bold">Liga 3</p>
        <p className="mt-2 text-xs leading-relaxed opacity-95">
          Esta categoría usa la preclasificación definida en los datos del sistema (documento Liga 3). La tabla de seeds
          editable por torneo no aplica aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200/90 pb-3 dark:border-gray-700">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <ListOrdered className="h-5 w-5 shrink-0 admin-theme-icon mt-0.5" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-[#111318] dark:text-white md:text-xl">Preclasificación</h2>
            <p className="mt-1 text-xs leading-relaxed text-[#616f89] dark:text-gray-400">
              Congelá el orden del <strong className="font-semibold text-[#111318] dark:text-gray-200">ranking de la liga</strong>{' '}
              para este torneo. Es distinto del ranking general en vivo: sirve para cabezas de serie en el cuadro y mensajes
              públicos aunque el ranking cambie después.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200/80 bg-[#f8f9fb]/90 px-3 py-3 dark:border-gray-600 dark:bg-gray-900/40">
        <Info className="h-4 w-4 shrink-0 text-[#616f89] dark:text-gray-500 mt-0.5" aria-hidden />
        <p className="text-[11px] leading-relaxed text-[#616f89] dark:text-gray-400 max-w-prose">
          Sin snapshot oficial, los seeds se calculan siempre con el ranking vigente. Con snapshot, los jugadores del torneo
          heredan primero el orden capturado; quien ingrese después sin estar en la lista queda al final según el ranking
          actual.
        </p>
      </div>

      {!readOnly ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button type="button" className={`${btnPrimary} w-full justify-center sm:w-auto`} onClick={() => setCaptureOpen(true)}>
            Capturar desde ranking actual
          </button>
          <button
            type="button"
            className={`${btnSecondary} w-full justify-center sm:w-auto`}
            disabled={!tournament.preclasificacion}
            onClick={() => setClearOpen(true)}
          >
            Quitar preclasificación
          </button>
        </div>
      ) : (
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Torneo en solo lectura.</p>
      )}

      {tournament.preclasificacion ? (
        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-[#616f89] dark:text-gray-500">Snapshot guardado</h3>
          <p className="text-xs text-[#616f89] dark:text-gray-400">
            {tournament.preclasificacion.sourceLabel ?? 'Ranking de liga'} · {fmtCaptured(tournament.preclasificacion.capturedAt)}{' '}
            · {tournament.preclasificacion.orderedPlayerIds.length} jugador(es) en orden
          </p>
          <div className="max-h-52 overflow-auto rounded-lg border border-gray-200/90 dark:border-gray-600">
            <table className="app-data-table w-full min-w-[280px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left dark:border-gray-600 dark:bg-gray-800/80">
                  <th className="py-2 px-2">#</th>
                  <th className="py-2 px-2">Jugador</th>
                </tr>
              </thead>
              <tbody>
                {snapRowsPreview.slice(0, 80).map((r) => (
                  <tr key={`${r.id}-${r.seedInSnap}`} className="border-b border-gray-100 dark:border-gray-700/80">
                    <td className="py-1.5 px-2 tabular-nums font-semibold">{r.seedInSnap}</td>
                    <td className="py-1.5 px-2">{r.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {snapRowsPreview.length > 80 ? (
              <p className="border-t border-gray-200 px-2 py-1 text-[10px] text-[#616f89] dark:border-gray-600">
                … y {snapRowsPreview.length - 80} más (lista completa persistida).
              </p>
            ) : null}
          </div>
        </section>
      ) : (
        <p className="text-sm text-[#616f89] dark:text-gray-400">No hay preclasificación oficial: se usa ranking vivo.</p>
      )}

      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[#616f89] dark:text-gray-500">
          Seeds entre participantes del torneo
        </h3>
        <p className="text-[11px] text-[#616f89] dark:text-gray-400">
          Solo jugadores que figuran en la tabla de grupos de este torneo ({participantIds.length}).
        </p>
        {participantIds.length === 0 ? (
          <p className="text-xs text-amber-800 dark:text-amber-200">Todavía no hay plantel en grupos para este torneo.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200/90 dark:border-gray-600">
            <table className="app-data-table w-full min-w-[320px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-[11px] uppercase tracking-wider text-[#616f89] dark:border-gray-600 dark:text-gray-500">
                  <th className="py-2 px-3">Jugador</th>
                </tr>
              </thead>
              <tbody>
                {participantSeedRows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700/80">
                    <td className="py-2 px-3 font-medium text-[#111318] dark:text-gray-100">
                      {seedFmt?.formatPlayerId(r.id) ?? r.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AdminConfirmDialog
        open={captureOpen}
        title="Capturar preclasificación"
        description={
          <>
            Se guardará el orden actual del ranking de esta liga ({rows.length} fila(s)) como tabla oficial de seeds para{' '}
            <strong>{tournament.name}</strong>. Podés volver a capturar más adelante o quitar la preclasificación.
          </>
        }
        confirmLabel="Capturar"
        onClose={() => setCaptureOpen(false)}
        onConfirm={() => {
          persistCapture();
          return true;
        }}
      />

      <AdminConfirmDialog
        open={clearOpen}
        title="Quitar preclasificación"
        description="Los seeds volverán a calcularse únicamente con el ranking en vivo. Esta acción no borra resultados ni grupos."
        confirmLabel="Quitar"
        variant="danger"
        onClose={() => setClearOpen(false)}
        onConfirm={() => {
          persistClear();
          return true;
        }}
      />
    </div>
  );
}

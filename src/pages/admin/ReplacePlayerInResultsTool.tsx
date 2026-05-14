import { useState, type FormEvent } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cleanPlayerName } from '@/lib/tennis/matchDedupe';
import { getResults, upsertResult } from '@/lib/tennis/resultsStore';
import type { MatchInput } from '@/types/tennisResults';
import { getTournamentById } from '@/lib/mockData';
import type { LigaNumKey } from '@/lib/tennis/loadLigasFromDocs';
import { appendAdminAuditEntry, auditActionLabel } from '@/lib/admin/tournamentAuditLog';
import { recalculateTournament } from '@/lib/tennis/recalculateTournament';
import { AdminConfirmDialog } from './AdminConfirmDialog';

type Props = {
  tournamentId: string;
  leagueNum: LigaNumKey;
};

/**
 * Reemplazo global de nombre de jugador en todos los resultados del torneo (mismo texto normalizado).
 */
export function ReplacePlayerInResultsTool({ tournamentId, leagueNum }: Props) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [pendingPair, setPendingPair] = useState<{ a: string; b: string } | null>(null);

  const runReplace = (a: string, b: string) => {
    const all = getResults().filter((r) => r.tournamentId === tournamentId);
    let n = 0;
    for (const r of all) {
      const pa = cleanPlayerName(r.playerA);
      const pb = cleanPlayerName(r.playerB);
      let na = pa;
      let nb = pb;
      if (pa.toLowerCase() === a.toLowerCase()) na = b;
      if (pb.toLowerCase() === a.toLowerCase()) nb = b;
      if (na === pa && nb === pb) continue;
      upsertResult({
        ...r,
        playerA: na,
        playerB: nb,
      });
      n++;
    }
    if (n > 0) {
      const rec = recalculateTournament({ tournamentId, league: leagueNum });
      const tn = getTournamentById(tournamentId)?.name?.trim() || tournamentId;
      appendAdminAuditEntry({
        action: 'jugador_reemplazado_resultados',
        actionLabel: auditActionLabel('jugador_reemplazado_resultados'),
        tournamentId,
        tournamentName: tn,
        league: leagueNum,
        playersInvolved: `${b} (reemplazo de ${a})`,
        prevValue: a,
        newValue: b,
        detail: `Reemplazo en resultados del torneo "${tn}": "${a}" por "${b}" (${n} registro(s)).`,
      });
      setMsg(
        rec.ok
          ? `Actualizados ${n} registro(s). Torneo recalculado correctamente.`
          : 'No se pudo recalcular. Revisá partidos incompletos o datos inconsistentes.',
      );
      if (!rec.ok) {
        console.warn('[recalculateTournament] Tras reemplazo en resultados:', rec.error);
      }
    } else {
      setMsg('No hubo coincidencias en este torneo.');
    }
    setFrom('');
    setTo('');
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const a = cleanPlayerName(from);
    const b = cleanPlayerName(to);
    if (!a || !b) {
      setMsg('Completá ambos nombres.');
      return;
    }
    if (a.toLowerCase() === b.toLowerCase()) {
      setMsg('El nombre nuevo debe ser distinto.');
      return;
    }
    setPendingPair({ a, b });
    setReplaceDialogOpen(true);
  };

  return (
    <section className="rounded-xl border border-amber-500/35 bg-amber-50/50 dark:bg-amber-950/20 p-4 md:p-5 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" aria-hidden />
        <div>
          <h4 className="font-bold text-[#111318] dark:text-white text-sm">Reemplazar jugador en resultados</h4>
          <p className="text-xs text-[#616f89] dark:text-gray-400 mt-1 leading-relaxed">
            Herramienta de soporte en la pestaña <strong>Resultados</strong> del torneo (ya no en Configuración). Afecta solo partidos guardados de{' '}
            <strong>este torneo</strong>. Usá el mismo formato de nombre que en el fixture.
          </p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="grid sm:grid-cols-2 gap-3 max-w-xl">
        <div>
          <label className="block text-[11px] font-bold uppercase text-[#616f89] mb-1">Nombre actual</label>
          <input
            className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="Ej: Juan Pérez"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase text-[#616f89] mb-1">Nombre nuevo</label>
          <input
            className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Ej: Juan Pérez (P)"
          />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="inline-flex rounded-md px-4 py-2 text-sm font-bold border admin-theme-btn">
            Reemplazar en este torneo
          </button>
        </div>
      </form>
      {msg ? <p className="text-sm text-[#111318] dark:text-gray-200">{msg}</p> : null}

      <AdminConfirmDialog
        open={replaceDialogOpen}
        title="Reemplazar jugador en resultados"
        description={
          pendingPair ? (
            <>
              ¿Reemplazar <strong className="text-[#111318] dark:text-white">&quot;{pendingPair.a}&quot;</strong> por{' '}
              <strong className="text-[#111318] dark:text-white">&quot;{pendingPair.b}&quot;</strong> en todos los partidos guardados de{' '}
              <strong className="text-[#111318] dark:text-white">este torneo</strong>?
            </>
          ) : null
        }
        confirmLabel="Reemplazar"
        variant="danger"
        irreversible
        onClose={() => {
          setReplaceDialogOpen(false);
          setPendingPair(null);
        }}
        onConfirm={() => {
          if (!pendingPair) return false;
          runReplace(pendingPair.a, pendingPair.b);
          setPendingPair(null);
          return true;
        }}
      />
    </section>
  );
}

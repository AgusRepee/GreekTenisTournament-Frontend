import type { LigaNumKey } from '@/lib/tennis/loadLigasFromDocs';
import type { GroupTableWithSets } from '@/lib/mockData';
import { AdminResultsVisualPanel } from '../results/AdminResultsVisualPanel';

type Props = {
  tournamentId: string;
  leagueNum: LigaNumKey;
  /** @deprecated El acento del workspace sigue la liga actual; opcional. */
  onWizardTournamentChange?: (tournamentId: string | null) => void;
  draftResetSignal: number;
  onResultsDirtyChange: (dirty: boolean) => void;
  /** Torneo finalizado o archivado: sin guardar ni W.O. */
  readOnly?: boolean;
  templateHasGrupos?: boolean;
  groupTables?: GroupTableWithSets[];
  groupStageStatus?: 'confirmed';
  onGroupStageStatusChange?: (next: 'confirmed' | 'open') => void;
  onRegisterBulkSave?: (fn: (() => Promise<boolean>) | null) => void;
  focusDedupeKey?: string | null;
  onConsumedFocusDedupeKey?: () => void;
  onRequestProgramarPartido?: (dedupeKey: string) => void;
};

/**
 * Resultados: listado visual por fecha / grupo / KO, acordeón con marcador y «Guardar todo».
 */
export function AdminResultadosView({
  tournamentId,
  leagueNum,
  onWizardTournamentChange,
  draftResetSignal,
  onResultsDirtyChange,
  readOnly = false,
  templateHasGrupos,
  groupTables,
  groupStageStatus,
  onGroupStageStatusChange,
  onRegisterBulkSave,
  focusDedupeKey,
  onConsumedFocusDedupeKey,
  onRequestProgramarPartido,
}: Props) {
  return (
    <div className="space-y-4">
      {readOnly ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-50/90 px-3 py-2 text-xs text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          Solo lectura: no se pueden guardar marcadores ni walkovers.
        </div>
      ) : null}
      <AdminResultsVisualPanel
        tournamentId={tournamentId}
        leagueNum={leagueNum}
        templateHasGrupos={templateHasGrupos}
        groupTables={groupTables}
        groupStageStatus={groupStageStatus}
        onGroupStageStatusChange={onGroupStageStatusChange}
        readOnly={readOnly}
        onTournamentThemeChange={onWizardTournamentChange}
        onDirtyChange={onResultsDirtyChange}
        draftResetSignal={draftResetSignal}
        onRegisterBulkSave={onRegisterBulkSave}
        focusDedupeKey={focusDedupeKey}
        onConsumedFocusDedupeKey={onConsumedFocusDedupeKey}
        onRequestProgramarPartido={onRequestProgramarPartido}
      />
    </div>
  );
}

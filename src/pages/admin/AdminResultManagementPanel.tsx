import { AdminResultWizard } from './AdminResultWizard';

type Props = {
  /** Para tema visual: torneo elegido en el wizard (además de la pestaña Liga). */
  onWizardTournamentChange?: (tournamentId: string | null) => void;
};

/** Panel de gestión: flujo por pasos (torneo → etapa → partidos en tarjetas → marcador estructurado). */
export function AdminResultManagementPanel({ onWizardTournamentChange }: Props) {
  return <AdminResultWizard onTournamentThemeChange={onWizardTournamentChange} />;
}

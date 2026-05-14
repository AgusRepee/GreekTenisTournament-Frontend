import { refreshClubDataFromStorage } from '@/lib/clubDataStore';
import { recalculateTournament as computeTournamentDerivedFromSnapshot } from '@/lib/tournamentEngine';

export type RecalculateTournamentParams = {
  tournamentId: string;
  /** Liga 1–6 del torneo (trazabilidad y validaciones futuras). */
  league: number;
};

export type RecalculateTournamentResult = { ok: true } | { ok: false; error: string };

/**
 * Recálculo central tras guardar/editar resultados, plantel o herramientas admin.
 *
 * Ejecuta el motor (`recalculateTournament` en `tournamentEngine`): grupos con **plantel completo**
 * (plantilla + override), clasificación, repechajes, KO, estadísticas de jugador, ranking de liga,
 * y fuerza `refreshClubDataFromStorage` para alinear tablas / perfiles / datos públicos derivados.
 *
 * No modifica planteles ni jugadores; solo lee snapshot + resultados persistidos.
 */
export function recalculateTournament(params: RecalculateTournamentParams): RecalculateTournamentResult {
  void params.league;
  try {
    computeTournamentDerivedFromSnapshot(params.tournamentId);
    refreshClubDataFromStorage();
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Error desconocido al recalcular.';
    return {
      ok: false,
      error,
    };
  }
}

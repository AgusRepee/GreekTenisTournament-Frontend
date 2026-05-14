import { refreshClubDataFromStorage } from '@/lib/clubDataStore';
import type { Tournament } from '@/lib/mockData';
import { getTournamentById } from '@/lib/mockData';
import { persistTournamentToStorage } from '@/lib/dataService';
import { getDataSourceMode } from '@/lib/data/tournamentRepository';
import { getAdminTournamentRow, getPublicTournamentMetaById, patchAdminTournament } from '@/lib/api/apiClient';
import { tournamentPreclasificacionFromJson } from '@/lib/api/mapTournamentPreclasificacion';

function normPreclasificacion(p: Tournament['preclasificacion']): string | null {
  return p == null ? null : JSON.stringify(p);
}

/** Persiste solo el snapshot en MySQL (modo API). Errores: caller puede capturar. */
export async function pushTournamentPreclasificacionToApi(
  tournamentId: string,
  preclasificacion: Tournament['preclasificacion'],
): Promise<void> {
  if (getDataSourceMode() !== 'api' || !tournamentId.trim()) return;
  await patchAdminTournament(tournamentId.trim(), { preclasificacion: preclasificacion ?? null });
}

/** Trae `preclasificacionJson` desde admin API y fusiona en overlay local si cambió. */
export async function hydrateTournamentPreclasificacionFromAdminApi(tournamentId: string): Promise<void> {
  if (getDataSourceMode() !== 'api' || !tournamentId.trim()) return;
  const row = await getAdminTournamentRow(tournamentId.trim());
  const parsed = tournamentPreclasificacionFromJson(row.preclasificacionJson);
  const cur = getTournamentById(tournamentId.trim());
  if (!cur) return;
  if (normPreclasificacion(cur.preclasificacion) === normPreclasificacion(parsed)) return;

  if (parsed == null) {
    const { preclasificacion: _drop, ...rest } = cur;
    persistTournamentToStorage(rest as Tournament);
  } else {
    persistTournamentToStorage({ ...cur, preclasificacion: parsed });
  }
  refreshClubDataFromStorage();
}

/** Igual que admin pero vía ruta pública (sin JWT), para detalle/bracket en visitantes. */
export async function hydrateTournamentPreclasificacionFromPublicApi(tournamentId: string): Promise<void> {
  if (getDataSourceMode() !== 'api' || !tournamentId.trim()) return;
  const row = await getPublicTournamentMetaById(tournamentId.trim());
  const parsed = tournamentPreclasificacionFromJson(row.preclasificacionJson);
  const cur = getTournamentById(tournamentId.trim());
  if (!cur) return;
  if (normPreclasificacion(cur.preclasificacion) === normPreclasificacion(parsed)) return;

  if (parsed == null) {
    const { preclasificacion: _drop, ...rest } = cur;
    persistTournamentToStorage(rest as Tournament);
  } else {
    persistTournamentToStorage({ ...cur, preclasificacion: parsed });
  }
  refreshClubDataFromStorage();
}

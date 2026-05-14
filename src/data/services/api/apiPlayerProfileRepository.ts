import { getPublicPlayer } from '@/lib/api/apiClient';

/** Perfil público enriquecido (`GET /api/public/players/:id`). */
export async function fetchPublicPlayerProfile(playerId: string): Promise<unknown> {
  return getPublicPlayer(playerId);
}

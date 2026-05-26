/**
 * Caché en memoria de perfiles públicos (`GET /api/public/players/:id`).
 * Evita perder la respuesta si el efecto del componente se cancela por desmontaje.
 */

import { fetchPublicPlayerProfile } from './apiPlayerProfileRepository';
import { mapPublicPlayerProfileResponse } from './mapPublicPlayerProfile';

export type ProfileEntry = {
  data: Record<string, unknown> | null;
  fetchDone: boolean;
};

/** Referencia estable para useSyncExternalStore (nunca devolver `{}` nuevo en cada getSnapshot). */
export const EMPTY_PUBLIC_PLAYER_PROFILE: ProfileEntry = Object.freeze({
  data: null,
  fetchDone: false,
});

const listeners = new Set<() => void>();
const byId = new Map<string, ProfileEntry>();
const inflight = new Map<string, Promise<void>>();

function emit(): void {
  listeners.forEach((l) => l());
}

export function getPublicPlayerProfileState(playerId: string): ProfileEntry {
  const id = playerId.trim();
  if (!id) return EMPTY_PUBLIC_PLAYER_PROFILE;
  return byId.get(id) ?? EMPTY_PUBLIC_PLAYER_PROFILE;
}

export function subscribePublicPlayerProfiles(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function ensurePublicPlayerProfileLoaded(playerId: string): void {
  const id = playerId.trim();
  if (!id) return;
  const cur = byId.get(id);
  if (cur?.fetchDone || inflight.has(id)) return;

  const p = (async () => {
    try {
      const payload = await fetchPublicPlayerProfile(id);
      byId.set(id, {
        data: mapPublicPlayerProfileResponse(payload),
        fetchDone: true,
      });
    } catch {
      byId.set(id, { data: null, fetchDone: true });
    } finally {
      inflight.delete(id);
      emit();
    }
  })();
  inflight.set(id, p);
}

/** Solo tests. */
export function resetPublicPlayerProfileStoreForTests(): void {
  byId.clear();
  inflight.clear();
  emit();
}

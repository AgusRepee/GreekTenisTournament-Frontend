/**
 * Capa de acceso a datos de torneos persistidos.
 *
 * Hoy: `localStorage` (clave `PERSISTENCE_KEYS.torneos` / `"torneos"`).
 * Mañana: sustituir el cuerpo de cada función por llamadas HTTP (misma firma o variantes `*Async`).
 */

import type { Tournament } from './mockData';
import { getData, saveData, PERSISTENCE_KEYS } from './localPersistence';

const STORAGE_KEY = PERSISTENCE_KEYS.torneos;

function readAll(): Tournament[] {
  const raw = getData<unknown>(STORAGE_KEY);
  return Array.isArray(raw) ? (raw as Tournament[]) : [];
}

function writeAll(list: Tournament[]): void {
  saveData(STORAGE_KEY, list);
}

/** Lista solo torneos guardados por el admin (overlay; el merge con defaults hace `clubDataStore`). */
export function getTorneos(): Tournament[] {
  return readAll();
}

export function createTorneo(torneo: Tournament): void {
  const list = readAll();
  if (list.some((x) => x.id === torneo.id)) {
    throw new Error(`Ya existe un torneo con id "${torneo.id}".`);
  }
  writeAll([...list, torneo]);
}

export function updateTorneo(torneo: Tournament): void {
  const list = readAll();
  const idx = list.findIndex((x) => x.id === torneo.id);
  if (idx < 0) {
    throw new Error(`No se encontró el torneo "${torneo.id}" para actualizar.`);
  }
  const next = [...list];
  next[idx] = torneo;
  writeAll(next);
}

export function deleteTorneo(id: string): void {
  writeAll(readAll().filter((x) => x.id !== id));
}

/** Crea o actualiza el overlay de torneos. El caller debe llamar `refreshClubDataFromStorage` después. */
export function persistTournamentToStorage(next: Tournament): void {
  const list = readAll();
  if (list.some((x) => x.id === next.id)) {
    updateTorneo(next);
  } else {
    createTorneo(next);
  }
}

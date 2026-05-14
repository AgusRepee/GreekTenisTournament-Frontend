/**
 * Lectura/escritura JSON genérica (hoy: localStorage).
 * Las claves de negocio viven en `@/data/types/persistenceKeys`.
 */

export { PERSISTENCE_KEYS } from '../data/types/persistenceKeys';

export function saveData(key: string, data: unknown): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

export function getData<T = unknown>(key: string): T | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}


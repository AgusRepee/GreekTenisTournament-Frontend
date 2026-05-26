/**
 * Modo de datos del torneo/club: `local` (default en dev) usa localStorage + stores actuales.
 * `api` delega en `VITE_API_URL` (ver `src/lib/api/apiClient.ts`).
 *
 * Activar en build: `VITE_DATA_SOURCE=api` (+ `VITE_API_URL` recomendado).
 * En producción, si la variable no está, se asume `api` (misma intención que `.env.production.example`).
 */

export type DataSourceMode = 'local' | 'api';

export function getDataSourceMode(): DataSourceMode {
  const v = import.meta.env.VITE_DATA_SOURCE?.trim().toLowerCase();
  if (v === 'api') return 'api';
  if (v === 'local') return 'local';
  // Misma intención que `.env.production.example`; no aplicar en Vitest (PROD puede ser true y el snapshot de club no es el de tests).
  if (import.meta.env.PROD && !import.meta.env.VITEST) return 'api';
  return 'local';
}

export function isApiDataSource(): boolean {
  return getDataSourceMode() === 'api';
}

/**
 * Punto único para inicializar adaptadores (ej. sustituir puertos en `src/data/services/registry.ts`).
 * Hoy solo documenta intención; el cableado pleno a la UI se hace de forma incremental.
 */
export function describeDataSourceForDebug(): { mode: DataSourceMode; apiUrl: string | undefined } {
  return {
    mode: getDataSourceMode(),
    apiUrl: import.meta.env.VITE_API_URL,
  };
}

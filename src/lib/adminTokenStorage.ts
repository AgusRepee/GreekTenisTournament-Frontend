/** JWT de admin en `sessionStorage` (compartido por `apiClient` y `adminAuth`). */

const KEY = 'greek-admin-jwt';

export function getStoredAdminToken(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const t = sessionStorage.getItem(KEY);
    return t?.trim() || null;
  } catch {
    return null;
  }
}

export function setStoredAdminToken(token: string | null): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (token) sessionStorage.setItem(KEY, token);
    else sessionStorage.removeItem(KEY);
  } catch {
    /* quota */
  }
}

/** True si hay credenciales para llamar endpoints `/api/admin/*` (JWT en sesión o token de dev en Vite). */
export function hasAdminApiCredentials(): boolean {
  if (getStoredAdminToken()) return true;
  if (import.meta.env.DEV && import.meta.env.VITE_ADMIN_TOKEN?.trim()) return true;
  return false;
}

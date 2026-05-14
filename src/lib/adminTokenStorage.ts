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

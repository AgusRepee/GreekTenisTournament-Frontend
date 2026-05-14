/**
 * Sesión de administrador en cliente.
 * - Modo **local**: JSON en localStorage (`greek-tennis-admin-session`) + credenciales demo.
 * - Modo **api**: JWT en `sessionStorage` (ver `adminTokenStorage`) tras `POST /api/admin/auth/login`.
 */

import { getDataSourceMode } from './data/tournamentRepository';
import { getStoredAdminToken, setStoredAdminToken } from './adminTokenStorage';

const SESSION_KEY = 'greek-tennis-admin-session';
/** Clave legada (sesiones anteriores); se limpia al iniciar / cerrar sesión con el nuevo formato. */
const LEGACY_IS_ADMIN_KEY = 'isAdmin';

export const ADMIN_SESSION_TOKEN = 'secure-token';

export interface AdminSessionPayload {
  isAdmin: boolean;
  token: string;
}

function parseSession(raw: string | null): AdminSessionPayload | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== 'object') return null;
    const rec = o as Record<string, unknown>;
    if (rec.isAdmin !== true || rec.token !== ADMIN_SESSION_TOKEN) return null;
    return { isAdmin: true, token: ADMIN_SESSION_TOKEN };
  } catch {
    return null;
  }
}

export function readIsAdmin(): boolean {
  const dataSourceMode = getDataSourceMode();
  if (getStoredAdminToken()) return true;
  if (dataSourceMode === 'api') {
    return import.meta.env.DEV && Boolean(import.meta.env.VITE_ADMIN_TOKEN?.trim());
  }
  if (typeof localStorage === 'undefined') return false;
  try {
    const session = parseSession(localStorage.getItem(SESSION_KEY));
    if (session) return true;
    return localStorage.getItem(LEGACY_IS_ADMIN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAdminSession(): void {
  if (typeof localStorage === 'undefined') return;
  const payload: AdminSessionPayload = { isAdmin: true, token: ADMIN_SESSION_TOKEN };
  localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  try {
    localStorage.removeItem(LEGACY_IS_ADMIN_KEY);
  } catch {
    /* ignore */
  }
}

/** Cierra la sesión de admin (no borra el resto de datos del sitio). */
export function clearAdminSession(): void {
  setStoredAdminToken(null);
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LEGACY_IS_ADMIN_KEY);
  } catch {
    /* ignore */
  }
}

const LOCAL_DEMO_USERNAME = 'admin';
const LOCAL_DEMO_PASSWORD = '1234';

export function credentialsMatch(username: string, password: string): boolean {
  return username === LOCAL_DEMO_USERNAME && password === LOCAL_DEMO_PASSWORD;
}

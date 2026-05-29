/**
 * Cliente HTTP unificado para modo `VITE_DATA_SOURCE=api`.
 * Prefijo base: `import.meta.env.VITE_API_URL` (sin barra final).
 * En `vite build` sin `.env.production`, en producción se usa la API pública por defecto
 * (evita bundles rotos en Hostinger; igual conviene definir `VITE_API_URL` para staging / otra API).
 * Admin: JWT en `sessionStorage` (login) o, solo en desarrollo, `VITE_ADMIN_TOKEN`.
 */

import { clearAdminSession } from '@/lib/adminAuth';
import { getStoredAdminToken, setStoredAdminToken } from '@/lib/adminTokenStorage';
import type { TournamentPreclasificacion } from '@/lib/mockData';
import type { TournamentCatalogType } from '@/types/tournamentCatalog';
import type { BulkSaveResultsBody, FinalizeTournamentBody } from './types';

export { getStoredAdminToken, setStoredAdminToken };

/** Origen API por defecto en producción (no es secreto; coincide con `.env.production.example`). */
const DEFAULT_PRODUCTION_API_URL = 'https://api.greektennis.com';

function baseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  if (import.meta.env.PROD) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(
        `[apiClient] VITE_API_URL no estaba definido en el build; usando ${DEFAULT_PRODUCTION_API_URL}. ` +
          'Creá `.env.production` desde `.env.production.example` antes de `npm run build:production`.',
      );
    }
    return DEFAULT_PRODUCTION_API_URL;
  }
  throw new Error(
    'VITE_API_URL no definido. En desarrollo copiá `.env.example` a `.env.local` o definí VITE_API_URL.',
  );
}

function headersJson(requireAuth: boolean): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (requireAuth) {
    const pre = import.meta.env.DEV ? import.meta.env.VITE_ADMIN_TOKEN?.trim() : undefined;
    const tok = getStoredAdminToken() ?? pre;
    if (tok) h.Authorization = `Bearer ${tok}`;
  }
  return h;
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

async function req<T>(method: string, path: string, body?: unknown, requireAuth = false): Promise<T> {
  const url = `${baseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    method,
    headers: headersJson(requireAuth),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await parseJson<T & { error?: string }>(res);
  if (!res.ok) {
    if (requireAuth && res.status === 401) {
      clearAdminSession();
      if (typeof window !== 'undefined') {
        const pathname = window.location.pathname;
        // Solo redirigir en zona admin: en rutas públicas los repos pueden intentar GET admin sin JWT y el 401 no debe expulsar al visitante.
        if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
          window.location.assign('/login?sesion=expirada');
        }
      }
    }
    const msg = (data as { error?: string }).error ?? res.statusText ?? 'Request failed';
    throw new Error(`${method} ${path}: ${msg}`);
  }
  return data as T;
}

/** Público */

export async function getPublicTournaments() {
  return req<unknown[]>('GET', '/api/public/tournaments');
}

export async function getPublicTournamentBySlug(slug: string) {
  return req<unknown>('GET', `/api/public/tournaments/${encodeURIComponent(slug)}`);
}

export async function getPublicPlayers() {
  return req<unknown[]>('GET', '/api/public/players');
}

export async function getPublicMatchResults(tournamentId?: string) {
  const q = tournamentId?.trim() ? `?tournamentId=${encodeURIComponent(tournamentId.trim())}` : '';
  return req<Record<string, unknown>[]>('GET', `/api/public/match-results${q}`, undefined, false);
}

/** Metadatos mínimos por id (preclasificación para bracket público). */
export async function getPublicTournamentMetaById(tournamentId: string) {
  return req<{ id: string; slug?: string | null; name?: string; preclasificacionJson?: unknown }>(
    'GET',
    `/api/public/tournaments/by-id/${encodeURIComponent(tournamentId.trim())}`,
    undefined,
    false,
  );
}

export async function getPublicTournamentSchedule(slug: string) {
  return req<unknown>('GET', `/api/public/tournaments/${encodeURIComponent(slug)}/schedule`);
}

export async function getPublicGroupStandingsByTournamentId(tournamentId: string) {
  const q = `?tournamentId=${encodeURIComponent(tournamentId.trim())}`;
  return req<unknown>('GET', `/api/public/group-standings${q}`, undefined, false);
}

export async function getPublicGroupStandingsBySlug(slug: string) {
  return req<unknown>(
    'GET',
    `/api/public/tournaments/${encodeURIComponent(slug)}/group-standings`,
    undefined,
    false,
  );
}

/** Misma carga que la agenda por slug, usando `tournamentId` (útil cuando el front solo conoce el id). */
export async function getPublicScheduleByTournamentId(tournamentId: string) {
  const q = `?tournamentId=${encodeURIComponent(tournamentId.trim())}`;
  return req<unknown>('GET', `/api/public/schedule${q}`, undefined, false);
}

export async function getPublicSchedules(tournamentId?: string) {
  const q = tournamentId?.trim() ? `?tournamentId=${encodeURIComponent(tournamentId.trim())}` : '';
  return req<Record<string, unknown>[]>('GET', `/api/public/schedules${q}`, undefined, false);
}

export async function getAdminSchedules(tournamentId?: string) {
  const q = tournamentId?.trim() ? `?tournamentId=${encodeURIComponent(tournamentId.trim())}` : '';
  return req<Record<string, unknown>[]>('GET', `/api/admin/schedules${q}`, undefined, true);
}

export async function saveMatchSchedule(matchId: string, payload: Record<string, unknown>) {
  return req<unknown>('POST', `/api/admin/matches/${encodeURIComponent(matchId)}/schedule`, payload, true);
}

export async function updateMatchSchedule(matchId: string, payload: Record<string, unknown>) {
  return req<unknown>('PUT', `/api/admin/matches/${encodeURIComponent(matchId)}/schedule`, payload, true);
}

export async function confirmTournamentSchedules(tournamentId: string, payload?: { keys?: string[] }) {
  return req<unknown>(
    'POST',
    `/api/admin/tournaments/${encodeURIComponent(tournamentId)}/schedules/confirm`,
    payload ?? {},
    true,
  );
}

export async function postponeMatchSchedule(matchId: string, payload: Record<string, unknown> = {}) {
  return req<unknown>(
    'POST',
    `/api/admin/matches/${encodeURIComponent(matchId)}/schedule/postpone`,
    payload,
    true,
  );
}

export async function cancelMatchSchedule(matchId: string) {
  return req<unknown>('POST', `/api/admin/matches/${encodeURIComponent(matchId)}/schedule/cancel`, {}, true);
}

export async function deleteAdminMatchSchedule(matchId: string) {
  return req<unknown>('DELETE', `/api/admin/matches/${encodeURIComponent(matchId)}/schedule`, undefined, true);
}

export async function getPublicRankings(leagueNum?: number) {
  const q =
    leagueNum != null && leagueNum >= 1 && leagueNum <= 6
      ? `?league=${encodeURIComponent(String(leagueNum))}`
      : '';
  return req<unknown>('GET', `/api/public/rankings${q}`);
}

export async function getPublicPlayer(id: string) {
  return req<unknown>('GET', `/api/public/players/${encodeURIComponent(id)}`);
}

/** Admin */

export async function getAdminTournamentMatches(tournamentId: string) {
  return req<unknown>('GET', `/api/admin/tournaments/${encodeURIComponent(tournamentId)}/matches`, undefined, true);
}

export async function getAdminTournamentLeagues(tournamentId: string) {
  return req<Record<string, unknown>[]>('GET', `/api/admin/tournaments/${encodeURIComponent(tournamentId)}/leagues`, undefined, true);
}

/** Lista `MatchResult` persistidos (todos los torneos o filtrados por `tournamentId`). */
export async function getAdminMatchResults(tournamentId?: string) {
  const q = tournamentId?.trim() ? `?tournamentId=${encodeURIComponent(tournamentId.trim())}` : '';
  return req<Record<string, unknown>[]>('GET', `/api/admin/match-results${q}`, undefined, true);
}

export async function deleteAdminMatchResultByDedupeKey(dedupeKey: string) {
  return req<{ ok?: boolean; deleted?: number }>('POST', '/api/admin/match-results/delete', { dedupeKey }, true);
}

export async function postMatchResult(matchId: string, payload: Record<string, unknown>) {
  return req<unknown>('POST', `/api/admin/matches/${encodeURIComponent(matchId)}/result`, payload, true);
}

export async function putMatchResult(matchId: string, payload: Record<string, unknown>) {
  return req<unknown>('PUT', `/api/admin/matches/${encodeURIComponent(matchId)}/result`, payload, true);
}

export async function bulkSaveResults(body: BulkSaveResultsBody) {
  return req<unknown>('POST', '/api/admin/results/bulk-save', body, true);
}

export async function postMatchSchedule(matchId: string, payload: Record<string, unknown>) {
  return saveMatchSchedule(matchId, payload);
}

export async function putMatchSchedule(matchId: string, payload: Record<string, unknown>) {
  return updateMatchSchedule(matchId, payload);
}

export async function confirmGroupResults(tournamentLeagueId: string, payload?: Record<string, unknown>) {
  return req<unknown>(
    'POST',
    `/api/admin/tournament-leagues/${encodeURIComponent(tournamentLeagueId)}/confirm-results`,
    payload ?? {},
    true,
  );
}

export async function reopenGroupResults(tournamentLeagueId: string) {
  return req<{ ok?: boolean; warning?: string; league?: unknown }>(
    'POST',
    `/api/admin/tournament-leagues/${encodeURIComponent(tournamentLeagueId)}/reopen-results`,
    {},
    true,
  );
}

export async function updateTournamentLeagueEliminationStatus(tournamentLeagueId: string, status: string) {
  return req<unknown>(
    'PUT',
    `/api/admin/tournament-leagues/${encodeURIComponent(tournamentLeagueId)}/elimination-status`,
    { status },
    true,
  );
}

export async function getAdminEliminationBracket(tournamentLeagueId: string) {
  return req<unknown>(
    'GET',
    `/api/admin/tournament-leagues/${encodeURIComponent(tournamentLeagueId)}/elimination`,
    undefined,
    true,
  );
}

export async function generateEliminationBracket(tournamentLeagueId: string, bracket: unknown) {
  return req<unknown>(
    'POST',
    `/api/admin/tournament-leagues/${encodeURIComponent(tournamentLeagueId)}/elimination/generate`,
    { bracket },
    true,
  );
}

export async function putEliminationBracket(tournamentLeagueId: string, bracket: unknown) {
  return req<unknown>(
    'PUT',
    `/api/admin/tournament-leagues/${encodeURIComponent(tournamentLeagueId)}/elimination`,
    { bracket },
    true,
  );
}

export async function confirmElimination(tournamentLeagueId: string) {
  return req<{ ok?: boolean; matchesCreated?: number; league?: unknown }>(
    'POST',
    `/api/admin/tournament-leagues/${encodeURIComponent(tournamentLeagueId)}/elimination/confirm`,
    {},
    true,
  );
}

export async function getPublicEliminationByTournamentId(tournamentId: string, leagueNum = 1) {
  const q = `?tournamentId=${encodeURIComponent(tournamentId.trim())}&leagueNum=${encodeURIComponent(String(leagueNum))}`;
  return req<unknown>('GET', `/api/public/elimination${q}`, undefined, false);
}

export async function getPublicTournamentElimination(slug: string, leagueNum = 1) {
  const q = leagueNum !== 1 ? `?leagueNum=${encodeURIComponent(String(leagueNum))}` : '';
  return req<unknown>('GET', `/api/public/tournaments/${encodeURIComponent(slug)}/elimination${q}`, undefined, false);
}

export type PatchAdminTournamentBody = {
  tournamentType?: TournamentCatalogType;
  /** Snapshot oficial o `null` para borrar en MySQL. */
  preclasificacion?: TournamentPreclasificacion | null;
};

export async function getAdminTournamentRow(tournamentId: string) {
  return req<{
    id: string;
    slug?: string | null;
    name?: string;
    tournamentType?: string;
    preclasificacionJson?: unknown;
    ligaDoc?: unknown;
    status?: string;
    [key: string]: unknown;
  }>('GET', `/api/admin/tournaments/${encodeURIComponent(tournamentId.trim())}`, undefined, true);
}

export async function patchAdminTournament(tournamentId: string, body: PatchAdminTournamentBody) {
  return req<Record<string, unknown>>(
    'PATCH',
    `/api/admin/tournaments/${encodeURIComponent(tournamentId.trim())}`,
    body,
    true,
  );
}

export async function finalizeTournament(tournamentId: string, body: FinalizeTournamentBody) {
  return req<unknown>(
    'POST',
    `/api/admin/tournaments/${encodeURIComponent(tournamentId)}/finalize`,
    body,
    true,
  );
}

export async function recalculateTournament(tournamentId: string) {
  return req<unknown>('POST', `/api/admin/tournaments/${encodeURIComponent(tournamentId)}/recalculate`, {}, true);
}

export async function getAuditLog(tournamentId: string, limit = 100) {
  return req<unknown>('GET', `/api/admin/tournaments/${encodeURIComponent(tournamentId)}/audit?limit=${limit}`, undefined, true);
}

export type AdminLoginResponse = {
  token?: string;
  tokenType?: string;
  expiresInSeconds?: number;
  error?: string;
};

/** `POST /api/admin/auth/login` — no envía Authorization; guarda JWT en sessionStorage si ok. */
export async function adminLogin(email: string, password: string): Promise<AdminLoginResponse> {
  const url = `${baseUrl()}/api/admin/auth/login`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJson<AdminLoginResponse>(res);
  if (!res.ok) {
    const msg = data.error ?? res.statusText ?? 'Error de login';
    throw new Error(msg);
  }
  if (data.token) setStoredAdminToken(data.token);
  return data;
}

export async function requestAdminPasswordReset(email: string): Promise<{ ok?: boolean; message?: string; error?: string }> {
  const url = `${baseUrl()}/api/admin/auth/forgot-password`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await parseJson<{ ok?: boolean; message?: string; error?: string }>(res);
  if (!res.ok) {
    throw new Error(data.error ?? res.statusText ?? 'No se pudo enviar el email de recuperación');
  }
  return data;
}

export async function resetAdminPassword(token: string, password: string): Promise<{ ok?: boolean; error?: string }> {
  const url = `${baseUrl()}/api/admin/auth/reset-password`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
  const data = await parseJson<{ ok?: boolean; error?: string }>(res);
  if (!res.ok) {
    throw new Error(data.error ?? res.statusText ?? 'No se pudo cambiar la contraseña');
  }
  return data;
}

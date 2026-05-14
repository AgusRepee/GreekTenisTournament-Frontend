import type { AdminPrimaryNavId } from './adminPanelTypes';

const BASE = '/admin';

export function adminHref(id: AdminPrimaryNavId): string {
  switch (id) {
    case 'dashboard':
      return `${BASE}/dashboard`;
    case 'torneos':
      return `${BASE}/torneos`;
    case 'jugadores':
      return `${BASE}/jugadores`;
    case 'noticias':
      return `${BASE}/noticias`;
    case 'configuracion':
      return `${BASE}/configuracion`;
    default:
      return `${BASE}/dashboard`;
  }
}

export function primaryNavFromPath(pathname: string): AdminPrimaryNavId {
  const p = pathname.replace(/\/$/, '') || '/';
  if (p.startsWith(`${BASE}/torneos`)) return 'torneos';
  if (p.startsWith(`${BASE}/jugadores`)) return 'jugadores';
  if (p.startsWith(`${BASE}/noticias`)) return 'noticias';
  if (p.startsWith(`${BASE}/configuracion`)) return 'configuracion';
  if (p.startsWith(`${BASE}/dashboard`) || p === BASE) return 'dashboard';
  return 'dashboard';
}

/** Vista workspace de un torneo (`/admin/torneos/:tournamentId`), sin listado ni constructor. */
export function isAdminTournamentDetailPath(pathname: string): boolean {
  const p = pathname.replace(/\/$/, '') || '/';
  const prefix = `${BASE}/torneos/`;
  if (!p.startsWith(prefix)) return false;
  const rest = p.slice(prefix.length);
  if (!rest || rest.includes('/')) return false;
  if (rest === 'nuevo') return false;
  if (rest.startsWith('constructor')) return false;
  return true;
}

/** Id del torneo en workspace (`/admin/torneos/:id`), o `null` si no aplica. */
export function adminTournamentWorkspaceIdFromPath(pathname: string): string | null {
  const p = pathname.replace(/\/$/, '') || '/';
  const prefix = `${BASE}/torneos/`;
  if (!p.startsWith(prefix)) return null;
  const rest = p.slice(prefix.length);
  if (!rest || rest.includes('/')) return null;
  if (rest === 'nuevo' || rest.startsWith('constructor')) return null;
  try {
    return decodeURIComponent(rest);
  } catch {
    return rest;
  }
}

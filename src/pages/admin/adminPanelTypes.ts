/** Navegación contextual del torneo (sidebar cuando estás en «Torneos»). */
export type TournamentNavId =
  | 'resumen'
  | 'fechas'
  | 'resultados'
  | 'tabla'
  | 'preclasificacion'
  | 'eliminacion'
  | 'historial';

/** Barra superior: ámbitos del panel. */
export type AdminPrimaryNavId = 'dashboard' | 'torneos' | 'jugadores' | 'noticias' | 'configuracion';

/** @deprecated Usá TournamentNavId para el sidebar; AdminNavId se mantiene por compatibilidad con datos existentes. */
export type AdminNavId = TournamentNavId | 'noticias' | 'configuracion';

/** Secciones ligadas al torneo / liga (fixture, resultados, tablas). */
export const ADMIN_TOURNAMENT_NAV_IDS: readonly TournamentNavId[] = [
  'resumen',
  'fechas',
  'resultados',
  'tabla',
  'preclasificacion',
  'eliminacion',
  'historial',
];

export const ADMIN_GLOBAL_NAV_IDS: readonly AdminNavId[] = ['noticias', 'configuracion'];

export function isTournamentAdminNav(id: AdminNavId): id is TournamentNavId {
  return (ADMIN_TOURNAMENT_NAV_IDS as readonly string[]).includes(id);
}

/** Items del sidebar (solo torneo). */
export const ADMIN_TOURNAMENT_NAV: { id: TournamentNavId; label: string; description: string }[] = [
  { id: 'resumen', label: 'Resumen', description: 'Avance y accesos rápidos' },
  { id: 'fechas', label: 'Fechas', description: 'Fixture, programación y horarios por fecha' },
  { id: 'resultados', label: 'Resultados', description: 'Marcadores y guardado' },
  { id: 'tabla', label: 'Tabla', description: 'Posiciones y cupos al playoff' },
  {
    id: 'preclasificacion',
    label: 'Seeds',
    description: 'Cabeza de serie oficial desde ranking de liga',
  },
  { id: 'eliminacion', label: 'Eliminación', description: 'Cuartos, semis y final' },
  { id: 'historial', label: 'Historial', description: 'Registro de cambios del admin' },
];

/** Lista completa (referencia); el sidebar usa solo {@link ADMIN_TOURNAMENT_NAV}. */
export const ADMIN_NAV: { id: AdminNavId; label: string; description: string }[] = [
  ...ADMIN_TOURNAMENT_NAV,
  { id: 'noticias', label: 'Noticias', description: 'Novedades del sitio' },
  { id: 'configuracion', label: 'Configuración', description: 'Ajustes generales del sitio' },
];

export function tournamentNavLabel(id: TournamentNavId): string {
  return ADMIN_TOURNAMENT_NAV.find((n) => n.id === id)?.label ?? id;
}

export function primaryNavLabel(id: AdminPrimaryNavId): string {
  switch (id) {
    case 'dashboard':
      return 'Dashboard';
    case 'torneos':
      return 'Torneos';
    case 'jugadores':
      return 'Jugadores';
    case 'noticias':
      return 'Noticias';
    case 'configuracion':
      return 'Configuración';
    default:
      return id;
  }
}

/** Textos de cabecera global (todo excepto vista Torneos, que usa cabecera de torneo). */
export function getPrimarySectionGlobalCopy(
  id: Exclude<AdminPrimaryNavId, 'torneos'>,
): { title: string; subtitle: string } {
  switch (id) {
    case 'dashboard':
      return {
        title: 'Dashboard',
        subtitle: 'Resumen del panel y accesos rápidos a torneos, jugadores y contenido.',
      };
    case 'jugadores':
      return {
        title: 'Jugadores',
        subtitle: 'Catálogo del club y cambios guardados en este navegador. Los torneos siguen definidos por el sistema.',
      };
    case 'noticias':
      return {
        title: 'Noticias del sitio',
        subtitle: 'Gestioná las novedades visibles para los jugadores.',
      };
    case 'configuracion':
      return {
        title: 'Configuración general',
        subtitle: 'Datos del club, identidad visual, reglas, ligas, visibilidad del inicio y copias de seguridad.',
      };
    default:
      return { title: 'Panel', subtitle: '' };
  }
}

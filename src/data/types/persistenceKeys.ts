/**
 * Claves de almacenamiento — única fuente para migrar a API/DB sin tocar la UI.
 */

export const PERSISTENCE_KEYS = {
  torneos: 'torneos',
  jugadores: 'jugadores',
  partidos: 'partidos',
  /** Ajustes generales del sitio (club, branding, reglas, ligas, visibilidad). */
  siteSettings: 'greek-tennis-site-settings-v1',
} as const;

/** Proyectos de torneo creados desde el constructor visual (admin). */
export const ADMIN_TOURNAMENT_BUILDER_STORAGE_KEY = 'greek-tennis-admin-tournament-projects-v1';

/** Resultados de partidos (motor de tenis / admin). */
export const MATCH_RESULTS_STORAGE_KEY = 'greek-tennis-results-v1';

/** Programación de partidos (fixture por dedupeKey). */
export const MATCH_SCHEDULE_STORAGE_KEY = 'greek-tennis-match-schedule-v1';

/** Noticias del sitio (admin → localStorage). */
export const NEWS_STORAGE_KEY = 'news';

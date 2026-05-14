/**
 * Capacidades “avanzadas” del panel (creación/edición/baja de jugadores y torneos).
 * Por defecto desactivadas; activar con `VITE_ENABLE_ADVANCED_ADMIN_CREATION=true`.
 */

export const ENABLE_ADVANCED_ADMIN_CREATION =
  import.meta.env.VITE_ENABLE_ADVANCED_ADMIN_CREATION === 'true';

/** Alta, edición, baja y activación/desactivación desde Jugadores. */
export const showAdminPlayerMutationsUi = ENABLE_ADVANCED_ADMIN_CREATION;

/** Constructor de torneos, duplicados implícitos en borradores y rutas asociadas. */
export const showAdminTournamentCreationUi = ENABLE_ADVANCED_ADMIN_CREATION;

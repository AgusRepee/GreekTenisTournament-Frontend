import { AdminGeneralSettingsView } from '../config/AdminGeneralSettingsView';

/**
 * Configuración general del sitio (club, branding, reglas, ligas, visibilidad, backup).
 * La gestión de torneos, jugadores, partidos y reemplazos en resultados vive en sus módulos.
 */
export function AdminConfiguracionView() {
  return <AdminGeneralSettingsView />;
}

import { showAdminPlayerMutationsUi } from '@/config/adminFeatures';
import { AdminPlayersCrud } from '../players/AdminPlayersAbm';

export function AdminJugadoresView() {
  return (
    <div className="admin-content-stack">
      <p className="max-w-3xl text-sm leading-relaxed text-[#616f89] dark:text-gray-400">
        {showAdminPlayerMutationsUi
          ? 'Gestioná el listado de jugadores del club por liga. Usá las pestañas para ver solo una categoría o el catálogo completo.'
          : 'Consultá el listado por liga. En este entorno el alta, la edición y la baja de jugadores no están habilitadas.'}
      </p>
      <AdminPlayersCrud />
    </div>
  );
}

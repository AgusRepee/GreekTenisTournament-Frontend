import { useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { ENABLE_ADVANCED_ADMIN_CREATION } from '@/config/adminFeatures';
import { AdminPanelHeader } from '../AdminPanelHeader';
import type { AdminTournamentProject } from '@/lib/admin/adminTournamentBuilderTypes';
import {
  loadAdminTournamentProjects,
  subscribeAdminTournamentProjects,
} from '@/lib/admin/adminTournamentBuilderStorage';
import { AdminTournamentBuilderWizard } from './AdminTournamentBuilderWizard';
import { useSafeAdminNavigate } from '../AdminUnsavedChangesContext';

export default function AdminTournamentBuilderPage() {
  const { projectId: rawId } = useParams<{ projectId: string }>();
  const projectId = rawId ? decodeURIComponent(rawId) : '';
  const safeNav = useSafeAdminNavigate();
  const [list, setList] = useState<AdminTournamentProject[]>(() => loadAdminTournamentProjects());

  useEffect(() => subscribeAdminTournamentProjects(() => setList(loadAdminTournamentProjects())), []);

  const project = useMemo(() => list.find((p) => p.id === projectId), [list, projectId]);

  if (!ENABLE_ADVANCED_ADMIN_CREATION) {
    return <Navigate to="/admin/torneos" replace />;
  }

  if (!projectId) {
    return <Navigate to="/admin/torneos" replace />;
  }

  if (!project) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <AdminPanelHeader
          context="global"
          primaryNav="torneos"
          title="Constructor de torneos"
          subtitle="No se encontró el proyecto."
        />
        <div className="container-admin py-16 text-center text-sm text-[#616f89] dark:text-gray-400">
          <p>El proyecto no existe o fue eliminado.</p>
          <button
            type="button"
            className="mt-4 text-sm font-bold text-primary underline"
            onClick={() => safeNav('/admin/torneos')}
          >
            Ir al listado de torneos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AdminPanelHeader
        context="global"
        primaryNav="torneos"
        title="Constructor de torneos"
        subtitle="Creación visual, ligas, grupos y reemplazos — sin tocar estructuras internas del motor actual."
      />
      <div className="container-admin w-full flex-1 py-6 md:py-8">
        <AdminTournamentBuilderWizard project={project} onProjectUpdated={() => setList(loadAdminTournamentProjects())} />
      </div>
    </div>
  );
}

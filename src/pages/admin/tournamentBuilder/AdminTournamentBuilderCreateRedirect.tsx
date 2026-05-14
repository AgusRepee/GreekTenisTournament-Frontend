import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createBlankProject,
  loadAdminTournamentProjects,
  saveAdminTournamentProjects,
  upsertProject,
} from '@/lib/admin/adminTournamentBuilderStorage';

export function AdminTournamentBuilderCreateRedirect() {
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const list = loadAdminTournamentProjects();
    const p = createBlankProject();
    saveAdminTournamentProjects(upsertProject(list, p));
    navigate(`/admin/torneos/constructor/${encodeURIComponent(p.id)}`, { replace: true });
  }, [navigate]);

  return (
    <div className="container-admin flex flex-1 flex-col items-center justify-center py-20">
      <p className="text-sm font-medium text-[#616f89] dark:text-gray-400">Preparando nuevo torneo…</p>
    </div>
  );
}

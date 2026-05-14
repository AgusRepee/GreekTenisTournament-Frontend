import type { ReactNode } from 'react';
import { useSafeAdminNavigate } from './AdminUnsavedChangesContext';
import { adminHref } from './adminNavPaths';
import { AdminDashboardView } from './views/AdminDashboardView';
import { AdminJugadoresView } from './views/AdminJugadoresView';
import { AdminNoticiasView } from './views/AdminNoticiasView';
import { AdminConfiguracionView } from './views/AdminConfiguracionView';
import { AdminTournamentListView } from './views/AdminTournamentListView';
function SectionShell({ children }: { children: ReactNode }) {
  return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
}

export function AdminDashboardPage() {
  const safeNavigate = useSafeAdminNavigate();
  return (
    <SectionShell>
      <div className="container-admin w-full flex-1 py-5 md:py-8 md:pb-12">
        <AdminDashboardView onNavigatePrimary={(id) => safeNavigate(adminHref(id))} />
      </div>
    </SectionShell>
  );
}

export function AdminJugadoresPage() {
  return (
    <SectionShell>
      <div className="container-admin w-full flex-1 py-5 md:py-8 md:pb-12">
        <AdminJugadoresView />
      </div>
    </SectionShell>
  );
}

export function AdminNoticiasPage() {
  return (
    <SectionShell>
      <div className="container-admin w-full flex-1 py-5 md:py-8 md:pb-12">
        <AdminNoticiasView />
      </div>
    </SectionShell>
  );
}

export function AdminConfiguracionPage() {
  return (
    <SectionShell>
      <div className="container-admin w-full flex-1 py-5 md:py-8 md:pb-12">
        <AdminConfiguracionView />
      </div>
    </SectionShell>
  );
}

export function AdminTournamentListPage() {
  return (
    <SectionShell>
      <div className="container-admin w-full flex-1 py-5 md:py-8 md:pb-12">
        <AdminTournamentListView />
      </div>
    </SectionShell>
  );
}

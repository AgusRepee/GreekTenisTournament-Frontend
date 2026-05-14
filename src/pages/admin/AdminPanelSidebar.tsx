import type { LucideIcon } from 'lucide-react';
import { Calendar, GitBranch, History, LayoutList, ListChecks, ListOrdered, Table2 } from 'lucide-react';
import type { TournamentNavId } from './adminPanelTypes';
import { ADMIN_TOURNAMENT_NAV } from './adminPanelTypes';

const NAV_ICONS: Record<TournamentNavId, LucideIcon> = {
  resumen: LayoutList,
  fechas: Calendar,
  resultados: ListChecks,
  tabla: Table2,
  preclasificacion: ListOrdered,
  eliminacion: GitBranch,
  historial: History,
};

type Props = {
  active: TournamentNavId;
  onNavigate: (id: TournamentNavId) => void;
};

export function AdminPanelSidebar({ active, onNavigate }: Props) {
  return (
    <aside className="w-full md:w-60 shrink-0 md:sticky md:top-40 self-start admin-tournament-sidebar">
      <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#616f89] dark:text-gray-500 md:px-0">
        Menú del torneo
      </p>
      <nav className="app-glass-panel space-y-1 rounded-xl p-2 shadow-sm border border-gray-200/60 dark:border-gray-600/50" aria-label="Secciones del torneo">
        {ADMIN_TOURNAMENT_NAV.map((item) => {
          const isActive = active === item.id;
          const Icon = NAV_ICONS[item.id];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`admin-sidebar-link w-full text-left rounded-lg py-3.5 min-h-[3rem] text-sm font-semibold transition-colors flex items-center gap-3 ${
                isActive
                  ? 'admin-sidebar-link-active'
                  : 'text-[#111318] dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/80 border-l-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'opacity-100' : 'opacity-55'}`} aria-hidden />
              {item.label}
            </button>
          );
        })}
      </nav>
      <p className="mt-3 px-1 text-[10px] text-[#616f89] dark:text-gray-500 leading-snug hidden md:block md:px-0">
        {ADMIN_TOURNAMENT_NAV.find((n) => n.id === active)?.description}
      </p>
    </aside>
  );
}

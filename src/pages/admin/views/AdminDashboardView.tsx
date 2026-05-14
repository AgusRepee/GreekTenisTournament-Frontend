import { AlertTriangle, ClipboardList, LayoutGrid, Newspaper, Settings, Trophy, Users } from 'lucide-react';
import { showAdminPlayerMutationsUi } from '@/config/adminFeatures';
import type { AdminPrimaryNavId } from '../adminPanelTypes';
import { useClubData } from '@/lib/clubDataStore';
import { useResults } from '@/lib/tennis/resultsStore';
import { useMatchSchedules } from '@/lib/tennis/matchScheduleStore';
import { collectPendingWorkload } from '@/lib/tennis/adminPendingWorkload';

type Props = {
  onNavigatePrimary: (id: AdminPrimaryNavId) => void;
};

const cardClass =
  'group flex min-h-[7.5rem] flex-col gap-2 rounded-xl border border-gray-200/90 bg-white/70 p-5 text-left shadow-sm transition-colors dark:border-gray-600/70 dark:bg-gray-900/45 dark:shadow-none md:p-6 hover:border-primary/35 dark:hover:border-primary/40';

const metricCardClass =
  'rounded-xl border border-gray-200/90 bg-white/80 p-4 shadow-sm dark:border-gray-600/70 dark:bg-gray-900/50';

export function AdminDashboardView({ onNavigatePrimary }: Props) {
  const club = useClubData();
  const results = useResults();
  const schedules = useMatchSchedules();

  const activeTournaments = club.tournaments.filter((t) => t.status !== 'finished');
  const pendingResults = activeTournaments.reduce(
    (sum, t) => sum + collectPendingWorkload(t.id, results, club.players).length,
    0,
  );
  const scheduleDrafts = schedules.filter(
    (s) => s.scheduleStatus === 'scheduled' && !!s.date?.trim() && !!s.time?.trim(),
  ).length;
  const scheduleAttention = schedules.filter((s) =>
    s.scheduleStatus === 'postponed' || s.scheduleStatus === 'suspended' || s.scheduleStatus === 'cancelled',
  ).length;

  const shortcuts: { id: AdminPrimaryNavId; label: string; desc: string; Icon: typeof Trophy }[] = [
    { id: 'torneos', label: 'Torneos', desc: 'Fixture, resultados, tablas y eliminación por liga.', Icon: Trophy },
    {
      id: 'jugadores',
      label: 'Jugadores',
      desc: showAdminPlayerMutationsUi
        ? 'Alta, edición y listado del club por categoría.'
        : 'Consultá el listado del club por categoría (solo lectura).',
      Icon: Users,
    },
    { id: 'noticias', label: 'Noticias', desc: 'Novedades visibles en Inicio y en la sección Novedades.', Icon: Newspaper },
    { id: 'configuracion', label: 'Configuración', desc: 'Club, marca, reglas, visibilidad y backups.', Icon: Settings },
  ];

  return (
    <div className="admin-content-stack">
      <section className="admin-readonly-panel rounded-xl border border-gray-200/90 p-5 dark:border-gray-600/60 md:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
            <LayoutGrid className="h-5 w-5 shrink-0" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-bold text-[#111318] dark:text-white md:text-lg">Centro operativo</h2>
            <p className="mt-0.5 text-xs text-[#616f89] dark:text-gray-400">Prioridad del día: torneos, agenda y resultados pendientes.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className={metricCardClass}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#616f89] dark:text-gray-500">Torneos activos</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-[#111318] dark:text-white">{activeTournaments.length}</p>
          </div>
          <div className={metricCardClass}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#616f89] dark:text-gray-500">Resultados pendientes</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-amber-700 dark:text-amber-300">{pendingResults}</p>
          </div>
          <div className={metricCardClass}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#616f89] dark:text-gray-500">Horarios por publicar</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-sky-700 dark:text-sky-300">{scheduleDrafts}</p>
          </div>
          <div className={metricCardClass}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#616f89] dark:text-gray-500">Agenda con alerta</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-rose-700 dark:text-rose-300">{scheduleAttention}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigatePrimary('torneos')}
          className="admin-theme-btn mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-bold shadow-sm sm:w-auto"
        >
          Ir a operar torneos
        </button>
      </section>

      <section>
        <h3 className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-[#616f89] dark:text-gray-500">Accesos rápidos</h3>
        <p className="mb-5 max-w-2xl text-sm text-[#616f89] dark:text-gray-400">Torneos queda como flujo principal. El resto son módulos secundarios de escritorio.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {shortcuts.map(({ id, label, desc, Icon }) => (
            <button key={id} type="button" onClick={() => onNavigatePrimary(id)} className={cardClass}>
              <span className="inline-flex items-center gap-2">
                <Icon className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:scale-105" aria-hidden />
                <span className="font-bold text-[#111318] dark:text-white">{label}</span>
              </span>
              {id === 'torneos' ? (
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                  <ClipboardList className="h-3 w-3" aria-hidden />
                  operativo
                </span>
              ) : id === 'noticias' || id === 'configuracion' ? (
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  <AlertTriangle className="h-3 w-3" aria-hidden />
                  escritorio
                </span>
              ) : null}
              <span className="text-xs leading-relaxed text-[#616f89] dark:text-gray-400">{desc}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

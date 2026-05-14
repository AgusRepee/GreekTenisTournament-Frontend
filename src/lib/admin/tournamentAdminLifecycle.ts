import type { Tournament } from '@/lib/mockData';
import { isTournamentCurrent } from '@/lib/mockData';

/** Estados operativos mostrados al admin (no reemplazan el `status` persistido del torneo). */
export type AdminTournamentLifecycle = 'borrador' | 'configurado' | 'en_curso' | 'finalizado' | 'archivado';

function hasGrupos(t: Tournament): boolean {
  const g = t.ligaDoc?.grupos;
  return !!g && Object.keys(g).length > 0;
}

export function deriveAdminTournamentLifecycle(t: Tournament): AdminTournamentLifecycle {
  if (t.archived) return 'archivado';
  if (t.status === 'finished') return 'finalizado';
  if (isTournamentCurrent(t)) return 'en_curso';
  if (hasGrupos(t)) return 'configurado';
  return 'borrador';
}

export function adminLifecycleLabel(l: AdminTournamentLifecycle): string {
  switch (l) {
    case 'borrador':
      return 'Borrador';
    case 'configurado':
      return 'Configurado';
    case 'en_curso':
      return 'En curso';
    case 'finalizado':
      return 'Finalizado';
    case 'archivado':
      return 'Archivado';
    default:
      return l;
  }
}

export function adminLifecycleHint(l: AdminTournamentLifecycle): string {
  switch (l) {
    case 'borrador':
      return 'Completá la plantilla y grupos antes de cargar resultados.';
    case 'configurado':
      return 'Torneo listo: podés cargar resultados y revisar tablas.';
    case 'en_curso':
      return 'Torneo activo: priorizá la carga de resultados y el cuadro.';
    case 'finalizado':
      return 'Solo lectura. Para cambiar marcadores, desbloqueá con cuidado desde Configuración o duplicá el torneo.';
    case 'archivado':
      return 'Archivado: solo consulta. Reactivá desde datos del club si aplica.';
    default:
      return '';
  }
}

export function isTournamentWorkspaceReadOnly(l: AdminTournamentLifecycle): boolean {
  return l === 'finalizado' || l === 'archivado';
}

export type AdminNextAction = { title: string; detail: string; target: 'resultados' | 'tabla' | 'fechas' };

/** Sugerencia operativa para el resumen (no técnica). */
export function recommendNextAdminAction(
  catalog: { round: number; dedupeKey: string }[],
  completedKeys: Set<string>,
  pendingCount: number,
  opts?: { isMasters1000?: boolean },
): AdminNextAction {
  if (pendingCount <= 0) {
    return {
      title: 'Revisar tabla y cupos',
      detail:
        opts?.isMasters1000 === true
          ? 'No hay pendientes en el fixture. Verificá tabla, clasificación a semifinales y eliminación.'
          : 'No hay pendientes en el fixture. Verificá tabla, cupos al playoff y eliminación.',
      target: 'tabla',
    };
  }
  const rounds = [...new Set(catalog.map((c) => c.round))].sort((a, b) => a - b);
  for (const r of rounds) {
    const rows = catalog.filter((c) => c.round === r);
    const incomplete = rows.some((row) => !completedKeys.has(row.dedupeKey));
    if (incomplete) {
      return {
        title: 'Cargar resultados',
        detail: `Próximo foco: Fecha ${r} (hay partidos sin marcador).`,
        target: 'resultados',
      };
    }
  }
  return {
    title: 'Cargar resultados',
    detail: 'Hay partidos pendientes: abrí Resultados y guardá cada marcador.',
    target: 'resultados',
  };
}

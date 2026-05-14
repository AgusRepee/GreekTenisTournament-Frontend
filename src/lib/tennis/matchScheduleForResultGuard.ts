import type { MatchScheduleEntry } from '@/data/services/contracts/matchSchedulePort';
import type { MatchInput } from '@/types/tennisResults';
import { parseMatch } from '@/lib/tennis/matchStatsEngine';

/** Mensaje único para validación / bulk save / modal / API (misma redacción). */
export const SCHEDULE_REQUIRED_FOR_PLAYED_MESSAGE =
  'Este partido tiene un resultado jugado, pero no tiene fecha programada. Para guardar el resultado, primero asigná fecha y hora.';

/**
 * Resultado “jugado normal” con sets y ganador (no walkover administrativo).
 * Retiros con marcador parseable cuentan como jugado a efectos de agenda.
 */
export function normalPlayedMatchRequiresSchedule(m: MatchInput): boolean {
  if (m.status === 'walkover') return false;
  if (m.status === 'suspended' || m.status === 'pending') return false;
  if (m.status !== 'played' && m.status !== 'retired') return false;
  if (!m.score?.trim()) return false;
  try {
    const parsed = parseMatch(m);
    if (parsed.isWalkover) return false;
    return parsed.sets.length > 0;
  } catch {
    return false;
  }
}

/**
 * Requisito para persistir un resultado con estado `played`: fecha y hora en la agenda del partido.
 * No exige confirmación pública (`confirmed`): alcanza con borrador `scheduled` + fecha/hora.
 */
export function matchScheduleHasDateTimeForPlayedResult(entry: MatchScheduleEntry | undefined): boolean {
  if (!entry) return false;
  const d = entry.date?.trim() ?? '';
  const t = entry.time?.trim() ?? '';
  if (!d || !t) return false;
  if (entry.scheduleStatus === 'unscheduled' || entry.scheduleStatus === 'cancelled') return false;
  return true;
}

import type { TournamentPreclasificacion } from '@/lib/mockData';

/** Convierte columna JSON MySQL → tipo frontend (o undefined si inválida/vacía). */
export function tournamentPreclasificacionFromJson(json: unknown): TournamentPreclasificacion | undefined {
  if (json == null || typeof json !== 'object' || Array.isArray(json)) return undefined;
  const o = json as Record<string, unknown>;
  const capturedAt = typeof o.capturedAt === 'string' ? o.capturedAt.trim() : '';
  const orderedPlayerIds = Array.isArray(o.orderedPlayerIds)
    ? o.orderedPlayerIds.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim())
    : [];
  const sourceLabel =
    typeof o.sourceLabel === 'string' && o.sourceLabel.trim().length > 0 ? o.sourceLabel.trim() : undefined;
  if (!capturedAt || orderedPlayerIds.length === 0) return undefined;
  return sourceLabel ? { capturedAt, orderedPlayerIds, sourceLabel } : { capturedAt, orderedPlayerIds };
}

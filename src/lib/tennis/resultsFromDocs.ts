/**
 * Adaptadores para resultados alineados con docs/ligaX-resultados.json.
 * Ver docs/TENNIS_ENGINE_SPEC.md.
 */

import type { LigaTemplate, MatchInput } from '../../types/tennisResults';
import { safeParseMatchBatch } from './resultSchemas';

export type LigaTemplateWithResults = LigaTemplate & { results: MatchInput[] };

/**
 * Carga y valida resultados (objeto con `matches` compatible con MatchResultBatchSchema).
 */
export function loadResultsFromDocs(raw: unknown): MatchInput[] {
  const parsed = safeParseMatchBatch(raw);
  if (!parsed.success) {
    throw new Error(
      'Resultados inválidos: el JSON debe cumplir el batch de partidos (campo `matches` y filas válidas).',
    );
  }
  return parsed.data.matches as MatchInput[];
}

/**
 * Arma vista enriquecida: plantilla de liga + lista de partidos (no muta el template).
 */
export function mergeTemplateWithResults(
  ligaTemplate: LigaTemplate,
  results: MatchInput[],
): LigaTemplateWithResults {
  return {
    ...ligaTemplate,
    results,
  };
}

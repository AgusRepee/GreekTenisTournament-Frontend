/**
 * Compatibilidad: la implementación vive en la capa `@/data`.
 * Importar desde aquí o desde `@/data` indistintamente.
 */

export {
  useResults,
  upsertResult,
  addResult,
  getResults,
  getResultByMatchId,
  removeResultByDedupeKey,
} from '@/data/hooks/matchResults';

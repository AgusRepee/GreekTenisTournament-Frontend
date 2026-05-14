import type { LigaTemplate } from '../../types/tennisResults';
import type { LigaNumKey } from './loadLigasFromDocs';
import { buildLiga3SyntheticFechas } from './liga3SyntheticFechas';

/** Fechas efectivas para una liga (incluye sintéticas Liga 3). */
export function getTemplateFechas(ligaNum: LigaNumKey, template: LigaTemplate): LigaTemplate['fechas'] {
  if (template.fechas.length > 0) return template.fechas;
  if (ligaNum === 3) return buildLiga3SyntheticFechas();
  return [];
}

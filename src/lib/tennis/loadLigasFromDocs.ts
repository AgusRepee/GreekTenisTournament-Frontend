/**
 * Plantillas docs/liga1.json … liga6.json (Vite resuelve JSON en build).
 */

import type { LigaTemplate } from '../../types/tennisResults';

import liga1 from '../../../docs/liga1.json';
import liga2 from '../../../docs/liga2.json';
import liga3 from '../../../docs/liga3.json';
import liga4 from '../../../docs/liga4.json';
import liga5 from '../../../docs/liga5.json';
import liga6 from '../../../docs/liga6.json';

export type LigaNumKey = 1 | 2 | 3 | 4 | 5 | 6;

function asTemplate(data: unknown, label: string): LigaTemplate {
  const o = data as Record<string, unknown>;
  if (!o || typeof o.torneo !== 'string' || typeof o.liga !== 'number' || !o.grupos || !o.fechas) {
    throw new Error(`loadLigasFromDocs: JSON inválido (${label})`);
  }
  return data as LigaTemplate;
}

export const ligasData: Record<LigaNumKey, LigaTemplate> = {
  1: asTemplate(liga1, 'liga1'),
  2: asTemplate(liga2, 'liga2'),
  3: asTemplate(liga3, 'liga3'),
  4: asTemplate(liga4, 'liga4'),
  5: asTemplate(liga5, 'liga5'),
  6: asTemplate(liga6, 'liga6'),
};

export const LIGA_NUMBERS: LigaNumKey[] = [1, 2, 3, 4, 5, 6];

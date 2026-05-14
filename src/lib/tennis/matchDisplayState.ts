/**
 * Estados visuales únicos para partidos (admin + vistas públicas alineadas al persistido).
 * — pending, draft (solo UI admin), played, walkover, suspended (+ chip "Editado" en admin con cambios locales).
 */

import type { MatchInput } from '@/types/tennisResults';

export const LABEL_PENDING = 'Pendiente';
export const LABEL_DRAFT = 'Borrador';
/** Resultado persistido con marcador (chip en cabecera y bloque expandido). */
export const LABEL_PLAYED = 'Cargado';
export const LABEL_WALKOVER_BADGE = 'W.O.';
export const LABEL_SUSPENDED = 'Suspendido';
export const LABEL_EDITED_HINT = 'Editado';

/** Fases visibles persistidas / borrador UI. */
export type MatchDisplayPhase = 'pending' | 'draft' | 'played' | 'walkover' | 'suspended';

export type MatchPresentationVm = {
  phase: MatchDisplayPhase;
  /** Borrador diferente sobre resultado ya persistido → chip “Editado” (solo admin). */
  showEditedChip: boolean;
};

/** Igual semántica que `hasSavedViewableOutcome`: hay algo guardado que la UI muestra como resultado. */
export function storedHasViewableOutcome(m: MatchInput | undefined): boolean {
  if (!m) return false;
  if (m.status === 'suspended') return true;
  return (
    (m.status === 'played' && Boolean(m.score?.trim())) ||
    m.status === 'walkover' ||
    m.status === 'retired'
  );
}

function phaseFromStoredOnly(stored: MatchInput | undefined): MatchDisplayPhase {
  if (!stored) return 'pending';
  if (stored.status === 'suspended') return 'suspended';
  if (stored.status === 'walkover' || stored.status === 'retired') return 'walkover';
  if (stored.status === 'played' && stored.score?.trim()) return 'played';
  return 'pending';
}

/** Vista pública o lectura sólo desde persistidos (sin estado borrador ni “editado”). */
export function resolvePublicMatchPresentation(stored: MatchInput | undefined): MatchPresentationVm {
  return { phase: phaseFromStoredOnly(stored), showEditedChip: false };
}

/** Admin: integra diferencia entre marcador borrador vs persistido. */
export function resolveAdminMatchPresentation(
  stored: MatchInput | undefined,
  draftDiffersFromStored: boolean,
): MatchPresentationVm {
  const basePhase = phaseFromStoredOnly(stored);
  const hasStored = storedHasViewableOutcome(stored);
  if (!draftDiffersFromStored) return { phase: basePhase, showEditedChip: false };
  if (!hasStored) return { phase: 'draft', showEditedChip: false };
  return { phase: basePhase, showEditedChip: true };
}

export function matchPresentationBadgeLabel(vm: MatchPresentationVm): string {
  switch (vm.phase) {
    case 'pending':
      return LABEL_PENDING;
    case 'draft':
      return LABEL_DRAFT;
    case 'played':
      return LABEL_PLAYED;
    case 'walkover':
      return LABEL_WALKOVER_BADGE;
    case 'suspended':
      return LABEL_SUSPENDED;
    default:
      return LABEL_PENDING;
  }
}

/** Texto lateral en bloques de resultado (solo lectura) desde persistidos. */
export function presentationStatusLabelForStored(stored: MatchInput | undefined): string {
  return matchPresentationBadgeLabel(resolvePublicMatchPresentation(stored));
}

/** Resumen público por partido (`Fechas por grupo`): marcador textual o etiqueta especial. */
export function formatPublicResultSummary(m: MatchInput | undefined): string | null {
  if (!m) return null;
  if (m.status === 'suspended') return LABEL_SUSPENDED;
  if (m.status === 'walkover') return LABEL_WALKOVER_BADGE;
  if (m.status === 'retired' && m.score?.trim()) return m.score.trim();
  if (m.status === 'played' && m.score?.trim()) return m.score.trim();
  return null;
}

export type MatchBadgeParts = {
  label: string;
  dotClass: string;
  /** Clases después de `rounded-full border` (o sólo clase temática jugado). */
  pillTailClasses: string;
};

export function matchPresentationPrimaryBadge(vm: MatchPresentationVm): MatchBadgeParts {
  const label = matchPresentationBadgeLabel(vm);
  switch (vm.phase) {
    case 'played':
      return { label, dotClass: 'bg-emerald-500', pillTailClasses: 'admin-result-pill-complete' };
    case 'walkover':
      return {
        label,
        dotClass: 'bg-rose-500',
        pillTailClasses:
          'border-rose-500/35 bg-rose-500/10 text-rose-900 dark:text-rose-100 dark:border-rose-500/45',
      };
    case 'suspended':
      return {
        label,
        dotClass: 'bg-violet-500',
        pillTailClasses:
          'border-violet-500/35 bg-violet-500/10 text-violet-950 dark:text-violet-100 dark:border-violet-500/45',
      };
    case 'draft':
      return {
        label,
        dotClass: 'bg-sky-500',
        pillTailClasses:
          'border-sky-500/35 bg-sky-500/10 text-sky-950 dark:text-sky-100 dark:border-sky-500/45',
      };
    case 'pending':
    default:
      return {
        label,
        dotClass: 'bg-amber-400',
        pillTailClasses:
          'border-amber-500/40 bg-amber-500/15 text-amber-950 dark:text-amber-200 dark:border-amber-500/45',
      };
  }
}

export const editedUnsavedChipClass =
  'inline-flex items-center rounded-md border border-blue-500/45 bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-blue-950 dark:border-blue-500/40 dark:bg-blue-950/45 dark:text-blue-100';

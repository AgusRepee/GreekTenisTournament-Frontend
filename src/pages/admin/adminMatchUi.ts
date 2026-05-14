import type { MatchInput } from '@/types/tennisResults';
import { resolvePublicMatchPresentation, type MatchDisplayPhase } from '@/lib/tennis/matchDisplayState';

/** @deprecated Prefer `MatchDisplayPhase` desde `@/lib/tennis/matchDisplayState`. */
export type AdminMatchUiStatus = MatchDisplayPhase;

/** Fase visual desde sólo resultado persistido (sin borrador). */
export function getAdminMatchUiStatus(r: MatchInput | undefined): MatchDisplayPhase {
  return resolvePublicMatchPresentation(r).phase;
}

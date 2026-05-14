/**
 * Historial simple de cambios de resultados (admin) en localStorage.
 */

import type { MatchInput } from '@/types/tennisResults';
import { parseMatchScore } from '@/lib/tennis/matchStatsEngine';

export const RESULT_CHANGE_HISTORY_KEY = 'greek-tennis-admin-result-history-v1';
const MAX_ENTRIES = 400;

export type ResultHistoryAction =
  | 'creado'
  /** @deprecated Persistido en versiones viejas; preferir edicion_resultado */
  | 'modificado'
  | 'edicion_resultado'
  | 'walkover'
  | 'suspendido';

export type ResultHistoryEntry = {
  id: string;
  at: string;
  tournamentId: string;
  matchKey: string;
  playerA: string;
  playerB: string;
  prevScore?: string;
  prevStatus?: string;
  newScore?: string;
  newStatus: MatchInput['status'];
  action: ResultHistoryAction;
  user: string;
  /** Resumen humano del ganador antes del cambio (nombre en plantilla). */
  prevWinnerLabel?: string;
  /** Resumen humano del ganador después del cambio. */
  newWinnerLabel?: string;
};

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function loadResultChangeHistory(): ResultHistoryEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RESULT_CHANGE_HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as ResultHistoryEntry[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** Etiqueta legible del ganador para auditoría (incluye W.O. y jugado con marcador). */
export function matchWinnerDisplayLabel(m: MatchInput | undefined): string {
  if (!m) return '—';
  if (m.status === 'suspended') return 'Sin ganador (suspendido)';
  if (m.status === 'walkover' || m.status === 'retired') {
    const letter = (m.score ?? 'A').toUpperCase();
    return letter === 'B' ? m.playerB : m.playerA;
  }
  if (m.status === 'played' && m.score?.trim()) {
    try {
      const p = parseMatchScore(m.score, { requireThirdSetSuperTiebreak: false });
      return p.winner === 'A' ? m.playerA : m.playerB;
    } catch {
      return '— (marcador ilegible)';
    }
  }
  return '—';
}

/** Había resultado persistido cargable en UI (jugado / W.O. / suspendido). */
export function hadPersistedViewableOutcome(m: MatchInput | undefined): boolean {
  if (!m) return false;
  if (m.status === 'suspended') return true;
  return (m.status === 'played' && !!m.score?.trim()) || m.status === 'walkover' || m.status === 'retired';
}

export function appendResultChangeEntry(entry: Omit<ResultHistoryEntry, 'id' | 'at'>): void {
  if (typeof localStorage === 'undefined') return;
  const full: ResultHistoryEntry = {
    id: randomId(),
    at: new Date().toISOString(),
    ...entry,
    user: entry.user?.trim() || 'admin local',
  };
  const next = [full, ...loadResultChangeHistory()].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(RESULT_CHANGE_HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
}

/**
 * Alta vs edición: si ya había un resultado cargado, la nueva grabación se registra como `edicion_resultado`.
 */
export function inferHistoryAction(hadPersistedViewable: boolean, nextStatus: MatchInput['status']): ResultHistoryAction {
  if (!hadPersistedViewable) {
    if (nextStatus === 'walkover') return 'walkover';
    if (nextStatus === 'suspended') return 'suspendido';
    return 'creado';
  }
  return 'edicion_resultado';
}

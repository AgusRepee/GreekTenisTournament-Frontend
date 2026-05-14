/**
 * Historial unificado de acciones admin (persistencia local).
 * Clave: {@link ADMIN_AUDIT_LOG_KEY}.
 */

import type { MatchInput } from '@/types/tennisResults';
import {
  hadPersistedViewableOutcome,
  matchWinnerDisplayLabel,
} from '@/lib/tennis/resultsChangeHistory';

export const ADMIN_AUDIT_LOG_KEY = 'greek-tennis-admin-audit-log-v1';
const MAX_ENTRIES = 600;

export type AdminAuditAction =
  | 'resultado_cargado'
  | 'resultado_editado'
  | 'walkover_cargado'
  | 'walkover_editado'
  | 'partido_suspendido'
  | 'resultado_reasignado_grupo'
  | 'jugador_reemplazado_resultados'
  | 'jugador_movido_grupo'
  | 'jugador_baja_plantel'
  | 'jugador_provisorio_creado'
  | 'plantel_grupos_guardado'
  | 'tabla_recalculada_manual'
  | 'cuadro_eliminacion_editado'
  | 'eliminacion_cruces_autogenerados'
  | 'eliminacion_armado_manual'
  | 'eliminacion_cruces_confirmados'
  | 'grupos_resultados_confirmados'
  | 'grupos_fase_desbloqueada'
  | 'programacion_confirmada'
  | 'programacion_reprogramada'
  | 'jugador_catalogo_creado'
  | 'jugador_catalogo_desactivado'
  | 'torneo_finalizado';

export type AdminAuditLogEntry = {
  id: string;
  at: string;
  /** Usuario que realizó la acción (solo cliente). */
  userLabel: string;
  action: AdminAuditAction;
  /** Nombre corto para la columna «Acción». */
  actionLabel: string;
  /** Torneo; null = alcance solo liga / catálogo (se muestra en bloque Liga). */
  tournamentId: string | null;
  tournamentName?: string;
  league: number;
  group?: string;
  /** Texto tipo "A vs B" o etiqueta libre. */
  matchLabel?: string;
  /** Nombres o IDs relevantes, separados por coma o ";". */
  playersInvolved?: string;
  prevValue?: string;
  newValue?: string;
  /** Texto para la columna detalle / una línea completa legible. */
  detail: string;
};

export const DEFAULT_AUDIT_USER = 'admin local';

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function loadAdminAuditLog(): AdminAuditLogEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ADMIN_AUDIT_LOG_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as AdminAuditLogEntry[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** Entradas de un torneo (orden: más reciente primero). */
export function filterAuditLogByTournament(tournamentId: string): AdminAuditLogEntry[] {
  return loadAdminAuditLog().filter((e) => e.tournamentId === tournamentId);
}

/** Acciones de catálogo de jugadores (misma liga, sin torneo). */
export function filterAuditLogLeagueOnly(league: number): AdminAuditLogEntry[] {
  return loadAdminAuditLog().filter((e) => e.tournamentId == null && e.league === league);
}

export function appendAdminAuditEntry(
  entry: Omit<AdminAuditLogEntry, 'id' | 'at' | 'userLabel'> & { userLabel?: string },
): void {
  if (typeof localStorage === 'undefined') return;
  const full: AdminAuditLogEntry = {
    id: randomId(),
    at: new Date().toISOString(),
    userLabel: entry.userLabel?.trim() || DEFAULT_AUDIT_USER,
    ...entry,
    tournamentId: entry.tournamentId,
  };
  const next = [full, ...loadAdminAuditLog()].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(ADMIN_AUDIT_LOG_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
}

/** Etiquetas cortas en español para la UI. */
export function auditActionLabel(action: AdminAuditAction): string {
  switch (action) {
    case 'resultado_cargado':
      return 'Resultado cargado';
    case 'resultado_editado':
      return 'Resultado editado';
    case 'walkover_cargado':
      return 'W.O. cargado';
    case 'walkover_editado':
      return 'W.O. editado';
    case 'partido_suspendido':
      return 'Partido suspendido';
    case 'resultado_reasignado_grupo':
      return 'Resultado reasignado (grupo)';
    case 'jugador_reemplazado_resultados':
      return 'Jugador reemplazado (resultados)';
    case 'jugador_movido_grupo':
      return 'Jugador movido de grupo';
    case 'jugador_baja_plantel':
      return 'Jugador dado de baja (plantel)';
    case 'jugador_provisorio_creado':
      return 'Provisorio en plantel';
    case 'plantel_grupos_guardado':
      return 'Plantel de grupos';
    case 'tabla_recalculada_manual':
      return 'Tabla recalculada';
    case 'cuadro_eliminacion_editado':
      return 'Cuadro eliminación';
    case 'eliminacion_cruces_autogenerados':
      return 'Eliminación · cruces auto';
    case 'eliminacion_armado_manual':
      return 'Eliminación · armado manual';
    case 'eliminacion_cruces_confirmados':
      return 'Eliminación · confirmada';
    case 'grupos_resultados_confirmados':
      return 'Grupos · resultados confirmados';
    case 'grupos_fase_desbloqueada':
      return 'Grupos · fase desbloqueada';
    case 'programacion_confirmada':
      return 'Programación confirmada';
    case 'programacion_reprogramada':
      return 'Partido reprogramado';
    case 'jugador_catalogo_creado':
      return 'Jugador creado (catálogo)';
    case 'jugador_catalogo_desactivado':
      return 'Jugador desactivado (catálogo)';
    case 'torneo_finalizado':
      return 'Torneo finalizado';
    default:
      return action;
  }
}

export function formatMatchOutcomeForAudit(m: MatchInput | undefined): string {
  if (!m) return '—';
  if (m.status === 'suspended') return 'Suspendido';
  if (m.status === 'walkover' || m.status === 'retired') {
    const letter = (m.score ?? 'A').toUpperCase();
    const w = letter === 'B' ? m.playerB : m.playerA;
    return `W.O. · gana ${w}`;
  }
  if (m.status === 'played' && m.score?.trim()) return m.score.trim();
  return m.status;
}

export function resolveMatchAuditAction(prev: MatchInput | undefined, next: MatchInput): AdminAuditAction {
  const had = hadPersistedViewableOutcome(prev);
  if (!had) {
    if (next.status === 'walkover' || next.status === 'retired') return 'walkover_cargado';
    if (next.status === 'suspended') return 'partido_suspendido';
    return 'resultado_cargado';
  }
  if (next.status === 'walkover' || next.status === 'retired') return 'walkover_editado';
  if (next.status === 'suspended') return 'partido_suspendido';
  return 'resultado_editado';
}

export function buildMatchResultAuditDescription(
  action: AdminAuditAction,
  playerA: string,
  playerB: string,
  prev: MatchInput | undefined,
  next: MatchInput,
): string {
  const vs = `${playerA} vs ${playerB}`;
  const prevS = formatMatchOutcomeForAudit(prev);
  const nextS = formatMatchOutcomeForAudit(next);
  if (action === 'partido_suspendido' && hadPersistedViewableOutcome(prev)) {
    return `Partido suspendido: ${vs}. Antes ${prevS}, ahora suspendido.`;
  }
  if (action === 'partido_suspendido') {
    return `Partido suspendido: ${vs}.`;
  }
  if (action === 'resultado_cargado' || action === 'walkover_cargado') {
    return `Resultado cargado: ${vs}. ${nextS}. Ganador: ${matchWinnerDisplayLabel(next)}.`;
  }
  if (action === 'resultado_editado' || action === 'walkover_editado') {
    return `Resultado editado: ${vs}. Antes ${prevS}, ahora ${nextS}.`;
  }
  return `${vs}. ${nextS}.`;
}

export function appendMatchResultAudit(params: {
  tournamentId: string;
  tournamentName: string;
  league: number;
  group?: string;
  playerA: string;
  playerB: string;
  prev?: MatchInput;
  next: MatchInput;
  userLabel?: string;
}): void {
  const action = resolveMatchAuditAction(params.prev, params.next);
  const label = auditActionLabel(action);
  const detail = buildMatchResultAuditDescription(action, params.playerA, params.playerB, params.prev, params.next);
  appendAdminAuditEntry({
    userLabel: params.userLabel,
    action,
    actionLabel: label,
    tournamentId: params.tournamentId,
    tournamentName: params.tournamentName,
    league: params.league,
    group: params.group,
    matchLabel: `${params.playerA} vs ${params.playerB}`,
    playersInvolved: `${params.playerA}; ${params.playerB}`,
    prevValue: formatMatchOutcomeForAudit(params.prev),
    newValue: formatMatchOutcomeForAudit(params.next),
    detail,
  });
}

import { ADMIN_TOURNAMENT_BUILDER_STORAGE_KEY } from '@/data/types/persistenceKeys';
import type { AdminTournamentProject } from './adminTournamentBuilderTypes';

const CHANGE = 'greek-tennis-admin-tournament-projects-changed';

function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `tproj-${crypto.randomUUID()}`;
  return `tproj-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function coerceLeagueNum(n: unknown): LeagueNum | null {
  const v = typeof n === 'string' ? Number.parseInt(n, 10) : Number(n);
  if (v === 1 || v === 2 || v === 3 || v === 4 || v === 5 || v === 6) return v;
  return null;
}

function parseProject(raw: unknown): AdminTournamentProject | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.name !== 'string') return null;
  return o as unknown as AdminTournamentProject;
}

export function loadAdminTournamentProjects(): AdminTournamentProject[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ADMIN_TOURNAMENT_BUILDER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseProject).filter((p): p is AdminTournamentProject => p != null);
  } catch {
    return [];
  }
}

export function saveAdminTournamentProjects(list: AdminTournamentProject[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(ADMIN_TOURNAMENT_BUILDER_STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* quota */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHANGE));
  }
}

export function subscribeAdminTournamentProjects(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const h = () => cb();
  window.addEventListener(CHANGE, h);
  return () => window.removeEventListener(CHANGE, h);
}

export function createBlankProject(): AdminTournamentProject {
  const now = new Date().toISOString();
  const d = new Date();
  const start = d.toISOString().slice(0, 10);
  const endDate = new Date(d.getTime() + 7 * 864e5);
  return {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    name: '',
    shortDescription: '',
    startDate: start,
    endDate: endDate.toISOString().slice(0, 10),
    lifecycle: 'draft',
    selectedLeagues: [],
    leagues: {},
    syntheticPlayers: [],
    replacementHistory: [],
    fixtureGenerated: false,
    resultsCommitted: false,
  };
}

export function upsertProject(list: AdminTournamentProject[], project: AdminTournamentProject): AdminTournamentProject[] {
  const next = { ...project, updatedAt: new Date().toISOString() };
  const idx = list.findIndex((p) => p.id === next.id);
  if (idx < 0) return [...list, next];
  const copy = [...list];
  copy[idx] = next;
  return copy;
}

export function deleteProject(list: AdminTournamentProject[], id: string): AdminTournamentProject[] {
  return list.filter((p) => p.id !== id);
}

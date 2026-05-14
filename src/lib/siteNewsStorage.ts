/**
 * Noticias gestionadas desde el admin (localStorage).
 */

import { NEWS_STORAGE_KEY } from '@/data/types/persistenceKeys';

export { NEWS_STORAGE_KEY };

const CHANGE_EVENT = 'greek-tennis-news-storage';

/** Alineado con filtros del sitio: Torneo / Club / Ranking / General */
export const NEWS_TOPIC_OPTIONS = ['Torneo', 'Club', 'Ranking', 'General'] as const;
export type NewsTopic = (typeof NEWS_TOPIC_OPTIONS)[number];

/** Ciclo de vida en admin / visibilidad pública (solo `active` se muestra en el sitio). */
export const NEWS_STATUS_VALUES = ['draft', 'active', 'inactive'] as const;
export type NewsStatus = (typeof NEWS_STATUS_VALUES)[number];

/** Texto corto para pills en el admin (se muestra en mayúsculas vía CSS). */
export const NEWS_STATUS_LABEL: Record<NewsStatus, string> = {
  draft: 'Borrador',
  active: 'Activa',
  inactive: 'Desactivada',
};

export interface News {
  id: string;
  title: string;
  content: string;
  /** Tópico para filtros en Novedades (no inferir del título). */
  topic: NewsTopic;
  image?: string;
  /** YYYY-MM-DD o ISO (fecha mostrada en el sitio). */
  date: string;
  status: NewsStatus;
  /** Solo persistencia; no se edita en el admin. */
  createdAt?: string;
}

function coerceTopic(v: unknown): NewsTopic {
  if (typeof v !== 'string') return 'General';
  return (NEWS_TOPIC_OPTIONS as readonly string[]).includes(v) ? (v as NewsTopic) : 'General';
}

function coerceStatus(o: Record<string, unknown>): NewsStatus {
  const s = o.status;
  if (s === 'draft' || s === 'active' || s === 'inactive') return s;
  if (typeof o.isPublished === 'boolean') return o.isPublished ? 'active' : 'draft';
  return 'draft';
}

function parseNewsRow(x: unknown): News | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.title !== 'string' || typeof o.content !== 'string') return null;
  if (typeof o.date !== 'string') return null;
  if (o.image !== undefined && typeof o.image !== 'string') return null;
  if (o.createdAt !== undefined && typeof o.createdAt !== 'string') return null;
  return {
    id: o.id,
    title: o.title,
    content: o.content,
    topic: coerceTopic(o.topic),
    date: o.date,
    status: coerceStatus(o),
    image: typeof o.image === 'string' && o.image.trim() ? o.image.trim() : undefined,
    createdAt: typeof o.createdAt === 'string' ? o.createdAt : undefined,
  };
}

export function loadNewsFromStorage(): News[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NEWS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseNewsRow).filter((n): n is News => n != null);
  } catch {
    return [];
  }
}

export function saveNewsToStorage(items: News[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }
}

export function subscribeNewsStorage(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => onStoreChange();
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

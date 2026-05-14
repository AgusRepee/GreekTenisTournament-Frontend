/**
 * Noticias y novedades del club: plantilla estática + entradas publicadas desde el admin (`localStorage` clave `news`).
 */

import { loadNewsFromStorage, type News as StoredNewsArticle } from './siteNewsStorage';

export const NEWS_CATEGORIES = ['Todas', 'Torneo', 'Club', 'Ranking', 'General'] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  /** YYYY-MM-DD */
  publishedAt: string;
  category: Exclude<NewsCategory, 'Todas'>;
  /** Nombre de archivo en /img (opcional) */
  image?: string;
}

export const NEWS_ITEMS: NewsItem[] = [
  {
    id: 'n-1',
    title: 'Abierta la inscripción al torneo Novak Djokovic en todas las ligas',
    excerpt: 'Ya podés anotarte en las ligas 1 a 5. Cupos limitados por categoría.',
    body:
      'Abrimos las inscripciones para el torneo Novak Djokovic en todas las ligas (1 a 5). Los cupos se asignan por orden de llegada una vez confirmado el pago.\n\nConsultá fechas y sedes en la sección Torneos o escribinos por WhatsApp para reservar tu lugar.',
    publishedAt: '2026-03-20',
    category: 'Torneo',
    image: 'novakrojo.webp',
  },
  {
    id: 'n-2',
    title: 'Nuevo horario de canchas en sede Carapachay',
    excerpt: 'A partir de abril ampliamos franja vespertina los martes y jueves.',
    body:
      'A pedido de los socios, desde abril contaremos con más turnos disponibles los martes y jueves por la tarde en Carapachay.\n\nEl calendario detallado se publicará en novedades y en el grupo de WhatsApp del club.',
    publishedAt: '2026-03-15',
    category: 'Club',
  },
  {
    id: 'n-3',
    title: 'Actualización del ranking general',
    excerpt: 'Ya están computados los puntos del último fin de semana de juego.',
    body:
      'Actualizamos el ranking general con los resultados del último fin de semana. Podés ver tu posición y la de tu liga en la sección Rankings.\n\nAnte cualquier inconsistencia, contactanos con nombre, categoría y torneo para revisarlo.',
    publishedAt: '2026-03-10',
    category: 'Ranking',
  },
  {
    id: 'n-4',
    title: 'Encuentro amistoso interligas',
    excerpt: 'Domingo de exhibición: mix de categorías y sorteo de premios.',
    body:
      'Organizamos un encuentro amistoso interligas con formato relámpago y sorteos para quienes participen o vengan a alentar.\n\nPronto publicaremos horario confirmado y cómo inscribirse como jugador o espectador.',
    publishedAt: '2026-03-05',
    category: 'General',
  },
];

function storedArticleToNewsItem(n: StoredNewsArticle): NewsItem {
  const body = n.content.trim();
  const excerpt =
    body.length <= 200 ? body.replace(/\s+/g, ' ') : `${body.slice(0, 197).replace(/\s+/g, ' ')}…`;
  const dateOnly = n.date.length >= 10 ? n.date.slice(0, 10) : n.date;
  return {
    id: n.id,
    title: n.title.trim(),
    excerpt: excerpt || ' ',
    body: n.content,
    publishedAt: dateOnly,
    category: n.topic,
    image: n.image?.trim() || undefined,
  };
}

/** Combina noticias publicadas desde el admin con la plantilla estática, ordenadas por fecha. */
export function getNewsSorted(): NewsItem[] {
  const fromAdmin = loadNewsFromStorage()
    .filter((x) => x.status === 'active')
    .map(storedArticleToNewsItem);
  return [...fromAdmin, ...NEWS_ITEMS].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export function formatNewsPublishedDate(iso: string): string {
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

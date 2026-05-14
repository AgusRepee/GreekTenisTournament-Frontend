import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Newspaper } from 'lucide-react';
import {
  NEWS_CATEGORIES,
  formatNewsPublishedDate,
  type NewsCategory,
  type NewsItem,
} from '../src/lib/newsData';
import { resolveNewsImageUrl } from '../src/lib/newsImageResolve';
import { useNewsFeedSorted } from '../src/lib/useNewsFeed';

const categoryBadge: Record<NewsItem['category'], string> = {
  Torneo: 'bg-primary/15 text-primary border border-primary/30',
  Club: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
  Ranking: 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/35',
  General: 'bg-gray-200/80 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600',
};

export const NewsScreen: React.FC = () => {
  const [filter, setFilter] = useState<NewsCategory>('Todas');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const allNews = useNewsFeedSorted();

  const items = useMemo(() => {
    if (filter === 'Todas') return allNews;
    return allNews.filter((n) => n.category === filter);
  }, [filter, allNews]);

  return (
    <div className="px-4 md:px-10 lg:px-20 flex justify-center py-10 md:py-12 flex-grow">
      <div className="w-full max-w-[960px] flex flex-col gap-10 md:gap-12">
        <section className="text-center md:text-left">
          <div className="inline-flex items-center gap-2 rounded-md bg-primary/10 text-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] mb-4">
            <Newspaper className="w-4 h-4" aria-hidden />
            Novedades
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-[1.08] tracking-tight text-[#111318] dark:text-white">
            Noticias del club
          </h1>
          <p className="mt-3 text-[#616f89] dark:text-gray-400 text-base leading-relaxed max-w-2xl font-normal">
            Enterate de torneos, sedes, rankings y eventos.             Las noticias publicadas desde el panel admin aparecen aquí junto con las novedades de plantilla del sitio.
          </p>
        </section>

        <div
          className="flex flex-wrap gap-2.5 justify-center md:justify-start"
          role="tablist"
          aria-label="Filtrar por categoría"
        >
          {NEWS_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={filter === cat}
              onClick={() => setFilter(cat)}
              className={`rounded-md px-4 py-2.5 text-sm font-semibold transition-all min-h-[2.75rem] ${
                filter === cat
                  ? 'bg-primary text-white shadow-sport-card dark:shadow-sport-card-dark'
                  : 'bg-white dark:bg-gray-800 text-[#616f89] dark:text-gray-400 border border-gray-200/90 dark:border-gray-600 hover:border-primary/50 hover:text-primary shadow-sm'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <ul className="flex flex-col gap-6 md:gap-8 list-none p-0 m-0">
          {items.length === 0 ? (
            <li className="app-glass-panel p-10 text-center text-[#616f89] shadow-sport-card dark:text-gray-400 dark:shadow-sport-card-dark md:p-12">
              No hay noticias en esta categoría por ahora.
            </li>
          ) : (
            items.map((item) => {
              const open = expandedId === item.id;
              const imgUrl = resolveNewsImageUrl(item.image);
              return (
                <li key={item.id}>
                  <article className="news-card-visual app-glass-panel overflow-hidden shadow-sport-card dark:shadow-sport-card-dark">
                    {imgUrl ? (
                      <div className="aspect-[21/9] w-full overflow-hidden bg-gray-100 dark:bg-gray-900">
                        <img
                          src={imgUrl}
                          alt=""
                          className="news-card-image h-full w-full object-cover"
                        />
                      </div>
                    ) : null}
                    <div className="p-6 md:p-8">
                      <div className="flex flex-wrap items-center gap-2 gap-y-1 mb-2">
                        <time
                          dateTime={item.publishedAt}
                          className="text-xs font-medium text-[#616f89] dark:text-gray-500"
                        >
                          {formatNewsPublishedDate(item.publishedAt)}
                        </time>
                        <span
                          className={`text-xs font-bold uppercase tracking-wide rounded-md px-2 py-0.5 ${categoryBadge[item.category]}`}
                        >
                          {item.category}
                        </span>
                      </div>
                      <h2 className="text-xl md:text-2xl font-bold text-[#111318] dark:text-white leading-snug tracking-tight">
                        {item.title}
                      </h2>
                      <p className="mt-3 text-sm text-[#616f89] dark:text-gray-400 leading-relaxed">
                        {item.excerpt}
                      </p>
                      {open ? (
                        <div className="mt-4 text-sm text-[#111318] dark:text-gray-200 leading-relaxed space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                          {item.body.split(/\n\n+/).map((para, i) => (
                            <p key={i}>{para}</p>
                          ))}
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setExpandedId(open ? null : item.id)}
                        className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-primary hover:text-primary-hover transition-colors"
                        aria-expanded={open}
                      >
                        {open ? (
                          <>
                            Ocultar
                            <ChevronUp className="w-4 h-4" aria-hidden />
                          </>
                        ) : (
                          <>
                            Leer más
                            <ChevronDown className="w-4 h-4" aria-hidden />
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
};

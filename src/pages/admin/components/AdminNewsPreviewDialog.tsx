import { useEffect, useId } from 'react';
import { X } from 'lucide-react';
import type { News, NewsStatus } from '@/lib/siteNewsStorage';
import { formatNewsPublishedDate } from '@/lib/newsData';
import { resolveNewsImageUrl } from '@/lib/newsImageResolve';

const categoryBadge: Record<News['topic'], string> = {
  Torneo: 'bg-primary/15 text-primary border border-primary/30',
  Club: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
  Ranking: 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/35',
  General: 'bg-gray-200/80 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600',
};

const statusAdminLine: Record<NewsStatus, string> = {
  draft: 'Borrador (no visible en el sitio)',
  active: 'Activa (visible en Inicio y Novedades)',
  inactive: 'Desactivada (no visible en el sitio)',
};

function excerptFromBody(body: string): string {
  const t = body.trim().replace(/\s+/g, ' ');
  if (!t) return 'Sin contenido todavía.';
  return t.length <= 200 ? t : `${t.slice(0, 197)}…`;
}

function imageSrc(image: string | undefined): string | undefined {
  if (!image?.trim()) return undefined;
  const v = image.trim();
  if (v.startsWith('data:') || /^https?:\/\//i.test(v)) return v;
  return resolveNewsImageUrl(v);
}

export interface AdminNewsPreviewDialogProps {
  open: boolean;
  article: News | null;
  /** Si true, muestra línea de estado para contexto admin */
  showAdminStatus?: boolean;
  onClose: () => void;
}

export function AdminNewsPreviewDialog({ open, article, showAdminStatus = true, onClose }: AdminNewsPreviewDialogProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !article) return null;

  const dateKey = article.date.length >= 10 ? article.date.slice(0, 10) : article.date;
  const imgUrl = imageSrc(article.image);
  const titleText = article.title.trim() || '(Sin título)';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-label="Cerrar vista previa"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="app-glass-panel relative z-[1] flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-gray-200/90 shadow-2xl dark:border-gray-600/70 sm:max-w-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-200/80 px-4 py-3 dark:border-gray-600/60 sm:px-5">
          <h2 id={titleId} className="text-base font-bold text-[#111318] dark:text-white">
            Vista previa
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-[#616f89] transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {showAdminStatus ? (
            <p className="border-b border-amber-200/80 bg-amber-50/90 px-4 py-2 text-xs font-semibold text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100 sm:px-5">
              Admin · {statusAdminLine[article.status]}
            </p>
          ) : null}
          <article className="news-card-visual overflow-hidden">
            {imgUrl ? (
              <div className="aspect-[21/9] w-full overflow-hidden bg-gray-100 dark:bg-gray-900">
                <img src={imgUrl} alt="" className="news-card-image h-full w-full object-cover" />
              </div>
            ) : null}
            <div className="p-5 md:p-7">
              <div className="mb-2 flex flex-wrap items-center gap-2 gap-y-1">
                <time dateTime={dateKey} className="text-xs font-medium text-[#616f89] dark:text-gray-500">
                  {dateKey ? formatNewsPublishedDate(dateKey) : '—'}
                </time>
                <span className={`text-xs font-bold uppercase tracking-wide rounded-md px-2 py-0.5 ${categoryBadge[article.topic]}`}>
                  {article.topic}
                </span>
              </div>
              <h3 className="text-lg font-bold leading-snug text-[#111318] dark:text-white md:text-xl">{titleText}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#616f89] dark:text-gray-400">{excerptFromBody(article.content)}</p>
              <div className="mt-4 border-t border-gray-200 pt-4 text-sm leading-relaxed text-[#111318] dark:text-gray-200 dark:border-gray-700">
                {article.content.trim() ? (
                  article.content.split(/\n\n+/).map((para, i) => <p key={i}>{para}</p>)
                ) : (
                  <p className="text-[#616f89] dark:text-gray-500">Sin cuerpo de texto.</p>
                )}
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

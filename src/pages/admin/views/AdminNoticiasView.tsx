import { useCallback, useId, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Eye, ImageIcon, Newspaper, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import type { News, NewsStatus, NewsTopic } from '@/lib/siteNewsStorage';
import { loadNewsFromStorage, NEWS_STATUS_LABEL, NEWS_TOPIC_OPTIONS, saveNewsToStorage } from '@/lib/siteNewsStorage';
import { resolveNewsImageUrl } from '@/lib/newsImageResolve';
import { useAdminRequestNavigate } from '../AdminUnsavedChangesContext';
import { UnsavedChangesGuard } from '../UnsavedChangesGuard';
import { AdminConfirmDialog } from '../AdminConfirmDialog';
import { AdminCmsEditorLayout } from '../components/AdminCmsEditorLayout';
import { AdminNewsPreviewDialog } from '../components/AdminNewsPreviewDialog';

const inputBase =
  'w-full rounded-md admin-input-editable dark:bg-gray-900 text-[#111318] dark:text-white placeholder:text-[#616f89] dark:placeholder:text-gray-500 outline-none transition-all px-3 py-2.5 text-sm disabled:opacity-55';

const labelClass = 'block text-sm font-semibold text-[#111318] dark:text-gray-200 mb-1.5';

const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-bold border shadow-sm transition-opacity admin-theme-btn';
const btnSecondary =
  'inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-bold border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-[#111318] dark:text-white admin-theme-btn-secondary transition-colors';
const btnDanger =
  'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-bold border border-red-500/50 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors';
const btnGhost =
  'inline-flex items-center gap-1 text-sm font-semibold admin-theme-accent-text hover:underline disabled:opacity-50 disabled:no-underline';

function newInternalId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `news-${crypto.randomUUID()}`;
  }
  return `news-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function emptyForm(): News {
  const d = new Date();
  return {
    id: '',
    title: '',
    content: '',
    topic: 'General',
    image: undefined,
    date: d.toISOString().slice(0, 10),
    status: 'draft',
  };
}

function sortNews(a: News, b: News): number {
  return new Date(b.date).getTime() - new Date(a.date).getTime();
}

function imagePreviewSrc(image: string | undefined): string {
  if (!image?.trim()) return '';
  const t = image.trim();
  if (t.startsWith('data:') || /^https?:\/\//i.test(t)) return t;
  return resolveNewsImageUrl(t);
}

const topicBadgeClass: Record<NewsTopic, string> = {
  Torneo: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-800',
  Club: 'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-950/40 dark:text-sky-100 dark:border-sky-800',
  Ranking: 'bg-violet-50 text-violet-900 border-violet-200 dark:bg-violet-950/40 dark:text-violet-100 dark:border-violet-800',
  General: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600',
};

const statusPillClass: Record<NewsStatus, string> = {
  draft: 'border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100',
  active: 'border-emerald-400/60 bg-emerald-100 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/45 dark:text-emerald-100',
  inactive: 'border-amber-400/50 bg-amber-100 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100',
};

function StatusPill({ status }: { status: NewsStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${statusPillClass[status]}`}
    >
      {NEWS_STATUS_LABEL[status]}
    </span>
  );
}

type ConfirmDialog =
  | { kind: 'none' }
  | { kind: 'publish'; snapshot: News }
  | { kind: 'deactivate'; snapshot: News }
  | { kind: 'activate'; snapshot: News }
  | { kind: 'delete'; snapshot: News };

function serializeNewsForm(n: News): string {
  return JSON.stringify({
    id: n.id,
    title: n.title,
    content: n.content,
    topic: n.topic,
    image: n.image,
    date: n.date,
    status: n.status,
    createdAt: n.createdAt,
  });
}

function buildRowFromForm(form: News, list: News[], status: NewsStatus): News | null {
  if (!form.title.trim() || !form.content.trim()) return null;
  if (!form.date?.trim()) return null;
  const hasId = !!form.id.trim();
  const id = hasId ? form.id : newInternalId();
  const prev = hasId ? list.find((x) => x.id === form.id) : undefined;
  const createdAt = hasId ? (prev?.createdAt ?? new Date().toISOString()) : new Date().toISOString();
  return {
    id,
    title: form.title.trim(),
    content: form.content.trim(),
    topic: form.topic,
    date: form.date.trim(),
    status,
    image: form.image?.trim() || undefined,
    createdAt,
  };
}

export function AdminNoticiasView() {
  const formTitleId = useId();
  const fileInputId = useId();
  const baselineSerializedRef = useRef('');
  const requestNavigate = useAdminRequestNavigate();
  const [list, setList] = useState<News[]>(() => loadNewsFromStorage());
  const [screen, setScreen] = useState<'list' | 'editor'>('list');
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [form, setForm] = useState<News>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmDialog>({ kind: 'none' });
  const [previewOpen, setPreviewOpen] = useState(false);
  /** Si no es null, la vista previa muestra esta fila (listado); si es null y el editor está abierto, se arma desde el formulario. */
  const [previewPinned, setPreviewPinned] = useState<News | null>(null);

  const refresh = useCallback(() => setList(loadNewsFromStorage().sort(sortNews)), []);

  const persist = useCallback((next: News[]) => {
    const sorted = [...next].sort(sortNews);
    saveNewsToStorage(sorted);
    setList(sorted);
  }, []);

  const goList = useCallback(() => {
    setScreen('list');
    setForm(emptyForm());
    baselineSerializedRef.current = '';
    setError(null);
  }, []);

  const goListGuarded = useCallback(() => requestNavigate(goList), [requestNavigate, goList]);

  const startCreate = () => {
    setError(null);
    setEditorMode('create');
    const next = emptyForm();
    setForm(next);
    baselineSerializedRef.current = serializeNewsForm(next);
    setScreen('editor');
  };

  const startEdit = (row: News) => {
    setError(null);
    setEditorMode('edit');
    const next = { ...row };
    setForm(next);
    baselineSerializedRef.current = serializeNewsForm(next);
    setScreen('editor');
  };

  const upsert = useCallback(
    (row: News, syncForm = true) => {
      const exists = list.some((x) => x.id === row.id);
      if (exists) persist(list.map((x) => (x.id === row.id ? row : x)));
      else persist([...list, row]);
      if (syncForm) {
        setForm({ ...row });
        baselineSerializedRef.current = serializeNewsForm(row);
      }
    },
    [list, persist],
  );

  const applyRemove = (id: string) => {
    persist(list.filter((x) => x.id !== id));
  };

  const validateForSave = (): boolean => {
    setError(null);
    if (!form.title.trim() || !form.content.trim()) {
      setError('Completá título y contenido.');
      return false;
    }
    if (!form.date?.trim()) {
      setError('Indicá una fecha.');
      return false;
    }
    return true;
  };

  const handleSaveDraft = () => {
    if (!validateForSave()) return;
    const row = buildRowFromForm(form, list, 'draft');
    if (!row) return;
    upsert(row);
  };

  const saveDraftForGuard = async () => {
    if (!validateForSave()) return;
    const row = buildRowFromForm(form, list, 'draft');
    if (!row) return;
    upsert(row);
  };

  const handleSaveChanges = () => {
    if (!validateForSave()) return;
    const row = buildRowFromForm(form, list, form.status);
    if (!row) return;
    if (editorMode === 'edit' && !list.some((x) => x.id === form.id)) {
      setError('No se encontró el registro a editar.');
      return;
    }
    upsert(row);
  };

  const openPublishDialog = () => {
    setError(null);
    if (!validateForSave()) return;
    const row = buildRowFromForm(form, list, 'active');
    if (!row) return;
    setConfirm({ kind: 'publish', snapshot: row });
  };

  const openDeactivateDialog = () => {
    if (!validateForSave()) return;
    const row = buildRowFromForm(form, list, form.status);
    if (!row) return;
    setConfirm({ kind: 'deactivate', snapshot: row });
  };

  const openActivateDialog = () => {
    if (!validateForSave()) return;
    const row = buildRowFromForm(form, list, 'active');
    if (!row) return;
    setConfirm({ kind: 'activate', snapshot: row });
  };

  const openEditorPreview = () => {
    setError(null);
    const partial = buildRowFromForm(form, list, form.status);
    if (!partial) {
      setError('Completá título, contenido y fecha para previsualizar.');
      return;
    }
    setPreviewPinned(null);
    setPreviewOpen(true);
  };

  const openListPreview = (row: News) => {
    setError(null);
    setPreviewPinned(row);
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewPinned(null);
  };

  const resolvedPreviewArticle = useMemo((): News | null => {
    if (!previewOpen) return null;
    if (previewPinned) return previewPinned;
    return buildRowFromForm(form, list, form.status);
  }, [previewOpen, previewPinned, form, list]);

  const onPickImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Elegí un archivo de imagen (JPG, PNG, WebP, etc.).');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (result) setForm((f) => ({ ...f, image: result }));
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setForm((f) => ({ ...f, image: undefined }));
  };

  const sortedList = useMemo(() => [...list].sort(sortNews), [list]);
  const previewSrc = imagePreviewSrc(form.image);

  const editorDirty =
    screen === 'editor' &&
    baselineSerializedRef.current !== '' &&
    serializeNewsForm(form) !== baselineSerializedRef.current;

  const publishFromList = (row: News) => {
    setConfirm({ kind: 'publish', snapshot: { ...row, status: 'active' } });
  };

  const deactivateFromList = (row: News) => {
    setConfirm({ kind: 'deactivate', snapshot: row });
  };

  const activateFromList = (row: News) => {
    setConfirm({ kind: 'activate', snapshot: row });
  };

  const deleteFromList = (row: News) => {
    setConfirm({ kind: 'delete', snapshot: row });
  };

  const syncFormAfterConfirm = screen === 'editor';

  const confirmPublish = () => {
    if (confirm.kind !== 'publish') return;
    upsert(confirm.snapshot, syncFormAfterConfirm);
  };

  const confirmDeactivate = () => {
    if (confirm.kind !== 'deactivate') return;
    upsert({ ...confirm.snapshot, status: 'inactive' }, syncFormAfterConfirm);
  };

  const confirmActivate = () => {
    if (confirm.kind !== 'activate') return;
    upsert({ ...confirm.snapshot, status: 'active' }, syncFormAfterConfirm);
  };

  const confirmDelete = () => {
    if (confirm.kind !== 'delete') return;
    applyRemove(confirm.snapshot.id);
    if (screen === 'editor' && form.id === confirm.snapshot.id) goList();
  };

  const status = form.status;

  const editorFooter = (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {status === 'draft' ? (
          <>
            <button type="button" onClick={handleSaveDraft} className={btnPrimary}>
              Guardar borrador
            </button>
            <button type="button" onClick={openPublishDialog} className={btnSecondary}>
              <Sparkles className="h-4 w-4" aria-hidden />
              Publicar
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={handleSaveChanges} className={btnPrimary}>
              Guardar cambios
            </button>
            {status === 'active' ? (
              <button type="button" onClick={openDeactivateDialog} className={btnSecondary}>
                Desactivar
              </button>
            ) : (
              <button type="button" onClick={openActivateDialog} className={btnSecondary}>
                Activar
              </button>
            )}
          </>
        )}
        <button type="button" onClick={openEditorPreview} className={btnSecondary}>
          <Eye className="h-4 w-4" aria-hidden />
          Visualizar
        </button>
      </div>
      <button type="button" onClick={goListGuarded} className={`${btnGhost} sm:ml-auto`}>
        Cancelar / Volver al listado
      </button>
    </div>
  );

  if (screen === 'editor') {
    const breadcrumb = editorMode === 'create' ? <>Noticias › Nueva noticia</> : <>Noticias › Editar noticia</>;
    const title = editorMode === 'create' ? 'Nueva noticia' : 'Editar noticia';
    const subtitle =
      editorMode === 'create'
        ? 'Creá una novedad para mostrar en el sitio.'
        : 'Actualizá la novedad; los cambios se guardan con las acciones de abajo.';

    return (
      <>
        <UnsavedChangesGuard isDirty={editorDirty} canSaveDraft onSaveDraft={saveDraftForGuard} onDiscard={() => {}} />
        <AdminCmsEditorLayout
          breadcrumb={breadcrumb}
          onBack={goListGuarded}
          title={title}
          subtitle={subtitle}
          statusBadge={<StatusPill status={form.status} />}
          footer={editorFooter}
        >
          {error ? (
            <p className="mb-4 text-sm font-medium text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          <div className="app-glass-panel space-y-8 rounded-xl border border-gray-200/90 p-5 shadow-sport-card dark:border-gray-600/70 dark:shadow-sport-card-dark md:p-8">
            <div className="admin-form-block space-y-4">
              <p className="admin-form-block-title">Información principal</p>
              <div>
                <label htmlFor={formTitleId} className={labelClass}>
                  Título
                </label>
                <input
                  id={formTitleId}
                  className={inputBase}
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ej.: Abierta la inscripción al torneo…"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="news-topic" className={labelClass}>
                    Tópico
                  </label>
                  <select
                    id="news-topic"
                    className={inputBase}
                    value={form.topic}
                    onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value as NewsTopic }))}
                  >
                    {NEWS_TOPIC_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-[#616f89] dark:text-gray-500">Define el filtro en la página Novedades del sitio.</p>
                </div>
                <div>
                  <label htmlFor="news-date" className={labelClass}>
                    Fecha
                  </label>
                  <input
                    id="news-date"
                    className={inputBase}
                    type="date"
                    value={form.date.slice(0, 10)}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="admin-form-block space-y-3">
              <p className="admin-form-block-title">Contenido</p>
              <label htmlFor="news-content" className={labelClass}>
                Contenido
              </label>
              <textarea
                id="news-content"
                className={`${inputBase} min-h-[180px] resize-y`}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={8}
                placeholder="Escribí el mensaje completo que verán los socios…"
              />
            </div>

            <div className="admin-form-block space-y-3">
              <p className="admin-form-block-title">Imagen</p>
              <p className="text-xs text-[#616f89] dark:text-gray-500">
                Elegí un archivo desde tu dispositivo (se guarda en este navegador; más adelante se puede conectar a subida al servidor).
              </p>
              <div className="overflow-hidden rounded-xl border border-gray-200/90 bg-gray-50/80 dark:border-gray-600 dark:bg-gray-900/40">
                <div className="aspect-[2/1] max-h-[220px] w-full overflow-hidden bg-gray-100 dark:bg-gray-800/60">
                  {previewSrc ? (
                    <img src={previewSrc} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 px-4 text-center text-sm text-[#616f89] dark:text-gray-500">
                      <ImageIcon className="h-10 w-10 opacity-35" aria-hidden />
                      <span className="font-medium">Sin imagen seleccionada</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-gray-200/90 p-3 dark:border-gray-600">
                  <input id={fileInputId} type="file" accept="image/*" className="sr-only" onChange={onPickImage} />
                  <label
                    htmlFor={fileInputId}
                    className="inline-flex cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-[#111318] shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
                  >
                    Elegir imagen…
                  </label>
                  {form.image ? (
                    <button type="button" onClick={clearImage} className={btnSecondary}>
                      <X className="h-4 w-4" aria-hidden />
                      Quitar imagen
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="admin-form-block space-y-2">
              <p className="admin-form-block-title">Estado</p>
              <p className="text-sm leading-relaxed text-[#616f89] dark:text-gray-400">
                {status === 'draft' && 'La noticia está en borrador: no se muestra en el sitio público hasta que la publiques.'}
                {status === 'active' && 'La noticia está activa: se muestra en Inicio y Novedades.'}
                {status === 'inactive' &&
                  'La noticia está desactivada: no se muestra en el sitio, pero conservás el contenido en el panel.'}
              </p>
            </div>
          </div>
        </AdminCmsEditorLayout>

        <AdminConfirmDialog
          open={confirm.kind === 'publish'}
          title="Publicar noticia"
          description={<p>¿Querés publicar esta noticia? Será visible en el sitio.</p>}
          confirmLabel="Sí, publicar"
          cancelLabel="Cancelar"
          variant="default"
          onClose={() => setConfirm({ kind: 'none' })}
          onConfirm={confirmPublish}
        />
        <AdminConfirmDialog
          open={confirm.kind === 'deactivate'}
          title="Desactivar noticia"
          description={<p>¿Querés desactivar esta noticia? Ya no será visible para los jugadores.</p>}
          confirmLabel="Sí, desactivar"
          cancelLabel="Cancelar"
          variant="default"
          onClose={() => setConfirm({ kind: 'none' })}
          onConfirm={confirmDeactivate}
        />
        <AdminConfirmDialog
          open={confirm.kind === 'activate'}
          title="Activar noticia"
          description={<p>¿Querés activar esta noticia? Será visible otra vez en el sitio.</p>}
          confirmLabel="Sí, activar"
          cancelLabel="Cancelar"
          variant="default"
          onClose={() => setConfirm({ kind: 'none' })}
          onConfirm={confirmActivate}
        />
        <AdminConfirmDialog
          open={confirm.kind === 'delete'}
          title="Eliminar noticia"
          description={<p>¿Seguro que querés eliminar esta noticia? Esta acción no se puede deshacer.</p>}
          confirmLabel="Sí, eliminar"
          cancelLabel="Cancelar"
          variant="danger"
          onClose={() => setConfirm({ kind: 'none' })}
          onConfirm={confirmDelete}
        />

        <AdminNewsPreviewDialog open={previewOpen} article={resolvedPreviewArticle} onClose={closePreview} />
      </>
    );
  }

  return (
    <div className="admin-content-stack">
      <div className="flex flex-col gap-4 border-b border-gray-200/80 pb-6 dark:border-gray-600/60 sm:flex-row sm:items-end sm:justify-between sm:pb-8">
        <div className="min-w-0 space-y-1">
          <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-[#616f89] dark:text-gray-500">Listado</h2>
          <p className="max-w-xl text-sm leading-relaxed text-[#616f89] dark:text-gray-400">
            Las noticias que guardés acá se combinan con las de ejemplo del sitio. Solo las <span className="font-semibold text-[#111318] dark:text-gray-200">activas</span> aparecen en Inicio y Novedades; las borrador y desactivadas quedan solo en este panel.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <button type="button" onClick={refresh} className={btnSecondary}>
            Actualizar lista
          </button>
          <button type="button" onClick={startCreate} className={btnPrimary}>
            <Plus className="h-4 w-4" aria-hidden />
            Nueva noticia
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <section aria-labelledby="admin-news-list-heading">
        <h3 id="admin-news-list-heading" className="sr-only">
          Noticias guardadas
        </h3>
        {sortedList.length === 0 ? (
          <div className="app-glass-panel flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300/90 px-6 py-12 text-center dark:border-gray-600">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Newspaper className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="font-semibold text-[#111318] dark:text-white">Todavía no hay noticias creadas</p>
              <p className="mt-1 max-w-sm text-sm text-[#616f89] dark:text-gray-400">
                Creá la primera con <span className="font-bold text-[#111318] dark:text-gray-200">Nueva noticia</span>. Podés guardar borrador
                hasta que esté lista para publicar.
              </p>
            </div>
          </div>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {sortedList.map((row) => {
              const thumb = imagePreviewSrc(row.image);
              return (
                <li
                  key={row.id}
                  className="app-glass-panel flex flex-col overflow-hidden rounded-xl border border-gray-200/90 shadow-sport-card dark:border-gray-600/70 dark:shadow-sport-card-dark sm:flex-row"
                >
                  <div className="relative aspect-[2/1] w-full shrink-0 bg-gray-100 dark:bg-gray-800/80 sm:aspect-auto sm:h-auto sm:w-36 sm:min-h-[7.5rem]">
                    {thumb ? (
                      <img src={thumb} alt="" className="h-full w-full object-cover sm:absolute sm:inset-0" />
                    ) : (
                      <div className="flex h-full min-h-[6rem] flex-col items-center justify-center gap-1 px-3 text-center text-xs text-[#616f89] dark:text-gray-500 sm:min-h-0">
                        <ImageIcon className="h-8 w-8 opacity-40" aria-hidden />
                        <span>Sin imagen</span>
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
                    <div className="min-w-0">
                      <p className="line-clamp-2 font-bold leading-snug text-[#111318] dark:text-white">{row.title}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${topicBadgeClass[row.topic]}`}
                        >
                          {row.topic}
                        </span>
                        <time className="text-xs tabular-nums text-[#616f89] dark:text-gray-400" dateTime={row.date.slice(0, 10)}>
                          {row.date.slice(0, 10)}
                        </time>
                        <StatusPill status={row.status} />
                      </div>
                    </div>
                    <div className="mt-auto flex flex-wrap gap-2 border-t border-gray-100 pt-3 dark:border-gray-700/80">
                      <button type="button" onClick={() => startEdit(row)} className={`${btnSecondary} px-3 py-2 text-xs`}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        Editar
                      </button>
                      <button type="button" onClick={() => openListPreview(row)} className={`${btnSecondary} px-3 py-2 text-xs`}>
                        <Eye className="h-3.5 w-3.5" aria-hidden />
                        Visualizar
                      </button>
                      {row.status === 'draft' ? (
                        <button type="button" onClick={() => publishFromList(row)} className={`${btnSecondary} px-3 py-2 text-xs`}>
                          <Sparkles className="h-3.5 w-3.5" aria-hidden />
                          Publicar
                        </button>
                      ) : null}
                      {row.status === 'active' ? (
                        <button type="button" onClick={() => deactivateFromList(row)} className={`${btnSecondary} px-3 py-2 text-xs`}>
                          Desactivar
                        </button>
                      ) : null}
                      {row.status === 'inactive' ? (
                        <button type="button" onClick={() => activateFromList(row)} className={`${btnSecondary} px-3 py-2 text-xs`}>
                          Activar
                        </button>
                      ) : null}
                      <button type="button" onClick={() => deleteFromList(row)} className={`${btnDanger} px-3 py-2 text-xs`}>
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <AdminConfirmDialog
        open={confirm.kind === 'publish'}
        title="Publicar noticia"
        description={<p>¿Querés publicar esta noticia? Será visible en el sitio.</p>}
        confirmLabel="Sí, publicar"
        cancelLabel="Cancelar"
        variant="default"
        onClose={() => setConfirm({ kind: 'none' })}
        onConfirm={confirmPublish}
      />
      <AdminConfirmDialog
        open={confirm.kind === 'deactivate'}
        title="Desactivar noticia"
        description={<p>¿Querés desactivar esta noticia? Ya no será visible para los jugadores.</p>}
        confirmLabel="Sí, desactivar"
        cancelLabel="Cancelar"
        variant="default"
        onClose={() => setConfirm({ kind: 'none' })}
        onConfirm={confirmDeactivate}
      />
      <AdminConfirmDialog
        open={confirm.kind === 'activate'}
        title="Activar noticia"
        description={<p>¿Querés activar esta noticia? Será visible otra vez en el sitio.</p>}
        confirmLabel="Sí, activar"
        cancelLabel="Cancelar"
        variant="default"
        onClose={() => setConfirm({ kind: 'none' })}
        onConfirm={confirmActivate}
      />
      <AdminConfirmDialog
        open={confirm.kind === 'delete'}
        title="Eliminar noticia"
        description={<p>¿Seguro que querés eliminar esta noticia? Esta acción no se puede deshacer.</p>}
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onClose={() => setConfirm({ kind: 'none' })}
        onConfirm={confirmDelete}
      />

      <AdminNewsPreviewDialog open={previewOpen} article={resolvedPreviewArticle} onClose={closePreview} />
    </div>
  );
}

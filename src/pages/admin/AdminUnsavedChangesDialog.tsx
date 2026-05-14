import { useEffect, useId, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { AdminGlobalModal } from './AdminGlobalModal';

const btnPrimary =
  'inline-flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-bold border shadow-sm transition-opacity admin-theme-btn sm:min-h-0 sm:w-auto';
const btnSecondary =
  'inline-flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-bold border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-[#111318] dark:text-white admin-theme-btn-secondary transition-colors sm:min-h-0 sm:w-auto';
const btnDanger =
  'inline-flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-bold border border-red-600 bg-red-600 text-white shadow-sm hover:bg-red-700 dark:border-red-500 dark:hover:bg-red-700 transition-colors sm:min-h-0 sm:w-auto';

export interface AdminUnsavedChangesDialogProps {
  open: boolean;
  canSaveDraft: boolean;
  bodyHint?: string;
  hasCommitSave?: boolean;
  /** Guardar todos los resultados pendientes (solo si la vista registró handler). */
  hasBulkSave?: boolean;
  onCancel: () => void;
  onDiscard: () => void;
  onSaveDraft: () => void | Promise<void>;
  onCommitSave?: () => void | Promise<void>;
  onBulkSave?: () => void | Promise<void>;
}

/**
 * Modal de cambios sin guardar (3 vías o 2 si no hay borrador).
 */
export function AdminUnsavedChangesDialog({
  open,
  canSaveDraft,
  bodyHint,
  hasCommitSave,
  hasBulkSave,
  onCancel,
  onDiscard,
  onSaveDraft,
  onCommitSave,
  onBulkSave,
}: AdminUnsavedChangesDialogProps) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => cancelRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;

  return (
    <AdminGlobalModal
      open={open}
      onClose={onCancel}
      labelledBy={titleId}
      overlayLabel="Cerrar"
      panelClassName="max-w-md border-amber-200/70 dark:border-amber-900/40"
    >
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-lg font-bold leading-snug text-[#111318] dark:text-white">
            Tenés cambios sin guardar
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#616f89] dark:text-gray-300">
            {bodyHint ?? 'Si salís ahora, las modificaciones que realizaste pueden perderse.'}
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-gray-200/80 pt-4 dark:border-gray-600/60 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-2">
        <button ref={cancelRef} type="button" onClick={onCancel} className={`${btnSecondary} order-1 sm:order-none`}>
          Cancelar
        </button>
        <button type="button" onClick={onDiscard} className={`${btnDanger} order-3 sm:order-none`}>
          Descartar cambios
        </button>
        {hasCommitSave && onCommitSave ? (
          <button type="button" onClick={() => void onCommitSave()} className={`${btnPrimary} order-2 sm:order-none`}>
            Guardar cambios
          </button>
        ) : null}
        {hasBulkSave && onBulkSave ? (
          <button type="button" onClick={() => void onBulkSave()} className={`${btnPrimary} order-2 sm:order-none`}>
            Guardar todo (resultados)
          </button>
        ) : null}
        {canSaveDraft ? (
          <button type="button" onClick={() => void onSaveDraft()} className={`${btnPrimary} order-2 sm:order-none`}>
            Guardar como borrador
          </button>
        ) : null}
      </div>
    </AdminGlobalModal>
  );
}

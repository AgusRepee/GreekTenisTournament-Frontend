import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { AdminGlobalModal } from './AdminGlobalModal';

const btnPrimary =
  'inline-flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-bold border shadow-sm transition-opacity admin-theme-btn sm:min-h-0 sm:w-auto';
const btnSecondary =
  'inline-flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-bold border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-[#111318] dark:text-white admin-theme-btn-secondary transition-colors sm:min-h-0 sm:w-auto';
const btnDanger =
  'inline-flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-bold border border-red-600 bg-red-600 text-white shadow-sm hover:bg-red-700 hover:border-red-700 dark:border-red-500 dark:bg-red-600 dark:hover:bg-red-700 transition-colors sm:min-h-0 sm:w-auto';

export type AdminConfirmVariant = 'default' | 'danger';

export interface AdminConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  /** Ancho del panel del diálogo (Tailwind). Por defecto `max-w-md`. */
  panelClassName?: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: AdminConfirmVariant;
  /** Texto extra para acciones que no se deshacen (ej. eliminar). */
  irreversible?: boolean;
  /** Si devuelve `false`, el diálogo permanece abierto (p. ej. validación fallida). */
  onConfirm: () => boolean | void;
  onClose: () => void;
}

/**
 * Modal de confirmación reutilizable para el panel admin (sin dependencia de Radix).
 */
export function AdminConfirmDialog({
  open,
  title,
  description,
  panelClassName = 'max-w-md',
  confirmLabel,
  cancelLabel = 'Cancelar',
  variant = 'default',
  irreversible = false,
  onConfirm,
  onClose,
}: AdminConfirmDialogProps) {
  const titleId = useId();
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => confirmBtnRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const confirmClass = variant === 'danger' ? btnDanger : btnPrimary;

  return (
    <AdminGlobalModal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      overlayLabel={cancelLabel}
      panelClassName={`${panelClassName} ${
        variant === 'danger' ? 'border-l-[5px] border-l-red-500 border-red-200/60 dark:border-red-900/40' : ''
      }`}
    >
      <div className="flex gap-3">
        {variant === 'danger' ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-lg font-bold leading-snug text-[#111318] dark:text-white">
            {title}
          </h2>
          {description ? (
            <div className="mt-2 text-sm leading-relaxed text-[#616f89] dark:text-gray-300">{description}</div>
          ) : null}
          {irreversible ? (
            <p className="mt-3 text-xs font-medium leading-relaxed text-red-800/90 dark:text-red-300/95">
              Esta acción no se puede deshacer.
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-gray-200/80 pt-4 dark:border-gray-600/60 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-2">
        <button type="button" onClick={onClose} className={btnSecondary}>
          {cancelLabel}
        </button>
        <button
          ref={confirmBtnRef}
          type="button"
          className={confirmClass}
          onClick={() => {
            const out = onConfirm();
            if (out !== false) onClose();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </AdminGlobalModal>
  );
}

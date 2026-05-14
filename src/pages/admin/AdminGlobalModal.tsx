import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type AdminGlobalModalProps = {
  open: boolean;
  children: ReactNode;
  onClose: () => void;
  labelledBy?: string;
  overlayLabel?: string;
  panelClassName?: string;
  closeOnBackdrop?: boolean;
};

/**
 * Modal global prioritario para admin.
 * Renderiza en document.body para no quedar atrapado por contenedores scrolleados,
 * transforms, z-index locales o solapas internas.
 */
export function AdminGlobalModal({
  open,
  children,
  onClose,
  labelledBy,
  overlayLabel = 'Cerrar',
  panelClassName = 'max-w-md',
  closeOnBackdrop = false,
}: AdminGlobalModalProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[260] flex items-center justify-center p-3 sm:p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-[3px] transition-opacity"
        aria-label={overlayLabel}
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`app-glass-panel relative z-[1] max-h-[min(92dvh,840px)] w-full overflow-y-auto rounded-xl border p-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] shadow-2xl sm:pb-6 md:p-6 ${panelClassName}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

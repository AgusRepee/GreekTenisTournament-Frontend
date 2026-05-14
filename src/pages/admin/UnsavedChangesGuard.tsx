import { useEffect } from 'react';
import { useAdminUnsavedChangesRegister } from './AdminUnsavedChangesContext';
import type { AdminUnsavedSnapshot } from './AdminUnsavedChangesContext';

export type UnsavedChangesGuardProps = {
  isDirty: boolean;
  canSaveDraft: boolean;
  onSaveDraft: () => void | Promise<void>;
  onDiscard: () => void;
  bodyHint?: string;
  onCommitSave?: () => boolean | void | Promise<boolean | void>;
};

/**
 * Conecta la vista con el guard global + advertencia al cerrar pestaña/recargar.
 */
export function UnsavedChangesGuard({
  isDirty,
  canSaveDraft,
  onSaveDraft,
  onDiscard,
  bodyHint,
  onCommitSave,
}: UnsavedChangesGuardProps) {
  useAdminUnsavedChangesRegister((): AdminUnsavedSnapshot | null => {
    if (!isDirty) return null;
    return {
      isDirty: true,
      canSaveDraft,
      saveDraft: onSaveDraft,
      bodyHint,
      commitSave: onCommitSave,
      discard: onDiscard,
    };
  });

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  return null;
}

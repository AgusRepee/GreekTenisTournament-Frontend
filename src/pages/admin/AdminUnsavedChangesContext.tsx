import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate, type NavigateOptions, type To } from 'react-router-dom';
import { AdminUnsavedChangesDialog } from './AdminUnsavedChangesDialog';

export type AdminUnsavedSnapshot = {
  isDirty: boolean;
  canSaveDraft: boolean;
  saveDraft: () => void | Promise<void>;
  /** Texto opcional bajo el título del modal. */
  bodyHint?: string;
  /** Guardar cambios (sin borrador). Devolvé `true` si se guardó bien para permitir la navegación pendiente. */
  commitSave?: () => boolean | void | Promise<boolean | void>;
  /** Guardar todos los borradores de resultados (p. ej. desde el panel de resultados). */
  bulkSave?: () => boolean | void | Promise<boolean | void>;
  discard: () => void;
};

type Getter = () => AdminUnsavedSnapshot | null;

type Ctx = {
  /** Registra el snapshot actual de la pantalla (null = nada que proteger). */
  setUnsavedGetter: (getter: Getter | null) => void;
  /** Ejecuta la navegación; si hay cambios sin guardar, abre el modal primero. */
  requestNavigate: (fn: () => void) => void;
};

const AdminUnsavedChangesContext = createContext<Ctx | null>(null);

export function AdminUnsavedChangesProvider({ children }: { children: ReactNode }) {
  const getterRef = useRef<Getter | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const pendingRef = useRef<(() => void) | null>(null);

  const setUnsavedGetter = useCallback((getter: Getter | null) => {
    getterRef.current = getter;
  }, []);

  const requestNavigate = useCallback((fn: () => void) => {
    const snap = getterRef.current?.();
    if (snap?.isDirty) {
      pendingRef.current = fn;
      setModalOpen(true);
    } else {
      fn();
    }
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    pendingRef.current = null;
  }, []);

  const handleDiscard = useCallback(() => {
    const snap = getterRef.current?.();
    snap?.discard();
    const next = pendingRef.current;
    setModalOpen(false);
    pendingRef.current = null;
    next?.();
  }, []);

  const handleSaveDraft = useCallback(async () => {
    const snap = getterRef.current?.();
    if (!snap?.canSaveDraft) return;
    await Promise.resolve(snap.saveDraft());
    await new Promise<void>((r) => queueMicrotask(() => r()));
    await new Promise<void>((r) => window.setTimeout(r, 0));
    if (getterRef.current?.()?.isDirty) {
      setModalOpen(false);
      pendingRef.current = null;
      return;
    }
    const next = pendingRef.current;
    setModalOpen(false);
    pendingRef.current = null;
    next?.();
  }, []);

  const handleCommitSave = useCallback(async () => {
    const snap = getterRef.current?.();
    if (!snap?.commitSave) return;
    const ok = await Promise.resolve(snap.commitSave());
    await new Promise<void>((r) => queueMicrotask(() => r()));
    await new Promise<void>((r) => window.setTimeout(r, 0));
    if (ok === false || getterRef.current?.()?.isDirty) {
      setModalOpen(false);
      pendingRef.current = null;
      return;
    }
    const next = pendingRef.current;
    setModalOpen(false);
    pendingRef.current = null;
    next?.();
  }, []);

  const handleBulkSave = useCallback(async () => {
    const snap = getterRef.current?.();
    if (!snap?.bulkSave) return;
    const ok = await Promise.resolve(snap.bulkSave());
    await new Promise<void>((r) => queueMicrotask(() => r()));
    await new Promise<void>((r) => window.setTimeout(r, 0));
    if (ok === false || getterRef.current?.()?.isDirty) {
      setModalOpen(false);
      pendingRef.current = null;
      return;
    }
    const next = pendingRef.current;
    setModalOpen(false);
    pendingRef.current = null;
    next?.();
  }, []);

  const snap = modalOpen ? getterRef.current?.() : null;

  const value = useMemo(
    () => ({
      setUnsavedGetter,
      requestNavigate,
    }),
    [setUnsavedGetter, requestNavigate],
  );

  return (
    <AdminUnsavedChangesContext.Provider value={value}>
      {children}
      <AdminUnsavedChangesDialog
        open={modalOpen}
        canSaveDraft={!!snap?.canSaveDraft}
        bodyHint={snap?.bodyHint}
        hasCommitSave={!!snap?.commitSave}
        hasBulkSave={!!snap?.bulkSave}
        onCancel={closeModal}
        onDiscard={handleDiscard}
        onSaveDraft={handleSaveDraft}
        onCommitSave={handleCommitSave}
        onBulkSave={handleBulkSave}
      />
    </AdminUnsavedChangesContext.Provider>
  );
}

export function useAdminUnsavedChangesContext(): Ctx {
  const ctx = useContext(AdminUnsavedChangesContext);
  if (!ctx) {
    throw new Error('useAdminUnsavedChangesContext debe usarse dentro de AdminUnsavedChangesProvider');
  }
  return ctx;
}

/**
 * Solo `requestNavigate`. Si no hay provider (p. ej. recarga parcial / HMR), ejecuta la navegación sin modal.
 * Preferí esto en layouts y cabeceras para que un fallo puntual no tumbe todo el panel admin.
 */
export function useAdminRequestNavigate(): Ctx['requestNavigate'] {
  const ctx = useContext(AdminUnsavedChangesContext);
  return useMemo(() => ctx?.requestNavigate ?? ((fn: () => void) => fn()), [ctx]);
}

/** Misma API que el provider, o `null` si el componente está fuera del árbol admin. */
export function useOptionalAdminUnsavedChangesContext(): Ctx | null {
  return useContext(AdminUnsavedChangesContext);
}

/** Navegación condicional respetando el guard global (para páginas bajo el panel). */
export function useSafeAdminNavigate() {
  const navigate = useNavigate();
  const ctx = useContext(AdminUnsavedChangesContext);
  return useCallback(
    (to: To, options?: NavigateOptions) => {
      const run = () => navigate(to, options);
      if (!ctx) {
        run();
        return;
      }
      ctx.requestNavigate(run);
    },
    [navigate, ctx],
  );
}

/**
 * Registra el estado de cambios sin guardar de la vista actual.
 * Pasá una función que lea el estado más reciente (evita closures viejos).
 */
export function useAdminUnsavedChangesRegister(getSnapshot: Getter) {
  const ctx = useContext(AdminUnsavedChangesContext);
  const getRef = useRef(getSnapshot);
  getRef.current = getSnapshot;

  useLayoutEffect(() => {
    if (!ctx) return;
    const getter = () => getRef.current();
    ctx.setUnsavedGetter(getter);
    return () => ctx.setUnsavedGetter(null);
  }, [ctx]);
}

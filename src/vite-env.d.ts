/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** `local` (default): localStorage/sessionStorage del navegador. `api`: backend REST. */
  readonly VITE_DATA_SOURCE?: string;
  readonly VITE_ADMIN_TOKEN?: string;
  /** `true`: muestra/habilita creación y eliminación avanzada en admin. Omitido = desactivado. */
  readonly VITE_ENABLE_ADVANCED_ADMIN_CREATION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

import { useCallback, useEffect, useId, useMemo, useState, type ChangeEvent } from 'react';
import {
  Building2,
  Database,
  Download,
  Eye,
  Layers,
  Palette,
  ScrollText,
  Shield,
  Upload,
} from 'lucide-react';
import type { LeagueNum } from '@/lib/mockData';
import { LEAGUES } from '@/lib/mockData';
import { getLeagueColor } from '@/lib/leagueColors';
import { refreshClubDataFromStorage } from '@/lib/clubDataStore';
import {
  applyLocalStorageBackup,
  buildLocalStorageBackup,
  loadSiteSettings,
  parseSiteBackupJson,
  saveSiteSettings,
  type SiteBackupPayload,
  type SiteBrandingSettings,
  type SiteClubSettings,
  type SiteHomeVisibility,
  type SiteLeagueUiConfig,
  type SiteRulesSettings,
} from '@/lib/siteSettings';
import { UnsavedChangesGuard } from '../UnsavedChangesGuard';
import { AdminCmsEditorLayout } from '../components/AdminCmsEditorLayout';
import { AdminUnsavedChangesDialog } from '../AdminUnsavedChangesDialog';
import { AdminConfirmDialog } from '../AdminConfirmDialog';
import { AdminGlobalModal } from '../AdminGlobalModal';

const inputBase =
  'w-full rounded-md admin-input-editable dark:bg-gray-900 text-[#111318] dark:text-white placeholder:text-[#616f89] dark:placeholder:text-gray-500 outline-none transition-all px-3 py-2.5 text-sm';
const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-bold border shadow-sm transition-opacity admin-theme-btn';
const btnSecondary =
  'inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-bold border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-[#111318] dark:text-white admin-theme-btn-secondary transition-colors';

type PanelId = 'club' | 'branding' | 'rules' | 'leagues' | 'home' | 'security' | 'backup' | null;

function readImageFile(e: ChangeEvent<HTMLInputElement>, onData: (dataUrl: string) => void) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file?.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === 'string') onData(reader.result);
  };
  reader.readAsDataURL(file);
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const SECTIONS: {
  id: Exclude<PanelId, null>;
  title: string;
  description: string;
  Icon: typeof Building2;
}[] = [
  {
    id: 'club',
    title: 'Datos del club',
    description: 'Nombre, contacto, redes y sede para footer y página de contacto.',
    Icon: Building2,
  },
  {
    id: 'branding',
    title: 'Identidad visual',
    description: 'Logos, fondos y nombre de marca visible (colores de liga siguen predefinidos).',
    Icon: Palette,
  },
  {
    id: 'rules',
    title: 'Reglas generales',
    description: 'Textos base para tolerancias, pelotas, walkover y clasificación.',
    Icon: ScrollText,
  },
  {
    id: 'leagues',
    title: 'Categorías / ligas',
    description: 'Nombre visible, descripción, orden y activación por liga.',
    Icon: Layers,
  },
  {
    id: 'home',
    title: 'Publicación y visibilidad',
    description: 'Qué bloques mostrar en la página de inicio.',
    Icon: Eye,
  },
  {
    id: 'security',
    title: 'Seguridad del admin',
    description: 'Accesos y políticas (preparado para cuando haya backend).',
    Icon: Shield,
  },
  {
    id: 'backup',
    title: 'Copias y exportación',
    description: 'Backup e importación de datos guardados en este navegador.',
    Icon: Database,
  },
];

export function AdminGeneralSettingsView() {
  const [panel, setPanel] = useState<PanelId>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [importConfirm, setImportConfirm] = useState<SiteBackupPayload | null>(null);
  const importId = useId();

  const [clubDraft, setClubDraft] = useState<SiteClubSettings | null>(null);
  const [clubBase, setClubBase] = useState('');

  const [brandDraft, setBrandDraft] = useState<SiteBrandingSettings | null>(null);
  const [brandBase, setBrandBase] = useState('');

  const [rulesDraft, setRulesDraft] = useState<SiteRulesSettings | null>(null);
  const [rulesBase, setRulesBase] = useState('');

  const [leaguesDraft, setLeaguesDraft] = useState<Record<LeagueNum, SiteLeagueUiConfig> | null>(null);
  const [leaguesBase, setLeaguesBase] = useState('');

  const [homeDraft, setHomeDraft] = useState<SiteHomeVisibility | null>(null);
  const [homeBase, setHomeBase] = useState('');

  const openPanel = useCallback((id: Exclude<PanelId, null>) => {
    const s = loadSiteSettings();
    if (id === 'club') {
      const d = { ...s.club };
      setClubDraft(d);
      setClubBase(JSON.stringify(d));
    } else if (id === 'branding') {
      const d = { ...s.branding };
      setBrandDraft(d);
      setBrandBase(JSON.stringify(d));
    } else if (id === 'rules') {
      const d = { ...s.rules };
      setRulesDraft(d);
      setRulesBase(JSON.stringify(d));
    } else if (id === 'leagues') {
      const d = JSON.parse(JSON.stringify(s.leagues)) as Record<LeagueNum, SiteLeagueUiConfig>;
      setLeaguesDraft(d);
      setLeaguesBase(JSON.stringify(d));
    } else if (id === 'home') {
      const d = { ...s.home };
      setHomeDraft(d);
      setHomeBase(JSON.stringify(d));
    }
    setPanel(id);
  }, []);

  const closePanelImmediate = useCallback(() => {
    setPanel(null);
    setClubDraft(null);
    setBrandDraft(null);
    setRulesDraft(null);
    setLeaguesDraft(null);
    setHomeDraft(null);
    setClubBase('');
    setBrandBase('');
    setRulesBase('');
    setLeaguesBase('');
    setHomeBase('');
  }, []);

  const dirty = useMemo(() => {
    if (panel === 'club' && clubDraft) return JSON.stringify(clubDraft) !== clubBase;
    if (panel === 'branding' && brandDraft) return JSON.stringify(brandDraft) !== brandBase;
    if (panel === 'rules' && rulesDraft) return JSON.stringify(rulesDraft) !== rulesBase;
    if (panel === 'leagues' && leaguesDraft) return JSON.stringify(leaguesDraft) !== leaguesBase;
    if (panel === 'home' && homeDraft) return JSON.stringify(homeDraft) !== homeBase;
    return false;
  }, [panel, clubDraft, clubBase, brandDraft, brandBase, rulesDraft, rulesBase, leaguesDraft, leaguesBase, homeDraft, homeBase]);

  const requestClosePanel = useCallback(() => {
    if (dirty) setLeaveOpen(true);
    else closePanelImmediate();
  }, [dirty, closePanelImmediate]);

  const persistPanel = useCallback((): boolean => {
    const full = loadSiteSettings();
    if (panel === 'club' && clubDraft) full.club = clubDraft;
    else if (panel === 'branding' && brandDraft) full.branding = brandDraft;
    else if (panel === 'rules' && rulesDraft) full.rules = rulesDraft;
    else if (panel === 'leagues' && leaguesDraft) full.leagues = leaguesDraft;
    else if (panel === 'home' && homeDraft) full.home = homeDraft;
    else return false;
    saveSiteSettings(full);
    refreshClubDataFromStorage();
    setToast('Cambios guardados correctamente.');
    if (panel === 'club' && clubDraft) setClubBase(JSON.stringify(clubDraft));
    if (panel === 'branding' && brandDraft) setBrandBase(JSON.stringify(brandDraft));
    if (panel === 'rules' && rulesDraft) setRulesBase(JSON.stringify(rulesDraft));
    if (panel === 'leagues' && leaguesDraft) setLeaguesBase(JSON.stringify(leaguesDraft));
    if (panel === 'home' && homeDraft) setHomeBase(JSON.stringify(homeDraft));
    return true;
  }, [panel, clubDraft, brandDraft, rulesDraft, leaguesDraft, homeDraft]);

  const discardAndClose = useCallback(() => {
    setLeaveOpen(false);
    closePanelImmediate();
  }, [closePanelImmediate]);

  const saveAndClose = useCallback(() => {
    persistPanel();
    setLeaveOpen(false);
    closePanelImmediate();
  }, [persistPanel, closePanelImmediate]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const handleImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const parsed = parseSiteBackupJson(text);
      if (!parsed) {
        setToast('No se pudo leer el archivo. Verificá que sea un backup JSON válido.');
        return;
      }
      setImportConfirm(parsed);
    };
    reader.readAsText(file);
  };

  const applyImport = () => {
    if (!importConfirm) return;
    applyLocalStorageBackup(importConfirm);
    setImportConfirm(null);
    setToast('Datos importados. Recargá la página si algo no se refleja al instante.');
  };

  const isFormPanel = panel === 'club' || panel === 'branding' || panel === 'rules' || panel === 'leagues' || panel === 'home';

  return (
    <div className="admin-content-stack">
      <UnsavedChangesGuard
        isDirty={isFormPanel && dirty}
        canSaveDraft={false}
        onSaveDraft={() => {}}
        bodyHint="Si salís ahora, las modificaciones de la configuración pueden perderse."
        onCommitSave={() => persistPanel()}
        onDiscard={discardAndClose}
      />

      <header className="max-w-3xl space-y-2">
        <h2 className="text-xl font-bold text-[#111318] dark:text-white md:text-2xl">Configuración general</h2>
        <p className="text-sm leading-relaxed text-[#616f89] dark:text-gray-400">
          Administrá los datos base, identidad visual y reglas generales del sitio. Los torneos, jugadores y partidos se gestionan en sus propias secciones.
        </p>
      </header>

      {toast ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200" role="status">
          {toast}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map(({ id, title, description, Icon }) => (
          <div
            key={id}
            className="app-glass-panel flex flex-col rounded-xl border border-gray-200/90 p-5 shadow-sm dark:border-gray-600/70 dark:shadow-sport-card-dark"
          >
            <div className="mb-3 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-[#111318] dark:text-white">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-[#616f89] dark:text-gray-400">{description}</p>
              </div>
            </div>
            <button type="button" onClick={() => openPanel(id)} className={`${btnSecondary} mt-auto w-full justify-center`}>
              Configurar
            </button>
          </div>
        ))}
      </div>

      {panel && panel !== 'club' && panel !== 'branding' && panel !== 'rules' && panel !== 'leagues' && panel !== 'home' ? (
        <AdminGlobalModal open={true} onClose={closePanelImmediate} panelClassName="max-w-2xl">
            {panel === 'security' ? (
              <div className="max-h-[85vh] overflow-y-auto p-6 md:p-8">
                <AdminCmsEditorLayout
                  title="Seguridad del admin"
                  subtitle="Funciones avanzadas de cuenta cuando exista backend."
                  onBack={closePanelImmediate}
                  backLabel="← Volver"
                >
                  <ul className="list-disc space-y-3 pl-5 text-sm text-[#616f89] dark:text-gray-400">
                    <li>
                      <strong className="text-[#111318] dark:text-gray-200">Cambiar contraseña</strong> — próximamente.
                    </li>
                    <li>
                      <strong className="text-[#111318] dark:text-gray-200">Usuarios administradores</strong> — próximamente.
                    </li>
                    <li>
                      <strong className="text-[#111318] dark:text-gray-200">Último acceso / cerrar otras sesiones</strong> — próximamente.
                    </li>
                  </ul>
                  <p className="mt-4 rounded-md border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                    Hoy el acceso al panel es local (sin servidor de cuentas). Esta sección queda preparada para integrar autenticación real.
                  </p>
                </AdminCmsEditorLayout>
              </div>
            ) : null}

            {panel === 'backup' ? (
              <div className="max-h-[85vh] overflow-y-auto p-6 md:p-8">
                <AdminCmsEditorLayout
                  title="Copias y exportación"
                  subtitle="Respaldo de localStorage: configuración, jugadores, partidos, resultados, noticias y proyectos del constructor."
                  onBack={closePanelImmediate}
                  backLabel="← Volver"
                >
                  <p className="rounded-lg border border-amber-200/70 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100">
                    Usá estas opciones con cuidado. Pueden modificar información visible del sitio.
                  </p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <button
                      type="button"
                      className={btnPrimary}
                      onClick={() => downloadJson(`greek-tennis-backup-${new Date().toISOString().slice(0, 10)}.json`, buildLocalStorageBackup())}
                    >
                      <Download className="h-4 w-4" aria-hidden />
                      Descargar backup (JSON)
                    </button>
                    <label className={`${btnSecondary} cursor-pointer`}>
                      <Upload className="h-4 w-4" aria-hidden />
                      Importar / restaurar backup
                      <input id={importId} type="file" accept="application/json,.json" className="sr-only" onChange={handleImportFile} />
                    </label>
                  </div>
                </AdminCmsEditorLayout>
              </div>
            ) : null}
        </AdminGlobalModal>
      ) : null}

      {isFormPanel ? (
        <AdminGlobalModal open={true} onClose={requestClosePanel} panelClassName="max-w-2xl">
            <div className="max-h-[85vh] overflow-y-auto">
              {panel === 'club' && clubDraft ? (
                <AdminCmsEditorLayout
                  title="Datos del club"
                  subtitle="Estos datos alimentan footer, contacto y bloques laterales del sitio."
                  onBack={requestClosePanel}
                  backLabel="← Volver"
                  footer={
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={btnPrimary} onClick={() => persistPanel()}>
                        Guardar datos del club
                      </button>
                      <button type="button" className={btnSecondary} onClick={requestClosePanel}>
                        Cancelar
                      </button>
                    </div>
                  }
                >
                  <div className="space-y-4">
                    <Field label="Nombre del club / circuito">
                      <input className={inputBase} value={clubDraft.circuitName} onChange={(e) => setClubDraft((d) => d && { ...d, circuitName: e.target.value })} />
                    </Field>
                    <Field label="Descripción corta">
                      <textarea className={`${inputBase} min-h-[88px]`} value={clubDraft.tagline} onChange={(e) => setClubDraft((d) => d && { ...d, tagline: e.target.value })} />
                    </Field>
                    <Field label="WhatsApp (solo dígitos, código país sin +)">
                      <input className={inputBase} inputMode="numeric" value={clubDraft.whatsappDigits} onChange={(e) => setClubDraft((d) => d && { ...d, whatsappDigits: e.target.value })} />
                    </Field>
                    <Field label="Email de contacto">
                      <input className={inputBase} type="email" value={clubDraft.contactEmail} onChange={(e) => setClubDraft((d) => d && { ...d, contactEmail: e.target.value })} />
                    </Field>
                    <Field label="Instagram (usuario sin @)">
                      <input className={inputBase} placeholder="greektenis" value={clubDraft.instagramHandle} onChange={(e) => setClubDraft((d) => d && { ...d, instagramHandle: e.target.value })} />
                    </Field>
                    <Field label="Sede / predio">
                      <input className={inputBase} value={clubDraft.venue} onChange={(e) => setClubDraft((d) => d && { ...d, venue: e.target.value })} />
                    </Field>
                    <Field label="Calle y número">
                      <input className={inputBase} value={clubDraft.street} onChange={(e) => setClubDraft((d) => d && { ...d, street: e.target.value })} />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Localidad">
                        <input className={inputBase} value={clubDraft.locality} onChange={(e) => setClubDraft((d) => d && { ...d, locality: e.target.value })} />
                      </Field>
                      <Field label="Código postal">
                        <input className={inputBase} value={clubDraft.postalCode} onChange={(e) => setClubDraft((d) => d && { ...d, postalCode: e.target.value })} />
                      </Field>
                    </div>
                    <Field label="Provincia">
                      <input className={inputBase} value={clubDraft.province} onChange={(e) => setClubDraft((d) => d && { ...d, province: e.target.value })} />
                    </Field>
                    <Field label="Link de Google Maps (opcional)">
                      <input className={inputBase} placeholder="https://maps.app.goo.gl/…" value={clubDraft.googleMapsUrl} onChange={(e) => setClubDraft((d) => d && { ...d, googleMapsUrl: e.target.value })} />
                    </Field>
                  </div>
                </AdminCmsEditorLayout>
              ) : null}

              {panel === 'branding' && brandDraft ? (
                <AdminCmsEditorLayout
                  title="Identidad visual"
                  subtitle="Las imágenes se guardan en Base64 en este navegador. Más adelante se puede reemplazar por subida a servidor."
                  onBack={requestClosePanel}
                  backLabel="← Volver"
                  footer={
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={btnPrimary} onClick={() => persistPanel()}>
                        Guardar identidad
                      </button>
                      <button type="button" className={btnSecondary} onClick={requestClosePanel}>
                        Cancelar
                      </button>
                    </div>
                  }
                >
                  <p className="mb-4 text-xs text-[#616f89] dark:text-gray-500">Los colores de liga del sitio siguen definidos en el sistema de diseño; no se modifican desde acá.</p>
                  <Field label="Nombre de marca visible">
                    <input className={inputBase} value={brandDraft.brandDisplayName} onChange={(e) => setBrandDraft((d) => d && { ...d, brandDisplayName: e.target.value })} />
                  </Field>
                  <ImageRow label="Logo principal" value={brandDraft.logoPrimaryDataUrl} onFile={(ev) => readImageFile(ev, (u) => setBrandDraft((d) => d && { ...d, logoPrimaryDataUrl: u }))} onClear={() => setBrandDraft((d) => d && { ...d, logoPrimaryDataUrl: '' })} />
                  <ImageRow label="Logo secundario" value={brandDraft.logoSecondaryDataUrl} onFile={(ev) => readImageFile(ev, (u) => setBrandDraft((d) => d && { ...d, logoSecondaryDataUrl: u }))} onClear={() => setBrandDraft((d) => d && { ...d, logoSecondaryDataUrl: '' })} />
                  <ImageRow label="Imagen de fondo (hero / cabeceras)" value={brandDraft.heroBackgroundDataUrl} onFile={(ev) => readImageFile(ev, (u) => setBrandDraft((d) => d && { ...d, heroBackgroundDataUrl: u }))} onClear={() => setBrandDraft((d) => d && { ...d, heroBackgroundDataUrl: '' })} />
                  <ImageRow label="Imagen fallback para torneos sin portada" value={brandDraft.tournamentCoverFallbackDataUrl} onFile={(ev) => readImageFile(ev, (u) => setBrandDraft((d) => d && { ...d, tournamentCoverFallbackDataUrl: u }))} onClear={() => setBrandDraft((d) => d && { ...d, tournamentCoverFallbackDataUrl: '' })} />
                  <ImageRow label="Avatar fallback jugadores sin foto" value={brandDraft.playerAvatarFallbackDataUrl} onFile={(ev) => readImageFile(ev, (u) => setBrandDraft((d) => d && { ...d, playerAvatarFallbackDataUrl: u }))} onClear={() => setBrandDraft((d) => d && { ...d, playerAvatarFallbackDataUrl: '' })} />
                </AdminCmsEditorLayout>
              ) : null}

              {panel === 'rules' && rulesDraft ? (
                <AdminCmsEditorLayout
                  title="Reglas generales"
                  subtitle="Texto base para nuevos torneos; cada torneo puede ajustar lo suyo en su módulo."
                  onBack={requestClosePanel}
                  backLabel="← Volver"
                  footer={
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={btnPrimary} onClick={() => persistPanel()}>
                        Guardar reglas
                      </button>
                      <button type="button" className={btnSecondary} onClick={requestClosePanel}>
                        Cancelar
                      </button>
                    </div>
                  }
                >
                  <Field label="Tolerancia de llegada tarde">
                    <textarea className={`${inputBase} min-h-[72px]`} value={rulesDraft.lateArrivalTolerance} onChange={(e) => setRulesDraft((d) => d && { ...d, lateArrivalTolerance: e.target.value })} />
                  </Field>
                  <Field label="Regla de pelotas">
                    <textarea className={`${inputBase} min-h-[88px]`} value={rulesDraft.ballsRuleText} onChange={(e) => setRulesDraft((d) => d && { ...d, ballsRuleText: e.target.value })} />
                  </Field>
                  <Field label="Sistema de puntuación general">
                    <textarea className={`${inputBase} min-h-[88px]`} value={rulesDraft.scoringSystemText} onChange={(e) => setRulesDraft((d) => d && { ...d, scoringSystemText: e.target.value })} />
                  </Field>
                  <Field label="Reglas de walkover">
                    <textarea className={`${inputBase} min-h-[88px]`} value={rulesDraft.walkoverRulesText} onChange={(e) => setRulesDraft((d) => d && { ...d, walkoverRulesText: e.target.value })} />
                  </Field>
                  <Field label="Reglas de clasificación generales">
                    <textarea className={`${inputBase} min-h-[100px]`} value={rulesDraft.classificationRulesText} onChange={(e) => setRulesDraft((d) => d && { ...d, classificationRulesText: e.target.value })} />
                  </Field>
                </AdminCmsEditorLayout>
              ) : null}

              {panel === 'leagues' && leaguesDraft ? (
                <AdminCmsEditorLayout
                  title="Categorías / ligas"
                  subtitle="Los colores del sistema están protegidos; solo podés ajustar nombre visible, descripción, orden y si la liga se muestra en el sitio."
                  onBack={requestClosePanel}
                  backLabel="← Volver"
                  footer={
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={btnPrimary} onClick={() => persistPanel()}>
                        Guardar ligas
                      </button>
                      <button type="button" className={btnSecondary} onClick={requestClosePanel}>
                        Cancelar
                      </button>
                    </div>
                  }
                >
                  <div className="space-y-6">
                    {LEAGUES.map((n) => {
                      const row = leaguesDraft[n]!;
                      const c = getLeagueColor(n);
                      return (
                        <div key={n} className={`rounded-lg border border-gray-200/90 p-4 dark:border-gray-600 ${c.borderTop}`}>
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <div className={`h-2 w-full max-w-[120px] rounded ${c.topBar}`} title="Color predefinido" />
                            <span className={c.badge}>Liga {n}</span>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Nombre visible">
                              <input
                                className={inputBase}
                                value={row.visibleName}
                                onChange={(e) =>
                                  setLeaguesDraft((d) => {
                                    if (!d) return d;
                                    const cur = d[n]!;
                                    return { ...d, [n]: { ...cur, visibleName: e.target.value } };
                                  })
                                }
                              />
                            </Field>
                            <Field label="Orden (número)">
                              <input
                                type="number"
                                className={inputBase}
                                min={1}
                                max={99}
                                value={row.order}
                                onChange={(e) =>
                                  setLeaguesDraft((d) => {
                                    if (!d) return d;
                                    const cur = d[n]!;
                                    return { ...d, [n]: { ...cur, order: Math.max(1, Number.parseInt(e.target.value, 10) || 1) } };
                                  })
                                }
                              />
                            </Field>
                          </div>
                          <Field label="Descripción">
                            <textarea
                              className={`${inputBase} mt-2 min-h-[72px]`}
                              value={row.description}
                              onChange={(e) =>
                                setLeaguesDraft((d) => {
                                  if (!d) return d;
                                  const cur = d[n]!;
                                  return { ...d, [n]: { ...cur, description: e.target.value } };
                                })
                              }
                            />
                          </Field>
                          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-[#111318] dark:text-gray-200">
                            <input
                              type="checkbox"
                              checked={row.enabled}
                              onChange={(e) =>
                                setLeaguesDraft((d) => {
                                  if (!d) return d;
                                  const cur = d[n]!;
                                  return { ...d, [n]: { ...cur, enabled: e.target.checked } };
                                })
                              }
                            />
                            Liga activa en el sitio
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </AdminCmsEditorLayout>
              ) : null}

              {panel === 'home' && homeDraft ? (
                <AdminCmsEditorLayout
                  title="Publicación y visibilidad"
                  subtitle="Controlá qué bloques se muestran en la página de inicio."
                  onBack={requestClosePanel}
                  backLabel="← Volver"
                  footer={
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={btnPrimary} onClick={() => persistPanel()}>
                        Guardar visibilidad
                      </button>
                      <button type="button" className={btnSecondary} onClick={requestClosePanel}>
                        Cancelar
                      </button>
                    </div>
                  }
                >
                  <div className="space-y-4">
                    <ToggleRow
                      id="h-torneos"
                      label="Mostrar próximos torneos en Inicio"
                      checked={homeDraft.showUpcomingTournaments}
                      onChange={(v) => setHomeDraft((d) => d && { ...d, showUpcomingTournaments: v })}
                    />
                    <ToggleRow
                      id="h-partidos"
                      label="Mostrar partidos importantes"
                      checked={homeDraft.showImportantMatches}
                      onChange={(v) => setHomeDraft((d) => d && { ...d, showImportantMatches: v })}
                    />
                    <ToggleRow id="h-rank" label="Mostrar rankings en Inicio" checked={homeDraft.showRankings} onChange={(v) => setHomeDraft((d) => d && { ...d, showRankings: v })} />
                    <ToggleRow id="h-news" label="Mostrar últimas noticias" checked={homeDraft.showLatestNews} onChange={(v) => setHomeDraft((d) => d && { ...d, showLatestNews: v })} />
                    <ToggleRow id="h-contact" label="Mostrar contacto lateral" checked={homeDraft.showSideContact} onChange={(v) => setHomeDraft((d) => d && { ...d, showSideContact: v })} />
                    <ToggleRow
                      id="h-insc"
                      label="Mostrar botón de inscripción (tarjetas de torneo)"
                      checked={homeDraft.showEnrollmentButton}
                      onChange={(v) => setHomeDraft((d) => d && { ...d, showEnrollmentButton: v })}
                    />
                  </div>
                </AdminCmsEditorLayout>
              ) : null}
            </div>
        </AdminGlobalModal>
      ) : null}

      <AdminUnsavedChangesDialog
        open={leaveOpen}
        canSaveDraft={false}
        hasCommitSave
        bodyHint="Si salís ahora, las modificaciones de la configuración pueden perderse."
        onCancel={() => setLeaveOpen(false)}
        onDiscard={discardAndClose}
        onSaveDraft={() => {}}
        onCommitSave={() => {
          persistPanel();
          setLeaveOpen(false);
          closePanelImmediate();
        }}
      />

      <AdminConfirmDialog
        open={!!importConfirm}
        title="Restaurar backup"
        description={
          <p className="text-sm text-[#616f89] dark:text-gray-400">
            Se van a reemplazar los datos guardados en este navegador (incluida la configuración) por los del archivo. ¿Continuar?
          </p>
        }
        confirmLabel="Sí, restaurar"
        cancelLabel="Cancelar"
        variant="danger"
        irreversible
        onClose={() => setImportConfirm(null)}
        onConfirm={applyImport}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-[#616f89] dark:text-gray-400">{label}</label>
      {children}
    </div>
  );
}

function ImageRow({
  label,
  value,
  onFile,
  onClear,
}: {
  label: string;
  value: string;
  onFile: (e: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) {
  const id = useId();
  return (
    <div className="mt-4 rounded-lg border border-gray-200/80 p-3 dark:border-gray-600">
      <p className="text-xs font-semibold text-[#616f89] dark:text-gray-400">{label}</p>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800">
          {value ? <img src={value} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-[10px] text-gray-400">Sin imagen</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <label htmlFor={id} className={`${btnSecondary} cursor-pointer`}>
            Elegir archivo
            <input type="file" accept="image/*" className="sr-only" id={id} onChange={onFile} />
          </label>
          {value ? (
            <button type="button" className={btnSecondary} onClick={onClear}>
              Quitar
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200/80 px-3 py-2.5 dark:border-gray-600">
      <label htmlFor={id} className="cursor-pointer text-sm font-medium text-[#111318] dark:text-gray-200">
        {label}
      </label>
      <input id={id} type="checkbox" className="h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </div>
  );
}

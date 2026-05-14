/**
 * Configuración general del sitio (localStorage). Consumo en footer, inicio, contacto y panel admin.
 */

import { useSyncExternalStore } from 'react';
import type { LeagueNum } from '@/lib/mockData';
import { LEAGUES } from '@/lib/mockData';
import { CLUB_GOOGLE_MAPS_COORDS, CLUB_MAIN_SITE } from '@/lib/clubAddress';
import { getData, saveData } from '@/lib/localPersistence';
import {
  PERSISTENCE_KEYS,
  ADMIN_TOURNAMENT_BUILDER_STORAGE_KEY,
  MATCH_RESULTS_STORAGE_KEY,
  NEWS_STORAGE_KEY,
} from '@/data/types/persistenceKeys';
import { DEFAULT_PLAYER_AVATAR_URL } from '@/lib/defaultPlayerAvatar';
import { refreshClubDataFromStorage } from '@/lib/clubDataStore';

const CHANGED = 'greek-tennis-site-settings-changed';
export const DEFAULT_CONTACT_EMAIL = 'contacto@greektennis.com';

export type SiteClubSettings = {
  circuitName: string;
  tagline: string;
  whatsappDigits: string;
  contactEmail: string;
  instagramHandle: string;
  venue: string;
  street: string;
  locality: string;
  postalCode: string;
  province: string;
  googleMapsUrl: string;
};

export type SiteBrandingSettings = {
  brandDisplayName: string;
  /** data:image/... o vacío → asset por defecto */
  logoPrimaryDataUrl: string;
  logoSecondaryDataUrl: string;
  heroBackgroundDataUrl: string;
  tournamentCoverFallbackDataUrl: string;
  playerAvatarFallbackDataUrl: string;
};

export type SiteRulesSettings = {
  lateArrivalTolerance: string;
  ballsRuleText: string;
  scoringSystemText: string;
  walkoverRulesText: string;
  classificationRulesText: string;
};

export type SiteLeagueUiConfig = {
  visibleName: string;
  description: string;
  enabled: boolean;
  order: number;
};

export type SiteHomeVisibility = {
  showUpcomingTournaments: boolean;
  showImportantMatches: boolean;
  showRankings: boolean;
  showLatestNews: boolean;
  showSideContact: boolean;
  showEnrollmentButton: boolean;
};

export type SiteSettings = {
  version: 1;
  club: SiteClubSettings;
  branding: SiteBrandingSettings;
  rules: SiteRulesSettings;
  leagues: Record<LeagueNum, SiteLeagueUiConfig>;
  home: SiteHomeVisibility;
};

export type SiteBackupPayload = {
  exportedAt: string;
  siteSettings: SiteSettings;
  jugadores: unknown;
  partidos: unknown;
  torneos: unknown;
  matchResults: unknown;
  news: unknown;
  adminTournamentProjects: unknown;
};

function defaultLeagues(): Record<LeagueNum, SiteLeagueUiConfig> {
  const o = {} as Record<LeagueNum, SiteLeagueUiConfig>;
  for (const n of LEAGUES) {
    o[n] = {
      visibleName: `Liga ${n}`,
      description: '',
      enabled: true,
      order: n,
    };
  }
  return o;
}

export function defaultSiteSettings(): SiteSettings {
  return {
    version: 1,
    club: {
      circuitName: 'Greek Tenis',
      tagline: 'Circuito amateur de tenis con torneos, rankings y estadísticas',
      whatsappDigits: '5491166459100',
      contactEmail: DEFAULT_CONTACT_EMAIL,
      instagramHandle: '',
      venue: CLUB_MAIN_SITE.venue,
      street: CLUB_MAIN_SITE.street,
      locality: CLUB_MAIN_SITE.locality,
      postalCode: CLUB_MAIN_SITE.postalCode,
      province: CLUB_MAIN_SITE.province,
      googleMapsUrl: '',
    },
    branding: {
      brandDisplayName: 'GREEK TENNIS',
      logoPrimaryDataUrl: '',
      logoSecondaryDataUrl: '',
      heroBackgroundDataUrl: '',
      tournamentCoverFallbackDataUrl: '',
      playerAvatarFallbackDataUrl: '',
    },
    rules: {
      lateArrivalTolerance: '15 minutos de tolerancia salvo acuerdo previo entre jugadores.',
      ballsRuleText: 'Pelotas nuevas acordadas por organización; en canchas sin presión se usan pelotas en buen estado.',
      scoringSystemText: 'Sistema estándar por sets; desempates según reglamento del torneo.',
      walkoverRulesText: 'WO por no presentación pasado el tiempo de tolerancia; comunicar al organizador.',
      classificationRulesText: 'Clasificación por puntos acumulados en fase regular; criterios de desempate: enfrentamiento directo, diferencia de sets, games a favor.',
    },
    leagues: defaultLeagues(),
    home: {
      showUpcomingTournaments: true,
      showImportantMatches: true,
      showRankings: true,
      showLatestNews: true,
      showSideContact: true,
      showEnrollmentButton: true,
    },
  };
}

export function resolveContactEmail(input: string | undefined | null): string {
  const value = input?.trim();
  if (!value || value === 'contacto@greektenis.com') return DEFAULT_CONTACT_EMAIL;
  return value;
}

function deepMerge<T extends Record<string, unknown>>(base: T, patch: unknown): T {
  if (patch == null || typeof patch !== 'object' || Array.isArray(patch)) return base;
  const p = patch as Record<string, unknown>;
  const out = { ...base } as Record<string, unknown>;
  for (const k of Object.keys(base)) {
    const bv = base[k as keyof T];
    const pv = p[k];
    if (pv != null && typeof bv === 'object' && !Array.isArray(bv) && typeof pv === 'object' && !Array.isArray(pv)) {
      out[k] = deepMerge(bv as Record<string, unknown>, pv);
    } else if (k in p) {
      out[k] = pv;
    }
  }
  return out as T;
}

/**
 * Snapshot estable para `useSyncExternalStore`: debe devolver la misma referencia
 * mientras no cambien los datos en storage (si no, React entra en bucle infinito).
 */
let siteSettingsSnapshot: SiteSettings | null = null;

function invalidateSiteSettingsSnapshot(): void {
  siteSettingsSnapshot = null;
}

function getSiteSettingsSnapshot(): SiteSettings {
  if (siteSettingsSnapshot == null) {
    const raw = getData<unknown>(PERSISTENCE_KEYS.siteSettings);
    siteSettingsSnapshot = deepMerge(defaultSiteSettings() as unknown as Record<string, unknown>, raw) as unknown as SiteSettings;
  }
  return siteSettingsSnapshot;
}

export function loadSiteSettings(): SiteSettings {
  return getSiteSettingsSnapshot();
}

export function normalizeImportedSiteSettings(raw: unknown): SiteSettings {
  return deepMerge(defaultSiteSettings() as unknown as Record<string, unknown>, raw) as unknown as SiteSettings;
}

export function saveSiteSettings(next: SiteSettings): void {
  saveData(PERSISTENCE_KEYS.siteSettings, next);
  invalidateSiteSettingsSnapshot();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHANGED));
  }
}

function subscribeSiteSettings(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const onChanged = () => {
    invalidateSiteSettingsSnapshot();
    cb();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key != null && e.key !== PERSISTENCE_KEYS.siteSettings) return;
    invalidateSiteSettingsSnapshot();
    cb();
  };
  window.addEventListener(CHANGED, onChanged);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGED, onChanged);
    window.removeEventListener('storage', onStorage);
  };
}

export function useSiteSettings(): SiteSettings {
  return useSyncExternalStore(subscribeSiteSettings, getSiteSettingsSnapshot, getSiteSettingsSnapshot);
}

export function getClubAddressLinesFromSettings(s: SiteClubSettings): string[] {
  const venue = s.venue.trim() || CLUB_MAIN_SITE.venue;
  const street = s.street.trim() || CLUB_MAIN_SITE.street;
  const locality = s.locality.trim() || CLUB_MAIN_SITE.locality;
  const postalCode = s.postalCode.trim() || CLUB_MAIN_SITE.postalCode;
  const province = s.province.trim() || CLUB_MAIN_SITE.province;
  return [`${venue}, ${street}`, `${postalCode} ${locality}`, province];
}

export function getGoogleMapsUrlFromSettings(s: SiteClubSettings): string {
  const u = s.googleMapsUrl.trim();
  if (u) return u;
  const { lat, lng } = CLUB_GOOGLE_MAPS_COORDS;
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function resolvePlayerAvatarFallback(s: SiteBrandingSettings): string {
  const u = s.playerAvatarFallbackDataUrl?.trim();
  return u || DEFAULT_PLAYER_AVATAR_URL;
}

export function parseSiteBackupJson(text: string): SiteBackupPayload | null {
  try {
    const j = JSON.parse(text) as unknown;
    if (!j || typeof j !== 'object') return null;
    const o = j as Record<string, unknown>;
    if (!o.siteSettings || typeof o.siteSettings !== 'object') return null;
    return j as SiteBackupPayload;
  } catch {
    return null;
  }
}

export function buildLocalStorageBackup(): SiteBackupPayload {
  return {
    exportedAt: new Date().toISOString(),
    siteSettings: loadSiteSettings(),
    jugadores: getData(PERSISTENCE_KEYS.jugadores),
    partidos: getData(PERSISTENCE_KEYS.partidos),
    torneos: getData(PERSISTENCE_KEYS.torneos),
    matchResults: getData(MATCH_RESULTS_STORAGE_KEY),
    news: getData(NEWS_STORAGE_KEY),
    adminTournamentProjects: getData(ADMIN_TOURNAMENT_BUILDER_STORAGE_KEY),
  };
}

export function applyLocalStorageBackup(payload: SiteBackupPayload): void {
  saveData(PERSISTENCE_KEYS.siteSettings, normalizeImportedSiteSettings(payload.siteSettings));
  if (payload.jugadores != null) saveData(PERSISTENCE_KEYS.jugadores, payload.jugadores);
  if (payload.partidos != null) saveData(PERSISTENCE_KEYS.partidos, payload.partidos);
  if (payload.torneos != null) saveData(PERSISTENCE_KEYS.torneos, payload.torneos);
  if (payload.matchResults != null) saveData(MATCH_RESULTS_STORAGE_KEY, payload.matchResults);
  if (payload.news != null) saveData(NEWS_STORAGE_KEY, payload.news);
  if (payload.adminTournamentProjects != null) saveData(ADMIN_TOURNAMENT_BUILDER_STORAGE_KEY, payload.adminTournamentProjects);
  invalidateSiteSettingsSnapshot();
  refreshClubDataFromStorage();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHANGED));
  }
}

export function isLeagueEnabled(settings: SiteSettings, league: LeagueNum): boolean {
  return settings.leagues[league]?.enabled !== false;
}

export function orderedPublicLeagues(settings: SiteSettings): LeagueNum[] {
  return [...LEAGUES]
    .filter((n) => isLeagueEnabled(settings, n))
    .sort((a, b) => (settings.leagues[a]?.order ?? a) - (settings.leagues[b]?.order ?? b));
}

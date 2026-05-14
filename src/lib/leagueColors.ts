/**
 * League color system — alineado con portadas Novak en /img (rojo…gris).
 * Liga 1 rojo, 2 naranja, 3 azul, 4 verde, 5 negro, 6 gris.
 */

import type { LeagueNum } from './mockData';

export interface LeagueColorClasses {
  /** Top border for cards/headers (e.g. border-t-4 border-red-500) */
  borderTop: string;
  /** Top bar background (for a 4px strip, e.g. bg-red-500) — use with h-1 rounded-t-xl */
  topBar: string;
  /** Light background */
  bg: string;
  /** Left/side border */
  border: string;
  /** Badge/chip: rounded-full px-3 py-1 text-xs font-semibold */
  badge: string;
  /** Category cell in tables (bg + text) */
  categoryBg: string;
}

const leagueMap: Record<LeagueNum, LeagueColorClasses> = {
  1: {
    borderTop: 'border-t-4 border-t-red-500',
    topBar: 'bg-red-500',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-l-4 border-l-red-500',
    badge: 'rounded-full px-3 py-1 text-xs font-semibold bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300 border border-red-500',
    categoryBg: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-200',
  },
  2: {
    borderTop: 'border-t-4 border-t-orange-400',
    topBar: 'bg-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-l-4 border-l-orange-400',
    badge: 'rounded-full px-3 py-1 text-xs font-semibold bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-400',
    categoryBg: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-200',
  },
  3: {
    borderTop: 'border-t-4 border-t-blue-500',
    topBar: 'bg-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-l-4 border-l-blue-500',
    badge: 'rounded-full px-3 py-1 text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-500',
    categoryBg: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200',
  },
  4: {
    borderTop: 'border-t-4 border-t-green-500',
    topBar: 'bg-green-500',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-l-4 border-l-green-500',
    badge: 'rounded-full px-3 py-1 text-xs font-semibold bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-500',
    categoryBg: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-200',
  },
  5: {
    borderTop: 'border-t-4 border-t-neutral-900',
    topBar: 'bg-neutral-900',
    bg: 'bg-neutral-100 dark:bg-neutral-900/35',
    border: 'border-l-4 border-l-neutral-900',
    badge: 'rounded-full px-3 py-1 text-xs font-semibold bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100 border border-neutral-900',
    categoryBg: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200',
  },
  6: {
    borderTop: 'border-t-4 border-t-gray-400',
    topBar: 'bg-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800/50',
    border: 'border-l-4 border-l-gray-400',
    badge: 'rounded-full px-3 py-1 text-xs font-semibold bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border border-gray-500',
    categoryBg: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-200',
  },
};

/**
 * Returns Tailwind classes for the given league (1–6).
 * Use for borders, backgrounds, and badges everywhere: ranking, profile, tournaments.
 */
function normalizeLeagueNum(league: LeagueNum | number | string | undefined | null): LeagueNum {
  const n = typeof league === 'string' ? Number.parseInt(league, 10) : Number(league);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5 || n === 6) return n;
  return 1;
}

/** Colores de liga; valores inválidos (datos viejos / JSON) → Liga 1 para no romper la UI. */
export function getLeagueColor(league: LeagueNum | number | string | undefined | null): LeagueColorClasses {
  return leagueMap[normalizeLeagueNum(league)];
}

/**
 * Sombra estática muy sutil en cards de torneo en curso (tinte acorde a la liga / franja superior).
 * Sin hover: solo profundidad ligera.
 */
export function getLeagueSubtleCardShadowClasses(league: LeagueNum): string {
  const map: Record<LeagueNum, string> = {
    1: 'shadow-[0_10px_26px_-10px_rgba(220,38,38,0.14)] dark:shadow-[0_12px_30px_-10px_rgba(248,113,113,0.12)]',
    2: 'shadow-[0_10px_26px_-10px_rgba(249,115,22,0.14)] dark:shadow-[0_12px_30px_-10px_rgba(253,186,116,0.1)]',
    3: 'shadow-[0_10px_26px_-10px_rgba(59,130,246,0.14)] dark:shadow-[0_12px_30px_-10px_rgba(96,165,250,0.1)]',
    4: 'shadow-[0_10px_26px_-10px_rgba(34,197,94,0.14)] dark:shadow-[0_12px_30px_-10px_rgba(74,222,128,0.1)]',
    5: 'shadow-[0_10px_26px_-10px_rgba(38,38,38,0.12)] dark:shadow-[0_12px_30px_-10px_rgba(163,163,163,0.1)]',
    6: 'shadow-[0_10px_26px_-10px_rgba(139,92,246,0.12)] dark:shadow-[0_12px_30px_-10px_rgba(196,181,253,0.1)]',
  };
  return map[league];
}

/** Próximos torneos: sombra neutra, sin color de liga. */
export const TOURNAMENT_CARD_SHADOW_NEUTRAL =
  'shadow-[0_8px_22px_-10px_rgba(15,23,42,0.08)] dark:shadow-[0_10px_26px_-12px_rgba(0,0,0,0.38)]';

/** Clases para `MatchCard` en cuadro público (reemplaza sky/primary fijo). */
export interface MatchCardLeagueUi {
  winnerRow: string;
  loserRow: string;
  avatarRing: string;
  avatarInitials: string;
  avatarNoPhotoShell: string;
  loserName: string;
  rankingMuted: string;
  checkWinner: string;
  scorePlaceholder: string;
  outerCard: string;
}

/**
 * Acentos del detalle público de torneo: navegación, hero, tablas destacadas, cuadro KO, tarjetas.
 * Liga inválida → Liga 1.
 */
export interface LeaguePublicTournamentTheme {
  accentText: string;
  /** Ganadores / resultado destacado (incluye variante dark si aplica). */
  accentTextWinner: string;
  accentSolid: string;
  accentSolidHover: string;
  accentBorderSoft: string;
  accentBgSoft: string;
  heroCategoryPill: string;
  /** `backgroundImage` cuando no hay portada */
  heroGradientNoCover: string;
  /** Stop central del degradado sobre la imagen de portada */
  heroCoverTintMidRgba: string;
  bracketShell: string;
  bracketEmpty: string;
  connectorStroke: string;
  elimTabActive: string;
  elimMobileShell: string;
  elimMobileCard: string;
  elimWinnerName: string;
  elimVsMuted: string;
  elimResult: string;
  /** Posiciones 3–4 en tabla de grupos (antes azul fijo). */
  posMidTier: string;
  matchCard: MatchCardLeagueUi;
}

const LEAGUE_PUBLIC_THEME: Record<LeagueNum, LeaguePublicTournamentTheme> = {
  1: {
    accentText: 'text-red-600 dark:text-red-400',
    accentTextWinner: 'text-red-600 dark:text-red-300',
    accentSolid: 'bg-red-600',
    accentSolidHover: 'hover:bg-red-700',
    accentBorderSoft: 'border-red-500/35',
    accentBgSoft: 'bg-red-50 dark:bg-red-950/30',
    heroCategoryPill: 'rounded-full bg-red-600/90 text-xs uppercase tracking-wider px-3 py-1',
    heroGradientNoCover: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)',
    heroCoverTintMidRgba: 'rgba(185,28,28,0.48)',
    bracketShell:
      'border border-red-200 bg-gradient-to-b from-red-50/95 to-white shadow-md dark:border-red-400/35 dark:bg-gradient-to-b dark:from-[#1c0a0c] dark:to-[#0c0608] dark:shadow-[0_0_40px_-14px_rgba(248,113,113,0.22)]',
    bracketEmpty:
      'border border-red-200 bg-gradient-to-b from-red-50 to-white dark:border-red-400/30 dark:bg-gradient-to-b dark:from-[#1c0a0c] dark:to-[#0c0608]',
    connectorStroke: 'text-red-500/55 dark:text-red-400/45',
    elimTabActive: 'border-white/90 bg-red-950 text-white shadow-md dark:bg-red-950',
    elimMobileShell:
      'flex flex-col gap-4 overflow-visible rounded-2xl border border-red-200 bg-gradient-to-b from-red-50/95 to-white p-4 shadow-md dark:border-red-400/35 dark:bg-gradient-to-b dark:from-[#1c0a0c] dark:to-[#0c0608] dark:shadow-[0_0_32px_-12px_rgba(248,113,113,0.22)]',
    elimMobileCard:
      'rounded-xl border border-red-200/90 bg-white p-4 shadow-sm dark:border-red-400/25 dark:bg-[#1a1012]/95',
    elimWinnerName: 'text-red-600 dark:text-red-300',
    elimVsMuted: 'text-[#616f89] dark:text-red-200/45',
    elimResult:
      'mt-2 border-t border-red-200/80 pt-2 text-sm font-bold text-red-600 dark:border-red-500/25 dark:text-red-400',
    posMidTier:
      'bg-red-500/20 dark:bg-red-500/30 text-red-700 dark:text-red-300 ring-2 ring-red-500/60 dark:ring-red-400/50',
    matchCard: {
      winnerRow:
        'border-l-2 border-red-500 bg-emerald-50 text-[#111318] dark:border-red-400 dark:bg-emerald-950/55 dark:text-white',
      loserRow:
        'border border-red-100 bg-red-50/80 text-[#111318] dark:border-red-500/10 dark:bg-[#151f35]/90 dark:text-red-100/90',
      avatarRing: 'bg-red-100 ring-1 ring-red-200 dark:bg-[#0f172a] dark:ring-red-500/30',
      avatarInitials: 'text-red-700/80 dark:text-red-400/80',
      avatarNoPhotoShell:
        'flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-red-100 text-xs font-semibold text-red-700 ring-1 ring-red-200 dark:bg-[#0f172a] dark:text-white dark:ring-red-500/30',
      loserName: 'text-[#374151] dark:text-red-100/85',
      rankingMuted: 'text-[#616f89] dark:text-red-300/70',
      checkWinner: 'text-red-600 dark:text-red-400',
      scorePlaceholder: 'text-[#616f89] dark:text-red-400/50',
      outerCard:
        'min-w-0 w-full overflow-hidden rounded-2xl border border-red-200 bg-white shadow-md dark:border-red-400/35 dark:bg-[#0c1428]/95 dark:shadow-[0_4px_24px_-8px_rgba(248,113,113,0.18)]',
    },
  },
  2: {
    accentText: 'text-orange-600 dark:text-orange-400',
    accentTextWinner: 'text-orange-600 dark:text-orange-300',
    accentSolid: 'bg-orange-500',
    accentSolidHover: 'hover:bg-orange-600',
    accentBorderSoft: 'border-orange-400/40',
    accentBgSoft: 'bg-orange-50 dark:bg-orange-950/30',
    heroCategoryPill: 'rounded-full bg-orange-500/90 text-xs uppercase tracking-wider px-3 py-1',
    heroGradientNoCover: 'linear-gradient(135deg, #9a3412 0%, #ea580c 100%)',
    heroCoverTintMidRgba: 'rgba(234,88,12,0.48)',
    bracketShell:
      'border border-orange-200 bg-gradient-to-b from-orange-50/95 to-white shadow-md dark:border-orange-400/35 dark:bg-gradient-to-b dark:from-[#1f1408] dark:to-[#0f0c08] dark:shadow-[0_0_40px_-14px_rgba(251,146,60,0.2)]',
    bracketEmpty:
      'border border-orange-200 bg-gradient-to-b from-orange-50 to-white dark:border-orange-400/30 dark:bg-gradient-to-b dark:from-[#1f1408] dark:to-[#0f0c08]',
    connectorStroke: 'text-orange-500/55 dark:text-orange-400/45',
    elimTabActive: 'border-white/90 bg-orange-950 text-white shadow-md dark:bg-orange-950',
    elimMobileShell:
      'flex flex-col gap-4 overflow-visible rounded-2xl border border-orange-200 bg-gradient-to-b from-orange-50/95 to-white p-4 shadow-md dark:border-orange-400/35 dark:bg-gradient-to-b dark:from-[#1f1408] dark:to-[#0f0c08] dark:shadow-[0_0_32px_-12px_rgba(251,146,60,0.2)]',
    elimMobileCard:
      'rounded-xl border border-orange-200/90 bg-white p-4 shadow-sm dark:border-orange-400/25 dark:bg-[#1a1510]/95',
    elimWinnerName: 'text-orange-600 dark:text-orange-300',
    elimVsMuted: 'text-[#616f89] dark:text-orange-200/45',
    elimResult:
      'mt-2 border-t border-orange-200/80 pt-2 text-sm font-bold text-orange-600 dark:border-orange-500/25 dark:text-orange-400',
    posMidTier:
      'bg-orange-500/20 dark:bg-orange-500/30 text-orange-800 dark:text-orange-300 ring-2 ring-orange-500/60 dark:ring-orange-400/50',
    matchCard: {
      winnerRow:
        'border-l-2 border-orange-500 bg-emerald-50 text-[#111318] dark:border-orange-400 dark:bg-emerald-950/55 dark:text-white',
      loserRow:
        'border border-orange-100 bg-orange-50/80 text-[#111318] dark:border-orange-500/10 dark:bg-[#151f35]/90 dark:text-orange-100/90',
      avatarRing: 'bg-orange-100 ring-1 ring-orange-200 dark:bg-[#0f172a] dark:ring-orange-500/30',
      avatarInitials: 'text-orange-700/80 dark:text-orange-400/80',
      avatarNoPhotoShell:
        'flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-100 text-xs font-semibold text-orange-700 ring-1 ring-orange-200 dark:bg-[#0f172a] dark:text-white dark:ring-orange-500/30',
      loserName: 'text-[#374151] dark:text-orange-100/85',
      rankingMuted: 'text-[#616f89] dark:text-orange-300/70',
      checkWinner: 'text-orange-600 dark:text-orange-400',
      scorePlaceholder: 'text-[#616f89] dark:text-orange-400/50',
      outerCard:
        'min-w-0 w-full overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-md dark:border-orange-400/35 dark:bg-[#0c1428]/95 dark:shadow-[0_4px_24px_-8px_rgba(251,146,60,0.18)]',
    },
  },
  3: {
    accentText: 'text-blue-600 dark:text-blue-400',
    accentTextWinner: 'text-blue-600 dark:text-blue-300',
    accentSolid: 'bg-blue-600',
    accentSolidHover: 'hover:bg-blue-700',
    accentBorderSoft: 'border-blue-500/35',
    accentBgSoft: 'bg-blue-50 dark:bg-blue-950/30',
    heroCategoryPill: 'rounded-full bg-blue-600/90 text-xs uppercase tracking-wider px-3 py-1',
    heroGradientNoCover: 'linear-gradient(135deg, #0d3b8a 0%, #2563eb 100%)',
    heroCoverTintMidRgba: 'rgba(13,59,138,0.45)',
    bracketShell:
      'border border-sky-200 bg-gradient-to-b from-sky-50/95 to-white shadow-md dark:border-sky-400/35 dark:bg-gradient-to-b dark:from-[#0c1629] dark:to-[#080f1d] dark:shadow-[0_0_40px_-14px_rgba(56,189,248,0.28)]',
    bracketEmpty:
      'border border-sky-200 bg-gradient-to-b from-sky-50 to-white dark:border-sky-400/30 dark:bg-gradient-to-b dark:from-[#0c1629] dark:to-[#080f1d]',
    connectorStroke: 'text-sky-500/55 dark:text-sky-400/45',
    elimTabActive: 'border-white/90 bg-[#132847] text-white shadow-md dark:bg-[#132847]',
    elimMobileShell:
      'flex flex-col gap-4 overflow-visible rounded-2xl border border-sky-200 bg-gradient-to-b from-sky-50/95 to-white p-4 shadow-md dark:border-sky-400/35 dark:bg-gradient-to-b dark:from-[#0c1629] dark:to-[#080f1d] dark:shadow-[0_0_32px_-12px_rgba(56,189,248,0.25)]',
    elimMobileCard:
      'rounded-xl border border-sky-200/90 bg-white p-4 shadow-sm dark:border-sky-400/25 dark:bg-[#111c33]/95',
    elimWinnerName: 'text-blue-600 dark:text-sky-300',
    elimVsMuted: 'text-[#616f89] dark:text-sky-200/50',
    elimResult:
      'mt-2 border-t border-sky-200/80 pt-2 text-sm font-bold text-blue-600 dark:border-sky-500/25 dark:text-sky-400',
    posMidTier:
      'bg-blue-500/20 dark:bg-blue-500/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/60 dark:ring-blue-400/50',
    matchCard: {
      winnerRow:
        'border-l-2 border-sky-500 bg-emerald-50 text-[#111318] dark:border-sky-400 dark:bg-emerald-950/55 dark:text-white',
      loserRow:
        'border border-sky-100 bg-sky-50/80 text-[#111318] dark:border-sky-500/10 dark:bg-[#151f35]/90 dark:text-sky-100/90',
      avatarRing: 'bg-sky-100 ring-1 ring-sky-200 dark:bg-[#0f172a] dark:ring-sky-500/30',
      avatarInitials: 'text-blue-700/80 dark:text-sky-400/80',
      avatarNoPhotoShell:
        'flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-100 text-xs font-semibold text-blue-700 ring-1 ring-sky-200 dark:bg-[#0f172a] dark:text-white dark:ring-sky-500/30',
      loserName: 'text-[#374151] dark:text-sky-100/85',
      rankingMuted: 'text-[#616f89] dark:text-sky-300/70',
      checkWinner: 'text-blue-600 dark:text-sky-400',
      scorePlaceholder: 'text-[#616f89] dark:text-sky-400/50',
      outerCard:
        'min-w-0 w-full overflow-hidden rounded-2xl border border-sky-200 bg-white shadow-md dark:border-sky-400/35 dark:bg-[#0c1428]/95 dark:shadow-[0_4px_24px_-8px_rgba(56,189,248,0.2)]',
    },
  },
  4: {
    accentText: 'text-green-600 dark:text-green-400',
    accentTextWinner: 'text-green-600 dark:text-green-300',
    accentSolid: 'bg-green-600',
    accentSolidHover: 'hover:bg-green-700',
    accentBorderSoft: 'border-green-500/35',
    accentBgSoft: 'bg-green-50 dark:bg-green-950/30',
    heroCategoryPill: 'rounded-full bg-green-600/90 text-xs uppercase tracking-wider px-3 py-1',
    heroGradientNoCover: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)',
    heroCoverTintMidRgba: 'rgba(22,163,74,0.48)',
    bracketShell:
      'border border-green-200 bg-gradient-to-b from-green-50/95 to-white shadow-md dark:border-green-400/35 dark:bg-gradient-to-b dark:from-[#0c1a10] dark:to-[#080f0d] dark:shadow-[0_0_40px_-14px_rgba(74,222,128,0.2)]',
    bracketEmpty:
      'border border-green-200 bg-gradient-to-b from-green-50 to-white dark:border-green-400/30 dark:bg-gradient-to-b dark:from-[#0c1a10] dark:to-[#080f0d]',
    connectorStroke: 'text-green-500/55 dark:text-green-400/45',
    elimTabActive: 'border-white/90 bg-green-950 text-white shadow-md dark:bg-green-950',
    elimMobileShell:
      'flex flex-col gap-4 overflow-visible rounded-2xl border border-green-200 bg-gradient-to-b from-green-50/95 to-white p-4 shadow-md dark:border-green-400/35 dark:bg-gradient-to-b dark:from-[#0c1a10] dark:to-[#080f0d] dark:shadow-[0_0_32px_-12px_rgba(74,222,128,0.2)]',
    elimMobileCard:
      'rounded-xl border border-green-200/90 bg-white p-4 shadow-sm dark:border-green-400/25 dark:bg-[#101a14]/95',
    elimWinnerName: 'text-green-600 dark:text-green-300',
    elimVsMuted: 'text-[#616f89] dark:text-green-200/45',
    elimResult:
      'mt-2 border-t border-green-200/80 pt-2 text-sm font-bold text-green-600 dark:border-green-500/25 dark:text-green-400',
    posMidTier:
      'bg-green-500/20 dark:bg-green-500/30 text-green-800 dark:text-green-300 ring-2 ring-green-500/60 dark:ring-green-400/50',
    matchCard: {
      winnerRow:
        'border-l-2 border-green-500 bg-emerald-50 text-[#111318] dark:border-green-400 dark:bg-emerald-950/55 dark:text-white',
      loserRow:
        'border border-green-100 bg-green-50/80 text-[#111318] dark:border-green-500/10 dark:bg-[#151f35]/90 dark:text-green-100/90',
      avatarRing: 'bg-green-100 ring-1 ring-green-200 dark:bg-[#0f172a] dark:ring-green-500/30',
      avatarInitials: 'text-green-700/80 dark:text-green-400/80',
      avatarNoPhotoShell:
        'flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-green-100 text-xs font-semibold text-green-700 ring-1 ring-green-200 dark:bg-[#0f172a] dark:text-white dark:ring-green-500/30',
      loserName: 'text-[#374151] dark:text-green-100/85',
      rankingMuted: 'text-[#616f89] dark:text-green-300/70',
      checkWinner: 'text-green-600 dark:text-green-400',
      scorePlaceholder: 'text-[#616f89] dark:text-green-400/50',
      outerCard:
        'min-w-0 w-full overflow-hidden rounded-2xl border border-green-200 bg-white shadow-md dark:border-green-400/35 dark:bg-[#0c1428]/95 dark:shadow-[0_4px_24px_-8px_rgba(74,222,128,0.18)]',
    },
  },
  5: {
    accentText: 'text-neutral-800 dark:text-neutral-200',
    accentTextWinner: 'text-neutral-800 dark:text-neutral-100',
    accentSolid: 'bg-neutral-800',
    accentSolidHover: 'hover:bg-neutral-900',
    accentBorderSoft: 'border-neutral-700/35',
    accentBgSoft: 'bg-neutral-100 dark:bg-neutral-900/40',
    heroCategoryPill: 'rounded-full bg-neutral-900/90 text-xs uppercase tracking-wider px-3 py-1',
    heroGradientNoCover: 'linear-gradient(135deg, #171717 0%, #404040 100%)',
    heroCoverTintMidRgba: 'rgba(38,38,38,0.58)',
    bracketShell:
      'border border-neutral-300 bg-gradient-to-b from-neutral-50/95 to-white shadow-md dark:border-neutral-600/50 dark:bg-gradient-to-b dark:from-[#141414] dark:to-[#0a0a0a] dark:shadow-[0_0_40px_-14px_rgba(163,163,163,0.18)]',
    bracketEmpty:
      'border border-neutral-300 bg-gradient-to-b from-neutral-50 to-white dark:border-neutral-600/45 dark:bg-gradient-to-b dark:from-[#141414] dark:to-[#0a0a0a]',
    connectorStroke: 'text-neutral-500/55 dark:text-neutral-400/45',
    elimTabActive: 'border-white/90 bg-neutral-950 text-white shadow-md dark:bg-neutral-950',
    elimMobileShell:
      'flex flex-col gap-4 overflow-visible rounded-2xl border border-neutral-300 bg-gradient-to-b from-neutral-50/95 to-white p-4 shadow-md dark:border-neutral-600/50 dark:bg-gradient-to-b dark:from-[#141414] dark:to-[#0a0a0a] dark:shadow-[0_0_32px_-12px_rgba(163,163,163,0.16)]',
    elimMobileCard:
      'rounded-xl border border-neutral-200/90 bg-white p-4 shadow-sm dark:border-neutral-600/35 dark:bg-[#141414]/95',
    elimWinnerName: 'text-neutral-800 dark:text-neutral-100',
    elimVsMuted: 'text-[#616f89] dark:text-neutral-400/55',
    elimResult:
      'mt-2 border-t border-neutral-200/80 pt-2 text-sm font-bold text-neutral-800 dark:border-neutral-600/35 dark:text-neutral-200',
    posMidTier:
      'bg-neutral-500/15 dark:bg-neutral-500/25 text-neutral-800 dark:text-neutral-200 ring-2 ring-neutral-500/45 dark:ring-neutral-400/40',
    matchCard: {
      winnerRow:
        'border-l-2 border-neutral-700 bg-emerald-50 text-[#111318] dark:border-neutral-500 dark:bg-emerald-950/55 dark:text-white',
      loserRow:
        'border border-neutral-200 bg-neutral-50/90 text-[#111318] dark:border-neutral-600/40 dark:bg-[#151f35]/90 dark:text-neutral-100/90',
      avatarRing: 'bg-neutral-200 ring-1 ring-neutral-300 dark:bg-[#0f172a] dark:ring-neutral-500/35',
      avatarInitials: 'text-neutral-700/80 dark:text-neutral-300/80',
      avatarNoPhotoShell:
        'flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-200 text-xs font-semibold text-neutral-800 ring-1 ring-neutral-300 dark:bg-[#0f172a] dark:text-white dark:ring-neutral-500/35',
      loserName: 'text-[#374151] dark:text-neutral-100/85',
      rankingMuted: 'text-[#616f89] dark:text-neutral-400/75',
      checkWinner: 'text-neutral-800 dark:text-neutral-200',
      scorePlaceholder: 'text-[#616f89] dark:text-neutral-400/55',
      outerCard:
        'min-w-0 w-full overflow-hidden rounded-2xl border border-neutral-300 bg-white shadow-md dark:border-neutral-600/45 dark:bg-[#0c1428]/95 dark:shadow-[0_4px_24px_-8px_rgba(163,163,163,0.14)]',
    },
  },
  6: {
    accentText: 'text-gray-600 dark:text-gray-300',
    accentTextWinner: 'text-gray-700 dark:text-gray-200',
    accentSolid: 'bg-gray-600',
    accentSolidHover: 'hover:bg-gray-700',
    accentBorderSoft: 'border-gray-500/35',
    accentBgSoft: 'bg-gray-100 dark:bg-gray-800/45',
    heroCategoryPill: 'rounded-full bg-gray-600/90 text-xs uppercase tracking-wider px-3 py-1',
    heroGradientNoCover: 'linear-gradient(135deg, #4b5563 0%, #9ca3af 100%)',
    heroCoverTintMidRgba: 'rgba(107,114,128,0.5)',
    bracketShell:
      'border border-gray-300 bg-gradient-to-b from-gray-50/95 to-white shadow-md dark:border-gray-500/40 dark:bg-gradient-to-b dark:from-[#13161c] dark:to-[#0a0c10] dark:shadow-[0_0_40px_-14px_rgba(156,163,175,0.18)]',
    bracketEmpty:
      'border border-gray-300 bg-gradient-to-b from-gray-50 to-white dark:border-gray-500/38 dark:bg-gradient-to-b dark:from-[#13161c] dark:to-[#0a0c10]',
    connectorStroke: 'text-gray-500/55 dark:text-gray-400/45',
    elimTabActive: 'border-white/90 bg-gray-900 text-white shadow-md dark:bg-gray-900',
    elimMobileShell:
      'flex flex-col gap-4 overflow-visible rounded-2xl border border-gray-300 bg-gradient-to-b from-gray-50/95 to-white p-4 shadow-md dark:border-gray-500/40 dark:bg-gradient-to-b dark:from-[#13161c] dark:to-[#0a0c10] dark:shadow-[0_0_32px_-12px_rgba(156,163,175,0.16)]',
    elimMobileCard:
      'rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm dark:border-gray-500/28 dark:bg-[#141822]/95',
    elimWinnerName: 'text-gray-700 dark:text-gray-200',
    elimVsMuted: 'text-[#616f89] dark:text-gray-400/55',
    elimResult:
      'mt-2 border-t border-gray-200/80 pt-2 text-sm font-bold text-gray-700 dark:border-gray-500/28 dark:text-gray-300',
    posMidTier:
      'bg-gray-500/20 dark:bg-gray-500/28 text-gray-800 dark:text-gray-300 ring-2 ring-gray-500/55 dark:ring-gray-400/45',
    matchCard: {
      winnerRow:
        'border-l-2 border-gray-500 bg-emerald-50 text-[#111318] dark:border-gray-400 dark:bg-emerald-950/55 dark:text-white',
      loserRow:
        'border border-gray-200 bg-gray-50/85 text-[#111318] dark:border-gray-600/35 dark:bg-[#151f35]/90 dark:text-gray-100/90',
      avatarRing: 'bg-gray-200 ring-1 ring-gray-300 dark:bg-[#0f172a] dark:ring-gray-500/35',
      avatarInitials: 'text-gray-700/80 dark:text-gray-400/80',
      avatarNoPhotoShell:
        'flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-xs font-semibold text-gray-700 ring-1 ring-gray-300 dark:bg-[#0f172a] dark:text-white dark:ring-gray-500/35',
      loserName: 'text-[#374151] dark:text-gray-100/85',
      rankingMuted: 'text-[#616f89] dark:text-gray-400/75',
      checkWinner: 'text-gray-700 dark:text-gray-300',
      scorePlaceholder: 'text-[#616f89] dark:text-gray-400/55',
      outerCard:
        'min-w-0 w-full overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-md dark:border-gray-500/38 dark:bg-[#0c1428]/95 dark:shadow-[0_4px_24px_-8px_rgba(156,163,175,0.16)]',
    },
  },
};

/** Colores de acento para detalle público de torneo y cuadro KO (por número de liga). */
export function getLeaguePublicTournamentTheme(
  league: LeagueNum | number | string | undefined | null,
): LeaguePublicTournamentTheme {
  const n = typeof league === 'string' ? Number.parseInt(league, 10) : Number(league);
  const key = (n === 1 || n === 2 || n === 3 || n === 4 || n === 5 || n === 6 ? n : 1) as LeagueNum;
  return LEAGUE_PUBLIC_THEME[key];
}

/**
 * Cuadro de eliminación en **admin**: grises y blancos (sin acento por liga ni sky/azul).
 * Móvil y escritorio.
 */
export function getAdminEliminationBracketTheme(): LeaguePublicTournamentTheme {
  const gray6 = LEAGUE_PUBLIC_THEME[6];
  return {
    ...gray6,
    bracketShell:
      'border border-gray-200/90 bg-gradient-to-b from-white via-gray-50/80 to-gray-100/50 shadow-sm dark:border-gray-600 dark:bg-gradient-to-b dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/95',
    bracketEmpty:
      'border border-gray-200/90 bg-gradient-to-b from-white to-gray-50 dark:border-gray-600 dark:bg-gradient-to-b dark:from-gray-900 dark:to-gray-800/90',
    connectorStroke: 'text-gray-400/80 dark:text-gray-500/70',
    matchCard: {
      winnerRow:
        'border-l-2 border-gray-400 bg-white text-[#111318] dark:border-gray-500 dark:bg-white/10 dark:text-white',
      loserRow:
        'border border-gray-200 bg-gray-50 text-[#111318] dark:border-gray-600 dark:bg-gray-800/70 dark:text-gray-200',
      avatarRing: 'bg-gray-100 ring-1 ring-gray-200 dark:bg-gray-700 dark:ring-gray-600',
      avatarInitials: 'text-[#616f89] dark:text-gray-300',
      avatarNoPhotoShell:
        'flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-xs font-semibold text-[#616f89] ring-1 ring-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:ring-gray-600',
      loserName: 'text-[#374151] dark:text-gray-300',
      rankingMuted: 'text-[#616f89] dark:text-gray-500',
      checkWinner: 'text-gray-600 dark:text-gray-300',
      scorePlaceholder: 'text-[#616f89] dark:text-gray-500',
      outerCard:
        'min-w-0 w-full overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-900/85 dark:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.35)]',
    },
  };
}

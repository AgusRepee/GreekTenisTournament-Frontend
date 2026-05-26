import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ChangeEvent } from 'react';
import { calculatePlayerStats } from '../src/lib/tennis/calculatePlayerStats';
import { getDataSourceMode } from '../src/lib/data/tournamentRepository';
import {
  buildGlobalRankingRowsFromLeagueMap,
  buildGlobalRankingRowsFromResults,
  derivePlayerProfileRankings,
  derivePlayerProfileRankingsFromLeagueMap,
  getTournamentHistoryForPlayerFromMatches,
  getTournamentParticipationHistoryForPlayer,
  longestWinStreakForPlayer,
  mapApiProfileRecentMatches,
  mapApiTournamentParticipation,
  mergeApiTournamentHistory,
  recentMatchesForProfile,
} from '../src/lib/tennis/derivedTennisData';
import { useTennisLiveData } from '../src/lib/tennis/useTennisLiveData';
import {
  EMPTY_PUBLIC_PLAYER_PROFILE,
  ensurePublicPlayerProfileLoaded,
  getPublicPlayerProfileState,
  subscribePublicPlayerProfiles,
} from '../src/data/services/api/publicPlayerProfileStore';
import {
  buildStubPlayerForProfileId,
  resolvePlayerForPublicRanking,
  withCanonicalPlayerId,
} from '../src/lib/tennis/rankingPlayerResolve';
import { calculateTournamentPoints } from '../src/lib/tennis/tournamentRanking';
import {
  Trophy,
  TrendingDown,
  Percent,
  Activity,
  TrendingUp,
  ArrowDown,
  Layers,
  Target,
  ChevronLeft,
  ChevronRight,
  User,
  Globe,
  Hand,
  Calendar,
  Ruler,
  Award,
  Hash,
  History,
  Sparkles,
  Pencil,
  Trash2,
  Save,
  X,
} from 'lucide-react';
import type { ClubDataSnapshot } from '../src/data/types';
import type { MatchInput } from '../src/types/tennisResults';
import type { CalculatedRankingRow } from '../src/lib/tennis/tournamentRanking';
import type { Player, Match, RankingRow, LeagueNum, Tournament, CategoryKey } from '../src/lib/mockData';
import {
  getPlayerById,
  formatTournamentDate,
  getPlayerPromotionHistory,
  categoryToLeague,
  getDefaultProfilePlayerId,
  CATEGORIES,
  isPlayerProfileListingVisible,
} from '../src/lib/mockData';
import { readIsAdmin } from '../src/lib/adminAuth';
import { getData, saveData, PERSISTENCE_KEYS } from '../src/lib/localPersistence';
import { refreshClubDataFromStorage } from '../src/lib/clubDataStore';
import { getLeagueColor } from '../src/lib/leagueColors';
import { LeagueBadge } from '../components/LeagueBadge';
import { resolvePlayerAvatarFallback, useSiteSettings } from '../src/lib/siteSettings';
import { uiFormatPointsCell, uiFormatRankHash } from '../src/lib/playerUiFormat';
import {
  ALVAREZ_DEMO_ACHIEVEMENTS,
  ALVAREZ_DEMO_CAREER_PATCH,
  ALVAREZ_DEMO_FINALS_CAREER,
  ALVAREZ_DEMO_FINALS_SEASON,
  ALVAREZ_DEMO_RANKINGS,
  ALVAREZ_DEMO_RECENT_MATCHES,
  ALVAREZ_DEMO_SEASON_PATCH,
  ALVAREZ_DEMO_SETS_WON_PCT,
  ALVAREZ_DEMO_TAG,
  ALVAREZ_DEMO_TOURNAMENT_ROWS,
  ALVAREZ_DEMO_WIN_PCT,
  ALVAREZ_DEMO_POINTS_CAREER,
  ALVAREZ_DEMO_POINTS_SEASON,
  isAlvarezDemoProfile,
  mergeAlvarezDemoPlayerFields,
} from '../src/lib/demo/alvarezProfileDemo';

function getProfileImageUrl(filename: string): string {
  try {
    return new URL(`../img/${filename}`, import.meta.url).href;
  } catch {
    return '';
  }
}

const FLAG_IMAGE_BY_NATIONALITY: Record<string, string> = {
  Argentina: 'arg.webp',
};
const FALLBACK_FLAG_EMOJI: Record<string, string> = {
  Uruguay: '🇺🇾',
  Chile: '🇨🇱',
  Paraguay: '🇵🇾',
};

function getNationalityFlag(nationality?: string): { image?: string; emoji?: string } {
  if (!nationality) return {};
  const image = FLAG_IMAGE_BY_NATIONALITY[nationality];
  if (image) return { image };
  return { emoji: FALLBACK_FLAG_EMOJI[nationality] ?? '' };
}

function splitDisplayName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: '', last: parts[0]! };
  const last = parts[parts.length - 1]!;
  const first = parts.slice(0, -1).join(' ');
  return { first, last };
}

function resolveProfileImageSrc(raw: string | undefined): string {
  if (!raw?.trim()) return '';
  const t = raw.trim();
  if (t.startsWith('data:') || /^https?:\/\//i.test(t)) return t;
  return getProfileImageUrl(t);
}

function readPersistedPlayerOverrides(): Player[] {
  const raw = getData<unknown>(PERSISTENCE_KEYS.jugadores);
  return Array.isArray(raw) ? (raw as Player[]) : [];
}

function upsertPersistedPlayer(row: Player): void {
  const list = readPersistedPlayerOverrides();
  const next = [...list.filter((p) => p.id !== row.id), row];
  saveData(PERSISTENCE_KEYS.jugadores, next);
  refreshClubDataFromStorage();
}

function removePersistedPlayer(id: string): boolean {
  const list = readPersistedPlayerOverrides();
  if (!list.some((p) => p.id === id)) return false;
  saveData(
    PERSISTENCE_KEYS.jugadores,
    list.filter((p) => p.id !== id),
  );
  refreshClubDataFromStorage();
  return true;
}

export type ProfileNavGateRef = React.MutableRefObject<{
  tryNavigate: (targetScreen: string, proceed: () => void) => void;
}>;

type ProfileEditFields = {
  firstName: string;
  lastName: string;
  category: CategoryKey;
  nationality: string;
  birthDate: string;
  heightCmInput: string;
  playingHand: 'Derecha' | 'Zurdo' | '';
  rosterActive: boolean;
  profileBio: string;
  profileVisibility: 'visible' | 'hidden';
  profileImage: string | undefined;
};

function playerToEditFields(p: Player): ProfileEditFields {
  const { first, last } = splitDisplayName(p.name);
  return {
    firstName: first,
    lastName: last || p.name.trim(),
    category: p.category,
    nationality: p.nationality?.trim() ?? '',
    birthDate: p.birthDate?.slice(0, 10) ?? '',
    heightCmInput: p.heightCm != null && p.heightCm > 0 ? String(Math.round(p.heightCm)) : '',
    playingHand: p.playingHand ?? '',
    rosterActive: p.rosterActive !== false,
    profileBio: p.profileBio?.trim() ?? '',
    profileVisibility: p.profileVisibility === 'hidden' ? 'hidden' : 'visible',
    profileImage: p.profileImage,
  };
}

function serializeEditFields(f: ProfileEditFields): string {
  return JSON.stringify(f);
}

function parseHeightCmInput(input: string): { cm?: number; error?: string } {
  const t = input.trim().replace(',', '.');
  if (!t) return {};
  if (/^\d+$/.test(t)) {
    const n = Number.parseInt(t, 10);
    if (n < 100 || n > 250) return { error: 'La altura debe estar entre 100 y 250 cm.' };
    return { cm: n };
  }
  const f = Number.parseFloat(t);
  if (!Number.isFinite(f)) return { error: 'Formato inválido.' };
  if (f > 0 && f < 3) {
    const cm = Math.round(f * 100);
    if (cm >= 100 && cm <= 250) return { cm };
  }
  return { error: 'Usá centímetros (ej. 185) o metros (ej. 1,85).' };
}

function validateProfileEditFields(f: ProfileEditFields): Record<string, string> {
  const err: Record<string, string> = {};
  if (!f.firstName.trim()) err.firstName = 'El nombre es obligatorio.';
  if (!f.lastName.trim()) err.lastName = 'El apellido es obligatorio.';
  if (!f.category) err.category = 'Elegí una liga / categoría.';
  const h = parseHeightCmInput(f.heightCmInput);
  if (h.error) err.heightCmInput = h.error;
  if (f.birthDate.trim()) {
    const d = new Date(f.birthDate);
    if (Number.isNaN(d.getTime())) err.birthDate = 'La fecha no es válida.';
    else {
      const y = d.getFullYear();
      if (y < 1920 || y > new Date().getFullYear()) err.birthDate = 'Revisá el año de nacimiento.';
    }
  }
  return err;
}

function buildPlayerFromEditForm(base: Player, f: ProfileEditFields): Player {
  const name = `${f.firstName.trim()} ${f.lastName.trim()}`.trim();
  const h = parseHeightCmInput(f.heightCmInput);
  const next: Player = {
    ...base,
    name,
    category: f.category,
    nationality: f.nationality.trim() || 'Argentina',
    birthDate: f.birthDate.trim() || undefined,
    heightCm: h.cm,
    playingHand: f.playingHand === 'Derecha' || f.playingHand === 'Zurdo' ? f.playingHand : undefined,
    rosterActive: f.rosterActive,
    profileBio: f.profileBio.trim() || undefined,
    profileVisibility: f.profileVisibility,
    profileImage: f.profileImage?.trim() || undefined,
  };
  return next;
}

/** Partidos con resultado en un año calendario (fecha del partido). */
function filterResultsByCalendarYear(results: MatchInput[], year: number): MatchInput[] {
  return results.filter((m) => {
    if (m.status === 'pending' || m.status === 'suspended') return false;
    const raw = m.date?.trim();
    if (!raw) return false;
    const y = new Date(raw).getFullYear();
    return Number.isFinite(y) && y === year;
  });
}

function countTitlesInSeasonYear(
  playerId: string,
  tournaments: Tournament[],
  ctx: { resultMatches: MatchInput[]; knockoutMatches: Match[]; players: Player[] },
  year: number,
): number {
  let n = 0;
  for (const t of tournaments) {
    if (t.status !== 'finished') continue;
    const ey = new Date(t.endDate).getFullYear();
    if (!Number.isFinite(ey) || ey !== year) continue;
    if (calculateTournamentPoints(playerId, t, ctx).phase === 'champion') n += 1;
  }
  return n;
}

function finalsReachedInSeasonYear(
  playerId: string,
  tournaments: Tournament[],
  ctx: { resultMatches: MatchInput[]; knockoutMatches: Match[]; players: Player[] },
  year: number,
): { reached: number; won: number } {
  let reached = 0;
  let won = 0;
  for (const t of tournaments) {
    if (t.status !== 'finished') continue;
    const ey = new Date(t.endDate).getFullYear();
    if (!Number.isFinite(ey) || ey !== year) continue;
    const { phase } = calculateTournamentPoints(playerId, t, ctx);
    if (phase === 'champion') {
      reached += 1;
      won += 1;
    } else if (phase === 'finalist') {
      reached += 1;
    }
  }
  return { reached, won };
}

function StatSpotlight({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  label: string;
  value: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/[0.06] bg-black/[0.02] px-4 py-5 shadow-sm backdrop-blur-[2px] dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none">
      <div
        className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-sky-500/[0.035] blur-2xl dark:bg-sky-400/[0.05]"
        aria-hidden
      />
      <Icon className="relative mb-3 size-5 text-sky-500 dark:text-sky-300" aria-hidden />
      <p className="relative text-[10px] font-bold uppercase tracking-[0.14em] text-[#616f89] dark:text-gray-400">
        {label}
      </p>
      <p className="relative mt-1.5 text-2xl font-black tabular-nums leading-none tracking-tight text-[#111318] dark:text-white sm:text-3xl">
        {value}
      </p>
    </div>
  );
}

function CircularGauge({
  pct,
  label,
  sub,
  accentClass = 'text-sky-400',
}: {
  pct: number;
  label: string;
  sub: string;
  accentClass?: string;
}) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  const offset = c - (clamped / 100) * c;
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="relative size-[7.5rem] shrink-0">
        <svg className="size-[7.5rem] -rotate-90 text-[#111318]/8 dark:text-white/10" viewBox="0 0 80 80" aria-hidden>
          <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="7" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke="currentColor"
            className={accentClass}
            strokeWidth="7"
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tabular-nums text-[#111318] dark:text-white">{clamped}%</span>
        </div>
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#616f89] dark:text-gray-400">{label}</p>
      <p className="max-w-[10rem] text-[11px] leading-snug text-[#616f89] dark:text-gray-500">{sub}</p>
    </div>
  );
}

interface ProfileScreenProps {
  selectedPlayerId?: string | null;
  setScreen?: (screen: string) => void;
  setSelectedPlayerId?: (id: string | null) => void;
  profileNavGateRef?: ProfileNavGateRef;
}

function ProfileUnsavedDialog({
  open,
  onCancel,
  onDiscard,
  onSave,
}: {
  open: boolean;
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void | Promise<void>;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="profile-unsaved-title">
      <div className="max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-xl dark:border-white/15 dark:bg-[#111318]">
        <h2 id="profile-unsaved-title" className="text-lg font-bold text-[#111318] dark:text-white">
          Tenés cambios sin guardar
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#616f89] dark:text-gray-400">
          Si salís ahora, las modificaciones del jugador pueden perderse.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-black/10 px-4 py-2.5 text-sm font-semibold text-[#111318] hover:bg-black/[0.04] dark:border-white/15 dark:text-white dark:hover:bg-white/10"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-lg border border-red-500/40 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
          >
            Descartar cambios
          </button>
          <button
            type="button"
            onClick={() => void onSave()}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:brightness-110"
          >
            <Save className="size-4 shrink-0" aria-hidden />
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

type DisplayPlayer = Player & { position: number; initial: string };

interface ProfileScreenInnerProps {
  displayPlayer: DisplayPlayer;
  /** Id de la URL / API (`p-l2-…`); no el alias local `p-doc-*` del catálogo seed. */
  canonicalPlayerId: string;
  setSelectedPlayerId?: (id: string | null) => void;
  setScreen?: (screen: string) => void;
  profileNavGateRef?: ProfileNavGateRef;
  canEditProfile: boolean;
  club: ClubDataSnapshot;
  results: MatchInput[];
  knockoutMerged: Match[];
  players: Player[];
  globalRankingRows: RankingRow[];
  rankingsByLeague: Map<LeagueNum, CalculatedRankingRow[]>;
}

function ProfileScreenInner({
  displayPlayer,
  canonicalPlayerId,
  setSelectedPlayerId,
  setScreen,
  profileNavGateRef,
  canEditProfile,
  club,
  results,
  knockoutMerged,
  players,
  globalRankingRows,
  rankingsByLeague,
}: ProfileScreenInnerProps) {
  const site = useSiteSettings();
  const defaultAvatarUrl = resolvePlayerAvatarFallback(site.branding);
  const alvarezDemo = isAlvarezDemoProfile(displayPlayer.name);
  const apiMode = getDataSourceMode() === 'api';
  const profilePlayerId = canonicalPlayerId.trim() || displayPlayer.id;

  useEffect(() => {
    if (apiMode && !alvarezDemo) ensurePublicPlayerProfileLoaded(profilePlayerId);
  }, [apiMode, alvarezDemo, profilePlayerId]);

  const apiProfileEntry = useSyncExternalStore(
    subscribePublicPlayerProfiles,
    () => getPublicPlayerProfileState(profilePlayerId),
    () => EMPTY_PUBLIC_PLAYER_PROFILE,
  );
  const apiProfile = apiMode && !alvarezDemo ? apiProfileEntry.data : null;

  const apiCareerStats = useMemo((): Record<string, unknown> | null => {
    if (!apiMode || alvarezDemo || !apiProfile || typeof apiProfile.careerStats !== 'object' || apiProfile.careerStats === null) {
      return null;
    }
    return apiProfile.careerStats as Record<string, unknown>;
  }, [apiMode, alvarezDemo, apiProfile]);

  const basePlayer = useMemo((): Player => {
    const raw = players.find((p) => p.id === displayPlayer.id);
    return raw ?? (displayPlayer as unknown as Player);
  }, [players, displayPlayer]);
  const [statsMode, setStatsMode] = useState<'actual' | 'carrera'>('actual');
  const [viewMode, setViewMode] = useState<'view' | 'edit'>('view');
  const [editFields, setEditFields] = useState<ProfileEditFields>(() => playerToEditFields(basePlayer));
  const baselineSerializedRef = useRef(serializeEditFields(playerToEditFields(basePlayer)));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [editBanner, setEditBanner] = useState<string | null>(null);
  const [navGuard, setNavGuard] = useState<{ onProceed: () => void } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const photoInputId = useId();

  const isDirty =
    viewMode === 'edit' && serializeEditFields(editFields) !== baselineSerializedRef.current;

  useEffect(() => {
    if (viewMode !== 'view') return;
    const next = playerToEditFields(basePlayer);
    setEditFields(next);
    baselineSerializedRef.current = serializeEditFields(next);
  }, [basePlayer, viewMode]);

  const openNavGuard = useCallback((onProceed: () => void) => {
    if (viewMode !== 'edit' || !isDirty) {
      onProceed();
      return;
    }
    setNavGuard({ onProceed });
  }, [viewMode, isDirty]);

  useLayoutEffect(() => {
    const ref = profileNavGateRef;
    if (!ref) return;
    ref.current = {
      tryNavigate: (_target, proceed) => {
        if (viewMode !== 'edit' || serializeEditFields(editFields) === baselineSerializedRef.current) {
          proceed();
          return;
        }
        setNavGuard({ onProceed: proceed });
      },
    };
    return () => {
      ref.current = { tryNavigate: (_t, p) => p() };
    };
  }, [profileNavGateRef, viewMode, editFields]);

  useEffect(() => {
    if (viewMode !== 'edit' || !isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [viewMode, isDirty]);

  const enterEdit = () => {
    setEditBanner(null);
    setFieldErrors({});
    const next = playerToEditFields(basePlayer);
    setEditFields(next);
    baselineSerializedRef.current = serializeEditFields(next);
    setViewMode('edit');
  };

  const cancelEdit = () => {
    const next = playerToEditFields(basePlayer);
    setEditFields(next);
    baselineSerializedRef.current = serializeEditFields(next);
    setFieldErrors({});
    setEditBanner(null);
    setViewMode('view');
  };

  const saveEdit = useCallback((): boolean => {
    const errs = validateProfileEditFields(editFields);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setEditBanner('Revisá los campos marcados.');
      return false;
    }
    const row = buildPlayerFromEditForm(basePlayer, editFields);
    upsertPersistedPlayer(row);
    setViewMode('view');
    setEditBanner(null);
    baselineSerializedRef.current = serializeEditFields(playerToEditFields(row));
    return true;
  }, [basePlayer, editFields]);

  const goPlayer = (id: string | null) => {
    if (!id || !setSelectedPlayerId) return;
    openNavGuard(() => {
      setSelectedPlayerId(id);
      setViewMode('view');
    });
  };

  const inputClass =
    'w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-[#111318] outline-none focus:ring-2 focus:ring-primary/40 dark:border-white/15 dark:bg-[#111318] dark:text-white';

  const closeNavGuard = () => setNavGuard(null);
  const navGuardDiscard = () => {
    cancelEdit();
    navGuard?.onProceed();
    setNavGuard(null);
  };
  const navGuardSave = () => {
    if (!saveEdit()) return;
    navGuard?.onProceed();
    setNavGuard(null);
  };

  const confirmDeletePlayer = () => {
    if (!removePersistedPlayer(displayPlayer.id)) {
      setEditBanner('Solo se pueden eliminar jugadores agregados en este navegador (no el catálogo base del club).');
      setDeleteConfirmOpen(false);
      return;
    }
    setDeleteConfirmOpen(false);
    setViewMode('view');
    setScreen?.('players');
    setSelectedPlayerId?.(null);
  };

  const onPickPhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file?.type.startsWith('image/')) {
      setEditBanner('Elegí un archivo de imagen.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const r = typeof reader.result === 'string' ? reader.result : '';
      if (r) setEditFields((f) => ({ ...f, profileImage: r }));
    };
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => setEditFields((f) => ({ ...f, profileImage: undefined }));

  const derivedStats = useMemo(() => {
    if (apiCareerStats) {
      const L = categoryToLeague(displayPlayer.category);
      const curLeague =
        typeof apiCareerStats.currentLeague === 'number' && apiCareerStats.currentLeague >= 1 && apiCareerStats.currentLeague <= 6
          ? (apiCareerStats.currentLeague as (typeof L))
          : L;
      const best = apiCareerStats.bestHistoricalRanking;
      return {
        playerId: displayPlayer.id,
        playerName: displayPlayer.name,
        totalMatchesPlayed: Number(apiCareerStats.totalMatchesPlayed ?? 0),
        totalWins: Number(apiCareerStats.totalWins ?? 0),
        totalLosses: Number(apiCareerStats.totalLosses ?? 0),
        setsWon: Number(apiCareerStats.setsWon ?? 0),
        setsLost: Number(apiCareerStats.setsLost ?? 0),
        setDifference: Number(apiCareerStats.setDifference ?? 0),
        tournamentsPlayed: Number(apiCareerStats.tournamentsPlayed ?? 0),
        tournamentsWon: Number(apiCareerStats.tournamentsWon ?? 0),
        bestHistoricalRanking: typeof best === 'number' && Number.isFinite(best) ? best : null,
        currentLeague: curLeague,
        winRate: Number(apiCareerStats.winRate ?? 0),
      };
    }
    const real = calculatePlayerStats(
      displayPlayer.id,
      results,
      club.tournaments,
      players,
      knockoutMerged,
    );
    if (!alvarezDemo) return real;
    return {
      ...real,
      ...ALVAREZ_DEMO_CAREER_PATCH,
      playerId: displayPlayer.id,
      playerName: displayPlayer.name,
    };
  }, [
    apiCareerStats,
    alvarezDemo,
    displayPlayer.id,
    displayPlayer.name,
    displayPlayer.category,
    results,
    club.tournaments,
    players,
    knockoutMerged,
  ]);

  const statsPending = !alvarezDemo && derivedStats.totalMatchesPlayed === 0;

  const rankingRowFromApi = useMemo(() => {
    for (const rows of rankingsByLeague.values()) {
      const cr = rows.find((r) => r.playerId === profilePlayerId);
      if (cr) return cr;
    }
    return undefined;
  }, [rankingsByLeague, profilePlayerId]);

  const leaguePointsDisplay = useMemo(() => {
    if (alvarezDemo) return ALVAREZ_DEMO_POINTS_CAREER;
    if (apiMode && !alvarezDemo && apiProfile) {
      const agg = apiProfile.aggregate;
      if (agg && typeof agg === 'object' && agg !== null) {
        const fromAgg = Number((agg as Record<string, unknown>).primaryLeaguePoints);
        if (Number.isFinite(fromAgg) && fromAgg > 0) return fromAgg;
      }
      const pr = apiProfile.primaryRanking;
      if (pr && typeof pr === 'object' && pr !== null) {
        const fromPrimary = Number((pr as Record<string, unknown>).points);
        if (Number.isFinite(fromPrimary) && fromPrimary > 0) return fromPrimary;
      }
    }
    if (rankingRowFromApi && rankingRowFromApi.points > 0) return rankingRowFromApi.points;
    return globalRankingRows.find((r) => r.playerId === profilePlayerId)?.points ?? 0;
  }, [alvarezDemo, apiMode, apiProfile, rankingRowFromApi, globalRankingRows, profilePlayerId]);

  const age = displayPlayer.birthDate
    ? new Date().getFullYear() - new Date(displayPlayer.birthDate).getFullYear()
    : null;
  const setsTotal = derivedStats.setsWon + derivedStats.setsLost;
  const winPctDisplay = alvarezDemo
    ? ALVAREZ_DEMO_WIN_PCT
    : !statsPending && derivedStats.totalMatchesPlayed > 0
      ? Math.round(derivedStats.winRate * 100)
      : 0;
  const setsWonPctDisplay = alvarezDemo
    ? ALVAREZ_DEMO_SETS_WON_PCT
    : !statsPending && setsTotal > 0
      ? Math.round((derivedStats.setsWon / setsTotal) * 100)
      : 0;

  const tournamentHistory = useMemo(() => {
    if (apiMode && apiProfile?.tournamentHistory) {
      return mergeApiTournamentHistory(apiProfile.tournamentHistory, club.tournaments);
    }
    return getTournamentHistoryForPlayerFromMatches(
      displayPlayer.id,
      club.tournaments,
      results,
      knockoutMerged,
      players,
    );
  }, [
    apiMode,
    apiProfile?.tournamentHistory,
    displayPlayer.id,
    club.tournaments,
    results,
    knockoutMerged,
    players,
  ]);

  const tournamentParticipation = useMemo(() => {
    if (alvarezDemo) return ALVAREZ_DEMO_TOURNAMENT_ROWS;
    if (apiMode && !alvarezDemo && apiProfile && Array.isArray(apiProfile.tournamentParticipation)) {
      return mapApiTournamentParticipation(apiProfile.tournamentParticipation);
    }
    return getTournamentParticipationHistoryForPlayer(
      displayPlayer.id,
      club.tournaments,
      results,
      knockoutMerged,
      players,
    );
  }, [alvarezDemo, apiMode, apiProfile, displayPlayer.id, club.tournaments, results, knockoutMerged, players]);

  const promotionHistory = useMemo(() => getPlayerPromotionHistory(displayPlayer.id), [displayPlayer.id]);
  const leagueNum = derivedStats.currentLeague;
  const profileRankings = useMemo(() => {
    if (alvarezDemo) return ALVAREZ_DEMO_RANKINGS;
    if (apiMode && !alvarezDemo && apiProfile && typeof apiProfile.profileRankings === 'object' && apiProfile.profileRankings !== null) {
      const pr = apiProfile.profileRankings as Record<string, unknown>;
      const gl = pr.league;
      const leagueNum =
        typeof gl === 'number' && gl >= 1 && gl <= 6 ? (gl as LeagueNum) : categoryToLeague(displayPlayer.category);
      return {
        globalPosition: typeof pr.globalPosition === 'number' ? pr.globalPosition : null,
        globalTotal: typeof pr.globalTotal === 'number' ? pr.globalTotal : players.length,
        league: leagueNum,
        leaguePosition: typeof pr.leaguePosition === 'number' ? pr.leaguePosition : null,
        leagueTotal: typeof pr.leagueTotal === 'number' ? pr.leagueTotal : 1,
      };
    }
    if (apiMode && !alvarezDemo && apiProfile?.primaryRanking && typeof apiProfile.primaryRanking === 'object') {
      const pr = apiProfile.primaryRanking as Record<string, unknown>;
      const leagueNum =
        typeof pr.league === 'number' && pr.league >= 1 && pr.league <= 6
          ? (pr.league as LeagueNum)
          : categoryToLeague(displayPlayer.category);
      const rank = Number(pr.rank);
      return {
        globalPosition: null,
        globalTotal: players.length,
        league: leagueNum,
        leaguePosition: Number.isFinite(rank) && rank > 0 ? rank : null,
        leagueTotal: (rankingsByLeague.get(leagueNum) ?? []).length || 1,
      };
    }
    if (apiMode) {
      const fromMap = derivePlayerProfileRankingsFromLeagueMap(profilePlayerId, players, rankingsByLeague);
      if (fromMap) return fromMap;
      if (rankingRowFromApi) {
        const L = rankingRowFromApi.league;
        return {
          globalPosition: null,
          globalTotal: players.length,
          league: L,
          leaguePosition: rankingRowFromApi.position > 0 ? rankingRowFromApi.position : null,
          leagueTotal: (rankingsByLeague.get(L) ?? []).length || 1,
        };
      }
    }
    return derivePlayerProfileRankings(displayPlayer.id, players, club.tournaments, results, knockoutMerged);
  }, [
    alvarezDemo,
    apiMode,
    apiProfile,
    displayPlayer.id,
    displayPlayer.category,
    players,
    rankingsByLeague,
    rankingRowFromApi,
    profilePlayerId,
    club.tournaments,
    results,
    knockoutMerged,
  ]);

  /** Ranking/puntos desde API: no usar `statsPending` para ocultar puntos ya materializados en MySQL. */
  const rankingUiPending = useMemo(() => {
    if (alvarezDemo) return false;
    if (!statsPending) return false;
    if (leaguePointsDisplay > 0) return false;
    if (rankingRowFromApi) return false;
    const lp = profileRankings?.leaguePosition;
    const gp = profileRankings?.globalPosition;
    return !((lp != null && lp > 0) || (gp != null && gp > 0));
  }, [alvarezDemo, statsPending, leaguePointsDisplay, rankingRowFromApi, profileRankings]);

  const leagueColor = getLeagueColor(leagueNum);

  const recentMatches = useMemo(() => {
    if (alvarezDemo) return ALVAREZ_DEMO_RECENT_MATCHES;
    if (apiMode && Array.isArray(apiProfile?.recentMatches)) {
      return mapApiProfileRecentMatches(apiProfile.recentMatches, displayPlayer.id).slice(0, 8);
    }
    return recentMatchesForProfile(displayPlayer.id, results, players, 8);
  }, [alvarezDemo, apiMode, apiProfile?.recentMatches, displayPlayer.id, results, players]);

  const winStreak = useMemo(() => {
    if (apiMode && !alvarezDemo && apiProfile && typeof apiProfile.longestWinStreak === 'number') {
      return apiProfile.longestWinStreak;
    }
    return longestWinStreakForPlayer(displayPlayer.id, results, players);
  }, [apiMode, alvarezDemo, apiProfile, displayPlayer.id, results, players]);

  const finalsGauge = useMemo(() => {
    if (alvarezDemo) {
      const { reached, won, pct } = ALVAREZ_DEMO_FINALS_CAREER;
      return { reached, won, pct };
    }
    if (apiMode && !alvarezDemo && apiProfile && typeof apiProfile.finalsGauge === 'object' && apiProfile.finalsGauge !== null) {
      const fg = apiProfile.finalsGauge as Record<string, unknown>;
      return {
        reached: Number(fg.reached ?? 0),
        won: Number(fg.won ?? 0),
        pct: typeof fg.pct === 'number' && Number.isFinite(fg.pct) ? fg.pct : null,
      };
    }
    const ctx = { resultMatches: results, knockoutMatches: knockoutMerged, players };
    let reached = 0;
    let won = 0;
    for (const t of club.tournaments) {
      if (t.status !== 'finished') continue;
      const { phase } = calculateTournamentPoints(displayPlayer.id, t, ctx);
      if (phase === 'champion') {
        reached += 1;
        won += 1;
      } else if (phase === 'finalist') {
        reached += 1;
      }
    }
    const pct = reached > 0 ? Math.round((won / reached) * 100) : null;
    return { reached, won, pct };
  }, [alvarezDemo, apiMode, apiProfile, club.tournaments, displayPlayer.id, results, knockoutMerged, players]);

  const seasonYear = useMemo(() => new Date().getFullYear(), []);
  const phaseCtxFull = useMemo(
    () => ({ resultMatches: results, knockoutMatches: knockoutMerged, players }),
    [results, knockoutMerged, players],
  );
  const resultsSeason = useMemo(
    () => filterResultsByCalendarYear(results, seasonYear),
    [results, seasonYear],
  );
  const statsSeason = useMemo(() => {
    if (apiMode && !alvarezDemo && apiProfile && typeof apiProfile.statsSeason === 'object' && apiProfile.statsSeason !== null) {
      const s = apiProfile.statsSeason as Record<string, unknown>;
      const L = categoryToLeague(displayPlayer.category);
      const curLeague =
        typeof s.currentLeague === 'number' && s.currentLeague >= 1 && s.currentLeague <= 6 ? (s.currentLeague as typeof L) : L;
      return {
        playerId: displayPlayer.id,
        playerName: displayPlayer.name,
        totalMatchesPlayed: Number(s.totalMatchesPlayed ?? 0),
        totalWins: Number(s.totalWins ?? 0),
        totalLosses: Number(s.totalLosses ?? 0),
        setsWon: Number(s.setsWon ?? 0),
        setsLost: Number(s.setsLost ?? 0),
        setDifference: Number(s.setDifference ?? 0),
        tournamentsPlayed: Number(s.tournamentsPlayed ?? 0),
        tournamentsWon: Number(s.tournamentsWon ?? 0),
        bestHistoricalRanking: null,
        currentLeague: curLeague,
        winRate: Number(s.winRate ?? 0),
      };
    }
    const base = calculatePlayerStats(
      displayPlayer.id,
      resultsSeason,
      club.tournaments,
      players,
      knockoutMerged,
    );
    const titles = countTitlesInSeasonYear(
      displayPlayer.id,
      club.tournaments,
      phaseCtxFull,
      seasonYear,
    );
    const merged = { ...base, tournamentsWon: titles };
    if (alvarezDemo) {
      return { ...merged, ...ALVAREZ_DEMO_SEASON_PATCH, tournamentsWon: 0 };
    }
    return merged;
  }, [
    apiMode,
    apiProfile,
    alvarezDemo,
    displayPlayer.id,
    displayPlayer.name,
    displayPlayer.category,
    resultsSeason,
    club.tournaments,
    players,
    knockoutMerged,
    seasonYear,
    phaseCtxFull,
  ]);

  const finalsSeason = useMemo(() => {
    if (alvarezDemo) return { ...ALVAREZ_DEMO_FINALS_SEASON };
    if (apiMode && !alvarezDemo && apiProfile && typeof apiProfile.finalsSeason === 'object' && apiProfile.finalsSeason !== null) {
      const fs = apiProfile.finalsSeason as Record<string, unknown>;
      return { reached: Number(fs.reached ?? 0), won: Number(fs.won ?? 0) };
    }
    return finalsReachedInSeasonYear(displayPlayer.id, club.tournaments, phaseCtxFull, seasonYear);
  }, [alvarezDemo, apiMode, apiProfile, displayPlayer.id, club.tournaments, phaseCtxFull, seasonYear]);

  const leagueNavIds = useMemo(() => {
    const L = categoryToLeague(displayPlayer.category);
    const rows = rankingsByLeague.get(L) ?? [];
    const fromRanking = rows.map((r) => r.playerId);
    if (fromRanking.includes(displayPlayer.id)) return fromRanking;
    return players
      .filter((p) => categoryToLeague(p.category) === L)
      .sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''), 'es'))
      .map((p) => p.id);
  }, [displayPlayer.category, displayPlayer.id, rankingsByLeague, players]);

  const navIndex = leagueNavIds.indexOf(displayPlayer.id);
  const prevPlayerId = navIndex > 0 ? leagueNavIds[navIndex - 1]! : null;
  const nextPlayerId =
    navIndex >= 0 && navIndex < leagueNavIds.length - 1 ? leagueNavIds[navIndex + 1]! : null;

  const profileHeaderName =
    viewMode === 'edit'
      ? `${editFields.firstName} ${editFields.lastName}`.trim() || displayPlayer.name
      : displayPlayer.name;
  const { first: heroFirst, last: heroLast } = splitDisplayName(profileHeaderName);
  const heroLeagueNum = viewMode === 'edit' ? categoryToLeague(editFields.category) : leagueNum;
  const heroLeagueColor = getLeagueColor(heroLeagueNum);
  const natForHero =
    viewMode === 'edit' ? editFields.nationality.trim() || 'Argentina' : displayPlayer.nationality?.trim() || '';
  const nationalityFlagHero = getNationalityFlag(natForHero || undefined);
  const profileImageSrc =
    viewMode === 'edit'
      ? resolveProfileImageSrc(editFields.profileImage)
      : resolveProfileImageSrc(displayPlayer.profileImage);
  const profilePhotoUrl = profileImageSrc || defaultAvatarUrl;
  const hasCustomPhoto = !!profileImageSrc;
  const initials = profileHeaderName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const achievements = useMemo(() => {
    if (alvarezDemo) return [...ALVAREZ_DEMO_ACHIEVEMENTS];
    const items: { title: string; detail: string }[] = [];
    for (const h of tournamentHistory.filter((x) => x.result === 'Campeón')) {
      items.push({ title: 'Campeón de torneo', detail: h.tournament.name });
    }
    for (const h of tournamentHistory.filter((x) => x.result === 'Finalista')) {
      items.push({ title: 'Finalista', detail: h.tournament.name });
    }
    if (!statsPending && derivedStats.bestHistoricalRanking != null) {
      items.push({
        title: 'Mejor ranking alcanzado',
        detail: `Puesto #${derivedStats.bestHistoricalRanking} (entre ligas, ${apiCareerStats ? 'ranking del club' : 'según resultados'})`,
      });
    }
    if (winStreak >= 2) {
      items.push({ title: 'Mayor racha de victorias', detail: `${winStreak} partidos seguidos` });
    }
    if (!statsPending && profileRankings?.leaguePosition === 1 && leaguePointsDisplay > 0) {
      items.push({ title: 'Líder de la liga', detail: `Liga ${profileRankings.league} · ranking actual` });
    }
    return items;
  }, [
    alvarezDemo,
    tournamentHistory,
    statsPending,
    derivedStats.bestHistoricalRanking,
    winStreak,
    profileRankings?.league,
    profileRankings?.leaguePosition,
    leaguePointsDisplay,
    apiCareerStats,
  ]);

  const leagueRankLabel = uiFormatRankHash(profileRankings?.leaguePosition ?? null, rankingUiPending);
  const globalRankLabel = uiFormatRankHash(profileRankings?.globalPosition ?? null, rankingUiPending);
  const pointsLabel = uiFormatPointsCell(leaguePointsDisplay, rankingUiPending);
  const pointsSeasonLabel = alvarezDemo ? uiFormatPointsCell(ALVAREZ_DEMO_POINTS_SEASON, false) : pointsLabel;
  const wlCareer =
    statsPending ? '—' : `${derivedStats.totalWins}–${derivedStats.totalLosses}`;
  const wlSeason =
    statsSeason.totalMatchesPlayed === 0
      ? '—'
      : `${statsSeason.totalWins}–${statsSeason.totalLosses}`;
  const finalsSeasonLabel =
    finalsSeason.reached === 0
      ? statsSeason.totalMatchesPlayed === 0
        ? '—'
        : '0 / 0'
      : `${finalsSeason.won} / ${finalsSeason.reached}`;
  const finalsCareerLabel =
    finalsGauge.reached === 0 ? (statsPending ? '—' : '0 / 0') : `${finalsGauge.won} / ${finalsGauge.reached}`;
  const bestRankLabel =
    statsPending || derivedStats.bestHistoricalRanking == null ? '—' : `#${derivedStats.bestHistoricalRanking}`;

  const statsModeRows = useMemo(() => {
    const isActual = statsMode === 'actual';
    const puntosValor = isActual ? (alvarezDemo ? pointsSeasonLabel : pointsLabel) : pointsLabel;
    return [
      { key: 'rg', label: 'Ranking global', value: globalRankLabel },
      {
        key: 'gp',
        label: 'G–P',
        hint: 'gan. – perd.',
        value: isActual ? wlSeason : wlCareer,
      },
      {
        key: 'tit',
        label: 'Títulos',
        value: isActual ? String(statsSeason.tournamentsWon) : statsPending ? '0' : String(derivedStats.tournamentsWon),
      },
      { key: 'fin', label: 'Finales', value: isActual ? finalsSeasonLabel : finalsCareerLabel },
      { key: 'pts', label: 'Puntos', value: puntosValor },
      { key: 'best', label: 'Mejor ranking', value: isActual ? '—' : bestRankLabel },
    ];
  }, [
    statsMode,
    globalRankLabel,
    wlSeason,
    wlCareer,
    statsSeason.tournamentsWon,
    derivedStats.tournamentsWon,
    statsPending,
    finalsSeasonLabel,
    finalsCareerLabel,
    alvarezDemo,
    pointsSeasonLabel,
    pointsLabel,
    bestRankLabel,
  ]);

  return (
    <main className="mx-auto w-full max-w-[1200px] flex-1 space-y-8 px-4 py-10 sm:px-6 md:space-y-10 md:py-12">
      {/* Hero — editorial, sin panel grande; navegación flotante arriba a la derecha */}
      <section className="relative pb-2 pt-1">
        <div className="mb-5 flex flex-wrap justify-end gap-2 sm:mb-6">
          <button
            type="button"
            disabled={!setSelectedPlayerId || prevPlayerId == null}
            onClick={() => goPlayer(prevPlayerId)}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white/75 px-3 py-2 text-[11px] font-semibold tracking-wide text-[#111318] shadow-sm backdrop-blur-md transition hover:bg-white/95 disabled:pointer-events-none disabled:opacity-35 dark:border-white/[0.12] dark:bg-[#111318]/55 dark:text-white dark:shadow-none dark:hover:bg-[#111318]/75"
            aria-label="Jugador anterior"
          >
            <ChevronLeft className="size-4 shrink-0 opacity-80" aria-hidden />
            <span className="hidden sm:inline">Anterior</span>
          </button>
          <button
            type="button"
            disabled={!setSelectedPlayerId || nextPlayerId == null}
            onClick={() => goPlayer(nextPlayerId)}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary px-3 py-2 text-[11px] font-semibold tracking-wide text-white shadow-sm backdrop-blur-sm transition hover:brightness-110 disabled:pointer-events-none disabled:opacity-35"
            aria-label="Jugador siguiente"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight className="size-4 shrink-0 opacity-90" aria-hidden />
          </button>
          {canEditProfile && viewMode === 'view' ? (
            <button
              type="button"
              onClick={enterEdit}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.1] bg-white/90 px-3 py-2 text-[11px] font-semibold tracking-wide text-[#111318] shadow-sm backdrop-blur-md transition hover:bg-white dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              <Pencil className="size-4 shrink-0 opacity-80" aria-hidden />
              <span className="hidden sm:inline">Editar jugador</span>
              <span className="sm:hidden">Editar</span>
            </button>
          ) : null}
          {canEditProfile && viewMode === 'edit' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  if (saveEdit()) setEditBanner(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/50 bg-emerald-600 px-3 py-2 text-[11px] font-semibold tracking-wide text-white shadow-sm transition hover:brightness-110"
              >
                <Save className="size-4 shrink-0" aria-hidden />
                Guardar
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.1] bg-white/90 px-3 py-2 text-[11px] font-semibold text-[#111318] shadow-sm dark:border-white/15 dark:bg-[#111318]/70 dark:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-600/95 px-3 py-2 text-[11px] font-semibold text-white shadow-sm transition hover:brightness-110"
              >
                <Trash2 className="size-4 shrink-0" aria-hidden />
                Eliminar
              </button>
              {setScreen ? (
                <button
                  type="button"
                  onClick={() => openNavGuard(() => setScreen('players'))}
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] px-3 py-2 text-[11px] font-semibold text-[#616f89] dark:text-gray-300"
                >
                  Volver a jugadores
                </button>
              ) : null}
            </>
          ) : null}
        </div>
        {editBanner ? (
          <p className="mb-3 rounded-lg border border-slate-400/20 bg-black/[0.02] px-3 py-2 text-sm font-medium text-[#616f89] dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300" role="status">
            {editBanner}
          </p>
        ) : null}

        <div className="flex flex-col-reverse items-stretch gap-12 lg:flex-row lg:items-start lg:gap-16 xl:gap-20">
          <div className="min-w-0 flex-1 space-y-7 pt-2 sm:space-y-8 lg:flex-[1.2] lg:space-y-10 lg:pt-4 lg:pr-4 xl:pr-8">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <LeagueBadge
                league={heroLeagueNum}
                className="!rounded-xl !border-2 !px-4 !py-2 !text-sm !font-bold shadow-sm sm:!px-5 sm:!py-2.5 sm:!text-base md:!text-lg"
              />
              {(natForHero || viewMode === 'edit') && (
                <span className="inline-flex items-center gap-2.5 rounded-full border border-black/[0.08] bg-black/[0.02] px-4 py-2 text-sm font-semibold text-[#111318] shadow-sm dark:border-white/15 dark:bg-white/[0.06] dark:text-white sm:px-5 sm:py-2.5 sm:text-base">
                  {nationalityFlagHero.image ? (
                    <img
                      src={getProfileImageUrl(nationalityFlagHero.image)}
                      alt=""
                      className="h-5 w-8 rounded object-cover sm:h-6 sm:w-10"
                      aria-hidden
                    />
                  ) : nationalityFlagHero.emoji ? (
                    <span aria-hidden className="text-xl leading-none sm:text-2xl">
                      {nationalityFlagHero.emoji}
                    </span>
                  ) : null}
                  {natForHero || '—'}
                </span>
              )}
              {canEditProfile && viewMode === 'view' && basePlayer.rosterActive === false ? (
                <span className="rounded-full border border-slate-400/50 bg-slate-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Inactivo en plantel
                </span>
              ) : null}
            </div>

            <div className="space-y-2 sm:space-y-3">
              {heroFirst ? (
                <p className="text-base font-semibold tracking-wide text-[#616f89] dark:text-gray-400 sm:text-lg md:text-xl">
                  {heroFirst}
                </p>
              ) : null}
              <h1 className="break-words text-4xl font-extrabold leading-[0.95] tracking-tight text-[#111318] dark:text-white sm:text-5xl md:text-6xl lg:text-7xl xl:text-[4.25rem] xl:leading-[0.92]">
                {heroLast || profileHeaderName}
              </h1>
              {viewMode === 'view' && basePlayer.profileBio?.trim() ? (
                <p className="max-w-2xl text-sm leading-relaxed text-[#616f89] dark:text-gray-400">{basePlayer.profileBio.trim()}</p>
              ) : null}
            </div>

            <div className="grid w-full max-w-lg grid-cols-2 gap-4 pt-2 sm:max-w-xl sm:gap-5 lg:flex lg:max-w-2xl lg:flex-wrap lg:gap-5">
              <span
                className="inline-flex min-h-[5.75rem] min-w-0 flex-col justify-center gap-1 rounded-2xl border border-black/[0.06] bg-black/[0.02] px-5 py-4 text-[#111318] shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:shadow-none sm:min-h-[6.25rem] sm:px-6 sm:py-5"
                title="Ranking en la liga del jugador"
              >
                <span className="text-3xl font-black tabular-nums leading-none tracking-tight sm:text-4xl lg:text-5xl">
                  {leagueRankLabel}
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#616f89] dark:text-gray-400 sm:text-sm">
                  Liga {profileRankings?.league ?? leagueNum}
                </span>
              </span>
              <span
                className="inline-flex min-h-[5.75rem] min-w-0 flex-col justify-center gap-1 rounded-2xl border border-black/[0.06] bg-black/[0.02] px-5 py-4 text-[#111318] shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:shadow-none sm:min-h-[6.25rem] sm:px-6 sm:py-5"
                title="Ranking global entre todas las ligas"
              >
                <span className="text-3xl font-black tabular-nums leading-none tracking-tight sm:text-4xl lg:text-5xl">
                  {globalRankLabel}
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#616f89] dark:text-gray-400 sm:text-sm">
                  General
                </span>
              </span>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[min(100%,300px)] shrink-0 sm:max-w-[min(100%,320px)] lg:ml-auto lg:mr-0 lg:max-w-[min(100%,300px)] xl:max-w-[min(100%,320px)]">
            <div className="flex flex-col overflow-hidden rounded-2xl shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)] dark:shadow-[0_16px_48px_-16px_rgba(0,0,0,0.65)]">
              <div className={`h-1.5 w-full shrink-0 ${heroLeagueColor.topBar}`} aria-hidden />
              <div className="aspect-[3/4] w-full overflow-hidden bg-black/[0.04] dark:bg-white/[0.05]">
                {hasCustomPhoto ? (
                  <img
                    src={profilePhotoUrl}
                    alt={profileHeaderName}
                    className="h-full w-full object-cover object-top"
                  />
                ) : (
                  <div className="flex h-full min-h-[220px] w-full flex-col items-center justify-center gap-1 bg-gradient-to-b from-black/[0.04] to-black/[0.02] dark:from-white/[0.06] dark:to-white/[0.02]">
                    <span className="text-5xl font-bold tracking-tight text-[#111318] dark:text-white sm:text-6xl">
                      {initials}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#616f89]/80 dark:text-gray-500">
                      Avatar
                    </span>
                  </div>
                )}
              </div>
              {canEditProfile && viewMode === 'edit' ? (
                <div className="flex flex-col gap-2 border-t border-black/10 bg-white/95 p-3 dark:border-white/10 dark:bg-[#111318]/95">
                  <input id={photoInputId} type="file" accept="image/*" className="sr-only" onChange={onPickPhoto} />
                  <label
                    htmlFor={photoInputId}
                    className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-black/10 bg-white px-3 py-2 text-center text-xs font-semibold text-[#111318] shadow-sm dark:border-white/15 dark:bg-white/10 dark:text-white"
                  >
                    Cambiar foto
                  </label>
                  {editFields.profileImage ? (
                    <button
                      type="button"
                      onClick={clearPhoto}
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300"
                    >
                      <X className="size-3.5 shrink-0" aria-hidden />
                      Eliminar foto
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {alvarezDemo ? (
        <div className="rounded-xl border border-slate-400/20 bg-black/[0.02] px-4 py-2.5 text-center text-xs font-semibold text-[#616f89] dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300">
          {ALVAREZ_DEMO_TAG}
        </div>
      ) : null}

      {/* Resumen deportivo */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-[#111318] dark:text-white">Resumen</h2>
            <p className="mt-0.5 text-xs font-medium text-[#616f89] dark:text-gray-400">
              Datos principales del jugador
              {viewMode === 'edit' ? (
                <span className="mt-1 block font-semibold text-primary"> · Ranking, puntos y estadísticas: solo lectura</span>
              ) : null}
            </p>
          </div>
          <span className="rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:bg-sky-400/10 dark:text-sky-300">
            Greek Tennis
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
          <StatSpotlight icon={Hash} label="Ranking liga" value={leagueRankLabel} />
          <StatSpotlight icon={Globe} label="Ranking general" value={globalRankLabel} />
          <StatSpotlight icon={Target} label="Puntos" value={pointsLabel} />
          <StatSpotlight icon={Activity} label="G–P" value={wlCareer} />
          <StatSpotlight icon={Trophy} label="Títulos" value={statsPending ? '0' : String(derivedStats.tournamentsWon)} />
          <StatSpotlight icon={TrendingUp} label="Mejor ranking" value={bestRankLabel} />
        </div>
      </section>

      {/* Actual / Carrera — un horizonte a la vez */}
      <section className="app-glass-panel rounded-2xl border border-black/[0.06] p-5 shadow-sm dark:border-white/10 dark:shadow-none sm:p-6 md:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <h2 className="text-base font-black uppercase tracking-tight text-[#111318] dark:text-white sm:text-lg">
              Actual / Carrera
            </h2>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-[#616f89] dark:text-gray-400">
              Elegí el horizonte: temporada {seasonYear} o carrera completa. Una sola vista a la vez.
            </p>
          </div>
          <div
            className="flex w-full shrink-0 rounded-xl border border-black/[0.08] bg-black/[0.03] p-1 dark:border-white/10 dark:bg-white/[0.05] sm:w-auto"
            role="tablist"
            aria-label="Horizonte de estadísticas"
          >
            <button
              type="button"
              role="tab"
              aria-selected={statsMode === 'actual'}
              onClick={() => setStatsMode('actual')}
              className={`min-h-[44px] flex-1 rounded-lg px-4 text-sm font-semibold transition sm:flex-none sm:px-6 ${
                statsMode === 'actual'
                  ? 'bg-primary text-white shadow-sm dark:bg-primary dark:text-white'
                  : 'text-[#616f89] hover:text-[#111318] dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              Actual
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statsMode === 'carrera'}
              onClick={() => setStatsMode('carrera')}
              className={`min-h-[44px] flex-1 rounded-lg px-4 text-sm font-semibold transition sm:flex-none sm:px-6 ${
                statsMode === 'carrera'
                  ? 'bg-primary text-white shadow-sm dark:bg-primary dark:text-white'
                  : 'text-[#616f89] hover:text-[#111318] dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              Carrera
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-black/[0.06] dark:border-white/10">
          <div className="border-b border-black/[0.06] bg-black/[0.02] px-4 py-3 dark:border-white/10 dark:bg-white/[0.03] sm:px-5">
            <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#616f89] dark:text-gray-400">
              <span>Métrica</span>
              <span className="text-primary dark:text-primary">Valor</span>
            </div>
          </div>
          <ul className="divide-y divide-black/[0.06] dark:divide-white/10">
            {statsModeRows.map((row) => (
              <li
                key={row.key}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3.5 sm:px-5 sm:py-4"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-[#111318] dark:text-white">{row.label}</span>
                  {row.hint ? (
                    <span className="mt-0.5 block text-[11px] text-[#616f89] dark:text-gray-500">({row.hint})</span>
                  ) : null}
                </div>
                <span className="shrink-0 text-right text-lg font-bold tabular-nums text-[#111318] dark:text-white sm:text-xl">
                  {row.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
        {statsMode === 'actual' ? (
          <p className="mt-4 text-center text-[10px] font-medium uppercase tracking-wider text-[#616f89] dark:text-gray-500">
            Actual · año {seasonYear} · finales según cierre de torneo
          </p>
        ) : (
          <p className="mt-4 text-center text-[10px] font-medium uppercase tracking-wider text-[#616f89] dark:text-gray-500">
            Carrera · totales registrados en el club
          </p>
        )}
      </section>

      {/* Rendimiento: % en círculos (protagonistas) + sets y finales agrupados */}
      <section className="app-glass-panel rounded-2xl border border-black/[0.06] p-5 shadow-sm dark:border-white/10 dark:shadow-none sm:p-6 md:p-8">
        <div className="mb-8">
          <h2 className="text-xl font-black uppercase tracking-tight text-[#111318] dark:text-white">Rendimiento</h2>
          <p className="mt-0.5 text-xs font-medium text-[#616f89] dark:text-gray-400">
            Porcentajes en primer plano · totales de sets y finales abajo
          </p>
        </div>

        {statsPending ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-black/10 py-12 dark:border-white/15">
            <Percent className="size-9 text-[#616f89]/40 dark:text-gray-600" aria-hidden />
            <p className="text-sm text-[#616f89] dark:text-gray-400">Sin partidos para gráficos.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* A) Indicadores principales */}
            <div className="flex flex-col items-center gap-8 lg:flex-row lg:flex-wrap lg:items-start lg:justify-center lg:gap-x-12 lg:gap-y-8">
              <div className="flex flex-wrap justify-center gap-10 md:gap-14">
                <CircularGauge
                  pct={winPctDisplay}
                  label="% Victorias"
                  sub={`${derivedStats.totalWins}/${derivedStats.totalMatchesPlayed} PJ`}
                />
                <CircularGauge
                  pct={setsWonPctDisplay}
                  label="% Sets ganados"
                  sub={setsTotal === 0 ? '—' : `${derivedStats.setsWon}/${setsTotal}`}
                  accentClass="text-emerald-500 dark:text-emerald-400"
                />
                {finalsGauge.reached > 0 && finalsGauge.pct != null ? (
                  <CircularGauge
                    pct={finalsGauge.pct}
                    label="% Finales ganadas"
                    sub={`${finalsGauge.won}/${finalsGauge.reached}`}
                    accentClass="text-sky-500 dark:text-sky-300"
                  />
                ) : null}
              </div>
              {!(finalsGauge.reached > 0 && finalsGauge.pct != null) ? (
                <div className="w-full max-w-sm rounded-2xl border border-black/[0.07] bg-black/[0.02] px-5 py-4 text-center dark:border-white/10 dark:bg-white/[0.03] lg:max-w-[14rem] lg:text-left">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#616f89] dark:text-gray-400">
                    Finales
                  </p>
                  <p className="mt-1.5 text-sm font-bold leading-snug text-[#111318] dark:text-white">
                    {finalsGauge.reached === 0 ? 'Sin muestra aún' : `${finalsGauge.won} gan. · ${finalsGauge.reached} disp.`}
                  </p>
                  {finalsGauge.reached > 0 && finalsGauge.pct != null ? (
                    <p className="mt-1 text-xs text-[#616f89] dark:text-gray-500">{finalsGauge.pct}% efectividad</p>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* B) Métricas absolutas (integradas, sin cajitas sueltas) */}
            <div className="rounded-2xl border border-black/[0.06] bg-black/[0.02] px-3 py-5 dark:border-white/10 dark:bg-white/[0.03] sm:px-6">
              <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#616f89] dark:text-gray-400">
                Totales en sets
              </p>
              <div className="grid grid-cols-1 divide-y divide-black/[0.06] dark:divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="flex flex-col items-center px-2 py-3 text-center sm:py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#616f89] dark:text-gray-500">
                    Sets ganados
                  </span>
                  <span className="mt-1 text-2xl font-black tabular-nums text-[#111318] dark:text-white">
                    {derivedStats.setsWon}
                  </span>
                </div>
                <div className="flex flex-col items-center px-2 py-3 text-center sm:py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#616f89] dark:text-gray-500">
                    Sets perdidos
                  </span>
                  <span className="mt-1 text-2xl font-black tabular-nums text-[#111318] dark:text-white">
                    {derivedStats.setsLost}
                  </span>
                </div>
                <div className="flex flex-col items-center px-2 py-3 text-center sm:py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#616f89] dark:text-gray-500">
                    Diferencia
                  </span>
                  <span className="mt-1 text-2xl font-black tabular-nums text-primary">
                    {derivedStats.setDifference > 0 ? '+' : ''}
                    {derivedStats.setDifference}
                  </span>
                </div>
              </div>
              {finalsGauge.reached > 0 && !(finalsGauge.reached > 0 && finalsGauge.pct != null) ? (
                <div className="mt-5 border-t border-black/[0.06] pt-4 text-center dark:border-white/10">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#616f89] dark:text-gray-400">
                    Finales (absoluto)
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#111318] dark:text-white">
                    {finalsGauge.won} ganadas · {finalsGauge.reached} disputadas
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Información básica */}
        <section className="app-glass-panel rounded-2xl border border-black/[0.06] p-6 shadow-sm dark:border-white/10 dark:shadow-none md:p-8">
          <h2 className="mb-6 flex items-center gap-2 border-b border-black/5 pb-4 text-lg font-bold text-[#111318] dark:border-white/10 dark:text-white">
            <User className="size-5 shrink-0 text-primary" aria-hidden />
            Información básica
          </h2>
          {canEditProfile && viewMode === 'edit' ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#616f89] dark:text-gray-500">Nombre</label>
                  <input
                    className={inputClass}
                    value={editFields.firstName}
                    onChange={(e) => setEditFields((f) => ({ ...f, firstName: e.target.value }))}
                    autoComplete="given-name"
                  />
                  {fieldErrors.firstName ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.firstName}</p> : null}
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#616f89] dark:text-gray-500">Apellido</label>
                  <input
                    className={inputClass}
                    value={editFields.lastName}
                    onChange={(e) => setEditFields((f) => ({ ...f, lastName: e.target.value }))}
                    autoComplete="family-name"
                  />
                  {fieldErrors.lastName ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.lastName}</p> : null}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#616f89] dark:text-gray-500">Liga / categoría</label>
                <select
                  className={inputClass}
                  value={editFields.category}
                  onChange={(e) => setEditFields((f) => ({ ...f, category: e.target.value as CategoryKey }))}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {fieldErrors.category ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.category}</p> : null}
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#616f89] dark:text-gray-500">Nacionalidad</label>
                <input
                  className={inputClass}
                  value={editFields.nationality}
                  onChange={(e) => setEditFields((f) => ({ ...f, nationality: e.target.value }))}
                  placeholder="Vacío = Argentina"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#616f89] dark:text-gray-500">Fecha de nacimiento</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={editFields.birthDate}
                    onChange={(e) => setEditFields((f) => ({ ...f, birthDate: e.target.value }))}
                  />
                  {fieldErrors.birthDate ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.birthDate}</p> : null}
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#616f89] dark:text-gray-500">Altura (cm o m)</label>
                  <input
                    className={inputClass}
                    value={editFields.heightCmInput}
                    onChange={(e) => setEditFields((f) => ({ ...f, heightCmInput: e.target.value }))}
                    placeholder="Ej. 185 o 1,85"
                  />
                  {fieldErrors.heightCmInput ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.heightCmInput}</p> : null}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#616f89] dark:text-gray-500">Mano hábil</label>
                <select
                  className={inputClass}
                  value={editFields.playingHand}
                  onChange={(e) =>
                    setEditFields((f) => ({
                      ...f,
                      playingHand: e.target.value === 'Zurdo' || e.target.value === 'Derecha' ? e.target.value : '',
                    }))
                  }
                >
                  <option value="">—</option>
                  <option value="Derecha">Derecha</option>
                  <option value="Zurdo">Zurdo</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-[#111318] dark:text-white">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-black/20 text-primary focus:ring-primary/40"
                    checked={editFields.rosterActive}
                    onChange={(e) => setEditFields((f) => ({ ...f, rosterActive: e.target.checked }))}
                  />
                  Activo en plantel
                </label>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#616f89] dark:text-gray-500">Visibilidad del perfil</label>
                <select
                  className={inputClass}
                  value={editFields.profileVisibility}
                  onChange={(e) =>
                    setEditFields((f) => ({
                      ...f,
                      profileVisibility: e.target.value === 'hidden' ? 'hidden' : 'visible',
                    }))
                  }
                >
                  <option value="visible">Visible en el sitio</option>
                  <option value="hidden">Oculto (listados públicos)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#616f89] dark:text-gray-500">Descripción corta (opcional)</label>
                <textarea
                  className={`${inputClass} min-h-[88px] resize-y`}
                  value={editFields.profileBio}
                  onChange={(e) => setEditFields((f) => ({ ...f, profileBio: e.target.value }))}
                  rows={3}
                  maxLength={400}
                  placeholder="Texto breve visible en la ficha…"
                />
              </div>
            </div>
          ) : (
            <ul className="space-y-0 divide-y divide-black/5 dark:divide-white/10">
              {[
                {
                  icon: User,
                  k: 'Nombre completo',
                  v: displayPlayer.name,
                },
                {
                  icon: Layers,
                  k: 'Liga actual',
                  v: `Liga ${profileRankings?.league ?? leagueNum} · ${displayPlayer.category}`,
                },
                {
                  icon: Globe,
                  k: 'Nacionalidad',
                  v: displayPlayer.nationality?.trim() ? displayPlayer.nationality : 'Sin dato',
                },
                {
                  icon: Hand,
                  k: 'Mano hábil',
                  v: displayPlayer.playingHand?.trim() ? displayPlayer.playingHand : '—',
                },
                ...(age != null ? [{ icon: Calendar, k: 'Edad', v: `${age} años` }] : [{ icon: Calendar, k: 'Edad', v: '—' }]),
                ...(displayPlayer.birthDate
                  ? [
                      {
                        icon: Calendar,
                        k: 'Nacimiento',
                        v: (() => {
                          const d = new Date(displayPlayer.birthDate!);
                          return Number.isNaN(d.getTime())
                            ? '—'
                            : d.toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              });
                        })(),
                      },
                    ]
                  : []),
                ...(displayPlayer.heightCm != null && displayPlayer.heightCm > 0
                  ? [
                      {
                        icon: Ruler,
                        k: 'Altura',
                        v: `${(displayPlayer.heightCm / 100).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`,
                      },
                    ]
                  : []),
                {
                  icon: Sparkles,
                  k: 'Visibilidad del perfil',
                  v: basePlayer.profileVisibility === 'hidden' ? 'Oculto en listados públicos' : 'Visible',
                },
                {
                  icon: Activity,
                  k: 'Estado en plantel',
                  v: basePlayer.rosterActive === false ? 'Inactivo' : 'Activo',
                },
              ].map((row) => {
                const RowIcon = row.icon;
                return (
                  <li key={row.k} className="flex items-start gap-3 py-3 first:pt-0">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-black/[0.04] dark:bg-white/10">
                      <RowIcon className="size-4 text-primary opacity-90" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#616f89] dark:text-gray-500">
                        {row.k}
                      </p>
                      <p className="font-medium text-[#111318] dark:text-white">{row.v}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Logros */}
        <section className="app-glass-panel rounded-2xl border border-black/[0.06] p-6 shadow-sm dark:border-white/10 dark:shadow-none md:p-8">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-[#111318] dark:text-white">
            <Trophy className="size-5 shrink-0 text-sky-500 dark:text-sky-300" aria-hidden />
            Logros del jugador
          </h2>
          <p className="mb-6 text-sm text-[#616f89] dark:text-gray-400">
            Reconocimientos según torneos y resultados registrados.
          </p>
          {achievements.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-black/10 py-12 text-center dark:border-white/15">
              <Sparkles className="size-10 text-[#616f89]/40 dark:text-gray-600" aria-hidden />
              <p className="max-w-sm text-sm text-[#616f89] dark:text-gray-400">
                Este jugador todavía no tiene logros registrados.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {achievements.map((a) => (
                <li
                  key={`${a.title}-${a.detail}`}
                  className="flex gap-3 rounded-xl border border-black/[0.06] bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <span
                    className="w-1 shrink-0 rounded-full bg-sky-400/70 dark:bg-sky-300/65"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-[#111318] dark:text-white">{a.title}</p>
                    <p className="mt-0.5 text-sm text-[#616f89] dark:text-gray-400">{a.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Últimos partidos */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-[#111318] dark:text-white">Últimos partidos</h2>
        {recentMatches.length === 0 ? (
          <div className="app-glass-panel rounded-2xl border border-black/[0.06] p-8 text-center text-sm text-[#616f89] dark:text-gray-400">
            No hay partidos registrados para este jugador.
          </div>
        ) : (
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {recentMatches.map((m, i) => {
              const outcomeStyles =
                m.outcome === 'Victoria'
                  ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                  : m.outcome === 'Derrota'
                    ? 'bg-red-500/12 text-red-800 dark:text-red-300'
                    : m.outcome === 'W.O.'
                      ? 'bg-slate-500/15 text-slate-800 dark:text-slate-300'
                      : m.outcome === 'Suspendido'
                        ? 'bg-violet-500/15 text-violet-900 dark:text-violet-200'
                        : 'bg-slate-500/15 text-slate-800 dark:text-slate-300';
              return (
                <article
                  key={`${m.dateIso ?? i}-${m.opponent}`}
                  className="w-[min(100%,280px)] shrink-0 rounded-xl border border-black/[0.06] bg-black/[0.02] p-4 shadow-sm transition hover:border-primary/30 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none dark:hover:border-primary/35"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#616f89] dark:text-gray-500">
                    {m.dateLabel}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#111318] dark:text-white">
                    {profileHeaderName}
                    <span className="font-normal text-[#616f89] dark:text-gray-400"> vs </span>
                    {m.opponent}
                  </p>
                  <p className="mt-2 font-mono text-sm text-[#111318] dark:text-gray-200">{m.score}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={`rounded-md px-2 py-1 text-xs font-bold ${outcomeStyles}`}>{m.outcome}</span>
                    {m.detail ? (
                      <span className="text-[11px] text-[#616f89] dark:text-gray-500">{m.detail}</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-[10px] text-[#616f89] dark:text-gray-500">{m.phase}</p>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Historial de torneos */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#111318] dark:text-white">
          <History className="size-5 shrink-0 text-primary" aria-hidden />
          Historial de torneos
        </h2>
        {tournamentParticipation.length === 0 ? (
          <div className="app-glass-panel rounded-2xl border border-black/[0.06] p-8 text-center text-sm text-[#616f89] dark:text-gray-400">
            Sin torneos finalizados con participación registrada.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {tournamentParticipation.map((row) => {
              const tColor = getLeagueColor(row.league);
              const pts = row.points.toLocaleString('es-AR');
              return (
                <article
                  key={`${row.tournament.id}-${row.league}`}
                  className="app-glass-panel flex overflow-hidden rounded-xl border border-black/[0.06] shadow-sm transition hover:border-primary/25 dark:border-white/10 dark:shadow-none dark:hover:border-primary/30"
                >
                  <div className={`w-1 shrink-0 ${tColor.topBar}`} aria-hidden />
                  <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold leading-snug text-[#111318] dark:text-white">{row.tournament.name}</p>
                      <Award className="size-4 shrink-0 text-primary opacity-80" aria-hidden />
                    </div>
                    <p className="text-xs text-[#616f89] dark:text-gray-400">
                      Liga {row.league} · {formatTournamentDate(row.tournament)}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-3 dark:border-white/10">
                      <span className="text-sm font-semibold text-[#111318] dark:text-white">{row.phaseLabel}</span>
                      <span className="rounded-md bg-primary/12 px-2 py-1 text-xs font-bold tabular-nums text-primary dark:bg-primary/20">
                        +{pts} pts
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {promotionHistory.length > 0 ? (
        <section className="app-glass-panel rounded-2xl border border-black/[0.06] p-6 shadow-sm dark:border-white/10 dark:shadow-none md:p-8">
          <h2 className="mb-4 text-lg font-bold text-[#111318] dark:text-white">Ascensos y descensos</h2>
          <ul className="divide-y divide-black/5 dark:divide-white/10">
            {promotionHistory.map((entry, i) => (
              <li
                key={i}
                className={`flex items-center gap-3 py-4 first:pt-0 ${
                  entry.type === 'promotion'
                    ? 'text-green-800 dark:text-green-400'
                    : 'text-red-800 dark:text-red-400'
                }`}
              >
                {entry.type === 'promotion' ? (
                  <TrendingUp className="size-5 shrink-0" aria-hidden />
                ) : (
                  <ArrowDown className="size-5 shrink-0" aria-hidden />
                )}
                <div>
                  <p className="font-semibold text-[#111318] dark:text-white">
                    {entry.type === 'promotion' ? 'Subió de liga' : 'Bajó de liga'}
                  </p>
                  <p className="text-sm text-[#616f89] dark:text-gray-400">
                    {entry.year} → Liga {entry.toLeague}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ProfileUnsavedDialog
        open={navGuard != null}
        onCancel={closeNavGuard}
        onDiscard={navGuardDiscard}
        onSave={navGuardSave}
      />

      {deleteConfirmOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="del-player-title"
        >
          <div className="max-w-md rounded-2xl border border-red-500/30 bg-white p-6 shadow-xl dark:border-red-400/30 dark:bg-[#111318]">
            <h2 id="del-player-title" className="text-lg font-bold text-red-800 dark:text-red-200">
              Eliminar jugador
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#616f89] dark:text-gray-400">
              Vas a borrar este jugador del almacenamiento local. No se puede deshacer. Solo podés eliminar registros agregados o modificados desde el panel en este navegador; los del catálogo base no se borran.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="rounded-lg border border-black/10 px-4 py-2.5 text-sm font-semibold text-[#111318] dark:border-white/15 dark:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeletePlayer}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:brightness-110"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  selectedPlayerId,
  setSelectedPlayerId,
  setScreen,
  profileNavGateRef,
}) => {
  const { club, results, knockoutMerged, rankingsByLeague } = useTennisLiveData();
  const players = Array.isArray(club.players) ? club.players : [];
  const tournaments = Array.isArray(club.tournaments) ? club.tournaments : [];

  const globalRankingRows = useMemo(() => {
    if (getDataSourceMode() === 'api') {
      return buildGlobalRankingRowsFromLeagueMap(rankingsByLeague, players);
    }
    return buildGlobalRankingRowsFromResults(players, tournaments, results, knockoutMerged);
  }, [rankingsByLeague, players, tournaments, results, knockoutMerged]);

  const displayPlayer = useMemo((): DisplayPlayer | null => {
    const toDisplay = (p: Player, position: number): DisplayPlayer => {
      const safeName = String(p.name ?? 'Jugador').trim() || 'Jugador';
      const initial = safeName
        .split(/\s+/)
        .map((n) => n[0])
        .filter(Boolean)
        .join('')
        .slice(0, 2);
      return mergeAlvarezDemoPlayerFields({ ...p, name: safeName, position, initial });
    };

    const resolve = (id: string | undefined): DisplayPlayer | null => {
      if (!id?.trim()) return null;
      const pid = id.trim();
      const fromRoster = players.find((x) => x.id === pid) ?? getPlayerById(pid);
      if (fromRoster) {
        const idx = globalRankingRows.findIndex((r) => r.playerId === pid);
        return toDisplay(withCanonicalPlayerId(pid, fromRoster), idx >= 0 ? idx + 1 : 0);
      }
      for (const rows of rankingsByLeague.values()) {
        const cr = rows.find((r) => r.playerId === pid);
        if (cr) {
          const fromRanking = resolvePlayerForPublicRanking(cr, players);
          return toDisplay(fromRanking, cr.position);
        }
      }
      if (getDataSourceMode() === 'api') {
        return toDisplay(buildStubPlayerForProfileId(pid), 0);
      }
      return null;
    };

    if (selectedPlayerId) {
      return resolve(selectedPlayerId);
    }
    const defId = getDefaultProfilePlayerId();
    if (defId) {
      const a = resolve(defId);
      if (a) return a;
    }
    const fid = players[0]?.id;
    if (fid) return resolve(fid);
    return null;
  }, [selectedPlayerId, players, globalRankingRows, rankingsByLeague]);

  if (!displayPlayer) {
    return (
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-10 sm:px-6 md:py-12">
        <div className="app-glass-panel rounded-2xl border border-black/[0.06] p-10 text-center shadow-sm dark:border-white/10">
          <p className="text-lg font-semibold text-[#111318] dark:text-white">Jugador no encontrado</p>
          <p className="mt-2 text-sm text-[#616f89] dark:text-gray-400">
            No hay jugadores cargados o el identificador no coincide con el plantel actual.
          </p>
        </div>
      </main>
    );
  }

  const isAdminViewer = readIsAdmin();
  /** Alta/edición/baja de jugadores solo en `/admin/jugadores`, nunca en el sitio público aunque haya sesión admin. */
  const canEditProfile = false;

  if (!isPlayerProfileListingVisible(displayPlayer, isAdminViewer)) {
    return (
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-10 sm:px-6 md:py-12">
        <div className="app-glass-panel rounded-2xl border border-black/[0.06] p-10 text-center shadow-sm dark:border-white/10">
          <p className="text-lg font-semibold text-[#111318] dark:text-white">Perfil no disponible</p>
          <p className="mt-2 text-sm text-[#616f89] dark:text-gray-400">
            Este jugador tiene el perfil oculto en los listados públicos.
          </p>
          {setScreen ? (
            <button
              type="button"
              onClick={() => setScreen('players')}
              className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:brightness-110"
            >
              Volver a jugadores
            </button>
          ) : null}
        </div>
      </main>
    );
  }

  const canonicalPlayerId = (selectedPlayerId?.trim() || displayPlayer.id).trim();

  return (
    <ProfileScreenInner
      displayPlayer={displayPlayer}
      canonicalPlayerId={canonicalPlayerId}
      setSelectedPlayerId={setSelectedPlayerId}
      setScreen={setScreen}
      profileNavGateRef={profileNavGateRef}
      canEditProfile={canEditProfile}
      club={club}
      results={results}
      knockoutMerged={knockoutMerged}
      players={players}
      globalRankingRows={globalRankingRows}
      rankingsByLeague={rankingsByLeague}
    />
  );
};

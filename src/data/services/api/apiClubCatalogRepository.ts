import type { ClubDataSnapshot } from '@/data/types';
import type { ClubCatalogPort } from '../contracts/clubCatalogPort';
import type { Match, Player, Tournament } from '@/lib/mockData';
import { leagueToCategory, type CategoryKey, type LeagueNum } from '@/lib/mockData';
import { getPublicPlayers, getPublicTournamentBySlug, getPublicTournaments } from '@/lib/api/apiClient';
import { buildClubDataDefaults } from '@/lib/clubDataDefaults';

const EMPTY_SNAPSHOT: ClubDataSnapshot = Object.freeze({
  players: [],
  tournaments: [],
  matches: [],
}) as ClubDataSnapshot;

function dateString(value: unknown): string {
  if (typeof value === 'string') return value.slice(0, 10);
  if (value && typeof value === 'object' && 'toISOString' in value) {
    try {
      return (value as Date).toISOString().slice(0, 10);
    } catch {
      return '';
    }
  }
  return '';
}

function obj(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function leagueFromRaw(raw: Record<string, unknown>): LeagueNum {
  const direct = Number(raw.league ?? raw.leagueNum);
  if (Number.isFinite(direct) && direct >= 1 && direct <= 6) return Math.floor(direct) as LeagueNum;
  const leagues = Array.isArray(raw.leagues) ? raw.leagues : [];
  for (const item of leagues) {
    const row = obj(item);
    const n = Number(row?.leagueNum);
    if (Number.isFinite(n) && n >= 1 && n <= 6) return Math.floor(n) as LeagueNum;
  }
  return 3;
}

function mapPlayer(raw: unknown): Player | null {
  const r = obj(raw);
  if (!r) return null;
  const id = typeof r.id === 'string' ? r.id.trim() : '';
  const name = typeof r.displayName === 'string' && r.displayName.trim()
    ? r.displayName.trim()
    : typeof r.name === 'string'
      ? r.name.trim()
      : '';
  const category = typeof r.category === 'string' ? (r.category as CategoryKey) : 'Tercera';
  if (!id || !name) return null;
  return {
    id,
    name,
    category,
    birthDate: dateString(r.birthDate) || undefined,
    nationality: typeof r.nationality === 'string' ? r.nationality : undefined,
    playingHand: r.playingHand === 'Zurdo' || r.playingHand === 'Derecha' ? r.playingHand : undefined,
    heightCm: typeof r.heightCm === 'number' ? r.heightCm : undefined,
    profileBio: typeof r.profileBio === 'string' ? r.profileBio : undefined,
    profileImage: typeof r.profileImage === 'string' ? r.profileImage : undefined,
    profileVisibility: r.profileVisibility === 'hidden' ? 'hidden' : 'visible',
    rosterActive: typeof r.rosterActive === 'boolean' ? r.rosterActive : true,
  };
}

function playersFromGroup(raw: unknown): string[] {
  const g = obj(raw);
  const rows = Array.isArray(g?.players) ? g.players : [];
  const out: string[] = [];
  for (const item of rows) {
    const gp = obj(item);
    const player = obj(gp?.player);
    const pid = typeof gp?.playerId === 'string' ? gp.playerId : typeof player?.id === 'string' ? player.id : '';
    if (pid) out.push(pid);
  }
  return out;
}

function groupRosterOverride(raw: Record<string, unknown>): Record<string, string[]> | undefined {
  const groups = Array.isArray(raw.groups) ? raw.groups : [];
  const out: Record<string, string[]> = {};
  for (const item of groups) {
    const g = obj(item);
    const key = typeof g?.key === 'string' ? g.key.trim() : '';
    if (!key) continue;
    out[key] = playersFromGroup(g);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function mapTournament(raw: unknown): Tournament | null {
  const wrapper = obj(raw);
  const r = obj(wrapper?.tournament) ?? wrapper;
  if (!r) return null;
  const id = typeof r.id === 'string' ? r.id.trim() : '';
  const name = typeof r.name === 'string' ? r.name.trim() : '';
  if (!id || !name) return null;
  const league = leagueFromRaw({ ...r, leagues: wrapper?.leagues ?? r.leagues });
  return {
    id,
    name,
    category: leagueToCategory(league),
    tournamentType: r.tournamentType === 'masters1000' ? 'masters1000' : 'greek500',
    status: r.status === 'finished' ? 'finished' : 'upcoming',
    startDate: dateString(r.startDate),
    endDate: dateString(r.endDate),
    location: typeof r.location === 'string' ? r.location : 'Greek Tennis',
    coverImage: typeof r.coverImage === 'string' ? r.coverImage : undefined,
    league,
    slotsTotal: typeof r.slotsTotal === 'number' ? r.slotsTotal : undefined,
    slotsTaken: typeof r.slotsTaken === 'number' ? r.slotsTaken : undefined,
    winnerId: typeof r.winnerId === 'string' ? r.winnerId : null,
    finalistId: typeof r.finalistId === 'string' ? r.finalistId : null,
    ligaDoc: obj(r.ligaDoc) as Tournament['ligaDoc'] | undefined,
    groupRosterOverride: groupRosterOverride(wrapper ?? r),
    preclasificacion: obj(r.preclasificacionJson ?? wrapper?.preclasificacion) as Tournament['preclasificacion'] | undefined,
  };
}

function mapMatch(raw: unknown): Match | null {
  const r = obj(raw);
  if (!r) return null;
  const id = typeof r.id === 'string' ? r.id : '';
  const tournamentId = typeof r.tournamentId === 'string' ? r.tournamentId : '';
  const playerA = typeof r.player1Id === 'string' ? r.player1Id : '';
  const playerB = typeof r.player2Id === 'string' ? r.player2Id : '';
  if (!id || !tournamentId || !playerA || !playerB) return null;
  return {
    id,
    tournamentId,
    playerA,
    playerB,
    score: typeof r.score === 'string' ? r.score : '',
    winnerId: typeof r.winnerId === 'string' ? r.winnerId : null,
    round: typeof r.roundLabel === 'string' ? r.roundLabel : undefined,
    scheduledDate: dateString(r.scheduledDate) || undefined,
    scheduledTime: typeof r.scheduledTime === 'string' ? r.scheduledTime : undefined,
  };
}

async function fetchApiSnapshot(): Promise<ClubDataSnapshot> {
  const [playersRaw, tournamentsRaw] = await Promise.all([getPublicPlayers(), getPublicTournaments()]);
  const players = playersRaw.map(mapPlayer).filter((p): p is Player => p != null);

  const details = await Promise.allSettled(
    tournamentsRaw.map((row) => {
      const r = obj(row);
      const slug = typeof r?.slug === 'string' && r.slug.trim() ? r.slug.trim() : typeof r?.id === 'string' ? r.id : '';
      return slug ? getPublicTournamentBySlug(slug) : Promise.resolve(row);
    }),
  );

  const tournaments: Tournament[] = [];
  const matches: Match[] = [];
  tournamentsRaw.forEach((base, index) => {
    const detail = details[index];
    const raw = detail?.status === 'fulfilled' ? detail.value : base;
    const tournament = mapTournament(raw);
    if (tournament) tournaments.push(tournament);
    const mRows = Array.isArray(obj(raw)?.matches) ? (obj(raw)?.matches as unknown[]) : [];
    for (const row of mRows) {
      const mapped = mapMatch(row);
      if (mapped) matches.push(mapped);
    }
  });

  return { players, tournaments, matches };
}

export function createApiClubCatalogRepository(): ClubCatalogPort {
  const localFallback = buildClubDataDefaults();
  const listeners = new Set<() => void>();
  let snapshot: ClubDataSnapshot = import.meta.env.DEV
    ? { players: localFallback.defaultPlayers, tournaments: localFallback.defaultTournaments, matches: [] }
    : EMPTY_SNAPSHOT;

  function emit(): void {
    listeners.forEach((l) => l());
  }

  async function reload(): Promise<void> {
    try {
      snapshot = await fetchApiSnapshot();
      emit();
    } catch (e) {
      console.error('[apiClubCatalog] no se pudo cargar catalogo publico', e);
      if (import.meta.env.DEV) {
        snapshot = { players: localFallback.defaultPlayers, tournaments: localFallback.defaultTournaments, matches: [] };
        emit();
      }
    }
  }

  void reload();

  return {
    getSnapshot(): ClubDataSnapshot {
      return snapshot;
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    refresh(): void {
      void reload();
    },
  };
}

import { describe, expect, it, vi } from 'vitest';
import { createApiClubCatalogRepository } from '../apiClubCatalogRepository';

vi.mock('@/lib/api/apiClient', () => ({
  getPublicPlayers: vi.fn(async () => [
    {
      id: 'p-db-1',
      name: 'Jugador Uno',
      category: 'Segunda',
      profileVisibility: 'active',
      rosterActive: true,
    },
    {
      id: 'p-db-2',
      name: 'Jugador Dos',
      category: 'Segunda',
      profileVisibility: 'active',
      rosterActive: true,
    },
  ]),
  getPublicTournaments: vi.fn(async () => [
    {
      id: 't-db',
      slug: 'torneo-db',
      name: 'Torneo DB',
      status: 'upcoming',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-01-31T00:00:00.000Z',
      location: 'Greek Tennis',
      leagues: [{ leagueNum: 2 }],
    },
  ]),
  getPublicTournamentBySlug: vi.fn(async () => ({
    tournament: {
      id: 't-db',
      slug: 'torneo-db',
      name: 'Torneo DB',
      status: 'upcoming',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-01-31T00:00:00.000Z',
      location: 'Greek Tennis',
    },
    leagues: [{ leagueNum: 2 }],
    groups: [
      {
        key: 'A',
        players: [{ playerId: 'p-db-1' }, { playerId: 'p-db-2' }],
      },
    ],
    matches: [
      {
        id: 'm-db-1',
        tournamentId: 't-db',
        player1Id: 'p-db-1',
        player2Id: 'p-db-2',
        winnerId: 'p-db-1',
        score: '6-4, 6-4',
        roundLabel: 'Grupo A - Fecha 1',
      },
    ],
  })),
}));

function waitForCatalogLoad(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('createApiClubCatalogRepository', () => {
  it('hydrates catalog using database ids instead of names', async () => {
    const repo = createApiClubCatalogRepository();
    await waitForCatalogLoad();

    const snapshot = repo.getSnapshot();
    expect(snapshot.players.map((p) => p.id)).toEqual(['p-db-1', 'p-db-2']);
    expect(snapshot.tournaments[0]).toMatchObject({
      id: 't-db',
      league: 2,
      groupRosterOverride: { A: ['p-db-1', 'p-db-2'] },
    });
    expect(snapshot.matches[0]).toMatchObject({
      id: 'm-db-1',
      tournamentId: 't-db',
      playerA: 'p-db-1',
      playerB: 'p-db-2',
      winnerId: 'p-db-1',
    });
  });
});

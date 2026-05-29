import { describe, expect, it } from 'vitest';
import { mapPublicGroupStandingsToTables, type PublicGroupStandingsPayload } from '../publicGroupStandingsApi';
import type { Tournament } from '@/lib/mockData';

const tournament: Tournament = {
  id: 't-novak-l2',
  name: 'Novak L2',
  category: 'intermedio',
  league: 2,
  status: 'upcoming',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  slotsTotal: 12,
  slotsTaken: 12,
};

describe('mapPublicGroupStandingsToTables', () => {
  it('maps API rows to GroupTableWithSets', () => {
    const payload: PublicGroupStandingsPayload = {
      tournamentId: 't-novak-l2',
      groups: [
        {
          key: 'A',
          name: 'Grupo A',
          rows: [
            {
              position: 1,
              playerId: 'p-l2-test',
              playerName: 'Jugador Test',
              PJ: 3,
              PG: 2,
              PP: 1,
              setsWon: 5,
              setsLost: 3,
              gamesWon: 30,
              gamesLost: 24,
              setDiff: 2,
            },
          ],
        },
      ],
    };

    const tables = mapPublicGroupStandingsToTables(payload, tournament);
    expect(tables).toHaveLength(1);
    expect(tables[0]!.name).toBe('Grupo A');
    expect(tables[0]!.rows[0]).toMatchObject({
      position: 1,
      PJ: 3,
      PG: 2,
      PP: 1,
      setsWon: 5,
      setsLost: 3,
      setDiff: 2,
    });
  });
});

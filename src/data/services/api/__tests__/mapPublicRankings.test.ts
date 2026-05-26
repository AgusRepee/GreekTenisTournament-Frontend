import { describe, expect, it } from 'vitest';
import { mapPublicRankingsResponse } from '../mapPublicRankings';

describe('mapPublicRankingsResponse', () => {
  it('rellena una liga desde leagueRows si byLeague viene incompleto', () => {
    const mapped = mapPublicRankingsResponse({
      byLeague: {
        1: [],
        2: [],
        3: [],
        4: [],
        5: [],
        6: [],
      },
      leagueRows: [
        {
          playerId: 'p-l5nd-peralta-g',
          league: 5,
          points: 170,
          played: 5,
          wins: 3,
          losses: 2,
          player: { name: 'Peralta G.', category: 'Quinta A' },
        },
        {
          playerId: 'p-l5nd-oviedo-m',
          league: 5,
          points: 160,
          played: 5,
          wins: 2,
          losses: 3,
          player: { name: 'Oviedo M.', category: 'Quinta A' },
        },
      ],
    });

    expect(mapped.get(5)?.map((row) => [row.position, row.playerId, row.points])).toEqual([
      [1, 'p-l5nd-peralta-g', 170],
      [2, 'p-l5nd-oviedo-m', 160],
    ]);
  });
});

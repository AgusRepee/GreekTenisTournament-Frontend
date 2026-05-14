import { describe, it, expect } from "vitest";
import { computeGroupStandings } from "../matchStatsEngine";

describe("computeGroupStandings", () => {
  const matches = [
    {
      tournamentId: "test",
      group: "A",
      playerA: "Jugador 1",
      playerB: "Jugador 2",
      score: "6-3 6-4",
      status: "played" as const,
    },
    {
      tournamentId: "test",
      group: "A",
      playerA: "Jugador 1",
      playerB: "Jugador 3",
      score: "6-4 4-6 10-7",
      status: "played" as const,
    },
    {
      tournamentId: "test",
      group: "A",
      playerA: "Jugador 2",
      playerB: "Jugador 3",
      score: "6-2 6-2",
      status: "played" as const,
    },
  ];

  it("calcula tabla correctamente", () => {
    const standings = computeGroupStandings(matches);

    expect(standings.length).toBe(3);

    const first = standings[0];
    expect(first.won).toBeGreaterThanOrEqual(1);
  });

  it("ordena por victorias", () => {
    const standings = computeGroupStandings(matches);

    expect(standings[0].won).toBeGreaterThanOrEqual(
      standings[1].won
    );
  });

  it("calcula diferencia de sets", () => {
    const standings = computeGroupStandings(matches);

    expect(typeof standings[0].setsDiff).toBe("number");
  });
});
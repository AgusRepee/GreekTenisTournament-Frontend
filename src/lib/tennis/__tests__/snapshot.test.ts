import { describe, it, expect } from "vitest";
import { computeTournamentSnapshot } from "../computeTournamentSnapshot";

describe("computeTournamentSnapshot", () => {
  const meta = {
    id: "test",
    name: "Torneo Test",
    liga: 1,
    status: "ongoing" as const,
  };

  const template = {
    grupos: {
      A: ["Jugador 1", "Jugador 2", "Jugador 3"],
    },
  };

  const results = [
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
  ];

  it("genera snapshot correctamente", () => {
    const snapshot = computeTournamentSnapshot(
      meta,
      template,
      results
    );

    expect(snapshot.groups.A).toBeDefined();
    expect(snapshot.globalStats.length).toBeGreaterThan(0);
  });

  it("incluye standings", () => {
    const snapshot = computeTournamentSnapshot(
      meta,
      template,
      results
    );

    expect(snapshot.groups.A.standings.length).toBe(3);
  });
});
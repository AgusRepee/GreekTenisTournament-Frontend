import { describe, it, expect } from "vitest";
import {
  calculateRanking,
  calculateSetDifference,
  calculateStandings,
  engineMatchesToMatchInputs,
  setsTallyToScoreString,
} from "../tournamentEngine";

describe("tournamentEngine", () => {
  describe("setsTallyToScoreString", () => {
    it("2-0 produce dos sets para el jugador 1", () => {
      expect(setsTallyToScoreString(2, 0)).toBe("6-4 6-4");
    });
    it("2-1 alterna sets", () => {
      expect(setsTallyToScoreString(2, 1)).toBe("6-4 4-6 6-4");
    });
  });

  describe("engineMatchesToMatchInputs", () => {
    it("omite partidos incompletos", () => {
      const out = engineMatchesToMatchInputs([
        { player1: "A", player2: "B", sets1: 1, sets2: 0 },
        { player1: "A", player2: "B", sets1: 2, sets2: 0 },
      ]);
      expect(out).toHaveLength(1);
      expect(out[0].playerA).toBe("A");
      expect(out[0].playerB).toBe("B");
      expect(out[0].status).toBe("played");
    });
  });

  describe("calculateStandings", () => {
    it("deriva posiciones solo desde partidos", () => {
      const players = ["Ana", "Bea", "Carla"];
      const matches = [
        { player1: "Ana", player2: "Bea", sets1: 2, sets2: 0 },
        { player1: "Ana", player2: "Carla", sets1: 2, sets2: 1 },
        { player1: "Bea", player2: "Carla", sets1: 0, sets2: 2 },
      ];
      const standings = calculateStandings(matches, players);
      expect(standings).toHaveLength(3);
      const ana = standings.find((r) => r.player === "Ana");
      const bea = standings.find((r) => r.player === "Bea");
      expect(ana?.won).toBe(2);
      expect(bea?.won).toBe(0);
      expect(standings[0].won).toBeGreaterThanOrEqual(standings[1].won);
    });

    it("incluye jugadores sin partidos con ceros", () => {
      const matches = [
        { player1: "A", player2: "B", sets1: 2, sets2: 0 },
      ];
      const standings = calculateStandings(matches, ["A", "B", "C"]);
      const c = standings.find((r) => r.player === "C");
      expect(c?.played).toBe(0);
      expect(c?.won).toBe(0);
    });
  });

  describe("calculateSetDifference", () => {
    it("suma sets ganados y perdidos del jugador", () => {
      const matches = [
        { player1: "X", player2: "Y", sets1: 2, sets2: 1 },
        { player1: "Z", player2: "X", sets1: 2, sets2: 0 },
      ];
      // X: 2-1 vs Y (+1 net sets), 0-2 vs Z (-2 net) => sets won 2+0, lost 1+2 => diff -1
      const diff = calculateSetDifference("X", matches);
      expect(diff).toBe(-1);
    });
  });

  describe("calculateRanking", () => {
    it("agrega varios torneos y ordena por victorias", () => {
      const ranking = calculateRanking([
        {
          id: "t1",
          matches: [
            { player1: "P1", player2: "P2", sets1: 2, sets2: 0 },
          ],
        },
        {
          id: "t2",
          matches: [
            { player1: "P1", player2: "P3", sets1: 2, sets2: 0 },
          ],
        },
      ]);
      const p1 = ranking.find((r) => r.player === "P1");
      expect(p1?.position).toBe(1);
      expect(p1?.won).toBe(2);
      expect(p1?.lost).toBe(0);
    });
  });
});

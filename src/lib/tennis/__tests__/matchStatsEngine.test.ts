import { describe, it, expect } from "vitest";
import { parseMatchScore, resolvePlayerAlias } from "../matchStatsEngine";

describe("parseMatchScore", () => {
  it("parsea sets corridos", () => {
    const result = parseMatchScore("6-3 6-4");

    expect(result.setsWonA).toBe(2);
    expect(result.setsWonB).toBe(0);
  });

  it("parsea match tie-break", () => {
    const result = parseMatchScore("6-4 4-6 10-2");

    expect(result.setsWonA).toBe(2);
    expect(result.sets.length).toBe(3);
  });

  it("parsea tie-break normal", () => {
    const result = parseMatchScore("7-6(5) 6-3");

    expect(result.sets[0].tiebreak).toBe(5);
  });

  it("detecta error en marcador inválido", () => {
    expect(() => parseMatchScore("6-5")).toThrow();
  });

  it("rechaza empate", () => {
    expect(() => parseMatchScore("6-4 4-6")).toThrow();
  });

  it("rechaza match tie-break inválido", () => {
    expect(() => parseMatchScore("10-9")).toThrow();
  });

  it("soporta separadores mixtos", () => {
    const result = parseMatchScore("6-4, 4-6; 10-2");

    expect(result.sets.length).toBe(3);
  });

  it("detecta retiro", () => {
    // Sin punto final tras RET: si no, el motor puede dejar un segmento "." al quitar "RET".
    const result = parseMatchScore("6-3 RET");

    expect(result.isRetired).toBe(true);
  });

  it("acepta tercer set a games si no se exige modo admin (legacy)", () => {
    const result = parseMatchScore("6-4 4-6 6-2");
    expect(result.setsWonA).toBe(2);
    expect(result.sets[2]!.isMatchTiebreak).toBe(false);
  });

  it("en modo admin exige Super Tie-Break si hay tres segmentos", () => {
    expect(() => parseMatchScore("6-4 4-6 6-3", { requireThirdSetSuperTiebreak: true })).toThrow();
    expect(() => parseMatchScore("6-4 4-6 10-8", { requireThirdSetSuperTiebreak: true })).not.toThrow();
  });
});

describe("resolvePlayerAlias", () => {
  const registry = [{ name: "Monzon M.", id: "p-l2-monzon-m" }];

  it("empareja nombre con tilde en partido contra roster sin tilde", () => {
    expect(resolvePlayerAlias("Monzón M.", registry)).toBe("Monzon M.");
  });

  it("empareja roster sin tilde consigo mismo", () => {
    expect(resolvePlayerAlias("Monzon M.", registry)).toBe("Monzon M.");
  });
});
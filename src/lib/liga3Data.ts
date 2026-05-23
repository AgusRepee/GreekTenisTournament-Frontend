/**
 * Torneo Novak Djokovic – Liga 3.
 * Estado inicial: fixture y planteles definidos; sin resultados (grupos ni eliminación).
 * Para cargar partidos: añadir filas a `LIGA3_GROUP_RESULTS` y partidos en `LIGA3_BRACKET_MATCHES`.
 */

export const LIGA3_TOURNAMENT_ID = 't-novak-l3';

/** Jugadores del torneo (solo para este torneo). ID interno para bracket/datos. */
export const LIGA3_PLAYERS: { id: string; name: string }[] = [
  { id: 'l3-pusterla', name: 'Pusterla P.' },
  { id: 'l3-santi-m', name: 'Santi M.' },
  { id: 'l3-rusel', name: 'Rusel S.' },
  { id: 'l3-bocchicchio', name: 'Bocchicchio F.' },h
  { id: 'l3-repecka', name: 'Repecka A.' },
  { id: 'l3-marin', name: 'Marin G.' },
  { id: 'l3-fernandez', name: 'Fernandez B.' },
  { id: 'l3-casadio', name: 'Casadio M.' },
  { id: 'l3-aguirre', name: 'Aguirre W.' },
  { id: 'l3-bianco', name: 'Bianco D.' },
  { id: 'l3-vito', name: 'Vito C.' },
  { id: 'l3-santi-g', name: 'Santi G.' },
  { id: 'l3-delvalle', name: 'Del Valle G.' },
  { id: 'l3-ferreres', name: 'Ferreres G.' },
  { id: 'l3-figueroa', name: 'Figueroa M.' },
  ];

const nameToId: Record<string, string> = Object.fromEntries(LIGA3_PLAYERS.map((p) => [p.name, p.id]));
export function getLiga3Id(name: string): string {
    return nameToId[name] ?? name;
}

/** Preclasificación del torneo (1-15). Cabezas de grupo: 1, 2, 3 (Grupo A, B, C). */
export const LIGA3_PRECLASIFICACION: Record<string, number> = {
    'l3-repecka': 1, // cabeza Grupo A
    'l3-marin': 2, // cabeza Grupo B
    'l3-vito': 3, // cabeza Grupo C
    'l3-delvalle': 4,
    'l3-aguirre': 5,
    'l3-pusterla': 6,
    'l3-casadio': 7,
    'l3-rusel': 8,
    'l3-bianco': 9,
    'l3-bocchicchio': 10,
    'l3-santi-m': 11,
    'l3-ferreres': 12,
    'l3-santi-g': 13,
    'l3-fernandez': 14,
    'l3-figueroa': 15,
};
export function getLiga3Preclasificacion(playerId: string): number | undefined {
    return LIGA3_PRECLASIFICACION[playerId];
}
export function getLiga3PlayerById(id: string): { id: string; name: string } | undefined {
    return LIGA3_PLAYERS.find((p) => p.id === id);
}
export function getLiga3PlayerByName(name: string): { id: string; name: string } | undefined {
    return LIGA3_PLAYERS.find((p) => p.name === name);
}

/** Resultado de un partido de fase de grupos */
export interface Liga3GroupMatchResult {
    groupName: string;
    fecha: number;
    playerA: string;
    playerB: string;
    score: string;
    winner: string;
    date: string;
    time: string;
}

/** Partidos de grupos con resultado. Vacío hasta que cargues fechas jugadas. */
export const LIGA3_GROUP_RESULTS: Liga3GroupMatchResult[] = [];

/** Plantilla por grupo (mismo orden que `LIGA3_GROUP_FIXTURES` en mockData) para tablas 0-0 sin partidos. */
const LIGA3_GROUP_ROSTERS: Record<string, string[]> = {
    'Grupo A': ['Santi M.', 'Rusel S.', 'Repecka A.', 'Pusterla P.', 'Bocchicchio F.'],
    'Grupo B': ['Fernandez B.', 'Marin G.', 'Casadio M.', 'Bianco D.', 'Aguirre W.'],
    'Grupo C': ['Santi G.', 'Figueroa M.', 'Del Valle G.', 'Ferreres G.', 'Vito C.'],
};

/** Partidos de fase de grupos con resultado (para "Partidos por fase de grupos") */
export function getLiga3GroupStageResults(): Liga3GroupMatchResult[] {
    return LIGA3_GROUP_RESULTS;
}

const POINTS_WIN = 3;
const POINTS_LOSS = 0;

function parseScoreTotals(score: string): { setsA: number; setsB: number; gamesA: number; gamesB: number } {
    const parts = score.split(',').map((s) => s.trim().split('-').map(Number));
    let setsA = 0;
    let setsB = 0;
    let gamesA = 0;
    let gamesB = 0;
    for (const [a, b] of parts) {
          if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
          gamesA += a;
          gamesB += b;
          if (a > b) setsA++;
          else if (b > a) setsB++;
    }
    return { setsA, setsB, gamesA, gamesB };
}

/** Standings por jugador (solo fase de grupos) */
export interface Liga3StandingRow {
    playerId: string;
    playerName: string;
    PJ: number;
    PG: number;
    PP: number;
    setsWon: number;
    setsLost: number;
    gamesWon: number;
    gamesLost: number;
    setDiff: number;
    points: number;
    /** Cambio de posición respecto a la fecha anterior: +2 = subió 2, -1 = bajó 1 */
  positionChange?: number;
}

function emptyStandingsForGroup(groupName: string): Liga3StandingRow[] {
    const names = LIGA3_GROUP_ROSTERS[groupName] ?? [];
    return names
      .map((name) => ({
              playerId: getLiga3Id(name),
              playerName: name,
              PJ: 0,
              PG: 0,
              PP: 0,
              setsWon: 0,
              setsLost: 0,
              gamesWon: 0,
              gamesLost: 0,
              setDiff: 0,
              points: 0,
      }))
      .sort((a, b) => (LIGA3_PRECLASIFICACION[a.playerId] ?? 999) - (LIGA3_PRECLASIFICACION[b.playerId] ?? 999));
}

function buildGroupStandings(groupName: string, upToFecha?: number): Liga3StandingRow[] {
    const matches = LIGA3_GROUP_RESULTS.filter(
          (m) => m.groupName === groupName && (upToFecha == null || m.fecha <= upToFecha)
        );
    if (matches.length === 0) {
          return emptyStandingsForGroup(groupName);
    }
    const map = new Map<string, Liga3StandingRow>();
    for (const m of matches) {
          const { setsA, setsB, gamesA, gamesB } = parseScoreTotals(m.score);
          for (const name of [m.playerA, m.playerB]) {
                  if (!map.has(name)) {
                            map.set(name, {
                                        playerId: getLiga3Id(name),
                                        playerName: name,
                                        PJ: 0,
                                        PG: 0,
                                        PP: 0,
                                        setsWon: 0,
                                        setsLost: 0,
                                        gamesWon: 0,
                                        gamesLost: 0,
                                        setDiff: 0,
                                        points: 0,
                            });
                  }
          }
          const rowA = map.get(m.playerA)!;
          const rowB = map.get(m.playerB)!;
          rowA.PJ++;
          rowB.PJ++;
          rowA.setsWon += setsA;
          rowA.setsLost += setsB;
          rowA.gamesWon += gamesA;
          rowA.gamesLost += gamesB;
          rowB.setsWon += setsB;
          rowB.setsLost += setsA;
          rowB.gamesWon += gamesB;
          rowB.gamesLost += gamesA;
          if (m.winner === m.playerA) {
                  rowA.PG++;
                  rowA.points += POINTS_WIN;
                  rowB.PP++;
                  rowB.points += POINTS_LOSS;
          } else {
                  rowB.PG++;
                  rowB.points += POINTS_WIN;
                  rowA.PP++;
                  rowA.points += POINTS_LOSS;
          }
    }
    const rows = Array.from(map.values()).map((r) => ({
          ...r,
          setDiff: r.setsWon - r.setsLost,
    }));
    rows.sort((a, b) => b.points - a.points || b.setDiff - a.setDiff);
    return rows;
}

export function getLiga3GroupStandings(): { name: string; rows: Liga3StandingRow[] }[] {
    const groups: { name: string; rows: Liga3StandingRow[] }[] = [];
    for (const name of ['Grupo A', 'Grupo B', 'Grupo C']) {
          const current = buildGroupStandings(name);
          const previous = buildGroupStandings(name, 4);
          const prevPosByPlayer = new Map<string, number>();
          previous.forEach((r, i) => prevPosByPlayer.set(r.playerId, i + 1));
          current.forEach((r, i) => {
                  const prevPos = prevPosByPlayer.get(r.playerId);
                  r.positionChange = prevPos != null ? prevPos - (i + 1) : undefined;
          });
          groups.push({ name, rows: current });
    }
    return groups;
}

/** Clasificación general del torneo (15 jugadores: grupos + eliminación). Para eliminación sumamos puntos por partidos jugados. */
export interface Liga3TournamentRankingRow {
    position: number;
    playerId: string;
    playerName: string;
    PJ: number;
    PG: number;
    PP: number;
    setsWon: number;
    setsLost: number;
    gamesWon: number;
    gamesLost: number;
    points: number;
}

/** Partidos del cuadro de eliminación (IDs l3-). Vacío hasta definir cuadro con resultados. */
export const LIGA3_BRACKET_MATCHES: Array<{
    id: string;
    playerA: string;
    playerB: string;
    score: string;
    winnerId: string | null;
    round: string;
    scheduledDate?: string;
    scheduledTime?: string;
}> = [];

/** Estado del torneo */
export const LIGA3_STATUS = 'Fase de grupos – sin resultados (calendario y fixture listos)';

/** Final del cuadro (si existe en `LIGA3_BRACKET_MATCHES`). */
export function getLiga3FinalMatch(): { playerA: string; playerB: string; date: string; time: string } | null {
    const f = LIGA3_BRACKET_MATCHES.find((m) => m.round === 'Final');
    if (!f) return null;
    const pa = getLiga3PlayerById(f.playerA);
    const pb = getLiga3PlayerById(f.playerB);
    return {
          playerA: pa?.name ?? f.playerA,
          playerB: pb?.name ?? f.playerB,
          date: f.scheduledDate ?? '—',
          time: f.scheduledTime ?? '—',
    };
}

/** Sistema de puntos Liga 3 */
export const LIGA3_POINTS_SYSTEM = [
  { result: 'Victoria', points: 3 },
  { result: 'Derrota', points: 0 },
  ];

/** Criterios de clasificación */
export const LIGA3_CLASSIFICATION_RULES =
    'Clasifican los mejores de cada grupo según: 1) Puntos; 2) Diferencia de sets; 3) Enfrentamiento directo.';

/** Calendario cronológico: grupos + eliminación */
export interface Liga3CalendarEntry {
    date: string;
    time: string;
    phase: string;
    result: string;
    playerA: string;
    playerB: string;
    group?: string;
}

export function getLiga3Calendar(): Liga3CalendarEntry[] {
    if (LIGA3_GROUP_RESULTS.length === 0 && LIGA3_BRACKET_MATCHES.length === 0) {
          return [];
    }
    const entries: Liga3CalendarEntry[] = LIGA3_GROUP_RESULTS.map((m) => ({
          date: m.date,
          time: m.time,
          phase: `Fecha ${m.fecha} – ${m.groupName}`,
          result: m.score,
          playerA: m.playerA,
          playerB: m.playerB,
          group: m.groupName,
    }));
    const qf = LIGA3_BRACKET_MATCHES.filter((m) => m.round === 'Cuartos de final');
    const sf = LIGA3_BRACKET_MATCHES.filter((m) => m.round === 'Semifinales');
    const fin = LIGA3_BRACKET_MATCHES.find((m) => m.round === 'Final');
    for (const m of qf) {
          const pa = getLiga3PlayerById(m.playerA)?.name ?? m.playerA;
          const pb = getLiga3PlayerById(m.playerB)?.name ?? m.playerB;
          entries.push({ date: 'Sáb 29 Mar', time: m.scheduledTime ?? '', phase: 'Cuartos de final', result: m.score || '—', playerA: pa, playerB: pb });
    }
    for (const m of sf) {
          const pa = getLiga3PlayerById(m.playerA)?.name ?? m.playerA;
          const pb = getLiga3PlayerById(m.playerB)?.name ?? m.playerB;
          entries.push({ date: 'Dom 30 Mar', time: m.scheduledTime ?? '', phase: 'Semifinales', result: m.score || '—', playerA: pa, playerB: pb });
    }
    if (fin) {
          const pa = getLiga3PlayerById(fin.playerA)?.name ?? fin.playerA;
          const pb = getLiga3PlayerById(fin.playerB)?.name ?? fin.playerB;
          entries.push({ date: 'Dom 6 Abr', time: fin.scheduledTime ?? '', phase: 'Final', result: 'Pendiente', playerA: pa, playerB: pb });
    }
    return entries;
}

/** Puntos por fase de eliminación (mismo criterio que en Resumen/Reglamento). */
const LIGA3_ELIM_POINTS = { champion: 500, finalist: 350, semifinal: 200, quarterfinal: 100 } as const;

/** Ranking del torneo: solo puntos por fase superada (no por partidos ganados/perdidos). */
export function getLiga3TournamentRanking(): Liga3TournamentRankingRow[] {
    const groups = getLiga3GroupStandings();
    const allRows: Liga3StandingRow[] = groups.flatMap((g) => g.rows);
    const byId = new Map<string, Liga3StandingRow>();
    for (const r of allRows) {
          byId.set(r.playerId, { ...r });
    }
    for (const m of LIGA3_BRACKET_MATCHES) {
          if (m.winnerId) {
                  for (const id of [m.playerA, m.playerB]) {
                            if (!byId.has(id)) {
                                        const p = getLiga3PlayerById(id);
                                        byId.set(id, {
                                                      playerId: id,
                                                      playerName: p?.name ?? id,
                                                      PJ: 0,
                                                      PG: 0,
                                                      PP: 0,
                                                      setsWon: 0,
                                                      setsLost: 0,
                                                      gamesWon: 0,
                                                      gamesLost: 0,
                                                      setDiff: 0,
                                                      points: 0,
                                        });
                            }
                            const row = byId.get(id)!;
                            row.PJ++;
                            if (m.winnerId === id) row.PG++;
                            else row.PP++;
                  }
          }
    }

  const finalMatch = LIGA3_BRACKET_MATCHES.find((m) => m.round === 'Final');
    const semifinals = LIGA3_BRACKET_MATCHES.filter((m) => m.round === 'Semifinales');
    const quarterfinals = LIGA3_BRACKET_MATCHES.filter((m) => m.round === 'Cuartos de final');

  const phasePoints = new Map<string, number>();
    for (const id of byId.keys()) {
          if (finalMatch && (finalMatch.playerA === id || finalMatch.playerB === id)) {
                  phasePoints.set(id, finalMatch.winnerId === id ? LIGA3_ELIM_POINTS.champion : LIGA3_ELIM_POINTS.finalist);
          } else if (semifinals.some((m) => m.winnerId && (m.playerA === id || m.playerB === id) && m.winnerId !== id)) {
                  phasePoints.set(id, LIGA3_ELIM_POINTS.semifinal);
          } else if (quarterfinals.some((m) => m.winnerId && (m.playerA === id || m.playerB === id) && m.winnerId !== id)) {
                  phasePoints.set(id, LIGA3_ELIM_POINTS.quarterfinal);
          }
    }

  const list = Array.from(byId.values()).map((r) => ({
        position: 0,
        playerId: r.playerId,
        playerName: r.playerName,
        PJ: r.PJ,
        PG: r.PG,
        PP: r.PP,
        setsWon: r.setsWon,
        setsLost: r.setsLost,
        gamesWon: r.gamesWon,
        gamesLost: r.gamesLost,
        points: phasePoints.get(r.playerId) ?? 0,
  }));

  list.sort(
        (a, b) =>
                b.points - a.points ||
                (b.setsWon - b.setsLost) - (a.setsWon - a.setsLost) ||
                a.playerName.localeCompare(b.playerName, 'es')
      );
    list.forEach((r, i) => {
          r.position = i + 1;
    });
    return list;
}

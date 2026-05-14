# Plan de integración (Cursor / desarrollo)

Objetivo: conectar el **motor de tenis** con la UI y `mockData` **sin romper** el sitio actual. Este documento es para quien implemente los cambios en el repo.

## Fuente de verdad

1. **`docs/TENNIS_ENGINE_SPEC.md`** — reglas y contratos conceptuales.
2. **`docs/RESULTADOS_AUTOMATION.md`** — flujo de archivos JSON y formato de `matches`.
3. **`docs/DATA_LOADING.md`** — dónde viven hoy torneos, partidos y ranking en `mockData.ts`.

## Módulos ya presentes (no duplicar)

| Ruta | Rol |
|------|-----|
| `src/types/tennisResults.ts` | Tipos `MatchInput`, `LigaTemplate`, `TournamentMeta`, etc. |
| `src/lib/tennis/resultSchemas.ts` | Zod + `safeParseMatchBatch` / plantilla / registry |
| `src/lib/tennis/matchStatsEngine.ts` | Parse, standings, stats, H2H, puntos por placement |
| `src/lib/tennis/resultsFromDocs.ts` | `loadResultsFromDocs`, `mergeTemplateWithResults` |
| `src/lib/tennis/computeTournamentSnapshot.ts` | `computeTournamentSnapshot`, `getPlayerRecentMatches` |
| `src/lib/tennis/index.ts` | Reexports |
| `src/lib/tennis/__tests__/*.test.ts` | Vitest (`npm run test`) |

## Orden sugerido de integración

### 1. Datos de entrada

- Versionar **`docs/ligaN-resultados.json`** (o import estático equivalente) validado con `safeParseMatchBatch`.
- Opcional: importar **`docs/ligaN.json`** con `safeParseLigaTemplate` cuando se quiera tipar la plantilla en runtime.

### 2. `src/lib/mockData.ts` (o capa intermedia)

- Mantener **jugadores, torneos, fixtures** mientras la UI dependa de ellos.
- Introducir una función que, para un `tournamentId` dado, devuelva un **`TournamentSnapshot`** o filas compatibles con lo que ya pinta `TournamentDetailScreen`.
- **No** borrar de golpe standings manuales hasta que la pantalla muestre los mismos datos o mejor.

### 3. `screens/TournamentDetailScreen.tsx`

- Sustituir gradualmente fuentes de tablas de grupos / stats cuando el snapshot cubra ese torneo.
- Ejemplo de composición: `computeTournamentSnapshot(meta, template, matches)` → `snapshot.groups[group].standings`.
- Usar **`useMemo`** si el snapshot se calcula en el cliente a partir de arrays grandes.

### 4. Perfil / búsqueda de jugador (futuro)

- `getPlayerRecentMatches(player, snapshot, n)` para “últimos partidos”.
- `snapshot.globalStats` o `aggregatePlayerStats` para números agregados del torneo.

### 5. Rankings globales del club (futuro)

- `awardPointsFromPlacement` + tabla de códigos (`champion`, `finalist`, …) según `TENNIS_ENGINE_SPEC.md` §4.5.
- Requiere definir en qué momento se asigna cada código (manual vs derivado del cuadro KO).

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| **Liga 3** (`liga3Data.ts`) | Convivencia: adapter que lea solo ligas 1,2,4,5,6 desde el motor, o migración explícita documentada. |
| **Nombres inconsistentes** | Registry + normalización; mismos strings que `docs/ligaN.json`. |
| **Rendimiento** | Snapshot memoizado; evitar recalcular en cada render. |
| **Duplicación** | Una sola fuente de verdad para resultados del torneo (JSON o mockData, no ambos sin sincronizar). |

## Criterios de “listo”

- `npm run build` y `npm run test` pasan.
- Torneo de prueba muestra standings coherentes con los JSON de resultados.
- Liga 3 sigue funcionando hasta que haya plan de reemplazo.

## Prompt corto para Cursor

```
@docs/TENNIS_ENGINE_SPEC.md @docs/INTEGRATION_PLAN_FOR_CURSOR.md
Integrar snapshot del motor para tournamentId X; no romper Liga 3.
```

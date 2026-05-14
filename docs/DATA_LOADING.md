# Carga de datos (torneos, rankings, partidos)

Guía para actualizar la web sin backend: los datos viven en TypeScript en el repo. Tras cada cambio: build y subida a Hostinger (sitio estático).

## Torneos Novak Djokovic — Ligas 1 a 5

El club trabaja **todas las ligas de la 1 a la 5**. En código, cada una tiene un torneo principal con este `id` (siempre usalo al cargar partidos o al pedir cambios por liga):

| Liga | `tournamentId` | Categoría (`Player.category`) | Notas de implementación actual |
|------|----------------|-------------------------------|--------------------------------|
| 1 | `t-novak` | `Primera` | Cuadro / partidos en `matches` con ese id (ej. `mb-q1`…). Próximos partidos: filas con `scheduledDate` / `scheduledTime`. |
| 2 | `t-novak-l2` | `Segunda` | Partidos en `matches` con `tournamentId: 't-novak-l2'` (agregar o editar según necesiten). |
| 3 | `t-novak-l3` | `Tercera` | **Módulo dedicado** `src/lib/liga3Data.ts`: grupos, resultados, bracket, preclasificación. Fixtures en `LIGA3_GROUP_FIXTURES` (`mockData.ts`). Ranking del torneo se calcula desde resultados allí. |
| 4 | `t-novak-l4` | `Cuarta` | Fixtures de grupos + interzonal: `LIGA4_GROUP_FIXTURES` en `mockData.ts`. Partidos de eliminatoria (si aplica) en `matches` con `t-novak-l4`. |
| 5 | `t-novak-l5` | `Quinta A` | Torneo y cupos en `tournaments`; partidos en `matches` con `t-novak-l5` cuando haya cuadro o fechas. |

**Jugadores del ranking:** viven en `players`; la **liga** de cada uno es su `category` (mapeada a número con `categoryToLeague` en `mockData.ts`). Al actualizar una liga concreta, conviene filtrar por esa categoría y por el `tournamentId` de la tabla de arriba.

Si más adelante se agregan archivos tipo `liga2Data.ts` / `liga5Data.ts` (igual que Liga 3), esta guía se amplía con las nuevas rutas; el flujo sigue siendo el mismo: **indicar siempre la liga (1–5) o el `tournamentId`**.

## Archivos principales

| Qué actualizás | Archivo | Notas |
|----------------|---------|--------|
| Jugadores globales, puntos, PJ/PG/PP, categoría (liga 1–5) | `src/lib/mockData.ts` | El ranking general **se calcula** ordenando `players` por `points` dentro de cada categoría/filtro. |
| Torneos (fechas, estado, ganador, cupos, imagen) | `src/lib/mockData.ts` → `tournaments` | Incluye `t-novak` … `t-novak-l5`. `coverImage`: archivo en `/img`. |
| Partidos (cuadros, resultados, pendientes) **cualquier liga** | `src/lib/mockData.ts` → `matches` | `tournamentId` = uno de la tabla Ligas 1–5. `playerA` / `playerB` / `winnerId` = ids `p-*` de `players`. |
| Partidos destacados / cartelera | `src/lib/mockData.ts` → `featuredMatches`, `upcomingImportantMatches` | Nombres en texto, no ids. |
| Liga 3: grupos, resultados, bracket, preclasificación | `src/lib/liga3Data.ts` | Ids `l3-*` y nombres alineados con fixtures. |
| Fixtures grupos Liga 3 | `src/lib/mockData.ts` → `LIGA3_GROUP_FIXTURES` | Nombres = `LIGA3_PLAYERS` en `liga3Data.ts`. |
| Fixtures grupos + interzonal Liga 4 | `src/lib/mockData.ts` → `LIGA4_GROUP_FIXTURES` | Nombres como string; deben ser los que muestre la UI. |
| Fotos “spotlight” ranking top 17 | `src/lib/mockData.ts` → `RANKING_SPOTLIGHT_VISUAL` + `public/players/` | Vista del top global; el orden real sigue siendo `players[].points`. |

## Convenciones rápidas

- **Ids de jugador global:** `p-0`, `p-1`, … en `players`. Nuevo jugador: id único y `category` acorde a su liga (1→`Primera` … 5→`Quinta A` o `Quinta B` según corresponda).
- **Categorías válidas:** `Primera`, `Segunda`, `Tercera`, `Cuarta`, `Quinta A`, `Quinta B` (`CATEGORIES` en `mockData.ts`).
- **Partido jugado:** `score` tipo `6-4, 6-3`; `winnerId` = id del ganador o `null` si pendiente.
- **Partido pendiente:** `score: ''`, `winnerId: null`, opcional `scheduledDate` (`YYYY-MM-DD`) y `scheduledTime` (`HH:mm`).
- **Fechas de torneo:** `startDate` / `endDate` como `YYYY-MM-DD`.

## Ranking general vs ranking de un torneo

- **Ranking por liga (1–4 en filtro principal) / todos:** derivado de `players` (puntos y stats). Actualizá `points` y `stats` por jugador de esa categoría.
- **Liga 5:** los jugadores de `Quinta A` / `Quinta B` entran en el modelo de categorías; el filtro “Liga 5” en torneos usa `league: 5` en el torneo Novak.
- **Variación de puesto / puntos en tabla:** hoy mock (`getMockRankingChange`, `getMockPointsChange`). Para datos reales habría que extender el modelo.
- **Ranking *dentro* del torneo:** para `t-novak-l3` viene de `liga3Data.ts`. Para **Liga 1, 2, 4 y 5** (hoy) suele reflejar un slice de jugadores de la categoría del torneo con sus puntos globales salvo que se agregue lógica tipo Liga 3.

## Prompt copiable para Cursor (pegá esto y completá los corchetes)

```
@docs/DATA_LOADING.md

Carga de datos — aplicá los cambios en el código.

Liga: [1 | 2 | 3 | 4 | 5] (tournamentId si lo sabés: t-novak, t-novak-l2, t-novak-l3, t-novak-l4, t-novak-l5)
Tipo: [ranking jugadores | partidos / cuadro | grupos + resultados | fixtures | torneo finalizado / cupos | spotlight | otro]
Acción: [ej. actualizar fecha 2 Liga 4, cerrar final Liga 1, …]

Datos (Excel pegado, fila 1 = encabezados):

[pegado]
```

Versión mínima:

```
@docs/DATA_LOADING.md Liga [1-5]: [una frase]. Datos:
[pegado]
```

## Checklist antes de publicar

- [ ] Build sin errores.
- [ ] `tournamentId` correcto para la liga que tocás (tabla arriba).
- [ ] Nuevos jugadores: id único, `category` alineada con la liga, `matches` con los mismos ids.
- [ ] Liga 3: nombres en resultados y fixtures alineados con `LIGA3_PLAYERS`.
- [ ] Ligas 1, 2, 4, 5: partidos y jugadores coherentes (misma categoría / torneo).
- [ ] Imágenes nuevas en la ruta que espera el campo (`public/players/…` o `/img`).

## Regla automática del editor

`.cursor/rules/data-loading.mdc`: al editar `mockData.ts` o `liga3Data.ts`, Cursor aplica estas convenciones (incluye **todas las ligas 1–5**).

# Automatización de resultados (motor de tenis)

Guía operativa para cargar partidos en JSON y entender qué calcula el motor **sin backend**. La especificación funcional está en **`TENNIS_ENGINE_SPEC.md`**.

## Objetivo

A partir de un archivo de resultados válido se puede (cuando la UI esté cableada) derivar:

- tablas de posiciones por grupo
- estadísticas por jugador (PJ, PG, PP, sets, games, racha, %)
- últimos N partidos por jugador
- snapshot serializable para pantallas (`computeTournamentSnapshot`)

## Flujo previsto

1. Editar o agregar **`docs/ligaX-resultados.json`** (convención sugerida; el repo puede versionar otro path).
2. Validar el JSON con **`MatchResultBatchSchema`** / **`safeParseMatchBatch`** (`src/lib/tennis/resultSchemas.ts`).
3. El motor (`src/lib/tennis/matchStatsEngine.ts`) parsea marcadores y agrega estadísticas.
4. Los adaptadores (`resultsFromDocs.ts`, `computeTournamentSnapshot.ts`) arman la vista lista para UI.
5. La aplicación consume el snapshot (integración futura; hoy parte de esto sigue en `mockData.ts`).

## Formato del archivo de resultados

Objeto raíz con array **`matches`**. Cada elemento debe alinearse con **`MatchInput`** (`src/types/tennisResults.ts`).

```json
{
  "matches": [
    {
      "tournamentId": "t-novak-l4",
      "group": "A",
      "round": 1,
      "playerA": "Chantada M.",
      "playerB": "Beitia J.",
      "score": "6-4 4-6 10-7",
      "status": "played",
      "date": "2026-04-12"
    }
  ]
}
```

### Campos habituales

| Campo | Notas |
|--------|--------|
| `tournamentId` | `t-novak`, `t-novak-l2`, … `t-novak-l6` |
| `group` | Letra de grupo, debe coincidir con `docs/ligaX.json` → `grupos` |
| `round` | Opcional; número de fecha del fixture |
| `playerA` / `playerB` | Mismo texto que en la plantilla de liga (ortografía consistente) |
| `score` | Ver matriz de marcadores en `TENNIS_ENGINE_SPEC.md` |
| `status` | `played` \| `walkover` \| `retired` \| `pending` |
| `date` | Opcional, `YYYY-MM-DD` |

## Reglas importantes

- Los **nombres** deben coincidir con **`docs/ligaN.json`** (y con un **PlayerRegistry** futuro si se usa).
- El **marcador** debe ser parseable por el motor (evitar sets inválidos tipo `6-5` sin tie-break).
- **Match tie-break** (tercer set corto): p. ej. `10-7`, `10-2`.
- **WO**: usar `status: "walkover"` y definir ganador según reglas del club (el string `WO` solo en score no basta para el parser de sets).

## Agregar un jugador

1. Incluirlo en la plantilla **`docs/ligaN.json`** en el grupo correspondiente.
2. Opcional: entrada en registry cuando exista flujo formal de alias.

## Reportar errores de carga

Indicar: liga, `tournamentId`, grupo, los dos nombres, marcador tal cual fue cargado y el mensaje de error (parse / validación Zod).

## Qué no hace el motor por sí solo (hoy)

- Persistencia en servidor ni multiusuario.
- Sustituir por completo **Liga 3** (`liga3Data.ts`) sin un plan de convivencia (ver `INTEGRATION_PLAN_FOR_CURSOR.md`).
- Puntos de ranking club: la tabla de fases existe en el motor (`awardPointsFromPlacement`); hay que cablear reglas y entradas reales.

## Referencias en código

| Pieza | Ruta |
|--------|------|
| Tipos | `src/types/tennisResults.ts` |
| Schemas + safe parse | `src/lib/tennis/resultSchemas.ts` |
| Motor | `src/lib/tennis/matchStatsEngine.ts` |
| Carga / merge | `src/lib/tennis/resultsFromDocs.ts` |
| Snapshot | `src/lib/tennis/computeTournamentSnapshot.ts` |
| Barrel | `src/lib/tennis/index.ts` |
| Tests | `src/lib/tennis/__tests__/*.test.ts` |

## Evolución futura

- Carga desde panel o API.
- Validación en tiempo real en el cliente.
- Un archivo de resultados por torneo o por fecha, según decida el club.

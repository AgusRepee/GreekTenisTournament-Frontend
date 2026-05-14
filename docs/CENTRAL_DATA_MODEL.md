# Modelo de datos centralizado — propuesta técnica

## Objetivo

Una **única fuente de verdad** para que, al guardar un resultado, se actualicen de forma coherente:

- tabla de grupo  
- clasificación  
- cuadro de eliminación  
- ranking  
- perfil y estadísticas visibles  

Hoy puede implementarse sobre **localStorage** y/o **archivos JSON**; el mismo esquema debe **mapear 1:1** a tablas **MySQL** en Hostinger (o similar) sin rediseñar el dominio.

---

## Principios

1. **Partido canónico (`Match`)** con referencia opcional a **`MatchResult`**. El marcador detallado vive en `MatchResult`, no duplicado en campos sueltos del partido salvo **denormalización controlada** (p. ej. `winnerId` en `Match` para consultas rápidas, siempre derivable del resultado).
2. **Rankings y tablas** son **derivados** del histórico de `Match` + `MatchResult`, salvo `RankingSnapshot` como **caché materializada** opcional para rendimiento en lectura.
3. **Un solo pipeline de escritura**: *persistir `MatchResult` → actualizar `Match` → encolar/trigger recálculo → actualizar snapshots / vistas*.
4. **Auditoría** centralizada en `AuditLog` (reemplaza o absorbe historiales ad-hoc por feature).

---

## Entidades y relaciones

```
Tournament 1──* TournamentLeague 1──* Group
                      │
                      └──* Match ──0..1 MatchResult
```

- Un **torneo** tiene una o más **ligas de torneo** (`TournamentLeague`), cada una con reglas, puntos y config de grupos.
- Los **grupos** pertenecen a una liga de torneo y listan `playerIds`.
- Los **partidos** referencian torneo, liga de torneo, opcionalmente grupo, etapa y ronda.
- El **resultado** es entidad propia vinculada por `matchId` / `resultId`.

**Nota sobre `Tournament.leagueIds`:** evita duplicar la configuración de liga dentro del torneo; la lista de ligas del torneo es solo FK. Si se prefiere solo `TournamentLeague.tournamentId`, se puede omitir `leagueIds` en favor de consulta por índice; se mantiene en el tipo TypeScript como conveniencia de lectura O(1) en cliente.

---

## Flujo al guardar `MatchResult`

1. **Validar** negocio (sets, WO, suspendido, ganador coherente).
2. **Escribir** `MatchResult` (insert o update versionado si se requiere historial de resultados).
3. **Actualizar** `Match`: `status`, `resultId`, `winnerId`, `updatedAt`.
4. **Recalcular** (misma transacción lógica o job en cola):
   - standings por grupo (`groupId` + `tournamentLeagueId`);
   - bracket de eliminación (`stage` + orden de `Match`);
   - puntos y posiciones de **clasificación** dentro de la liga de torneo;
   - **ranking global por liga** (club): regenerar filas o actualizar `RankingSnapshot`;
   - agregados de **jugador** (PJ/PG/PP, sets, etc.) para perfil.
5. **Auditar** (`AuditLog`) con `before`/`after` del agregado relevante o del diff mínimo.
6. **Notificar** capa UI (subscribe único) para re-render global.

En **MySQL**, el paso 4 puede ser: triggers + tablas materializadas, o aplicación + transacción; en **localStorage**, un único `save` de blob versionado o varias claves con `refresh()` único al final.

---

## Mapeo migración MySQL (orientativo)

| Entidad (TS)        | Tabla sugerida        | Índices clave                          |
|---------------------|-----------------------|----------------------------------------|
| Player              | `players`             | `id`, `league`, `status`               |
| Tournament          | `tournaments`         | `id`, `slug` UNIQUE                    |
| TournamentLeague    | `tournament_leagues`  | `tournament_id`, `league`              |
| Group               | `groups`              | `tournament_league_id`                 |
| Match               | `matches`             | `tournament_league_id`, `group_id`, `stage` |
| MatchResult         | `match_results`       | `match_id` UNIQUE (1:1 actual)         |
| RankingSnapshot     | `ranking_snapshots`   | `league`, `player_id`                  |
| AuditLog            | `audit_logs`          | `entity_type`, `entity_id`, `created_at` |

`sets` en `MatchResult`: columna **JSON** en MySQL 8+ o tabla hija `match_result_sets (result_id, set_index, p1, p2, …)`.

---

## Qué deja de estar “hardcodeado”

- Fixture y resultados dejan de vivir solo en `liga3Data` / ramas especiales: migran a **`TournamentLeague.groupsConfig`** + **`Match`** + **`MatchResult`**.
- Rankings dejan de calcularse solo en memoria sin persistir opcional: el contrato permite **`RankingSnapshot`** como caché o como verdad si se define política explícita.

---

## Riesgos y decisiones pendientes

| Tema | Decisión sugerida |
|------|-------------------|
| Historial de resultados (varios por partido) | Hoy el modelo asume 1:1 `Match` ↔ `MatchResult` actual; para historial, `resultId` pasa a ser lista o tabla `match_result_versions`. |
| WO / suspendido | `MatchResult.type` + `sets` vacíos o convención mínima; `winnerId`/`loserId` obligatorios en WO. |
| `player1Id` / `player2Id` vs orden canónico | Mantener orden de sorteo en `Match`; el ganador siempre en `winnerId`. |
| Liga 3 legacy | Plan de migración: import script JSON → entidades nuevas, luego retirar `liga3Data`. |

---

## Implementación en el repo

- **Tipos TypeScript**: `src/domain/centralTennisModel.ts` (interfaces exportadas).
- **UI / mockData**: sin cambios en esta entrega; el siguiente paso sería un **adaptador** `legacySnapshot → centralModel` y un **repositorio** que implemente persistencia localStorage/MySQL detrás de la misma interfaz.

---

## Referencia cruzada con el código actual

| Actual | Futuro centralizado |
|--------|---------------------|
| `Player` (mockData) | `domain.Player` (+ migración de nombres a first/last/display) |
| `Tournament` | `domain.Tournament` + `TournamentLeague` |
| `Match` (club `partidos`) | `domain.Match` |
| `MatchInput` (results store) | `MatchResult` + actualización de `Match` |
| Rankings en memoria | Cálculo desde `Match`/`MatchResult` + opcional `RankingSnapshot` |
| Historial admin resultados | Unificar hacia `AuditLog` o conservar como subset |

Este documento y los tipos son la base para el siguiente PR de **adaptadores y orquestador de recálculo**, sin tocar aún las pantallas.

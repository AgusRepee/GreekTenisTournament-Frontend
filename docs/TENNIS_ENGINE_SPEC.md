# Tennis Engine Specification

## 1. Objetivo

Este documento define el glosario, reglas de negocio, contratos conceptuales y casos de marcador para el motor de resultados de torneos de tenis amateur de Greek Tennis.

El objetivo es establecer una base consistente para:

- parsear resultados ingresados manualmente
- calcular tablas de posiciones
- resolver desempates
- determinar clasificados
- asignar puntos de ranking
- preparar snapshots serializables para la UI

---

## 2. Alcance

Este motor está pensado para una SPA estática basada en Vite + React, sin backend, con datos cargados desde archivos JSON dentro del repositorio.

El sistema debe soportar:

- fase de grupos
- fecha libre / bye
- interzonal
- cuadros eliminatorios
- resultados manuales
- cálculo de standings
- evolución futura a backend sin romper contrato de datos

---

## 3. Glosario

### Set
Unidad principal de puntuación dentro de un partido. Un partido puede jugarse al mejor de 2 sets con match tie-break en caso de empate, o bajo otras reglas configurables.

### Game
Subunidad de un set. Normalmente un set se gana llegando a 6 games con diferencia mínima de 2, o por tie-break en 6-6.

### Tie-break
Desempate de set que se juega usualmente en 6-6. El set se registra como `7-6(x)` o `6-7(x)`, donde `x` es la diferencia de puntos del tie-break.

### Match tie-break
Desempate final del partido, normalmente a 10 puntos, usado en lugar de un tercer set completo. Se representa por ejemplo como `10-7`.

### Walkover (WO)
Victoria otorgada sin jugar el partido porque un jugador no se presenta o no puede disputarlo antes de comenzar. No debe contarse igual que un retiro iniciado, aunque ambos pueden otorgar victoria.

### Retiro
Finalización anticipada de un partido ya comenzado porque un jugador abandona por lesión, imposibilidad física u otra causa. Puede ocurrir con marcador parcial o al finalizar un set.

### Partido no jugado
Partido previsto en fixture pero aún sin resultado válido cargado. No impacta estadísticas hasta tener un resultado confirmado.

### Bye / Libre
Fecha en la que un jugador no disputa partido por la estructura del grupo o del fixture. No suma victoria ni derrota, salvo regla explícita del torneo.

### Fase de grupos
Etapa round-robin donde todos los jugadores del grupo se enfrentan entre sí según fixture.

### Interzonal
Partido adicional entre jugadores de grupos distintos. Puede impactar standings generales o ser informativo según configuración del torneo.

### Repechaje
Instancia adicional para clasificar a jugadores que no accedieron directamente por posición de grupo. Su lógica queda prevista como extensión configurable.

### Cuadro KO
Etapa eliminatoria directa. El perdedor queda eliminado y el ganador avanza de ronda.

---

## 4. Reglas de negocio configurables

### 4.1 Parámetros base sugeridos

| Parámetro | Descripción | Tipo | Default sugerido |
|---|---|---:|---|
| `winPoints` | Puntos por victoria en round-robin | number | `2` |
| `lossPoints` | Puntos por derrota en round-robin | number | `1` |
| `walkoverWinPoints` | Puntos por victoria por WO | number | `2` |
| `walkoverLossPoints` | Puntos por derrota por WO | number | `0` |
| `retirementWinPoints` | Puntos por victoria por retiro rival | number | `2` |
| `retirementLossPoints` | Puntos por derrota por retiro propio | number | `1` |
| `byePoints` | Puntos por fecha libre | number | `0` |
| `bestOf` | Cantidad máxima de sets lógicos del partido | number | `3` |
| `finalSetMode` | Tercer set completo o match tie-break | enum | `"match_tiebreak_10"` |
| `groupAdvanceCount` | Cuántos clasifican por grupo | number | `2` |
| `allowBestThirds` | Si se contemplan mejores terceros | boolean | `false` |
| `allowRepechage` | Si existe repechaje | boolean | `false` |
| `useHeadToHead` | Si aplica desempate por enfrentamiento directo | boolean | `true` |
| `useGameDifference` | Si aplica diferencia de games | boolean | `true` |
| `useSetDifference` | Si aplica diferencia de sets | boolean | `true` |
| `sortFallback` | Último criterio de desempate | enum | `"random_draw"` |

---

### 4.2 Orden de tabla sugerido

Orden por defecto para standings de fase de grupos:

1. Partidos ganados (`PG`)
2. Diferencia de sets
3. Diferencia de games
4. Head-to-head
5. Sorteo / criterio manual

> Nota: algunas ligas o clubes pueden preferir primero head-to-head y luego diferencias. Por eso debe ser configurable.

---

### 4.3 Clasificación desde grupos

| Escenario | Regla sugerida |
|---|---|
| Grupos estándar | Clasifican los primeros 2 de cada grupo |
| Grupos con cuadro especial | Clasifican 1° y 2°, más mejores terceros |
| Repechaje | 3° y/o 4° juegan repechaje según configuración |
| Liga con interzonal | El interzonal no modifica clasificación salvo que se explicite |

---

### 4.4 Mejores terceros / repechaje

Se deja prevista una interfaz configurable para soportar:

- comparación entre terceros de distintos grupos
- prioridad por PG
- luego diferencia de sets
- luego diferencia de games
- luego sorteo

Esta lógica se implementará como módulo aparte o stub inicial.

---

### 4.5 Ranking club por fase alcanzada

Tabla editable sugerida:

| Fase alcanzada | Código | Puntos sugeridos |
|---|---|---:|
| Campeón | `champion` | 100 |
| Finalista | `finalist` | 70 |
| Semifinalista | `semifinalist` | 45 |
| Cuartos de final | `quarterfinalist` | 25 |
| Clasificado desde grupos | `group_qualified` | 15 |
| Participación | `participant` | 5 |
| Victoria por WO | `walkover_win` | 0 |
| Descalificación | `disqualified` | 0 |

> Esta tabla debe quedar separada del cálculo de standings. El ranking club es una capa adicional.

---

## 5. Contratos conceptuales de datos

### 5.1 LigaTemplate
Representa la plantilla estructural del torneo y debe ser compatible con archivos `docs/ligaN.json`.

Debe contener:

- `torneo`
- `liga`
- `grupos`
- `fechas`
- `nota` opcional

### 5.2 MatchResult
Representa el resultado de un partido puntual y debe contener al menos:

- torneo o referencia de torneo
- grupo o fase
- jugador A
- jugador B
- marcador string
- estado del partido
- fecha opcional
- metadata opcional

### 5.3 MatchResultBatch
Lista de resultados de un torneo o una parte del torneo.

### 5.4 TournamentMeta
Metadatos generales del torneo:

- id
- slug
- nombre
- liga
- estado
- cupos
- fechas de inicio/fin
- tipo de fase
- reglas aplicadas

### 5.5 PlayerRegistry
Registro canónico de jugadores para resolver alias y evitar inconsistencias de nombres.

Debe contemplar:

- nombre canónico
- alias alternativos
- id opcional
- categoría/liga
- estado opcional

---

## 6. Matriz de casos de marcador

| Tipo de marcador | Input string | Parse esperado | Sets A/B | Games A/B esperados | Notas |
|---|---|---|---|---|---|
| Sets corridos | `6-3 6-4` | OK | `2/0` | `12/7` | Partido resuelto en 2 sets |
| Tres sets con MTB | `6-4 4-6 10-2` | OK | `2/1` | `20/12` si MTB cuenta separado; configurable | El tercer segmento es match tie-break |
| Tres sets con separadores mixtos | `6-4, 4-6; 10-2` | OK | `2/1` | Igual al anterior | Debe tolerar coma y punto y coma |
| Tie-break normal | `7-6(5) 6-3` | OK | `2/0` | `13/9` | Primer set con TB |
| Tie-break invertido | `6-7(8) 6-3 10-7` | OK | `2/1` | válido | A pierde el primer set en tie-break |
| Retiro tras set | `6-3 ret.` | OK | `1/0` o victoria especial | `6/3` | Requiere flag de retiro |
| Walkover | `WO` | OK | `0/0` estructuralmente | `0/0` | Se define fuera del marcador tradicional |
| Walkover explícito A | `A WO` | FAIL en parser puro | n/a | n/a | El parser de score no debe depender del nombre |
| Partido no jugado | `` | FAIL o estado pendiente | n/a | n/a | El estado debe informar pendiente |
| Set incompleto inválido | `6-5` | FAIL | n/a | n/a | No válido sin regla especial |
| TB inválido | `7-6()` | FAIL | n/a | n/a | Falta valor del tie-break |
| Match TB inválido | `10-10` | FAIL | n/a | n/a | No hay ganador |
| Marcador imposible | `6-4 6-7(4) 8-6 10-2` | FAIL | n/a | n/a | Exceso de segmentos |
| Segmento no numérico | `6-x 6-4` | FAIL | n/a | n/a | Entrada inválida |

---

## 7. Decisiones de diseño sugeridas

### 7.1 Parser tolerante, motor estricto
El parser debe aceptar variaciones razonables de formato, pero el motor debe rechazar resultados incoherentes.

### 7.2 Nombres canónicos obligatorios
Toda agregación debe hacerse sobre nombres normalizados o resueltos mediante registry.

### 7.3 Standings reproducibles
El orden final no debe depender del orden de carga de partidos.

### 7.4 UI desacoplada
La UI no debe recalcular lógica compleja. Debe consumir snapshots ya computados.

---

## 8. Casos especiales contemplados

- resultado cargado con alias
- resultado repetido del mismo partido
- jugador inexistente en registry
- partido del fixture sin resultado
- WO cargado como string simple
- retiro con set parcial
- interzonal sin impacto en tabla
- tercer puesto / mejores terceros
- coexistencia temporal con datos legacy de Liga 3

---

## 9. Fuera de alcance inicial

Por ahora quedan fuera del alcance obligatorio:

- live scoring punto por punto
- validación contra reglamentos ATP/ITF completos
- arbitraje de conflictos de resultados
- sincronización multiusuario
- edición concurrente
- backend persistente
- auth y auditoría

---

## 10. Evolución prevista

Este motor debe diseñarse para migrar luego a:

- carga desde backend/API
- base de datos relacional
- panel de carga de resultados
- ranking histórico persistente
- multi-club / multi-torneo
- reglas por categoría

---

## 11. Resumen ejecutivo

La prioridad del motor es:

1. validar resultados
2. parsear marcadores
3. agregar estadísticas por jugador
4. calcular tablas
5. resolver clasificados
6. exponer un snapshot listo para UI

Todo debe mantenerse puro, testeable y desacoplado de React.
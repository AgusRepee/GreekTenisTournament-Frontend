# Checklist: admin operativo — carga de resultados

Checklist manual para cerrar que un **torneo ya creado** puede operarse en producción/demo **sin tener que usar el constructor** para dar de alta el torneo. Marcar cada ítem con `[ ]` → `[x]` al validar.

**Referencia automatizada**: `npm run test` ejecuta pruebas de motor y helpers (ver `src/lib/__tests__/adminOperativeResultsFlow.test.ts` y `resultsFlowVerification.test.ts`). No sustituye prueba navegador.

**URLs del proyecto**:

- Web pública: `/` (`MainApp`; navbar sin enlace Admin).
- Login admin: `/login`.
- Panel: `/admin` (redirección interna a `dashboard`; torneos en `/admin/torneos`).
- Workspace de torneo: `/admin/torneos/:tournamentId` (nombre de URL = id Novak del torneo).

**Almacenamiento (local)** — útil ante “¿se perdieron datos?”:

- Sesión admin: `localStorage['greek-tennis-admin-session']` (véase `adminAuth.ts`). Cerrar sesión **no** debe borrar resultados ni club.
- Resultados: `greek-tennis-results-v1` (`MATCH_RESULTS_STORAGE_KEY`).
- Club / snapshots: `PERSISTENCE_KEYS` en `src/data/types/persistenceKeys.ts`.

---

## 1. Acceso

| # | Caso | Criterio de aceptación |
|---|------|-------------------------|
| 1.1 | Entrada al panel | Con sesión válida, abrir `/admin` carga el layout admin (sidebar, sin MainApp). |
| 1.2 | Sin sesión | `/admin` redirige a `/login` (`ProtectedAdminRoute`). |
| 1.3 | Navbar público | En `/` la barra **no** muestra botón/link “Admin” (acceso por URL conocida `/login`). |
| 1.4 | Login | Credenciales de demo en `credentialsMatch` (`adminAuth.ts`) permiten establecer sesión. |
| 1.5 | Cerrar sesión | Acción “Salir”/cerrar sesión limpia la sesión admin; **persisten** `partidos`/resultados al volver al sitio público. |
| 1.6 | Vuelta a entrar | Tras login de nuevo, se ven los mismos torneos/resultados que antes de cerrar sesión. |

---

## 2. Torneo

| # | Caso | Criterio |
|---|------|----------|
| 2.1 | Lista | En **Torneos** (`/admin/torneos`) aparecen torneos ya definidos por datos del club/docs (no hace falta “crear nuevo” para esta verificación). |
| 2.2 | Entrar | Click en un torneo abre workspace con breadcrumb/contexto correcto. |
| 2.3 | Selector de liga | Si hay varias ligas, el selector permite cambiar liga sin perder navegación (Resumen/Fechas/… del mismo torneo). |
| 2.4 | Estado | **Resumen** muestra ciclo de vida / solo lectura coherente con torneo archivado o activo (`tournamentAdminLifecycle`). |

---

## 3. Fechas

| # | Caso | Criterio |
|---|------|----------|
| 3.1 | Navegación | Pestaña **Fechas** lista fechas por tabs; dentro, grupos o interzonal como en plantilla. |
| 3.2 | Pendiente | Partido sin resultado: badge/texto **Pendiente**, sin marcador jugado ni ganador. |
| 3.3 | Jugado | Persistido jugado: se ve bloque resultado con ganador y sets (véase estados unificados en `matchDisplayState.ts`). |
| 3.4 | Libre | Líneas “Libre …” se renderizan correctamente (`parseLibre` / etiquetas claras). |
| 3.5 | W.O. | Marcado walkover persistido: W.O., ganador y texto de rival no presentó donde aplique (`AdminMatchOutcomeVisual`). |
| 3.6 | Suspendido | **Suspendido**: sin ganador para tabla de resultado visual; marcador neutral. |

---

## 4. Resultados

| # | Caso | Criterio |
|---|------|----------|
| 4.1 | Abrir pendiente | Expandir/acceder desde **Resultados** o **Resumen** → edición disponible (grid marcador visible). |
| 4.2 | Marcador válido | Bo3 coherente (p. ej. `6-4 6-3` o sets + ST válidos) permite **Guardar** y desaparece de pendientes tras guardado. |
| 4.3 | Marcador inválido | Inputs incompletos o motor inválidos rechazan persistencia (`validateAdminMatchResult` / errores debajo del card). |
| 4.4 | KO sin jugadores | Cruce KO con placeholder: no permite guardar score hasta tener ambos jugadores (`KO_MATCH_PENDING_PLAYERS_MESSAGE`). |
| 4.5 | Walkover | Botones W.O. por lado guardan resultado; recálculo debe reflejarse en siguiente pantalla si aplica. |
| 4.6 | Suspender | Confirmación; estado suspendido persistente sin sumar estadísticas definitivas. |
| 4.7 | Guardar individual | Un partido solo dispara toast y recálculo según configuración (`commitAdminMatchResult` + `recalculateTournament` donde aplique). |
| 4.8 | Guardar todo | Solo habilitado con al menos un borrador **válido**; modal con resumen; inválidos listados pero no frenan válidos (`AdminResultsVisualPanel`). |
| 4.9 | Editar cargado | “Editar resultado” pide confirmación; chip **Editado** con cambios sin guardar. |
| 4.10 | Historial | Tras cambios relevantes aparecen entradas en **Historial** del torneo / auditoría de resultados (`tournamentAuditLog`, `resultsChangeHistory` según flujo implementado). |
| 4.11 | Torneo solo lectura | Torneo/archivo finalizado: no persistencia en resultados (`readOnly` en panel). |

---

## 5. Tabla

| # | Caso | Criterio |
|---|------|----------|
| 5.1 | Plantel | Lista incluye jugadores del grupo desde plantilla/override (`AdminTablaView`), no sólo los que tienen partido. |
| 5.2 | Sin PJ | Jugador en grupo sin datos aún muestra PJ/PG en lógica de UI coherente (no “desaparece” de la tabla de plantel si el diseño lo incluye como fila disponible/drag). |
| 5.3 | Métricas | Tras cargar/fechar partidos del grupo: PJ, PG, PP, diferencia de sets/partidos puntos donde esté definido en la liga. |
| 5.4 | Cupos | Donde aplique playoff/repechaje, indicadores UI alineados a motor (`AdminTablaView` copy + datos derivados post `recalculateTournament`). |
| 5.5 | Drag grupos | Mover fichas entre grupos/disponibles y **Guardar** persiste tabla y migración de resultados si el flujo existe (mensajes de herramienta de migración donde corresponda). |

---

## 6. Eliminación

| # | Caso | Criterio |
|---|------|----------|
| 6.1 | Lista KO | Vista **Eliminación** muestra repechaje/cuartos/semifinal/final según catálogo (`buildKnockoutAdminEntries`). |
| 6.2 | Mismo editor | Misma grilla marcador / W.O. / Suspender que fase grupos. |
| 6.3 | Avance | Tras resultado persistido válido el ganador rellena slot siguiente donde el motor así lo defin (`propagateKnockoutWinnerSlots`). |
| 6.4 | Cuadros iniciales | Herramienta de edición de cuartos inicial si existe (`AdminBracketQuarterEditor`) permite ajuste manual registrado en historial donde esté cableado. |

---

## 7. Página pública (post cambios admin)

Ventana nueva o mismo navegador (datos locales compartidos). Torneo público debe leer mismo store en demo local.

| # | Caso | Criterio |
|---|------|----------|
| 7.1 | Fixture | Pantalla torneo (“Fechas por grupo”) refleja `resultSummary` vía `buildPublicGroupStageFixtures` / overlay. |
| 7.2 | Resultados | Sección resultados muestra marcadores o Pendiente/W.O./Suspendido consistente. |
| 7.3 | Tabla | Posiciones/coherencia con mismo torneo+liganum. |
| 7.4 | Ranking | `RankingsScreen` / datos derivados coherente con nueva suma donde la liga use ranking activo. |
| 7.5 | Perfil | Últimos partidos incluyen WO/suspendidos con etiquetas esperadas (`ProfileMatchOutcome`). |
| 7.6 | Bracket | Eliminación en detalle muestra resultado/ganadores alineados a store (desktop bracket + cards móvil). |

---

## 8. Persistencia

| # | Caso | Criterio |
|---|------|----------|
| 8.1 | F5 panel | Refrescar con `/admin/torneos/...` abierto conserva resultado guardados. |
| 8.2 | Cerrar navegador | Reabrir misma máquina y perfil navegador: datos persistidos (localStorage). |
| 8.3 | Logout datos | Confirmar manualmente que `MATCH_RESULTS_STORAGE_KEY` sigue en `Application` DevTools después de logout. |

---

## 9. Comandos sugeridos (CI local)

```bash
npm run build
npm run test
```

Documentos relacionados: `docs/TENNIS_ENGINE_SPEC.md`, `docs/RESULTS_FLOW_VERIFICATION.md`, `docs/DATA_LOADING.md`.

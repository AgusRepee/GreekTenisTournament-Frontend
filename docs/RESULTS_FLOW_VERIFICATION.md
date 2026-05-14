# Checklist: flujo completo de resultados (carga → UI → persistencia)

Caso de referencia: **Alvarez I. vs Araujo J.** — marcador **6-4, 6-3** (ganador Alvarez).

**Precondiciones**

- [ ] Ambos jugadores existen en el plantel con nombres coincidentes con el fixture (mayúsculas / iniciales como en el torneo).
- [ ] El partido aparece en **Admin → Resultados** (fase de grupos) para el torneo y **grupo** correctos.
- [ ] La plantilla del torneo (`ligaDoc.grupos`) incluye ese grupo; si no hay grupos, la sección **Tabla** muestra el aviso correspondiente (no aplica PG/PP por grupo).

**Referencias técnicas (persistencia local actual)**

| Qué | Dónde |
|-----|--------|
| Resultados canónicos (`MatchInput`) | `localStorage` clave `greek-tennis-results-v1` (`MATCH_RESULTS_STORAGE_KEY`) |
| Partidos persistidos (KO / agenda en `partidos`) | clave `partidos` |
| Historial admin de cambios de resultado | `greek-tennis-admin-result-history-v1` (`RESULT_CHANGE_HISTORY_KEY`) |
| Jugadores / torneos | `jugadores`, `torneos` |

> **Historial en pantalla:** hoy el historial se **persiste** al guardar (`appendResultChangeEntry`), pero **no hay una vista dedicada** en el admin que liste esas entradas. Para QA manual: DevTools → Application → Local Storage → clave anterior, o añadir una pantalla “Historial” que consuma `loadResultChangeHistory()`.

> **API MySQL (futuro):** cuando el backend persista resultados y auditoría, repetir la misma checklist contra el servidor (`/api/...`, `audit_logs`) y sin depender de `localStorage`.

---

## 1. Admin (carga del resultado)

- [ ] El acordeón/fila del partido pasa de **pendiente** a **cargado** (marcador visible, sin estado borrador pendiente tras guardar).
- [ ] Se muestra **ganador** coherente con el marcador (Alvarez).
- [ ] Tras **Guardar resultado** (o **Guardar todo**): toast de éxito; no queda el partido en “cambios sin guardar” para ese marcador.
- [ ] **Historial de cambios:** en `localStorage` aparece un objeto nuevo al inicio del array en `greek-tennis-admin-result-history-v1` con `action` acorde (`creado` / `modificado`), `playerA` / `playerB`, `newScore` con el marcador guardado.
- [ ] Reintentar guardar el **mismo** marcador sin cambios: comportamiento idempotente o mensaje claro (sin duplicar lógica rota).

---

## 2. Tabla de grupo (Admin → Tabla)

Columnas: **PJ**, **PG**, **PP**, **Sets** (ganados-perdidos), **Pts**.

**Alvarez**

- [ ] **PJ** incrementa en 1.
- [ ] **PG** incrementa en 1.
- [ ] **PP** sin incremento por este partido.
- [ ] **Sets** refleja sets ganados y perdidos del partido (p. ej. `2-1` acumulado si ya había jugado antes).
- [ ] **Pts** suma los puntos de tabla según reglas (victoria en grupos = 3 pts en motor actual).

**Araujo**

- [ ] **PJ** +1.
- [ ] **PP** +1.
- [ ] **PG** sin victoria por este partido.
- [ ] **Sets** y **Pts** coherentes con la derrota.

---

## 3. Clasificación (Admin → Clasificación)

- [ ] El **orden** de filas del grupo refleja puntos y desempates (PJ/PG/PP/sets).
- [ ] Tras más resultados en el mismo grupo, los **clasificados directos** / mejores terceros se actualizan según reglas del torneo.

---

## 4. Ranking (liga)

- [ ] En la vista de **ranking** de la liga del torneo, **puntos** y contadores de **PJ / victorias / sets** del ganador y del perdedor reflejan el nuevo partido.
- [ ] Las **posiciones** se recalculan (al menos: nadie queda con datos obsoletos tras F5).

---

## 5. Perfil **Alvarez**

- [ ] **Partidos jugados** (+1).
- [ ] **Victorias** (+1).
- [ ] **Sets ganados / perdidos** alineados al marcador.
- [ ] **Últimos partidos** incluye el encuentro vs Araujo con resultado **W** y marcador visible.

---

## 6. Perfil **Araujo**

- [ ] **Partidos jugados** (+1).
- [ ] **Derrotas** (+1).
- [ ] **Sets** coherentes (perdió más sets ganados que el ganador).
- [ ] **Últimos partidos** incluye el partido con resultado **L**.

---

## 7. Página pública

- [ ] **Detalle del torneo** (slug / vista pública): el partido de ese grupo muestra el resultado **6-4, 6-3** (o formato que use la UI).
- [ ] **Ranking público:** mismas tendencias que en admin (puntos / posición).
- [ ] **Perfil público** de ambos jugadores: estadísticas y últimos partidos alineados al perfil interno.

---

## 8. Persistencia y sesión

- [ ] **F5** (recarga completa): todo lo anterior sigue igual (resultado, tablas, rankings, perfiles).
- [ ] Cerrar pestaña y volver al sitio: datos intactos.
- [ ] **Cerrar sesión admin** (si aplica) y volver a entrar: resultado sigue guardado.
- [ ] Opcional: ventana incógnito = datos nuevos (sin `localStorage` previo); no confundir con “pérdida” de datos en el perfil normal.

---

## 9. Errores y casos límite

| Caso | Resultado esperado |
|------|-------------------|
| Marcador **inválido** (texto basura, sets imposibles) | Validación falla; mensaje de error; **no** se persiste resultado; tablas/ranking **sin** cambio. |
| Partido que termina en **empate de sets** (p. ej. 1-1 sin TB final) | Motor rechaza: *empate de sets*; no guardar. |
| **W.O.** | Estado walkover + ganador elegible; marcador según reglas (`W.O.` / ganador); historial con `action: walkover` si aplica. |
| **Modificar** un resultado ya guardado | Confirmación de sobrescritura; tras confirmar, todas las vistas y el historial reflejan **modificado**; PG/PP/sets/puntos/ranking/perfiles consistentes con el **nuevo** marcador. |

---

## 10. Verificación automática (Vitest)

En el repo:

```bash
npm test
```

Los tests en `src/lib/__tests__/resultsFlowVerification.test.ts` cubren el caso **Alvarez / Araujo**, validación de **empate de sets**, **W.O.**, marcador inválido y **cambio de ganador** usando el motor central (`recalculateTournamentFromData`, `validateMatchResult`).

La función pura `runResultsFlowVerification` en `src/lib/tennis/resultsFlowVerification.ts` devuelve una lista de checks `{ id, ok, detail }` útil para extender QA o integrar en scripts.

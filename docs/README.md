# Documentación del proyecto (índice)

Referencias para **carga de datos**, **motor de tenis** e **integración futura**. No sustituye al código; enlaza los documentos que debe usar Cursor o cualquier desarrollador.

## Motor de resultados y automatización

| Documento | Contenido |
|-----------|-----------|
| [TENNIS_ENGINE_SPEC.md](./TENNIS_ENGINE_SPEC.md) | Glosario, reglas de negocio, contratos conceptuales, matriz de marcadores. **Fuente de verdad funcional** del motor. |
| [RESULTADOS_AUTOMATION.md](./RESULTADOS_AUTOMATION.md) | Flujo JSON → validación → motor → snapshot; formato de `matches`; referencias a archivos en `src/lib/tennis/`. |
| [INTEGRATION_PLAN_FOR_CURSOR.md](./INTEGRATION_PLAN_FOR_CURSOR.md) | Plan para cablear el motor a `mockData` / UI; riesgos (Liga 3, nombres, performance); checklist. |
| [PROMPT_USUARIO_CLUB.md](./PROMPT_USUARIO_CLUB.md) | Plantilla corta para que el club envíe resultados en texto plano antes de pasarlos a JSON. |

## Datos legacy (sitio actual)

| Documento | Contenido |
|-----------|-----------|
| [DATA_LOADING.md](./DATA_LOADING.md) | Dónde editar torneos, partidos y ranking en `mockData.ts`, IDs Novak por liga, convenciones. |

## Plantillas por liga (JSON en repo)

Archivos **`liga1.json` … `liga6.json`**: plantillas de grupos y fechas para armar fixtures. Los resultados cargados pueden convivir en **`ligaN-resultados.json`** (convención descrita en RESULTADOS_AUTOMATION).

## Comandos útiles

- `npm run build` — build de producción.
- `npm run test` — tests del motor (`src/lib/tennis/__tests__`).

## Orden de lectura sugerido

1. `DATA_LOADING.md` si solo se actualizan datos mock actuales.  
2. `TENNIS_ENGINE_SPEC.md` + `RESULTADOS_AUTOMATION.md` si se trabaja en el motor o en JSON de resultados.  
3. `INTEGRATION_PLAN_FOR_CURSOR.md` antes de tocar `TournamentDetailScreen` o `mockData` para integrar snapshots.

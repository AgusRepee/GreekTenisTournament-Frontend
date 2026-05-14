# GREEK TENIS — Estado de la aplicación y arquitectura

Documento de referencia: estructura actual del proyecto, capas de software, persistencia, motor de tenis y funcionalidades de la web (incluye los cambios recientes de **cabezas de serie (seeds)** y la **capa de datos** preparada para backend).

---

## Stack técnico

- **Frontend:** React, Vite, TypeScript, Tailwind (clases en componentes).
- **Enrutamiento:** React Router (`/login`, `/admin`, resto en SPA con estado `currentScreen`).
- **Estado en cliente:** hooks de la capa `@/data` (`useResults`, `useClubData`) + `localStorage` vía adaptadores locales (sustituibles por API).

---

## Arquitectura en capas

Objetivo: que la **UI no dependa** de si los datos vienen de `localStorage`, API REST o base de datos.

| Capa | Ubicación | Responsabilidad |
|------|-----------|-----------------|
| **Tipos** | `src/data/types/` | `MatchInput`, `ClubDataSnapshot`, `PERSISTENCE_KEYS`, `MATCH_RESULTS_STORAGE_KEY` |
| **Seed (datos iniciales)** | `src/data/seed/` | Reexporta `buildClubDataDefaults` (jugadores/torneos base sin I/O) |
| **Servicios (puertos + implementación)** | `src/data/services/` | Contratos `MatchResultsPort`, `ClubCatalogPort`; implementaciones `local/*`; `registry.ts` para inyectar otra implementación (tests / futuro Node + MySQL + Prisma) |
| **Hooks (entrada React)** | `src/data/hooks/` | `useResults`, `upsertResult`, `useClubData`, `getClubSnapshot`, `refreshClubDataFromStorage`, etc. |
| **Barrel público** | `src/data/index.ts` | API única recomendada: `import { … } from '@/data'` |
| **Compatibilidad** | `src/lib/tennis/resultsStore.ts`, `src/lib/clubDataStore.ts` | Reexportan `@/data` para imports antiguos |
| **Motor de cálculo (sin I/O)** | `src/lib/tennis/*` | Stats, standings, snapshot de torneo, rankings, seeds **como función pura**, validación admin, etc. |
| **UI** | `screens/`, `components/`, `src/pages/` | Pantallas y componentes; deben usar `@/data` o hooks que delegan en puertos, no `localStorage` directo |

**Motor vs datos:** `useTennisLiveData` (`src/lib/tennis/useTennisLiveData.ts`) combina `useResults` + `useClubData` desde `@/data` y calcula `rankingsByLeague` con el motor (`computeRankingsByLeague`). No conoce almacenamiento.

**Adaptador genérico de claves:** `src/lib/localPersistence.ts` — `getData` / `saveData` (JSON en `localStorage`). Las claves de negocio están centralizadas en `src/data/types/persistenceKeys.ts`.

---

## Cambios e implementaciones recientes (resumen)

### 1. Cabezas de serie (seeds / preclasificación)

- **Función:** `calculateTournamentSeeds(players, leagueRanking)` en `src/lib/tennis/tournamentSeeding.ts` (+ `tournamentSeedsToMap`).
- **Regla:** el seed en cada torneo sigue el **ranking de la liga** (`CalculatedRankingRow.position`). Participantes sin fila en la tabla van al final (orden estable por `id`).
- **UI:** `TournamentDetailScreen` construye un mapa de seeds con `useTennisLiveData` → `rankingsByLeague` y participantes de grupos (o `getPlayersByFilters` si no hay tablas). Se muestra `(N)` en:
  - fase de grupos,
  - cuadro de eliminación (desktop y móvil),
  - resultados Liga 3 (nombres con seed cuando aplica).
- **Bracket:** `getBracketMatchesForLibrary(tournamentId, seedMap?)` y `getBracketRoundsForUI(tournamentId, seedMap?)` reciben el mapa opcional; `MatchCard` sigue mostrando ranking/seed en `(N)`.

### 2. Capa de datos (`@/data`)

- Separación **types / seed / services / hooks** como se describe arriba.
- **Registro:** `setMatchResultsPort`, `setClubCatalogPort`, `resetDataPortsToLocalDefaults` para tests o migración a API.
- **Alias:** `tsconfig` y Vite resuelven `@/data` → `src/data` (y `@/data/*` en TypeScript).

### 3. Persistencia unificada de claves

- `PERSISTENCE_KEYS` (`torneos`, `jugadores`, `partidos`) y `MATCH_RESULTS_STORAGE_KEY` viven en `src/data/types/persistenceKeys.ts`.
- Resultados del motor de tenis (JSON de partidos) usan `MATCH_RESULTS_STORAGE_KEY`.

---

## Rutas y navegación

| Ruta / modo | Contenido |
|-------------|-----------|
| `/*` (por defecto) | App principal con navegación por **pantalla** (`history.pushState`): `home`, `news`, `directory`, `rankings`, `players`, `contact`, `profile`, `tournament_detail` |
| `/login` | Login de administración |
| `/admin` | Panel admin (protegido) — carga de resultados y herramientas |

La barra superior incluye: Inicio, Novedades, Torneos, Rankings, Jugadores, Contacto; búsqueda de jugador que lleva a la pantalla de jugadores.

---

## Funcionalidades por pantalla (público)

### Inicio (`HomeScreen`)

- Hero con imagen de fondo, categorías y ligas.
- **Torneos** por estado (próximos / en curso / destacados) con `useClubData` y helpers de `mockData`.
- **Partidos importantes** y **partidos destacados** con badges por liga, iconos por tipo (final, semifinal, cuartos, etc.), enlaces a WhatsApp (`whatsapp.ts`).
- **Rankings en vivo:** puntos derivados con `useTennisLiveData` y formato `playerUiFormat`.
- Modal de próximo torneo (`UpcomingTournamentModal`).

### Novedades (`NewsScreen`)

- Listado de noticias desde `src/lib/newsData` (categorías, fechas, imágenes desde `img/` vía `import.meta.glob`).

### Directorio de torneos (`DirectoryScreen`)

- Listado de torneos con datos del club (`useClubData` / snapshot).
- Navegación al detalle de torneo.

### Detalle de torneo (`TournamentDetailScreen`, lazy-loaded)

- Secciones: **Resumen**, **Fase de grupos**, **Eliminación**, **Resultados**, **Reglamento**.
- Integración con **motor de snapshot** cuando aplica (`computeTournamentSnapshot`, `shouldUseEngineSnapshot`): tablas de grupos y ranking top derivados de resultados reales.
- **Liga 3** (`t-novak-l3`): flujo específico (calendario Liga 3, reglas de playoff, resultados de grupos + eliminatoria, merge con `useResults`).
- **Placeholders:** torneos anunciados sin datos completos usan plantilla vacía de bracket donde corresponde.
- **Seeds:** como en la sección de seeds arriba.

### Rankings (`RankingsScreen`)

- Rankings por liga / global según datos del club y derivados del motor.

### Jugadores (`PlayerSearchScreen`)

- Búsqueda y listado; acceso a perfil.

### Perfil (`ProfileScreen`)

- Datos del jugador seleccionado (según `selectedPlayerId`).

### Contacto (`ContactScreen`)

- Información de contacto del club.

### Pie y cookies

- `Footer`, `CookieBanner` (consentimiento / aviso).

---

## Administración (`/admin`, `AddResultScreen`)

Tras login (`AdminLoginScreen` + `ProtectedAdminRoute`):

- **Pestañas típicas:** resultados, carga rápida, grupos, cuadro, datos (según `AdminSection`).
- **Ligas 1–6:** tabs con plantillas desde documentos (`loadLigasFromDocs`, generadores).
- **Carga de resultados:** validación de scores (`adminScoreValidation`), grids tipo Flashscore/ATP, `upsertResult` → capa de datos.
- **Snapshot en vivo:** `computeTournamentSnapshot`, vista previa de tablas (`snapshotToGroupTables`).
- **Bracket UI:** `TournamentBracket`, `getBracketRoundsForUI`.
- **Paneles:** `AdminQuickResultForm`, `AdminResultManagementPanel`, `AdminDataManager` (CRUD masivo sobre `localStorage` vía `getData`/`saveData` / claves del club — candidato a migrar al mismo patrón de puertos en el futuro).

---

## Motor de tenis (`src/lib/tennis/`)

Punto de entrada barrel: `src/lib/tennis/index.ts`. Incluye (entre otros):

- **Partidos y stats:** `matchStatsEngine`, `resultSchemas`, `resultsFromDocs`
- **Torneo:** `computeTournamentSnapshot`, `tournamentSnapshotBridge`, `tournamentEngine`, `groupStandings`
- **Rankings:** `tournamentRanking`, `derivedTennisData`, `calculatePlayerStats`
- **Fases:** `playerReachedPhase`, `playoffQualification`
- **Seeds:** `tournamentSeeding` (`calculateTournamentSeeds`, `tournamentSeedsToMap`)
- **Hook agregador:** `useTennisLiveData`
- **Store de resultados (reexport):** `resultsStore` → `@/data`

Tests unitarios en `src/lib/tennis/__tests__/` (Vitest).

---

## Servicio unificado de torneo (`src/services/dataService.ts`)

Funciones de alto nivel para el admin y flujos que necesitan jugadores/torneos/partidos sin tocar la UI directamente:

- `getPlayers`, `getTournaments`, `getTournamentByLeague`, `getMatchesByTournament`, `saveMatchResult`, `getGroupsByTournament`, `initializeTournamentDataFromSeedIfEmpty`, etc.

`src/lib/dataService.ts` gestiona overlay de **torneos** persistidos (CRUD admin).

---

## Datos mock y catálogo

- **`src/lib/mockData.ts`:** torneos, jugadores, helpers de UI (bracket, rankings mock, etc.).
- **`src/lib/clubDataDefaults.ts`:** genera jugadores/torneos base (Novak por ligas, torneos Nadal/Federer/Masters, etc.).
- **`src/lib/liga3Data.ts`:** jugadores y fixture Liga 3, preclasificación estática de respaldo.
- **Documentos JSON** en `docs/` (ligas) para generadores.

---

## Pruebas y build

```bash
npm test    # Vitest
npm run build
```

---

## Próximos pasos sugeridos (backend)

1. Implementar `MatchResultsPort` y `ClubCatalogPort` contra API Node + Prisma.
2. En el bootstrap de la app, `setMatchResultsPort` / `setClubCatalogPort`.
3. Sustituir o envolver `AdminDataManager` para que use el mismo contrato en lugar de `getData`/`saveData` directos.
4. Mantener el motor en `src/lib/tennis` como librería pura compartida o publicarla como paquete interno.

---

*Última actualización alineada con el código del repositorio (capa `@/data`, seeds por ranking de liga, detalle de torneo y admin descritos arriba).*

# Greek Tennis Frontend

Frontend React/Vite para Greek Tennis Series.

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS

## Desarrollo local

```bash
npm install
npm run dev
```

## Build staging

```bash
cp .env.staging.example .env.staging
npm run build:staging
```

## Build production

```bash
cp .env.production.example .env.production
npm run build:production
```

## Deploy Hostinger HTML

Subir contenido de:

```txt
dist/
```

a:

```txt
greektennis.com / public_html
```

## Variables

```env
VITE_DATA_SOURCE=api
VITE_API_URL=https://api.greektennis.com
```

No configurar contraseñas admin como `VITE_*`: todo lo que empieza con `VITE_` queda público en el bundle.
El login de producción usa email y contraseña contra la API (`/api/admin/auth/login`).
La recuperación de contraseña usa `/forgot-password` y `/reset-password`, enviando el email desde la API.

### Si olvidaste el `.env.production` antes del build

En builds de producción (`vite build` con `import.meta.env.PROD`), el código asume modo **`api`** si falta `VITE_DATA_SOURCE`, y usa **`https://api.greektennis.com`** si falta `VITE_API_URL` (con `console.warn`). No sustituye tener `.env.production` copiado del ejemplo: para otra URL de API o un sitio 100 % local en `dist`, definí las variables explícitamente.

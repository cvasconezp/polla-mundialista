# ⚽ Polla Mundialista 2026

App web para organizar una polla (quiniela) del Mundial 2026. Los jugadores predicen
los marcadores, los puntos se calculan **automáticamente** desde una API de fútbol, y
hay un panel de administrador para gestionar aportes y corregir resultados.

## ✨ Características

- Login con Google (NextAuth).
- Predicción de marcadores con **bloqueo automático al pitazo inicial** (validado en el servidor).
- Puntuación automática: exacto **5**, ganador+diferencia **3**, solo ganador **1**, equipo que avanza **+2**, campeón **10**.
- Tabla de posiciones en vivo con desempate por marcadores exactos.
- Predicción de campeón (se cierra con el primer partido).
- Panel de admin: marca de pagos, bote acumulado, corrección manual de resultados.
- **Sincronización automática** de resultados desde football-data.org vía cron.

## 🏗️ Arquitectura

```
Frontend + API (Next.js 14)  ──►  Vercel
Base de datos (PostgreSQL)   ──►  Railway
Cron de sincronización       ──►  Railway Cron  (o Vercel Cron)
Datos de fútbol              ──►  football-data.org (plan gratis incluye el Mundial)
```

## 🚀 Puesta en marcha (local)

```bash
npm install
cp .env.example .env        # completa las variables
npm run db:push             # crea las tablas en Postgres
npm run db:seed             # carga equipos + partidos (reales si hay token, o de ejemplo)
npm run dev                 # http://localhost:3000
```

## 🔑 Variables de entorno

Ver `.env.example`. Las clave:

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Postgres de Railway |
| `NEXTAUTH_URL` / `NEXTAUTH_SECRET` | Sesiones (genera el secret con `openssl rand -base64 32`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Login con Google (Google Cloud Console) |
| `ADMIN_EMAILS` | Emails que serán admin (separados por coma) |
| `FOOTBALL_DATA_TOKEN` | Token gratis de football-data.org |
| `CRON_SECRET` | Protege el endpoint `/api/cron/sync` |

## ☁️ Despliegue

### 1) Base de datos — Railway
1. Crea un proyecto en Railway → **Add PostgreSQL**.
2. Copia la `DATABASE_URL` (pestaña *Connect*) a tus variables de Vercel.

### 2) App — Vercel
1. Importa el repo de GitHub en Vercel.
2. Agrega todas las variables de entorno del `.env.example`.
3. Deploy. (El `build` corre `prisma generate` automáticamente.)
4. Tras el primer deploy, ejecuta las migraciones y el seed una vez:
   `npx prisma db push` y `npm run db:seed` (con `DATABASE_URL` apuntando a Railway).

### 3) Cron de sincronización
**Opción A — Railway Cron (recomendada, corre cada 5 min):**
- En Railway crea un **Cron Service** apuntando a este repo con el comando `npm run sync`
  y schedule `*/5 * * * *`. Usa las mismas variables de entorno.

**Opción B — Vercel Cron:**
- Ya está configurado en `vercel.json`. Ojo: en el plan *Hobby* de Vercel los crons
  corren **una vez al día**, insuficiente para resultados en vivo. Usa la opción A para
  cadencia de minutos.

> El endpoint `/api/cron/sync` está protegido con `CRON_SECRET` (header `Authorization: Bearer <secret>`).

## 🧪 Tests

```bash
npm test     # 13 tests de la lógica de puntuación (node:test)
```

## 📁 Estructura

```
app/            Pantallas (predicciones, tabla, campeón, admin, login) + rutas API
lib/            Lógica de puntos (pura, testeada), API football-data, sync, auth, prisma
prisma/         schema.prisma + seed
scripts/        sync-cron.ts (para Railway Cron)
test/           Tests de la lógica de puntuación
```

## 📝 Notas

- Los pagos se registran **manualmente** en el panel de admin (la app no procesa dinero).
- Antes del torneo, prueba el cron con partidos de otra liga para validar el cálculo.
- Una polla con dinero puede tener implicaciones legales según tu país; manténla recreativa.

# Gym Tracker

A personal workout planning and progression tracking app. Plan workouts by
week and day, log sets as you train, see your previous performance right
next to today's entry, and track personal bests and progression over time.

## Tech stack

- **Frontend/Backend**: Next.js (Pages Router, JavaScript), API routes
- **Database**: PostgreSQL
- **ORM**: Prisma

## Product decisions worth knowing about

- **Templates vs sessions**: Each week/day has a *template* (the planned
  workout) and a *session* (what you actually logged). Editing this week's
  results never overwrites last week's — they're separate rows.
- **Exercise identity**: Renaming an exercise never breaks its history —
  every exercise has a stable id, and history is tracked against that id,
  not the display name.
- **Reordering**: exercises are reordered with up/down buttons rather than
  drag-and-drop, for reliability on mobile. Can be upgraded later.
- **"Previous" hint**: shows the most recent *completed* session for that
  exercise identity, regardless of which day/week it happened in.
- **PB highlighting while logging**: a set field highlights yellow if it
  beats your previous session's best for that exercise (a quick in-the-moment
  signal). The Progress page computes true all-time PBs across full history.

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up your environment file

```bash
cp .env.example .env
```

Edit `.env` and set `DATABASE_URL` to point at a local Postgres database, e.g.:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gymtracker"
```

If you don't have Postgres locally, the easiest option is Docker:

```bash
docker run --name gymtracker-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=gymtracker -p 5432:5432 -d postgres:16
```

### 3. Run migrations

```bash
npx prisma migrate dev --name init
```

This creates the database tables from `prisma/schema.prisma`.

### 4. Seed demo data (optional but recommended for first run)

```bash
npm run seed
```

This creates two demo weeks with a couple of exercises and one completed
session, so you can immediately see the "previous performance" and
progression features working.

### 5. Run the app

```bash
npm run dev
```

Open http://localhost:3000 — the Program page is the default/home page.

## Pushing to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

## Deploying to Railway

1. Create a new Railway project and choose **Deploy from GitHub repo**,
   selecting this repository.
2. Add a **PostgreSQL** plugin to the same Railway project.
3. In your app service's **Variables** tab, add a `DATABASE_URL` variable
   referencing the Postgres plugin (Railway can auto-link this — see the
   step-by-step walkthrough for exact clicks).
4. Set the **Build Command** to `npm run build` (this also runs
   `prisma generate`).
5. Set the **Start Command** to `npm run start` (this binds to Railway's
   `$PORT` automatically).
6. Before or after the first deploy, run migrations against the Railway
   database:
   ```bash
   railway run npx prisma migrate deploy
   ```
   (or run it as a one-off Railway shell command from the dashboard).
7. Optionally seed demo data the same way:
   ```bash
   railway run npm run seed
   ```
8. Generate a public domain for the service from the **Settings** tab.

## Project structure

```
prisma/schema.prisma      Database schema
prisma/seed.js            Demo data
lib/prisma.js             Prisma client singleton
lib/calculations.js       BMI/BMR/volume/PB calculation helpers
pages/index.js            Program page (weeks + days grid)
pages/day/[id].js         Workout builder/logger for one day
pages/progress.js         Progression page + personal bests
pages/history.js          Completed workout history
pages/profile.js          Body metrics + BMI/BMR
pages/api/**              Backend API routes
components/               Shared UI (NavBar, SavingTag)
styles/globals.css        App-wide styling
```

## Data model summary

- `Exercise` — stable exercise identity (name + type), referenced everywhere else.
- `Week` → `WorkoutDay` (7 per week) → `WorkoutExercise` (template line items, one per exercise on that day).
- `WorkoutDay` → `WorkoutSession` (the actual logged results for that day) → `SessionExercise` (actual sets/cardio data per exercise).
- `BodyMetric` — one row per profile save, so history is preserved.

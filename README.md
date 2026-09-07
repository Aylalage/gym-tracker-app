# Gym Tracker App

A FitXR-styled gym workout tracker PWA (Progressive Web App) built with Express, Node.js, and PostgreSQL.

## Features

- Log workouts by day with exercises (strength & cardio)
- Track sets, reps, and weights
- Personal bests (PB) detection with yellow highlighting
- Progress tab showing exercise history and trends
- Mark sets as complete with checkmarks
- Add/repeat/delete workouts
- Responsive design, works on mobile
- Add to home screen on iOS/Android

## Setup & Deployment on Railway

### 1. Push to GitHub

```bash
cd gym-tracker-app
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gym-tracker-app.git
git push -u origin main
```

### 2. Deploy on Railway

1. Go to [railway.app](https://railway.app)
2. Click **+ New** → **GitHub Repo**
3. Select `gym-tracker-app`
4. Click **Add** and select **PostgreSQL** plugin
5. Go to **Deployments** and wait for it to finish
6. Copy the **Generate Domain** URL
7. Test it in your browser

### 3. Add to Home Screen (iPhone)

1. Open the Railway domain URL in Safari
2. Tap **Share** (bottom middle)
3. Tap **Add to Home Screen**
4. Name it "Gym Tracker" and tap **Add**

## Local Development

```bash
npm install
DATABASE_URL="postgresql://user:password@localhost/gymtracker" npm start
```

Visit `http://localhost:3000`

## Database Schema

- `days` - Workouts with exercises (JSONB)
- `body_stats` - Weight, body fat %, muscle mass history
- `profile_info` - Height, age, sex

All tables auto-create on startup.

## API Endpoints

- `GET/POST /api/days` - List/create workouts
- `PUT/DELETE /api/days/:id` - Update/delete workout
- `GET/POST /api/body-stats` - Body measurements
- `GET/POST /api/profile-info` - Personal details

## Notes

- Data is stored locally in the browser (in-memory state)
- PostgreSQL backend is ready for data persistence
- To enable persistence, modify the HTML to POST changes to `/api/days` on update

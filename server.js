const express = require('express');
const pg = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// PostgreSQL connection
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

client.connect();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database tables
async function initDb() {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS days (
        id TEXT PRIMARY KEY,
        date DATE NOT NULL,
        day_name TEXT NOT NULL,
        is_rest BOOLEAN NOT NULL DEFAULT false,
        title TEXT NOT NULL DEFAULT '',
        exercises JSONB NOT NULL DEFAULT '[]',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS body_stats (
        id TEXT PRIMARY KEY,
        date DATE NOT NULL,
        weight_kg NUMERIC,
        body_fat_pct NUMERIC,
        muscle_mass_kg NUMERIC,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS profile_info (
        id TEXT PRIMARY KEY DEFAULT 'singleton',
        height_cm NUMERIC,
        age INTEGER,
        sex TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    console.log('Database tables initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

initDb();

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get all days
app.get('/api/days', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM days ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get single day
app.get('/api/days/:id', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM days WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Day not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Create or update day
app.post('/api/days', async (req, res) => {
  const { id, date, day_name, is_rest, title, exercises } = req.body;
  try {
    await client.query(
      `INSERT INTO days (id, date, day_name, is_rest, title, exercises) 
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
       date = $2, day_name = $3, is_rest = $4, title = $5, exercises = $6, updated_at = now()`,
      [id, date, day_name, is_rest, title, JSON.stringify(exercises)]
    );
    res.json({ id, date, day_name, is_rest, title, exercises });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Update day
app.put('/api/days/:id', async (req, res) => {
  const { date, day_name, is_rest, title, exercises } = req.body;
  try {
    await client.query(
      `UPDATE days SET date = $1, day_name = $2, is_rest = $3, title = $4, exercises = $5, updated_at = now()
       WHERE id = $6`,
      [date, day_name, is_rest, title, JSON.stringify(exercises), req.params.id]
    );
    res.json({ id: req.params.id, date, day_name, is_rest, title, exercises });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Delete day
app.delete('/api/days/:id', async (req, res) => {
  try {
    await client.query('DELETE FROM days WHERE id = $1', [req.params.id]);
    res.json({ deleted: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Body stats endpoints
app.get('/api/body-stats', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM body_stats ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/body-stats', async (req, res) => {
  const { id, date, weight_kg, body_fat_pct, muscle_mass_kg } = req.body;
  try {
    await client.query(
      `INSERT INTO body_stats (id, date, weight_kg, body_fat_pct, muscle_mass_kg)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
       date = $2, weight_kg = $3, body_fat_pct = $4, muscle_mass_kg = $5, updated_at = now()`,
      [id, date, weight_kg, body_fat_pct, muscle_mass_kg]
    );
    res.json({ id, date, weight_kg, body_fat_pct, muscle_mass_kg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/body-stats/:id', async (req, res) => {
  try {
    await client.query('DELETE FROM body_stats WHERE id = $1', [req.params.id]);
    res.json({ deleted: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Profile info endpoints
app.get('/api/profile-info', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM profile_info WHERE id = $1', ['singleton']);
    if (result.rows.length === 0) {
      return res.json({ id: 'singleton', height_cm: null, age: null, sex: null });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/profile-info', async (req, res) => {
  const { height_cm, age, sex } = req.body;
  try {
    await client.query(
      `INSERT INTO profile_info (id, height_cm, age, sex)
       VALUES ('singleton', $1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET
       height_cm = $1, age = $2, sex = $3, updated_at = now()`,
      [height_cm, age, sex]
    );
    res.json({ id: 'singleton', height_cm, age, sex });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Serve index.html for all non-API routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Gym tracker server running on port ${port}`);
});

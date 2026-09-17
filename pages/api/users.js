const prisma = require('../../lib/prisma');
const bcrypt = require('bcryptjs');

const STARTER_TEMPLATES = [
  {
    name: 'Push Day',
    exercises: [
      { name: 'Bench Press', reps: 8 },
      { name: 'Overhead Press', reps: 8 },
      { name: 'Triceps Pushdown', reps: 12 },
    ],
  },
  {
    name: 'Pull Day',
    exercises: [
      { name: 'Deadlift', reps: 5 },
      { name: 'Lat Pulldown', reps: 10 },
      { name: 'Bicep Curl', reps: 12 },
    ],
  },
  {
    name: 'Legs Day',
    exercises: [
      { name: 'Squat', reps: 8 },
      { name: 'Leg Press', reps: 10 },
      { name: 'Calf Raise', reps: 15 },
    ],
  },
];

async function seedStarterTemplates(userId) {
  for (const t of STARTER_TEMPLATES) {
    const exerciseRows = [];
    for (const ex of t.exercises) {
      const exercise = await prisma.exercise.create({ data: { userId, name: ex.name, type: 'STRENGTH' } });
      exerciseRows.push({ exerciseId: exercise.id, reps: ex.reps });
    }
    await prisma.template.create({
      data: {
        userId,
        name: t.name,
        exercises: {
          create: exerciseRows.map((ex, i) => ({
            exerciseId: ex.exerciseId,
            order: i,
            plannedSets: [{ reps: ex.reps, weightKg: null, completed: false }, { reps: ex.reps, weightKg: null, completed: false }, { reps: ex.reps, weightKg: null, completed: false }],
          })),
        },
      },
    });
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, pinHash: true },
    });
    // Never expose the actual hash — just whether a PIN is required.
    return res.status(200).json(users.map((u) => ({ id: u.id, name: u.name, hasPin: !!u.pinHash })));
  }

  if (req.method === 'POST') {
    const { name, pin } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });

    const pinHash = pin && pin.trim() ? await bcrypt.hash(pin.trim(), 10) : null;
    const user = await prisma.user.create({ data: { name: name.trim(), pinHash } });
    await seedStarterTemplates(user.id);
    return res.status(201).json({ id: user.id, name: user.name, hasPin: !!user.pinHash });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}


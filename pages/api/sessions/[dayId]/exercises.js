const prisma = require('../../../../lib/prisma');
const { getUserId } = require('../../../../lib/auth');

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).end();
  }

  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'not logged in' });

  const { dayId } = req.query;

  const owner = await prisma.workoutDay.findUnique({ where: { id: dayId }, include: { week: true } });
  if (!owner || owner.week.userId !== userId) return res.status(404).json({ error: 'day not found' });

  // body.exercises: [{ exerciseId, order, actualSets, notes, supersetGroup, restSeconds }]
  const { exercises } = req.body || {};
  if (!Array.isArray(exercises)) return res.status(400).json({ error: 'exercises array required' });

  const session = await prisma.workoutSession.findUnique({ where: { workoutDayId: dayId } });
  if (!session) return res.status(404).json({ error: 'session not found - GET it first to create one' });

  // Replace session exercises
  await prisma.sessionExercise.deleteMany({ where: { sessionId: session.id } });
  for (const ex of exercises) {
    await prisma.sessionExercise.create({
      data: {
        sessionId: session.id,
        exerciseId: ex.exerciseId,
        order: ex.order,
        actualSets: ex.actualSets,
        notes: ex.notes || null,
        supersetGroup: ex.supersetGroup || null,
        restSeconds: typeof ex.restSeconds === 'number' ? ex.restSeconds : null,
      },
    });
  }

  // Keep the day's template structurally in sync, so future weeks
  // duplicated from this one carry the same exercise list.
  await prisma.workoutExercise.deleteMany({ where: { workoutDayId: dayId } });
  for (const ex of exercises) {
    await prisma.workoutExercise.create({
      data: {
        workoutDayId: dayId,
        exerciseId: ex.exerciseId,
        order: ex.order,
        plannedSets: ex.actualSets,
        notes: ex.notes || null,
        supersetGroup: ex.supersetGroup || null,
        restSeconds: typeof ex.restSeconds === 'number' ? ex.restSeconds : null,
      },
    });
  }

  const updated = await prisma.workoutSession.findUnique({
    where: { workoutDayId: dayId },
    include: { sessionExercises: { orderBy: { order: 'asc' }, include: { exercise: true } } },
  });
  return res.status(200).json(updated);
}

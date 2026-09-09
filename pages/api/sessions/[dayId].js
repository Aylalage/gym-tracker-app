const prisma = require('../../../lib/prisma');

module.exports = async function handler(req, res) {
  const { dayId } = req.query;

  if (req.method === 'GET') {
    let session = await prisma.workoutSession.findUnique({
      where: { workoutDayId: dayId },
      include: { sessionExercises: { orderBy: { order: 'asc' }, include: { exercise: true } } },
    });

    if (!session) {
      const day = await prisma.workoutDay.findUnique({
        where: { id: dayId },
        include: { exercises: { orderBy: { order: 'asc' } } },
      });
      if (!day) return res.status(404).json({ error: 'day not found' });

      session = await prisma.workoutSession.create({
        data: {
          workoutDayId: dayId,
          startedAt: new Date(),
          sessionExercises: {
            create: day.exercises.map((we) => ({
              exerciseId: we.exerciseId,
              order: we.order,
              actualSets: we.plannedSets,
            })),
          },
        },
        include: { sessionExercises: { orderBy: { order: 'asc' }, include: { exercise: true } } },
      });
    }

    return res.status(200).json(session);
  }

  if (req.method === 'PUT') {
    // body: { completed?, durationSec?, sessionExercises: [{ id, actualSets, notes }] }
    const { completed, durationSec, sessionExercises } = req.body || {};

    if (Array.isArray(sessionExercises)) {
      for (const se of sessionExercises) {
        await prisma.sessionExercise.update({
          where: { id: se.id },
          data: { actualSets: se.actualSets, notes: se.notes || null },
        });
      }
    }

    const data = {};
    if (typeof completed === 'boolean') {
      data.completed = completed;
      if (completed) data.completedAt = new Date();
    }
    if (typeof durationSec === 'number') data.durationSec = durationSec;

    const session = await prisma.workoutSession.update({
      where: { workoutDayId: dayId },
      data,
      include: { sessionExercises: { orderBy: { order: 'asc' }, include: { exercise: true } } },
    });
    return res.status(200).json(session);
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).end();
};

const prisma = require('../../../lib/prisma');
const { getUserId } = require('../../../lib/auth');

// Find the most recent COMPLETED session-exercise for a given exercise id,
// looked up by exercise identity (not workout name), from any week that
// finished before the given week number. Used to prefill / show "previous".
// exerciseId is always scoped to one user already (Exercise rows aren't
// shared between profiles), so this naturally never crosses profiles.
async function findPrevious(exerciseId, beforeWeekNumber) {
  const rows = await prisma.sessionExercise.findMany({
    where: {
      exerciseId,
      session: {
        completed: true,
        workoutDay: { week: { number: { lt: beforeWeekNumber } } },
      },
    },
    include: { session: { include: { workoutDay: { include: { week: true } } } } },
    orderBy: { session: { workoutDay: { week: { number: 'desc' } } } },
    take: 1,
  });
  return rows[0] || null;
}

export default async function handler(req, res) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'not logged in' });

  const { id } = req.query;

  const owner = await prisma.workoutDay.findUnique({ where: { id }, include: { week: true } });
  if (!owner || owner.week.userId !== userId) return res.status(404).json({ error: 'not found' });

  if (req.method === 'GET') {
    const day = await prisma.workoutDay.findUnique({
      where: { id },
      include: {
        week: true,
        exercises: { orderBy: { order: 'asc' }, include: { exercise: true } },
        session: { include: { sessionExercises: { include: { exercise: true } } } },
      },
    });

    const previous = {};
    for (const we of day.exercises) {
      const prev = await findPrevious(we.exerciseId, day.week.number);
      if (prev) {
        previous[we.exerciseId] = {
          actualSets: prev.actualSets,
          weekNumber: prev.session.workoutDay.week.number,
          completedAt: prev.session.completedAt,
        };
      }
    }

    return res.status(200).json({ ...day, previous });
  }

  if (req.method === 'PUT') {
    // Full replace of a day's template: name + ordered exercise list.
    // body.exercises: [{ exerciseId, order, plannedSets, notes }]
    const { name, exercises } = req.body || {};

    const data = {};
    if (typeof name === 'string') data.name = name;

    if (Array.isArray(exercises)) {
      await prisma.workoutExercise.deleteMany({ where: { workoutDayId: id } });
      for (const ex of exercises) {
        await prisma.workoutExercise.create({
          data: {
            workoutDayId: id,
            exerciseId: ex.exerciseId,
            order: ex.order,
            plannedSets: ex.plannedSets,
            notes: ex.notes || null,
            supersetGroup: ex.supersetGroup || null,
            restSeconds: typeof ex.restSeconds === 'number' ? ex.restSeconds : null,
          },
        });
      }
    }

    if (Object.keys(data).length > 0) {
      await prisma.workoutDay.update({ where: { id }, data });
    }

    const day = await prisma.workoutDay.findUnique({
      where: { id },
      include: { exercises: { orderBy: { order: 'asc' }, include: { exercise: true } } },
    });
    return res.status(200).json(day);
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).end();
}

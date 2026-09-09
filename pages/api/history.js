const prisma = require('../../lib/prisma');
const { DAY_NAMES } = require('../../lib/constants');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }

  const sessions = await prisma.workoutSession.findMany({
    where: { completed: true },
    include: {
      workoutDay: { include: { week: true } },
      sessionExercises: { orderBy: { order: 'asc' }, include: { exercise: true } },
    },
    orderBy: { completedAt: 'desc' },
  });

  const result = sessions.map((s) => ({
    id: s.id,
    weekNumber: s.workoutDay.week.number,
    dayOfWeek: s.workoutDay.dayOfWeek,
    dayName: DAY_NAMES[s.workoutDay.dayOfWeek],
    workoutName: s.workoutDay.name,
    completedAt: s.completedAt,
    durationSec: s.durationSec,
    exercises: s.sessionExercises.map((se) => ({
      name: se.exercise.name,
      type: se.exercise.type,
      actualSets: se.actualSets,
      notes: se.notes,
    })),
  }));

  return res.status(200).json(result);
}

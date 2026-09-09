const prisma = require('../../../lib/prisma');
const { strengthVolume, maxWeight, maxReps, computePBs } = require('../../../lib/calculations');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }

  const { exerciseId } = req.query;
  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise) return res.status(404).json({ error: 'not found' });

  const rows = await prisma.sessionExercise.findMany({
    where: { exerciseId, session: { completed: true } },
    include: { session: { include: { workoutDay: { include: { week: true } } } } },
    orderBy: { session: { workoutDay: { week: { number: 'asc' } } } },
  });

  const history = rows.map((r) => ({
    weekNumber: r.session.workoutDay.week.number,
    completedAt: r.session.completedAt,
    actualSets: r.actualSets,
    ...(exercise.type === 'STRENGTH'
      ? {
          maxWeight: maxWeight(r.actualSets),
          maxReps: maxReps(r.actualSets),
          volume: strengthVolume(r.actualSets),
        }
      : {}),
  }));

  const pbs = computePBs(exercise.type, rows.map((r) => ({ actualSets: r.actualSets })));

  return res.status(200).json({ exercise, history, pbs });
};

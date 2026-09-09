const prisma = require('../../../../lib/prisma');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  const { id } = req.query;
  const { targetDayId } = req.body || {};
  if (!targetDayId) return res.status(400).json({ error: 'targetDayId is required' });

  const source = await prisma.workoutDay.findUnique({
    where: { id },
    include: { exercises: true },
  });
  if (!source) return res.status(404).json({ error: 'source day not found' });

  await prisma.workoutDay.update({ where: { id: targetDayId }, data: { name: source.name } });
  await prisma.workoutExercise.deleteMany({ where: { workoutDayId: targetDayId } });
  for (const ex of source.exercises) {
    await prisma.workoutExercise.create({
      data: {
        workoutDayId: targetDayId,
        exerciseId: ex.exerciseId,
        order: ex.order,
        plannedSets: ex.plannedSets,
        notes: ex.notes,
      },
    });
  }

  const target = await prisma.workoutDay.findUnique({
    where: { id: targetDayId },
    include: { exercises: { orderBy: { order: 'asc' }, include: { exercise: true } } },
  });
  return res.status(200).json(target);
};

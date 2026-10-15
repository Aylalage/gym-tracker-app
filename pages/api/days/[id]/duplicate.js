const prisma = require('../../../../lib/prisma');
const { getUserId } = require('../../../../lib/auth');
const { stripCompleted } = require('../../../../lib/calculations');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'not logged in' });

  const { id } = req.query;
  const { targetDayId } = req.body || {};
  if (!targetDayId) return res.status(400).json({ error: 'targetDayId is required' });

  const source = await prisma.workoutDay.findUnique({
    where: { id },
    include: { exercises: true, week: true },
  });
  if (!source || source.week.userId !== userId) return res.status(404).json({ error: 'source day not found' });

  const targetOwner = await prisma.workoutDay.findUnique({ where: { id: targetDayId }, include: { week: true } });
  if (!targetOwner || targetOwner.week.userId !== userId) return res.status(404).json({ error: 'target day not found' });

  await prisma.workoutDay.update({ where: { id: targetDayId }, data: { name: source.name } });
  await prisma.workoutExercise.deleteMany({ where: { workoutDayId: targetDayId } });
  for (const ex of source.exercises) {
    await prisma.workoutExercise.create({
      data: {
        workoutDayId: targetDayId,
        exerciseId: ex.exerciseId,
        order: ex.order,
        plannedSets: stripCompleted(ex.plannedSets),
        notes: ex.notes,
        supersetGroup: ex.supersetGroup,
        restSeconds: ex.restSeconds,
      },
    });
  }

  // If the target day was ever opened before, it already has its own
  // WorkoutSession (created independently of the template on first visit).
  // That session's exercises were going stale after a duplicate, since only
  // the template was being replaced above. Clear an in-progress session so
  // it regenerates fresh from the new template next time it's opened.
  // A completed session is left untouched so history is never overwritten.
  const targetSession = await prisma.workoutSession.findUnique({ where: { workoutDayId: targetDayId } });
  if (targetSession && !targetSession.completed) {
    await prisma.workoutSession.delete({ where: { id: targetSession.id } });
  }

  const target = await prisma.workoutDay.findUnique({
    where: { id: targetDayId },
    include: { exercises: { orderBy: { order: 'asc' }, include: { exercise: true } } },
  });
  return res.status(200).json(target);
}

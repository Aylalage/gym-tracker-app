const prisma = require('../../../../lib/prisma');
const { getUserId } = require('../../../../lib/auth');

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

  const source = await prisma.workoutSession.findUnique({
    where: { id },
    include: {
      workoutDay: { include: { week: true } },
      sessionExercises: true,
    },
  });
  if (!source || source.workoutDay.week.userId !== userId) return res.status(404).json({ error: 'source session not found' });

  const targetOwner = await prisma.workoutDay.findUnique({ where: { id: targetDayId }, include: { week: true } });
  if (!targetOwner || targetOwner.week.userId !== userId) return res.status(404).json({ error: 'target day not found' });

  await prisma.workoutDay.update({ where: { id: targetDayId }, data: { name: source.workoutDay.name } });
  await prisma.workoutExercise.deleteMany({ where: { workoutDayId: targetDayId } });
  for (const se of source.sessionExercises) {
    await prisma.workoutExercise.create({
      data: {
        workoutDayId: targetDayId,
        exerciseId: se.exerciseId,
        order: se.order,
        plannedSets: se.actualSets,
        notes: se.notes,
        supersetGroup: se.supersetGroup,
        restSeconds: se.restSeconds,
      },
    });
  }

  // Same rule as duplicating a day: don't overwrite an already-completed
  // session on the target day, but clear a stale in-progress one so it
  // regenerates from the freshly-copied template.
  const targetSession = await prisma.workoutSession.findUnique({ where: { workoutDayId: targetDayId } });
  if (targetSession && !targetSession.completed) {
    await prisma.workoutSession.delete({ where: { id: targetSession.id } });
  }

  return res.status(200).json({ copied: true, targetDayId });
}

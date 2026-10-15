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

  const template = await prisma.template.findUnique({ where: { id }, include: { exercises: true } });
  if (!template || template.userId !== userId) return res.status(404).json({ error: 'template not found' });

  const targetOwner = await prisma.workoutDay.findUnique({ where: { id: targetDayId }, include: { week: true } });
  if (!targetOwner || targetOwner.week.userId !== userId) return res.status(404).json({ error: 'target day not found' });

  await prisma.workoutDay.update({ where: { id: targetDayId }, data: { name: template.name } });
  await prisma.workoutExercise.deleteMany({ where: { workoutDayId: targetDayId } });
  for (const ex of template.exercises) {
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

  const targetSession = await prisma.workoutSession.findUnique({ where: { workoutDayId: targetDayId } });
  if (targetSession && !targetSession.completed) {
    await prisma.workoutSession.delete({ where: { id: targetSession.id } });
  }

  return res.status(200).json({ applied: true, targetDayId });
}

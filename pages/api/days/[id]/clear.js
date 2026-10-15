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
  const owner = await prisma.workoutDay.findUnique({ where: { id }, include: { week: true } });
  if (!owner || owner.week.userId !== userId) return res.status(404).json({ error: 'not found' });

  const session = await prisma.workoutSession.findUnique({ where: { workoutDayId: id } });
  if (session) await prisma.workoutSession.delete({ where: { id: session.id } });
  await prisma.workoutExercise.deleteMany({ where: { workoutDayId: id } });
  await prisma.workoutDay.update({ where: { id }, data: { name: 'Rest' } });

  return res.status(200).json({ cleared: true });
}

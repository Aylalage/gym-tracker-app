const prisma = require('../../../lib/prisma');
const { getUserId } = require('../../../lib/auth');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'not logged in' });

  const { dayAId, dayBId } = req.body || {};
  if (!dayAId || !dayBId || dayAId === dayBId) {
    return res.status(400).json({ error: 'dayAId and dayBId (two different days) are required' });
  }

  const [dayA, dayB] = await Promise.all([
    prisma.workoutDay.findUnique({ where: { id: dayAId }, include: { week: true } }),
    prisma.workoutDay.findUnique({ where: { id: dayBId }, include: { week: true } }),
  ]);
  if (!dayA || !dayB || dayA.week.userId !== userId || dayB.week.userId !== userId) {
    return res.status(404).json({ error: 'day not found' });
  }
  if (dayA.weekId !== dayB.weekId) {
    return res.status(400).json({ error: 'both days must be in the same week' });
  }

  // Swap via a temporary placeholder to avoid tripping the
  // @@unique([weekId, dayOfWeek]) constraint mid-update.
  await prisma.$transaction([
    prisma.workoutDay.update({ where: { id: dayAId }, data: { dayOfWeek: -1 } }),
    prisma.workoutDay.update({ where: { id: dayBId }, data: { dayOfWeek: dayA.dayOfWeek } }),
    prisma.workoutDay.update({ where: { id: dayAId }, data: { dayOfWeek: dayB.dayOfWeek } }),
  ]);

  return res.status(200).json({ swapped: true });
}

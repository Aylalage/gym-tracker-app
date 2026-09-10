const prisma = require('../../../lib/prisma');
const { getUserId } = require('../../../lib/auth');

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end();
  }

  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'not logged in' });

  const { id } = req.query;
  const session = await prisma.workoutSession.findUnique({
    where: { id },
    include: { workoutDay: { include: { week: true } } },
  });
  if (!session || session.workoutDay.week.userId !== userId) {
    return res.status(404).json({ error: 'not found' });
  }

  // Deleting the session only removes the logged results — the WorkoutDay
  // and its template stay intact, and a fresh session will be created next
  // time that day is opened.
  await prisma.workoutSession.delete({ where: { id } });

  return res.status(200).json({ deleted: true });
}

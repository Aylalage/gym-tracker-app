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
  const week = await prisma.week.findUnique({ where: { id } });
  if (!week || week.userId !== userId) return res.status(404).json({ error: 'week not found' });

  // Cascades defined in the schema handle WorkoutDay -> WorkoutExercise and
  // WorkoutDay -> WorkoutSession -> SessionExercise automatically.
  await prisma.week.delete({ where: { id } });

  return res.status(200).json({ deleted: true });
}

const prisma = require('../../../lib/prisma');
const { getUserId } = require('../../../lib/auth');

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).end();
  }

  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'not logged in' });

  const { id } = req.query;
  const existing = await prisma.exercise.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return res.status(404).json({ error: 'not found' });

  const { name } = req.body || {};
  const exercise = await prisma.exercise.update({ where: { id }, data: { name } });
  return res.status(200).json(exercise);
}

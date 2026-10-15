const prisma = require('../../lib/prisma');
const { getUserId } = require('../../lib/auth');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }

  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'not logged in' });

  const { goal } = req.query;
  const where = { published: true };
  if (goal) where.goal = { key: goal };

  const templates = await prisma.masterTemplate.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    include: { goal: true, days: { orderBy: { dayOfWeek: 'asc' }, include: { exercises: { orderBy: { order: 'asc' } } } } },
  });
  return res.status(200).json(templates);
}

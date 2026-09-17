const prisma = require('../../lib/prisma');
const { getUserId } = require('../../lib/auth');

export default async function handler(req, res) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'not logged in' });

  if (req.method === 'GET') {
    const templates = await prisma.template.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: { exercises: { orderBy: { order: 'asc' }, include: { exercise: true } } },
    });
    return res.status(200).json(templates);
  }

  if (req.method === 'POST') {
    // body: { name, exercises: [{ exerciseId, order, plannedSets, notes, supersetGroup, restSeconds }] }
    const { name, exercises } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
    if (!Array.isArray(exercises) || exercises.length === 0) {
      return res.status(400).json({ error: 'at least one exercise is required' });
    }

    const template = await prisma.template.create({
      data: {
        userId,
        name: name.trim(),
        exercises: {
          create: exercises.map((ex, i) => ({
            exerciseId: ex.exerciseId,
            order: i,
            plannedSets: ex.plannedSets,
            notes: ex.notes || null,
            supersetGroup: ex.supersetGroup || null,
            restSeconds: typeof ex.restSeconds === 'number' ? ex.restSeconds : null,
          })),
        },
      },
      include: { exercises: { orderBy: { order: 'asc' }, include: { exercise: true } } },
    });
    return res.status(201).json(template);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}

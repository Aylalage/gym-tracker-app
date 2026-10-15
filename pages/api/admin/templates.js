const prisma = require('../../../lib/prisma');
const { requireAdmin } = require('../../../lib/auth');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const userId = await requireAdmin(req, res);
    if (!userId) return;
    const templates = await prisma.masterTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      include: { goal: true, days: { orderBy: { dayOfWeek: 'asc' }, include: { exercises: { orderBy: { order: 'asc' } } } } },
    });
    return res.status(200).json(templates);
  }

  if (req.method === 'POST') {
    const userId = await requireAdmin(req, res);
    if (!userId) return;
    const { name, description, goalId, difficulty, daysPerWeek, recommendedWeeks } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
    if (!daysPerWeek) return res.status(400).json({ error: 'daysPerWeek is required' });

    const template = await prisma.masterTemplate.create({
      data: {
        name: name.trim(),
        description: description || null,
        goalId: goalId || null,
        difficulty: difficulty || null,
        daysPerWeek: Number(daysPerWeek),
        recommendedWeeks: recommendedWeeks ? Number(recommendedWeeks) : null,
      },
      include: { goal: true, days: true },
    });
    return res.status(201).json(template);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}

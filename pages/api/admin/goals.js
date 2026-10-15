const prisma = require('../../../lib/prisma');
const { requireAdmin } = require('../../../lib/auth');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const userId = await requireAdmin(req, res);
    if (!userId) return;
    const goals = await prisma.goalCategory.findMany({ orderBy: { order: 'asc' } });
    return res.status(200).json(goals);
  }

  if (req.method === 'POST') {
    const userId = await requireAdmin(req, res);
    if (!userId) return;
    const { key, label } = req.body || {};
    if (!key || !label) return res.status(400).json({ error: 'key and label are required' });
    const last = await prisma.goalCategory.findFirst({ orderBy: { order: 'desc' } });
    const goal = await prisma.goalCategory.create({
      data: { key: key.trim(), label: label.trim(), order: last ? last.order + 1 : 0 },
    });
    return res.status(201).json(goal);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}

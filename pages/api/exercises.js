const prisma = require('../../lib/prisma');
const { getUserId } = require('../../lib/auth');

export default async function handler(req, res) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'not logged in' });

  if (req.method === 'GET') {
    const exercises = await prisma.exercise.findMany({ where: { userId }, orderBy: { name: 'asc' } });
    return res.status(200).json(exercises);
  }

  if (req.method === 'POST') {
    const { name, type } = req.body || {};
    if (!name || !type) return res.status(400).json({ error: 'name and type are required' });

    // Reuse an existing exercise with the same name+type rather than creating
    // a duplicate identity, so history stays merged for repeated names.
    const existing = await prisma.exercise.findFirst({ where: { userId, name, type } });
    if (existing) return res.status(200).json(existing);

    const exercise = await prisma.exercise.create({ data: { userId, name, type } });
    return res.status(201).json(exercise);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}

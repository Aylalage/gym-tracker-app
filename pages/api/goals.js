const prisma = require('../../lib/prisma');
const { getUserId } = require('../../lib/auth');

const DEFAULTS = [
  { key: 'build_muscle', label: 'Build Muscle / Strength', order: 0 },
  { key: 'lose_weight', label: 'Lose Weight', order: 1 },
  { key: 'maintain_fitness', label: 'Maintain Fitness', order: 2 },
  { key: 'general_fitness', label: 'General Fitness', order: 3 },
];

async function ensureDefaults() {
  const count = await prisma.goalCategory.count();
  if (count === 0) {
    for (const g of DEFAULTS) await prisma.goalCategory.create({ data: g });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }

  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'not logged in' });

  await ensureDefaults();
  const goals = await prisma.goalCategory.findMany({ orderBy: { order: 'asc' } });
  return res.status(200).json(goals);
}

const prisma = require('../../lib/prisma');
const { getUserId } = require('../../lib/auth');

export default async function handler(req, res) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'not logged in' });

  if (req.method === 'GET') {
    const metrics = await prisma.bodyMetric.findMany({ where: { userId }, orderBy: { date: 'asc' } });
    return res.status(200).json(metrics);
  }

  if (req.method === 'POST') {
    const { weightKg, heightCm, bodyFatPct, muscleMassKg, age, sex } = req.body || {};
    const metric = await prisma.bodyMetric.create({
      data: {
        userId,
        weightKg: weightKg ?? null,
        heightCm: heightCm ?? null,
        bodyFatPct: bodyFatPct ?? null,
        muscleMassKg: muscleMassKg ?? null,
        age: age ?? null,
        sex: sex ?? null,
      },
    });
    return res.status(201).json(metric);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}

const prisma = require('../../lib/prisma');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const metrics = await prisma.bodyMetric.findMany({ orderBy: { date: 'asc' } });
    return res.status(200).json(metrics);
  }

  if (req.method === 'POST') {
    const { weightKg, heightCm, bodyFatPct, muscleMassKg, age, sex } = req.body || {};
    const metric = await prisma.bodyMetric.create({
      data: {
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

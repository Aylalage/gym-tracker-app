const prisma = require('../../lib/prisma');
const { getUserId } = require('../../lib/auth');

export default async function handler(req, res) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'not logged in' });

  if (req.method === 'GET') {
    const settings = await prisma.programSettings.findUnique({ where: { userId } });
    return res.status(200).json(settings);
  }

  if (req.method === 'PUT') {
    const { startDate } = req.body || {};
    if (!startDate) return res.status(400).json({ error: 'startDate is required' });

    const settings = await prisma.programSettings.upsert({
      where: { userId },
      update: { startDate: new Date(startDate) },
      create: { userId, startDate: new Date(startDate) },
    });
    return res.status(200).json(settings);
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).end();
}

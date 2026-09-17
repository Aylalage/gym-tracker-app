const prisma = require('../../../lib/prisma');
const { getUserId } = require('../../../lib/auth');

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end();
  }

  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'not logged in' });

  const { id } = req.query;
  const template = await prisma.template.findUnique({ where: { id } });
  if (!template || template.userId !== userId) return res.status(404).json({ error: 'not found' });

  await prisma.template.delete({ where: { id } });
  return res.status(200).json({ deleted: true });
}

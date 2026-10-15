const prisma = require('../../../../../lib/prisma');
const { requireAdmin } = require('../../../../../lib/auth');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  const userId = await requireAdmin(req, res);
  if (!userId) return;

  const { id } = req.query;
  const { published } = req.body || {};
  const template = await prisma.masterTemplate.update({ where: { id }, data: { published: !!published } });
  return res.status(200).json(template);
}

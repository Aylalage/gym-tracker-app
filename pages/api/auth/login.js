const prisma = require('../../../lib/prisma');
const bcrypt = require('bcryptjs');
const { setUserCookie } = require('../../../lib/auth');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  const { userId, pin } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'profile not found' });

  if (user.pinHash) {
    const ok = pin && (await bcrypt.compare(pin, user.pinHash));
    if (!ok) return res.status(401).json({ error: 'incorrect PIN' });
  }

  setUserCookie(res, user.id);
  return res.status(200).json({ id: user.id, name: user.name });
}

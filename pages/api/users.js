const prisma = require('../../lib/prisma');
const bcrypt = require('bcryptjs');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, pinHash: true },
    });
    // Never expose the actual hash — just whether a PIN is required.
    return res.status(200).json(users.map((u) => ({ id: u.id, name: u.name, hasPin: !!u.pinHash })));
  }

  if (req.method === 'POST') {
    const { name, pin } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });

    const pinHash = pin && pin.trim() ? await bcrypt.hash(pin.trim(), 10) : null;
    const user = await prisma.user.create({ data: { name: name.trim(), pinHash } });
    return res.status(201).json({ id: user.id, name: user.name, hasPin: !!user.pinHash });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}

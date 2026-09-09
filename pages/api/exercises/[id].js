const prisma = require('../../../lib/prisma');

module.exports = async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    const { name } = req.body || {};
    const exercise = await prisma.exercise.update({ where: { id }, data: { name } });
    return res.status(200).json(exercise);
  }

  res.setHeader('Allow', ['PUT']);
  return res.status(405).end();
};

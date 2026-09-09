const prisma = require('../../lib/prisma');
const { computePBs } = require('../../lib/calculations');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }

  const exercises = await prisma.exercise.findMany({
    include: {
      sessionExercises: {
        where: { session: { completed: true } },
        include: { session: true },
      },
    },
  });

  const result = exercises
    .filter((e) => e.sessionExercises.length > 0)
    .map((e) => ({
      exerciseId: e.id,
      name: e.name,
      type: e.type,
      pbs: computePBs(e.type, e.sessionExercises),
    }));

  return res.status(200).json(result);
}

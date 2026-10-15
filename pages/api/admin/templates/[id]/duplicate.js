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
  const source = await prisma.masterTemplate.findUnique({
    where: { id },
    include: { days: { include: { exercises: true } } },
  });
  if (!source) return res.status(404).json({ error: 'not found' });

  const copy = await prisma.masterTemplate.create({
    data: {
      name: `${source.name} (Copy)`,
      description: source.description,
      goalId: source.goalId,
      difficulty: source.difficulty,
      daysPerWeek: source.daysPerWeek,
      recommendedWeeks: source.recommendedWeeks,
      published: false,
      days: {
        create: source.days.map((day) => ({
          dayOfWeek: day.dayOfWeek,
          workoutName: day.workoutName,
          exercises: {
            create: day.exercises.map((ex) => ({
              order: ex.order,
              name: ex.name,
              type: ex.type,
              sets: ex.sets,
              reps: ex.reps,
              repRangeMin: ex.repRangeMin,
              repRangeMax: ex.repRangeMax,
              notes: ex.notes,
              restSeconds: ex.restSeconds,
            })),
          },
        })),
      },
    },
  });

  return res.status(201).json(copy);
}

const prisma = require('../../lib/prisma');
const { getUserId } = require('../../lib/auth');

export default async function handler(req, res) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'not logged in' });

  if (req.method === 'GET') {
    const weeks = await prisma.week.findMany({
      where: { userId },
      orderBy: { number: 'asc' },
      include: {
        days: {
          orderBy: { dayOfWeek: 'asc' },
          include: { session: true },
        },
      },
    });
    return res.status(200).json(weeks);
  }

  if (req.method === 'POST') {
    const { duplicateFromWeekId } = req.body || {};
    const last = await prisma.week.findFirst({ where: { userId }, orderBy: { number: 'desc' } });
    const nextNumber = last ? last.number + 1 : 1;

    const week = await prisma.week.create({ data: { userId, number: nextNumber } });

    if (duplicateFromWeekId) {
      // Only ever copy from a week that actually belongs to this user.
      const sourceDays = await prisma.workoutDay.findMany({
        where: { weekId: duplicateFromWeekId, week: { userId } },
        include: { exercises: true },
      });
      for (const day of sourceDays) {
        const newDay = await prisma.workoutDay.create({
          data: { weekId: week.id, dayOfWeek: day.dayOfWeek, name: day.name },
        });
        for (const ex of day.exercises) {
          await prisma.workoutExercise.create({
            data: {
              workoutDayId: newDay.id,
              exerciseId: ex.exerciseId,
              order: ex.order,
              plannedSets: ex.plannedSets,
              notes: ex.notes,
              supersetGroup: ex.supersetGroup,
              restSeconds: ex.restSeconds,
            },
          });
        }
      }
    } else {
      // Fresh week: create 7 blank days so the UI has a full grid to edit.
      for (let d = 0; d < 7; d++) {
        await prisma.workoutDay.create({
          data: { weekId: week.id, dayOfWeek: d, name: 'Rest' },
        });
      }
    }

    const full = await prisma.week.findUnique({
      where: { id: week.id },
      include: { days: { orderBy: { dayOfWeek: 'asc' }, include: { session: true } } },
    });
    return res.status(201).json(full);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}

const prisma = require('../../lib/prisma');

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const weeks = await prisma.week.findMany({
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
    const last = await prisma.week.findFirst({ orderBy: { number: 'desc' } });
    const nextNumber = last ? last.number + 1 : 1;

    const week = await prisma.week.create({ data: { number: nextNumber } });

    if (duplicateFromWeekId) {
      const sourceDays = await prisma.workoutDay.findMany({
        where: { weekId: duplicateFromWeekId },
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
};

module.exports.DAY_NAMES = DAY_NAMES;

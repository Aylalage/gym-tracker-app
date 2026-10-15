const prisma = require('../../lib/prisma');
const { getUserId } = require('../../lib/auth');
const { stripCompleted } = require('../../lib/calculations');

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
    // How many copies to create in one go (e.g. 11 for a 12-week plan that
    // already has its first week). Always at least 1, capped to stay sane.
    const count = Math.min(Math.max(parseInt((req.body || {}).count, 10) || 1, 1), 52);

    const last = await prisma.week.findFirst({ where: { userId }, orderBy: { number: 'desc' } });
    let nextNumber = last ? last.number + 1 : 1;

    // Only ever copy from a week that actually belongs to this user.
    let sourceDays = null;
    if (duplicateFromWeekId) {
      sourceDays = await prisma.workoutDay.findMany({
        where: { weekId: duplicateFromWeekId, week: { userId } },
        include: { exercises: { orderBy: { order: 'asc' } } },
        orderBy: { dayOfWeek: 'asc' },
      });
      if (sourceDays.length === 0) return res.status(404).json({ error: 'week not found' });
    }

    const createdIds = [];
    for (let n = 0; n < count; n++) {
      const data = { userId, number: nextNumber++ };

      if (sourceDays) {
        // One nested write per week (week + days + exercises), with every
        // completed tick cleared so the new week looks untouched.
        data.days = {
          create: sourceDays.map((day) => ({
            dayOfWeek: day.dayOfWeek,
            name: day.name,
            exercises: {
              create: day.exercises.map((ex) => ({
                exerciseId: ex.exerciseId,
                order: ex.order,
                plannedSets: stripCompleted(ex.plannedSets),
                notes: ex.notes,
                supersetGroup: ex.supersetGroup,
                restSeconds: ex.restSeconds,
              })),
            },
          })),
        };
      } else {
        // Fresh week: 7 blank days so the UI has a full grid to edit.
        data.days = {
          create: Array.from({ length: 7 }, (_, d) => ({ dayOfWeek: d, name: 'Rest' })),
        };
      }

      const week = await prisma.week.create({ data });
      createdIds.push(week.id);
    }

    const full = await prisma.week.findUnique({
      where: { id: createdIds[0] },
      include: { days: { orderBy: { dayOfWeek: 'asc' }, include: { session: true } } },
    });
    return res.status(201).json({ ...full, createdCount: createdIds.length });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}

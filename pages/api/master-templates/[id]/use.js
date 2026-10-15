const prisma = require('../../../../lib/prisma');
const { getUserId } = require('../../../../lib/auth');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'not logged in' });

  const { id } = req.query;
  const template = await prisma.masterTemplate.findUnique({
    where: { id },
    include: { days: { include: { exercises: { orderBy: { order: 'asc' } } } } },
  });
  if (!template) return res.status(404).json({ error: 'template not found' });

  const last = await prisma.week.findFirst({ where: { userId }, orderBy: { number: 'desc' } });
  const nextNumber = last ? last.number + 1 : 1;
  const week = await prisma.week.create({ data: { userId, number: nextNumber } });

  // Blank grid first, then fill in the weekdays the template actually uses.
  const dayByWeekday = {};
  for (let d = 0; d < 7; d++) {
    dayByWeekday[d] = await prisma.workoutDay.create({ data: { weekId: week.id, dayOfWeek: d, name: 'Rest' } });
  }

  for (const templateDay of template.days) {
    const workoutDay = dayByWeekday[templateDay.dayOfWeek];
    await prisma.workoutDay.update({ where: { id: workoutDay.id }, data: { name: templateDay.workoutName } });

    let order = 0;
    for (const ex of templateDay.exercises) {
      // Reuse an existing exercise identity for this user if the name+type
      // already exists, so progression/history stays connected.
      let exercise = await prisma.exercise.findFirst({ where: { userId, name: ex.name, type: ex.type } });
      if (!exercise) {
        exercise = await prisma.exercise.create({ data: { userId, name: ex.name, type: ex.type } });
      }

      const repValue = ex.reps ?? ex.repRangeMin ?? null;
      const plannedSets =
        ex.type === 'STRENGTH'
          ? Array.from({ length: ex.sets }, () => ({ reps: repValue, weightKg: null, completed: false }))
          : { timeSec: null, distanceKm: null, level: null, completed: false };

      const noteParts = [];
      if (ex.repRangeMin && ex.repRangeMax) noteParts.push(`Suggested rep range: ${ex.repRangeMin}-${ex.repRangeMax}`);
      if (ex.notes) noteParts.push(ex.notes);

      await prisma.workoutExercise.create({
        data: {
          workoutDayId: workoutDay.id,
          exerciseId: exercise.id,
          order: order++,
          plannedSets,
          notes: noteParts.length ? noteParts.join(' — ') : null,
          restSeconds: ex.restSeconds || null,
        },
      });
    }
  }

  const full = await prisma.week.findUnique({
    where: { id: week.id },
    include: { days: { orderBy: { dayOfWeek: 'asc' }, include: { session: true } } },
  });
  return res.status(201).json(full);
}

const prisma = require('../../../../lib/prisma');
const { requireAdmin } = require('../../../../lib/auth');

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const userId = await requireAdmin(req, res);
    if (!userId) return;
    const template = await prisma.masterTemplate.findUnique({
      where: { id },
      include: { goal: true, days: { orderBy: { dayOfWeek: 'asc' }, include: { exercises: { orderBy: { order: 'asc' } } } } },
    });
    if (!template) return res.status(404).json({ error: 'not found' });
    return res.status(200).json(template);
  }

  if (req.method === 'PUT') {
    const userId = await requireAdmin(req, res);
    if (!userId) return;
    const { name, description, goalId, difficulty, daysPerWeek, recommendedWeeks, days } = req.body || {};

    const data = {};
    if (typeof name === 'string') data.name = name.trim();
    if (typeof description === 'string' || description === null) data.description = description;
    if (typeof goalId === 'string' || goalId === null) data.goalId = goalId || null;
    if (typeof difficulty === 'string' || difficulty === null) data.difficulty = difficulty;
    if (daysPerWeek) data.daysPerWeek = Number(daysPerWeek);
    if (recommendedWeeks !== undefined) data.recommendedWeeks = recommendedWeeks ? Number(recommendedWeeks) : null;

    if (Object.keys(data).length > 0) {
      await prisma.masterTemplate.update({ where: { id }, data });
    }

    // Full replace of days/exercises, same pattern as the user-side day editor.
    if (Array.isArray(days)) {
      await prisma.masterTemplateDay.deleteMany({ where: { templateId: id } });
      for (const day of days) {
        await prisma.masterTemplateDay.create({
          data: {
            templateId: id,
            dayOfWeek: day.dayOfWeek,
            workoutName: day.workoutName,
            exercises: {
              create: (day.exercises || []).map((ex, i) => ({
                order: i,
                name: ex.name,
                type: ex.type,
                sets: Number(ex.sets),
                reps: ex.reps ? Number(ex.reps) : null,
                repRangeMin: ex.repRangeMin ? Number(ex.repRangeMin) : null,
                repRangeMax: ex.repRangeMax ? Number(ex.repRangeMax) : null,
                notes: ex.notes || null,
                restSeconds: ex.restSeconds ? Number(ex.restSeconds) : null,
              })),
            },
          },
        });
      }
    }

    const updated = await prisma.masterTemplate.findUnique({
      where: { id },
      include: { goal: true, days: { orderBy: { dayOfWeek: 'asc' }, include: { exercises: { orderBy: { order: 'asc' } } } } },
    });
    return res.status(200).json(updated);
  }

  if (req.method === 'DELETE') {
    const userId = await requireAdmin(req, res);
    if (!userId) return;
    await prisma.masterTemplate.delete({ where: { id } });
    return res.status(200).json({ deleted: true });
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  return res.status(405).end();
}

const prisma = require('../../../../lib/prisma');
const { getUserId } = require('../../../../lib/auth');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'not logged in' });

  const { id } = req.query; // the duplicate to remove
  const { intoExerciseId } = req.body || {}; // the identity to keep
  if (!intoExerciseId || intoExerciseId === id) {
    return res.status(400).json({ error: 'intoExerciseId is required and must differ from the source' });
  }

  const [source, target] = await Promise.all([
    prisma.exercise.findUnique({ where: { id } }),
    prisma.exercise.findUnique({ where: { id: intoExerciseId } }),
  ]);
  if (!source || !target || source.userId !== userId || target.userId !== userId) {
    return res.status(404).json({ error: 'exercise not found' });
  }
  if (source.type !== target.type) {
    return res.status(400).json({ error: 'can only merge two exercises of the same type (strength/cardio)' });
  }

  // Move every historical reference onto the kept identity, then remove the
  // now-empty duplicate. Progress, PBs, and "previous performance" all key
  // off exerciseId, so this immediately reunites their history.
  await prisma.$transaction([
    prisma.workoutExercise.updateMany({ where: { exerciseId: id }, data: { exerciseId: intoExerciseId } }),
    prisma.sessionExercise.updateMany({ where: { exerciseId: id }, data: { exerciseId: intoExerciseId } }),
    prisma.templateExercise.updateMany({ where: { exerciseId: id }, data: { exerciseId: intoExerciseId } }),
    prisma.exercise.delete({ where: { id } }),
  ]);

  return res.status(200).json({ merged: true, keptExerciseId: intoExerciseId });
}

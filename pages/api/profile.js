const prisma = require('../../lib/prisma');
const { getUserId } = require('../../lib/auth');

const EDITABLE_FIELDS = [
  'primaryGoalId',
  'goalDescription',
  'experienceLevel',
  'trainingDaysPerWeek',
  'preferredTrainingType',
  'equipmentAvailable',
  'bodyAreaPriorities',
  'exerciseRestrictions',
  'aiSupportEnabled',
  'onboardingCompleted',
];

export default async function handler(req, res) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'not logged in' });

  if (req.method === 'GET') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { primaryGoal: true },
    });
    if (!user) return res.status(404).json({ error: 'not found' });
    const { pinHash, ...safe } = user;
    return res.status(200).json(safe);
  }

  if (req.method === 'PUT') {
    const body = req.body || {};
    const data = {};
    for (const key of EDITABLE_FIELDS) {
      if (key in body) data[key] = body[key];
    }
    if (data.trainingDaysPerWeek !== undefined && data.trainingDaysPerWeek !== null) {
      data.trainingDaysPerWeek = Number(data.trainingDaysPerWeek);
    }
    const user = await prisma.user.update({ where: { id: userId }, data, include: { primaryGoal: true } });
    const { pinHash, ...safe } = user;
    return res.status(200).json(safe);
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).end();
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding demo data…');

  const user = await prisma.user.create({ data: { name: 'Demo' } });
  const userId = user.id;

  const shoulderPress = await prisma.exercise.create({ data: { userId, name: 'Shoulder Press', type: 'STRENGTH' } });
  const squat = await prisma.exercise.create({ data: { userId, name: 'Squat', type: 'STRENGTH' } });
  const treadmill = await prisma.exercise.create({ data: { userId, name: 'Treadmill', type: 'CARDIO' } });

  // Week 1 — fully completed, gives Week 2 something to compare against.
  const week1 = await prisma.week.create({ data: { userId, number: 1 } });
  const dayNames1 = ['Shoulders', 'Legs', 'Rest', 'Cardio', 'Rest', 'Rest', 'Rest'];
  const week1Days = [];
  for (let d = 0; d < 7; d++) {
    const day = await prisma.workoutDay.create({ data: { weekId: week1.id, dayOfWeek: d, name: dayNames1[d] } });
    week1Days.push(day);
  }

  await prisma.workoutExercise.create({
    data: { workoutDayId: week1Days[0].id, exerciseId: shoulderPress.id, order: 0, plannedSets: [{ reps: 10, weightKg: 10 }, { reps: 10, weightKg: 10 }, { reps: 8, weightKg: 12 }] },
  });
  await prisma.workoutExercise.create({
    data: { workoutDayId: week1Days[1].id, exerciseId: squat.id, order: 0, plannedSets: [{ reps: 10, weightKg: 40 }, { reps: 10, weightKg: 40 }] },
  });
  await prisma.workoutExercise.create({
    data: { workoutDayId: week1Days[3].id, exerciseId: treadmill.id, order: 0, plannedSets: { timeSec: 1200, distanceKm: 3.2, level: 5 } },
  });

  await prisma.workoutSession.create({
    data: {
      workoutDayId: week1Days[0].id,
      completed: true,
      startedAt: new Date(Date.now() - 26 * 24 * 3600 * 1000),
      completedAt: new Date(Date.now() - 26 * 24 * 3600 * 1000),
      durationSec: 1500,
      sessionExercises: {
        create: [{ exerciseId: shoulderPress.id, order: 0, actualSets: [{ reps: 10, weightKg: 10 }, { reps: 10, weightKg: 10 }, { reps: 8, weightKg: 12 }] }],
      },
    },
  });
  await prisma.workoutSession.create({
    data: {
      workoutDayId: week1Days[1].id,
      completed: true,
      startedAt: new Date(Date.now() - 25 * 24 * 3600 * 1000),
      completedAt: new Date(Date.now() - 25 * 24 * 3600 * 1000),
      durationSec: 1800,
      sessionExercises: { create: [{ exerciseId: squat.id, order: 0, actualSets: [{ reps: 10, weightKg: 40 }, { reps: 10, weightKg: 40 }] }] },
    },
  });
  await prisma.workoutSession.create({
    data: {
      workoutDayId: week1Days[3].id,
      completed: true,
      startedAt: new Date(Date.now() - 23 * 24 * 3600 * 1000),
      completedAt: new Date(Date.now() - 23 * 24 * 3600 * 1000),
      durationSec: 1200,
      sessionExercises: { create: [{ exerciseId: treadmill.id, order: 0, actualSets: { timeSec: 1200, distanceKm: 3.2, level: 5 } }] },
    },
  });
  // Rest days still need an (incomplete) session-less state — leave as-is.

  // Week 2 — set up as the "current" in-progress week, structure copied,
  // no completed sessions yet, so opening Week 2 Shoulders shows Week 1's
  // "previous performance" hint.
  const week2 = await prisma.week.create({ data: { userId, number: 2 } });
  for (let d = 0; d < 7; d++) {
    const day = await prisma.workoutDay.create({ data: { weekId: week2.id, dayOfWeek: d, name: dayNames1[d] } });
    if (d === 0) {
      await prisma.workoutExercise.create({
        data: { workoutDayId: day.id, exerciseId: shoulderPress.id, order: 0, plannedSets: [{ reps: 10, weightKg: 10 }, { reps: 10, weightKg: 10 }, { reps: 8, weightKg: 12 }] },
      });
    }
    if (d === 1) {
      await prisma.workoutExercise.create({
        data: { workoutDayId: day.id, exerciseId: squat.id, order: 0, plannedSets: [{ reps: 10, weightKg: 40 }, { reps: 10, weightKg: 40 }] },
      });
    }
  }

  await prisma.bodyMetric.create({
    data: { userId, weightKg: 72, heightCm: 175, bodyFatPct: 18, muscleMassKg: 34, age: 30, sex: 'female', date: new Date(Date.now() - 20 * 24 * 3600 * 1000) },
  });
  await prisma.bodyMetric.create({
    data: { userId, weightKg: 71.2, heightCm: 175, bodyFatPct: 17.5, muscleMassKg: 34.4, age: 30, sex: 'female' },
  });

  await prisma.programSettings.create({
    data: { userId, startDate: week1.createdAt },
  });

  console.log('Seed complete. Demo profile name: "Demo" (no PIN).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

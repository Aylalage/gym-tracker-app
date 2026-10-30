// "Most recent update" lookup.
//
// Whenever a workout is copied into a new week (or a new session is opened
// for a day), the sets/reps/weights should come from the LAST time the
// user actually trained or edited that exercise, not from whichever older
// week happened to be copied from.
//
// A logged exercise counts as "performed" if ANY of these is true:
//   - the session was marked complete
//   - at least one set was ticked
//   - the user edited it at all (touchedAt is set whenever they save it)
// A session that was only auto-created from a plan and never touched does
// NOT count, otherwise stale copied numbers would keep re-copying themselves.
//
// "Most recent" is by program position (week, then day of week), with the
// edit time as the tie-breaker. Pass `before` (see positionOf) to only
// consider things that happened earlier than a given day.

function hasTick(actualSets) {
  if (Array.isArray(actualSets)) return actualSets.some((s) => s && s.completed);
  return !!(actualSets && actualSets.completed);
}

function positionOf(weekNumber, dayOfWeek) {
  return weekNumber * 10 + dayOfWeek; // dayOfWeek is 0-6, so this orders correctly
}

function usable(actualSets) {
  if (Array.isArray(actualSets)) return actualSets.length > 0;
  return !!actualSets && typeof actualSets === 'object';
}

async function latestPerformedMap(prisma, userId, exerciseIds, before) {
  const ids = [...new Set(exerciseIds.filter(Boolean))];
  if (ids.length === 0) return {};

  const rows = await prisma.sessionExercise.findMany({
    where: { exerciseId: { in: ids }, session: { workoutDay: { week: { userId } } } },
    include: { session: { include: { workoutDay: { include: { week: true } } } } },
  });

  const out = {};
  for (const r of rows) {
    const performed = r.touchedAt != null || r.session.completed || hasTick(r.actualSets);
    if (!performed || !usable(r.actualSets)) continue;

    const day = r.session.workoutDay;
    const pos = positionOf(day.week.number, day.dayOfWeek);
    if (before != null && pos >= before) continue;

    const when = new Date(r.touchedAt || r.session.completedAt || 0).getTime();
    const cur = out[r.exerciseId];
    if (!cur || pos > cur.pos || (pos === cur.pos && when > cur.when)) {
      out[r.exerciseId] = {
        actualSets: r.actualSets,
        weekNumber: day.week.number,
        dayOfWeek: day.dayOfWeek,
        completedAt: r.session.completedAt,
        pos,
        when,
      };
    }
  }
  return out;
}

module.exports = { latestPerformedMap, positionOf, hasTick };

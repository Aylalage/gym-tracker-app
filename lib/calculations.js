// BMI = kg / m^2
function calcBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const heightM = heightCm / 100;
  return +(weightKg / (heightM * heightM)).toFixed(1);
}

// Mifflin-St Jeor BMR formula (requires age + sex)
function calcBMR(weightKg, heightCm, age, sex) {
  if (!weightKg || !heightCm || !age || !sex) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}

// Total volume for a strength exercise's actual sets: sum(reps * weightKg)
function strengthVolume(sets) {
  if (!Array.isArray(sets)) return 0;
  return sets.reduce((sum, s) => sum + (Number(s.reps) || 0) * (Number(s.weightKg) || 0), 0);
}

function maxWeight(sets) {
  if (!Array.isArray(sets) || sets.length === 0) return null;
  return Math.max(...sets.map((s) => Number(s.weightKg) || 0));
}

function maxReps(sets) {
  if (!Array.isArray(sets) || sets.length === 0) return null;
  return Math.max(...sets.map((s) => Number(s.reps) || 0));
}

// Given a list of past SessionExercise rows (oldest -> newest) for one exercise,
// compute personal bests. Works for both types; cardio and strength look at
// different fields.
function computePBs(type, history) {
  // history: [{ actualSets, completedAt }]
  if (type === 'STRENGTH') {
    let pbWeight = 0;
    let pbReps = 0;
    let pbVolume = 0;
    for (const h of history) {
      const w = maxWeight(h.actualSets) || 0;
      const r = maxReps(h.actualSets) || 0;
      const v = strengthVolume(h.actualSets);
      if (w > pbWeight) pbWeight = w;
      if (r > pbReps) pbReps = r;
      if (v > pbVolume) pbVolume = v;
    }
    return { pbWeight, pbReps, pbVolume };
  } else {
    let pbDuration = 0;
    let pbDistance = 0;
    let pbLevel = 0;
    for (const h of history) {
      const c = h.actualSets || {};
      if ((c.timeSec || 0) > pbDuration) pbDuration = c.timeSec || 0;
      if ((c.distanceKm || 0) > pbDistance) pbDistance = c.distanceKm || 0;
      if ((c.level || 0) > pbLevel) pbLevel = c.level || 0;
    }
    return { pbDuration, pbDistance, pbLevel };
  }
}

// Compare the newest entry against everything before it, to flag "is this a
// new PB right now" for highlighting in the UI.
function isNewPB(type, latest, priorHistory) {
  const priorPBs = computePBs(type, priorHistory);
  if (type === 'STRENGTH') {
    const w = maxWeight(latest.actualSets) || 0;
    const r = maxReps(latest.actualSets) || 0;
    const v = strengthVolume(latest.actualSets);
    return w > priorPBs.pbWeight || r > priorPBs.pbReps || v > priorPBs.pbVolume;
  } else {
    const c = latest.actualSets || {};
    return (
      (c.timeSec || 0) > priorPBs.pbDuration ||
      (c.distanceKm || 0) > priorPBs.pbDistance ||
      (c.level || 0) > priorPBs.pbLevel
    );
  }
}

module.exports = {
  calcBMI,
  calcBMR,
  strengthVolume,
  maxWeight,
  maxReps,
  computePBs,
  isNewPB,
};

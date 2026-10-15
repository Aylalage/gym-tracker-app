import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function emptyExercise() {
  return { name: '', type: 'STRENGTH', sets: 3, reps: 10, repRangeMin: null, repRangeMax: null, notes: '', restSeconds: null };
}

export default function AdminTemplateEditor() {
  const router = useRouter();
  const { id } = router.query;

  const [me, setMe] = useState(undefined);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goalId, setGoalId] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [recommendedWeeks, setRecommendedWeeks] = useState('');
  const [days, setDays] = useState([]);
  const [addingExerciseDay, setAddingExerciseDay] = useState(null);
  const [newEx, setNewEx] = useState(emptyExercise());

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then(setMe);
    fetch('/api/goals').then((r) => r.json()).then(setGoals);
  }, []);

  useEffect(() => {
    if (!id || me === undefined) return;
    if (me?.role !== 'admin') {
      setLoading(false);
      return;
    }
    fetch(`/api/admin/templates/${id}`)
      .then((r) => r.json())
      .then((t) => {
        setName(t.name);
        setDescription(t.description || '');
        setGoalId(t.goalId || '');
        setDifficulty(t.difficulty || '');
        setDaysPerWeek(t.daysPerWeek);
        setRecommendedWeeks(t.recommendedWeeks || '');
        setDays(
          t.days.map((d) => ({
            dayOfWeek: d.dayOfWeek,
            workoutName: d.workoutName,
            exercises: d.exercises.map((ex) => ({ ...ex })),
          }))
        );
        setLoading(false);
      });
  }, [id, me]);

  function addDay() {
    const used = days.map((d) => d.dayOfWeek);
    const nextFree = [0, 1, 2, 3, 4, 5, 6].find((d) => !used.includes(d));
    if (nextFree === undefined) return;
    setDays([...days, { dayOfWeek: nextFree, workoutName: 'Workout', exercises: [] }]);
  }

  function removeDay(dayIndex) {
    setDays(days.filter((_, i) => i !== dayIndex));
  }

  function updateDay(dayIndex, patch) {
    setDays(days.map((d, i) => (i === dayIndex ? { ...d, ...patch } : d)));
  }

  function startAddExercise(dayIndex) {
    setAddingExerciseDay(dayIndex);
    setNewEx(emptyExercise());
  }

  function confirmAddExercise() {
    if (!newEx.name.trim()) return;
    setDays(
      days.map((d, i) => (i === addingExerciseDay ? { ...d, exercises: [...d.exercises, { ...newEx, name: newEx.name.trim() }] } : d))
    );
    setAddingExerciseDay(null);
  }

  function removeExercise(dayIndex, exIndex) {
    setDays(days.map((d, i) => (i === dayIndex ? { ...d, exercises: d.exercises.filter((_, j) => j !== exIndex) } : d)));
  }

  function moveExercise(dayIndex, exIndex, dir) {
    setDays(
      days.map((d, i) => {
        if (i !== dayIndex) return d;
        const arr = [...d.exercises];
        const target = exIndex + dir;
        if (target < 0 || target >= arr.length) return d;
        [arr[exIndex], arr[target]] = [arr[target], arr[exIndex]];
        return { ...d, exercises: arr };
      })
    );
  }

  async function save() {
    setSaving(true);
    await fetch(`/api/admin/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description: description || null,
        goalId: goalId || null,
        difficulty: difficulty || null,
        daysPerWeek: Number(daysPerWeek),
        recommendedWeeks: recommendedWeeks ? Number(recommendedWeeks) : null,
        days,
      }),
    });
    setSaving(false);
    router.push('/admin/templates');
  }

  if (me === undefined || loading) return <div className="page">Loading…</div>;
  if (me?.role !== 'admin') return <div className="page"><p className="empty-state">You don't have access to this page.</p></div>;

  return (
    <div className="page">
      <button className="back-btn" onClick={() => router.push('/admin/templates')}>‹</button>
      <h1 className="title">Edit Template</h1>

      <div className="card">
        <span className="field-label">Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} style={{ marginBottom: 10 }} />

        <span className="field-label">Description</span>
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} style={{ marginBottom: 10 }} />

        <span className="field-label">Goal</span>
        <select value={goalId} onChange={(e) => setGoalId(e.target.value)} style={{ marginBottom: 10 }}>
          <option value="">—</option>
          {goals.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
        </select>

        <span className="field-label">Difficulty</span>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={{ marginBottom: 10 }}>
          <option value="">—</option>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>

        <span className="field-label">Days per week</span>
        <input type="number" value={daysPerWeek} onChange={(e) => setDaysPerWeek(e.target.value)} style={{ marginBottom: 10 }} />

        <span className="field-label">Recommended duration (weeks, optional)</span>
        <input type="number" value={recommendedWeeks} onChange={(e) => setRecommendedWeeks(e.target.value)} />
      </div>

      <div className="section-title">Workout Days</div>
      {days.map((day, dayIndex) => (
        <div className="card" key={dayIndex}>
          <div className="row" style={{ marginBottom: 8 }}>
            <select value={day.dayOfWeek} onChange={(e) => updateDay(dayIndex, { dayOfWeek: Number(e.target.value) })} style={{ width: 140 }}>
              {DAY_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
            </select>
            <input
              value={day.workoutName}
              onChange={(e) => updateDay(dayIndex, { workoutName: e.target.value })}
              placeholder="Workout name"
              style={{ flex: 1, marginLeft: 8 }}
            />
            <button className="icon-btn danger" onClick={() => removeDay(dayIndex)}>✕</button>
          </div>

          {day.exercises.map((ex, exIndex) => (
            <div key={exIndex} className="exercise-card">
              <div className="exercise-header">
                <div className="reorder-btns">
                  <button onClick={() => moveExercise(dayIndex, exIndex, -1)}>▲</button>
                  <button onClick={() => moveExercise(dayIndex, exIndex, 1)}>▼</button>
                </div>
                <div style={{ flex: 1, fontWeight: 800 }}>{ex.name}</div>
                <span className="pill">{ex.type === 'STRENGTH' ? 'Strength' : 'Cardio'}</span>
                <button className="icon-btn danger" onClick={() => removeExercise(dayIndex, exIndex)}>✕</button>
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                {ex.type === 'STRENGTH'
                  ? `${ex.sets} sets × ${ex.reps || `${ex.repRangeMin}-${ex.repRangeMax}`} reps`
                  : `${ex.sets} rounds`}
                {ex.restSeconds ? ` · Rest ${ex.restSeconds}s` : ''}
                {ex.notes ? ` · ${ex.notes}` : ''}
              </div>
            </div>
          ))}

          {addingExerciseDay === dayIndex ? (
            <div className="card">
              <input
                placeholder="Exercise name"
                value={newEx.name}
                onChange={(e) => setNewEx({ ...newEx, name: e.target.value })}
                style={{ marginBottom: 8 }}
              />
              <div className="type-toggle" style={{ marginBottom: 10 }}>
                <button className={newEx.type === 'STRENGTH' ? 'active strength' : ''} onClick={() => setNewEx({ ...newEx, type: 'STRENGTH' })}>Strength</button>
                <button className={newEx.type === 'CARDIO' ? 'active cardio' : ''} onClick={() => setNewEx({ ...newEx, type: 'CARDIO' })}>Cardio</button>
              </div>
              {newEx.type === 'STRENGTH' && (
                <>
                  <div className="cardio-grid" style={{ marginBottom: 8 }}>
                    <div>
                      <span className="field-label">Sets</span>
                      <input type="number" value={newEx.sets} onChange={(e) => setNewEx({ ...newEx, sets: Number(e.target.value) })} />
                    </div>
                    <div>
                      <span className="field-label">Reps (fixed)</span>
                      <input type="number" value={newEx.reps || ''} onChange={(e) => setNewEx({ ...newEx, reps: e.target.value ? Number(e.target.value) : null })} />
                    </div>
                    <div>
                      <span className="field-label">Or rep range min</span>
                      <input type="number" value={newEx.repRangeMin || ''} onChange={(e) => setNewEx({ ...newEx, repRangeMin: e.target.value ? Number(e.target.value) : null, reps: null })} />
                    </div>
                    <div>
                      <span className="field-label">Rep range max</span>
                      <input type="number" value={newEx.repRangeMax || ''} onChange={(e) => setNewEx({ ...newEx, repRangeMax: e.target.value ? Number(e.target.value) : null, reps: null })} />
                    </div>
                  </div>
                </>
              )}
              {newEx.type === 'CARDIO' && (
                <div style={{ marginBottom: 8 }}>
                  <span className="field-label">Rounds/sets</span>
                  <input type="number" value={newEx.sets} onChange={(e) => setNewEx({ ...newEx, sets: Number(e.target.value) })} />
                </div>
              )}
              <span className="field-label">Rest (seconds, optional)</span>
              <input type="number" value={newEx.restSeconds || ''} onChange={(e) => setNewEx({ ...newEx, restSeconds: e.target.value ? Number(e.target.value) : null })} style={{ marginBottom: 8 }} />
              <span className="field-label">Notes (optional)</span>
              <textarea rows={2} value={newEx.notes} onChange={(e) => setNewEx({ ...newEx, notes: e.target.value })} style={{ marginBottom: 10 }} />
              <div className="top-actions">
                <button className="btn btn-lime btn-sm" onClick={confirmAddExercise}>Add</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setAddingExerciseDay(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="btn btn-ghost btn-block" onClick={() => startAddExercise(dayIndex)}>+ Add Exercise</button>
          )}
        </div>
      ))}

      <button className="btn btn-ghost btn-block" style={{ marginBottom: 16 }} onClick={addDay} disabled={days.length >= 7}>
        + Add Workout Day
      </button>

      <button className="btn btn-lime btn-block" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save Template'}
      </button>
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import SavingTag from '../../components/SavingTag';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function emptyStrengthSets() {
  return [{ reps: null, weightKg: null }];
}
function emptyCardio() {
  return { timeSec: null, distanceKm: null, level: null };
}

function summarizeStrength(sets) {
  if (!Array.isArray(sets) || sets.length === 0) return '—';
  return sets.map((s) => `${s.weightKg ?? '-'}kg x${s.reps ?? '-'}`).join(', ');
}
function summarizeCardio(c) {
  if (!c) return '—';
  const parts = [];
  if (c.timeSec) parts.push(`${Math.round(c.timeSec / 60)} min`);
  if (c.distanceKm) parts.push(`${c.distanceKm} km`);
  if (c.level) parts.push(`Level ${c.level}`);
  return parts.length ? parts.join(' · ') : '—';
}

export default function DayEditor() {
  const router = useRouter();
  const { id } = router.query;

  const [day, setDay] = useState(null);
  const [session, setSession] = useState(null);
  const [nameDraft, setNameDraft] = useState('');
  const [saveState, setSaveState] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExType, setNewExType] = useState('STRENGTH');
  const [catalog, setCatalog] = useState([]);
  const [allDays, setAllDays] = useState([]);
  const [duplicateTarget, setDuplicateTarget] = useState('');
  const [timerSec, setTimerSec] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  const saveTimeout = useRef(null);
  const timerInterval = useRef(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [dayRes, sessionRes, catalogRes, weeksRes] = await Promise.all([
      fetch(`/api/days/${id}`),
      fetch(`/api/sessions/${id}`),
      fetch('/api/exercises'),
      fetch('/api/weeks'),
    ]);
    const dayData = await dayRes.json();
    const sessionData = await sessionRes.json();
    setDay(dayData);
    setNameDraft(dayData.name);
    setSession(sessionData);
    setCatalog(await catalogRes.json());
    const weeks = await weeksRes.json();
    const flat = [];
    weeks.forEach((w) =>
      w.days.forEach((d) => flat.push({ id: d.id, label: `Week ${w.number} · ${DAY_NAMES[d.dayOfWeek]} (${d.name})` }))
    );
    setAllDays(flat.filter((d) => d.id !== id));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (timerRunning) {
      timerInterval.current = setInterval(() => setTimerSec((s) => s + 1), 1000);
    } else if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }
    return () => clearInterval(timerInterval.current);
  }, [timerRunning]);

  function fmtTimer(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  async function saveDayName(name) {
    await fetch(`/api/days/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  }

  function scheduleFieldSave(nextSession) {
    setSession(nextSession);
    setSaveState('saving');
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      try {
        await fetch(`/api/sessions/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionExercises: nextSession.sessionExercises.map((se) => ({
              id: se.id,
              actualSets: se.actualSets,
              notes: se.notes,
            })),
          }),
        });
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }, 700);
  }

  async function saveStructure(nextExercises) {
    setSaveState('saving');
    const res = await fetch(`/api/sessions/${id}/exercises`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exercises: nextExercises.map((se, i) => ({
          exerciseId: se.exerciseId,
          order: i,
          actualSets: se.actualSets,
          notes: se.notes,
        })),
      }),
    });
    const updated = await res.json();
    setSession(updated);
    setSaveState('saved');
  }

  function updateExercise(index, patch) {
    const next = { ...session, sessionExercises: session.sessionExercises.map((se, i) => (i === index ? { ...se, ...patch } : se)) };
    scheduleFieldSave(next);
  }

  function addSet(index) {
    const se = session.sessionExercises[index];
    const sets = [...se.actualSets, { reps: null, weightKg: null }];
    const next = { ...session, sessionExercises: session.sessionExercises.map((s, i) => (i === index ? { ...s, actualSets: sets } : s)) };
    saveStructure(next.sessionExercises);
  }

  function removeSet(index, setIdx) {
    const se = session.sessionExercises[index];
    const sets = se.actualSets.filter((_, i) => i !== setIdx);
    const next = { ...session, sessionExercises: session.sessionExercises.map((s, i) => (i === index ? { ...s, actualSets: sets } : s)) };
    saveStructure(next.sessionExercises);
  }

  function updateSet(index, setIdx, patch) {
    const se = session.sessionExercises[index];
    const sets = se.actualSets.map((s, i) => (i === setIdx ? { ...s, ...patch } : s));
    updateExercise(index, { actualSets: sets });
  }

  function moveExercise(index, dir) {
    const arr = [...session.sessionExercises];
    const target = index + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    saveStructure(arr);
  }

  function removeExercise(index) {
    const arr = session.sessionExercises.filter((_, i) => i !== index);
    saveStructure(arr);
  }

  async function handleAddExercise() {
    if (!newExName.trim()) return;
    const res = await fetch('/api/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newExName.trim(), type: newExType }),
    });
    const exercise = await res.json();
    const newEntry = {
      exerciseId: exercise.id,
      exercise,
      actualSets: exercise.type === 'STRENGTH' ? emptyStrengthSets() : emptyCardio(),
      notes: '',
    };
    const arr = [...session.sessionExercises, newEntry];
    await saveStructure(arr);
    setNewExName('');
    setShowAdd(false);
  }

  async function renameExercise(exerciseId, name) {
    await fetch(`/api/exercises/${exerciseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    load();
  }

  async function markComplete() {
    await fetch(`/api/sessions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true, durationSec: timerSec || undefined }),
    });
    setTimerRunning(false);
    load();
  }

  async function duplicateHere() {
    if (!duplicateTarget) return;
    await fetch(`/api/days/${id}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetDayId: duplicateTarget }),
    });
    alert('Duplicated into selected day.');
  }

  if (!day || !session) return <div className="page">Loading…</div>;

  return (
    <div className="page">
      <SavingTag state={saveState} />
      <button className="back-btn" onClick={() => router.push('/')}>‹</button>

      <div className="row" style={{ marginBottom: 4 }}>
        <div className="row-day-name">{DAY_NAMES[day.dayOfWeek]} · Week {day.week.number}</div>
        {session.completed && <span className="pill done">Done</span>}
      </div>
      <input
        className="exercise-name-input"
        style={{ fontSize: 24, marginBottom: 14, padding: '6px 0' }}
        value={nameDraft}
        onChange={(e) => setNameDraft(e.target.value)}
        onBlur={() => saveDayName(nameDraft)}
      />

      <div className="top-actions">
        <button className="btn btn-ghost btn-sm" onClick={() => setTimerRunning((r) => !r)}>
          ⏱ {fmtTimer(timerSec)} {timerRunning ? '(pause)' : '(start)'}
        </button>
      </div>

      {session.sessionExercises.map((se, index) => {
        const prev = day.previous?.[se.exerciseId];
        return (
          <div className="exercise-card" key={se.id}>
            <div className="exercise-header">
              <div className="reorder-btns">
                <button onClick={() => moveExercise(index, -1)}>▲</button>
                <button onClick={() => moveExercise(index, 1)}>▼</button>
              </div>
              <input
                className="exercise-name-input"
                defaultValue={se.exercise.name}
                onBlur={(e) => e.target.value.trim() && renameExercise(se.exerciseId, e.target.value.trim())}
              />
              <span className="pill">{se.exercise.type === 'STRENGTH' ? 'Strength' : 'Cardio'}</span>
              <button className="icon-btn danger" onClick={() => removeExercise(index)}>✕</button>
            </div>

            {prev && (
              <div className="prev-hint">
                Previous (Week {prev.weekNumber}): <b>{se.exercise.type === 'STRENGTH' ? summarizeStrength(prev.actualSets) : summarizeCardio(prev.actualSets)}</b>
              </div>
            )}

            {se.exercise.type === 'STRENGTH' ? (
              <>
                {se.actualSets.map((set, si) => {
                  const prevBest = prev && Array.isArray(prev.actualSets)
                    ? Math.max(0, ...prev.actualSets.map((s) => s.weightKg || 0))
                    : 0;
                  const isPB = (set.weightKg || 0) > prevBest && prevBest > 0;
                  return (
                    <div className={`set-row ${isPB ? 'pb' : ''}`} key={si}>
                      <div className="set-num">{si + 1}</div>
                      <input
                        type="number"
                        placeholder="Reps"
                        value={set.reps ?? ''}
                        onChange={(e) => updateSet(index, si, { reps: e.target.value === '' ? null : Number(e.target.value) })}
                      />
                      <input
                        type="number"
                        placeholder="kg"
                        value={set.weightKg ?? ''}
                        onChange={(e) => updateSet(index, si, { weightKg: e.target.value === '' ? null : Number(e.target.value) })}
                      />
                      <button className="icon-btn danger" onClick={() => removeSet(index, si)}>✕</button>
                    </div>
                  );
                })}
                <button className="link-btn" onClick={() => addSet(index)}>+ Add set</button>
              </>
            ) : (
              <div className="cardio-grid">
                <div>
                  <span className="field-label">Time (min)</span>
                  <input
                    type="number"
                    value={se.actualSets?.timeSec ? se.actualSets.timeSec / 60 : ''}
                    onChange={(e) => updateExercise(index, { actualSets: { ...se.actualSets, timeSec: e.target.value === '' ? null : Number(e.target.value) * 60 } })}
                  />
                </div>
                <div>
                  <span className="field-label">Distance (km)</span>
                  <input
                    type="number"
                    value={se.actualSets?.distanceKm ?? ''}
                    onChange={(e) => updateExercise(index, { actualSets: { ...se.actualSets, distanceKm: e.target.value === '' ? null : Number(e.target.value) } })}
                  />
                </div>
                <div>
                  <span className="field-label">Level / resistance</span>
                  <input
                    type="number"
                    value={se.actualSets?.level ?? ''}
                    onChange={(e) => updateExercise(index, { actualSets: { ...se.actualSets, level: e.target.value === '' ? null : Number(e.target.value) } })}
                  />
                </div>
              </div>
            )}

            <div style={{ marginTop: 10 }}>
              <span className="field-label">Notes</span>
              <textarea
                rows={2}
                value={se.notes || ''}
                onChange={(e) => updateExercise(index, { notes: e.target.value })}
              />
            </div>
          </div>
        );
      })}

      {showAdd ? (
        <div className="exercise-card">
          <input
            list="exercise-catalog"
            placeholder="Exercise name"
            value={newExName}
            onChange={(e) => setNewExName(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <datalist id="exercise-catalog">
            {catalog.map((c) => <option key={c.id} value={c.name} />)}
          </datalist>
          <div className="type-toggle" style={{ marginBottom: 10 }}>
            <button className={newExType === 'STRENGTH' ? 'active strength' : ''} onClick={() => setNewExType('STRENGTH')}>Strength</button>
            <button className={newExType === 'CARDIO' ? 'active cardio' : ''} onClick={() => setNewExType('CARDIO')}>Cardio</button>
          </div>
          <div className="top-actions">
            <button className="btn btn-lime btn-sm" onClick={handleAddExercise}>Add</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-ghost btn-block" onClick={() => setShowAdd(true)}>+ Add Exercise</button>
      )}

      <div className="section-title">Duplicate this workout</div>
      <div className="card">
        <select value={duplicateTarget} onChange={(e) => setDuplicateTarget(e.target.value)} style={{ marginBottom: 8 }}>
          <option value="">Choose a day…</option>
          {allDays.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
        <button className="btn btn-ghost btn-block" onClick={duplicateHere} disabled={!duplicateTarget}>
          Copy this workout there
        </button>
      </div>

      {!session.completed && (
        <button className="btn btn-lime btn-block" style={{ marginTop: 16 }} onClick={markComplete}>
          ✓ Mark Workout Complete
        </button>
      )}
    </div>
  );
}

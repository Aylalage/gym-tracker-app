import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import SavingTag from '../../components/SavingTag';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function emptyStrengthSets() {
  return [{ reps: null, weightKg: null, completed: false }];
}
function emptyCardio() {
  return { timeSec: null, distanceKm: null, level: null, completed: false };
}
function genGroupId() {
  return `sg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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

// Groups consecutive exercises sharing a supersetGroup into blocks for rendering.
function buildBlocks(list) {
  const blocks = [];
  let i = 0;
  while (i < list.length) {
    const item = list[i];
    if (item.supersetGroup) {
      const group = [item];
      let j = i + 1;
      while (j < list.length && list[j].supersetGroup === item.supersetGroup) {
        group.push(list[j]);
        j++;
      }
      blocks.push({ type: 'superset', items: group });
      i = j;
    } else {
      blocks.push({ type: 'single', item });
      i++;
    }
  }
  return blocks;
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
  const [openMenu, setOpenMenu] = useState(null);
  const [replacingIndex, setReplacingIndex] = useState(null);
  const [replaceName, setReplaceName] = useState('');
  const [replaceType, setReplaceType] = useState('STRENGTH');
  const [supersetPickerIndex, setSupersetPickerIndex] = useState(null);
  const [supersetPartnerId, setSupersetPartnerId] = useState('');
  const [restRemaining, setRestRemaining] = useState(null);
  const [restLabel, setRestLabel] = useState('');

  const saveTimeout = useRef(null);
  const timerInterval = useRef(null);
  const restInterval = useRef(null);

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

  useEffect(() => {
    if (restRemaining === null) return;
    if (restRemaining <= 0) {
      clearInterval(restInterval.current);
      setRestRemaining(null);
      return;
    }
    restInterval.current = setInterval(() => setRestRemaining((s) => (s === null ? null : s - 1)), 1000);
    return () => clearInterval(restInterval.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restRemaining]);

  function fmtTimer(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function startRest(seconds, label) {
    if (!seconds) return;
    setRestLabel(label);
    setRestRemaining(seconds);
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
          supersetGroup: se.supersetGroup || null,
          restSeconds: typeof se.restSeconds === 'number' ? se.restSeconds : null,
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
    const sets = [...se.actualSets, { reps: null, weightKg: null, completed: false }];
    const next = session.sessionExercises.map((s, i) => (i === index ? { ...s, actualSets: sets } : s));
    saveStructure(next);
  }

  function removeSet(index, setIdx) {
    const se = session.sessionExercises[index];
    const sets = se.actualSets.filter((_, i) => i !== setIdx);
    const next = session.sessionExercises.map((s, i) => (i === index ? { ...s, actualSets: sets } : s));
    saveStructure(next);
  }

  function updateSet(index, setIdx, patch) {
    const se = session.sessionExercises[index];
    const sets = se.actualSets.map((s, i) => (i === setIdx ? { ...s, ...patch } : s));
    updateExercise(index, { actualSets: sets });
  }

  function toggleSetComplete(index, setIdx) {
    const se = session.sessionExercises[index];
    const set = se.actualSets[setIdx];
    const nextCompleted = !set.completed;
    updateSet(index, setIdx, { completed: nextCompleted });
    if (nextCompleted && se.restSeconds) startRest(se.restSeconds, se.exercise.name);
  }

  function toggleCardioComplete(index) {
    const se = session.sessionExercises[index];
    const nextCompleted = !se.actualSets?.completed;
    updateExercise(index, { actualSets: { ...se.actualSets, completed: nextCompleted } });
    if (nextCompleted && se.restSeconds) startRest(se.restSeconds, se.exercise.name);
  }

  function moveExercise(index, dir) {
    const arr = [...session.sessionExercises];
    const target = index + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    saveStructure(arr);
  }

  function removeExercise(index) {
    setOpenMenu(null);
    const removed = session.sessionExercises[index];
    let arr = session.sessionExercises.filter((_, i) => i !== index);
    // If removing this leaves only one exercise in its superset group, ungroup that one too.
    if (removed.supersetGroup) {
      const stillGrouped = arr.filter((e) => e.supersetGroup === removed.supersetGroup);
      if (stillGrouped.length === 1) {
        arr = arr.map((e) => (e.supersetGroup === removed.supersetGroup ? { ...e, supersetGroup: null } : e));
      }
    }
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
      supersetGroup: null,
      restSeconds: null,
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

  function setRestTimerFor(index) {
    setOpenMenu(null);
    const current = session.sessionExercises[index].restSeconds;
    const input = prompt('Rest time in seconds (e.g. 60):', current || 60);
    if (input === null) return;
    const seconds = parseInt(input, 10);
    if (!seconds || seconds <= 0) return;
    const arr = session.sessionExercises.map((se, i) => (i === index ? { ...se, restSeconds: seconds } : se));
    saveStructure(arr);
  }

  function removeRestTimerFor(index) {
    setOpenMenu(null);
    const arr = session.sessionExercises.map((se, i) => (i === index ? { ...se, restSeconds: null } : se));
    saveStructure(arr);
  }

  function startReplace(index) {
    setOpenMenu(null);
    setReplacingIndex(index);
    setReplaceName('');
    setReplaceType(session.sessionExercises[index].exercise.type);
  }

  async function confirmReplace() {
    if (!replaceName.trim()) return;
    const res = await fetch('/api/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: replaceName.trim(), type: replaceType }),
    });
    const exercise = await res.json();
    const arr = session.sessionExercises.map((se, i) =>
      i === replacingIndex
        ? {
            ...se,
            exerciseId: exercise.id,
            exercise,
            actualSets: exercise.type === 'STRENGTH' ? emptyStrengthSets() : emptyCardio(),
          }
        : se
    );
    await saveStructure(arr);
    setReplacingIndex(null);
  }

  function startSupersetPicker(index) {
    setOpenMenu(null);
    setSupersetPickerIndex(index);
    setSupersetPartnerId('');
  }

  function confirmSuperset() {
    if (!supersetPartnerId) return;
    const index = supersetPickerIndex;
    const partnerIndex = session.sessionExercises.findIndex((se) => se.id === supersetPartnerId);
    if (partnerIndex === -1) return;
    const partner = session.sessionExercises[partnerIndex];
    const groupId = partner.supersetGroup || session.sessionExercises[index].supersetGroup || genGroupId();

    // Reorder so the partner sits immediately after this exercise, then tag both with the group id.
    let arr = session.sessionExercises.filter((_, i) => i !== partnerIndex);
    const newIndex = arr.findIndex((se) => se.id === session.sessionExercises[index].id);
    arr.splice(newIndex + 1, 0, partner);
    arr = arr.map((se) =>
      se.id === session.sessionExercises[index].id || se.id === partner.id ? { ...se, supersetGroup: groupId } : se
    );

    saveStructure(arr);
    setSupersetPickerIndex(null);
  }

  function removeFromSuperset(index) {
    setOpenMenu(null);
    const groupId = session.sessionExercises[index].supersetGroup;
    let arr = session.sessionExercises.map((se, i) => (i === index ? { ...se, supersetGroup: null } : se));
    const stillGrouped = arr.filter((e) => e.supersetGroup === groupId);
    if (stillGrouped.length === 1) {
      arr = arr.map((e) => (e.supersetGroup === groupId ? { ...e, supersetGroup: null } : e));
    }
    saveStructure(arr);
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

  function renderExerciseCard(se, index) {
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
          {se.restSeconds ? <span className="rest-badge">⏱ {se.restSeconds}s</span> : null}
          <div className="exercise-menu-wrap">
            <button className="exercise-menu-btn" onClick={() => setOpenMenu(openMenu === se.id ? null : se.id)}>⋮</button>
            {openMenu === se.id && (
              <div className="exercise-menu">
                {se.restSeconds ? (
                  <button onClick={() => removeRestTimerFor(index)}>⏱ Remove Rest Timer</button>
                ) : (
                  <button onClick={() => setRestTimerFor(index)}>⏱ Add Rest Timer</button>
                )}
                <hr />
                <button onClick={() => startReplace(index)}>🔁 Replace Exercise</button>
                <hr />
                {se.supersetGroup ? (
                  <button onClick={() => removeFromSuperset(index)}>Remove from Superset</button>
                ) : (
                  <button onClick={() => startSupersetPicker(index)}>Create Superset</button>
                )}
                <hr />
                <button className="danger" onClick={() => removeExercise(index)}>✕ Remove Exercise</button>
              </div>
            )}
          </div>
        </div>

        {replacingIndex === index && (
          <div className="card" style={{ marginBottom: 10 }}>
            <input
              list="exercise-catalog"
              placeholder="New exercise name"
              value={replaceName}
              onChange={(e) => setReplaceName(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            <div className="type-toggle" style={{ marginBottom: 10 }}>
              <button className={replaceType === 'STRENGTH' ? 'active strength' : ''} onClick={() => setReplaceType('STRENGTH')}>Strength</button>
              <button className={replaceType === 'CARDIO' ? 'active cardio' : ''} onClick={() => setReplaceType('CARDIO')}>Cardio</button>
            </div>
            <div className="top-actions">
              <button className="btn btn-lime btn-sm" onClick={confirmReplace}>Replace</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setReplacingIndex(null)}>Cancel</button>
            </div>
          </div>
        )}

        {supersetPickerIndex === index && (
          <div className="card" style={{ marginBottom: 10 }}>
            <span className="field-label">Pair with which exercise?</span>
            <select value={supersetPartnerId} onChange={(e) => setSupersetPartnerId(e.target.value)} style={{ margin: '8px 0' }}>
              <option value="">Choose…</option>
              {session.sessionExercises
                .filter((other) => other.id !== se.id)
                .map((other) => (
                  <option key={other.id} value={other.id}>{other.exercise.name}</option>
                ))}
            </select>
            <div className="top-actions">
              <button className="btn btn-lime btn-sm" onClick={confirmSuperset} disabled={!supersetPartnerId}>Link</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setSupersetPickerIndex(null)}>Cancel</button>
            </div>
          </div>
        )}

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
                  <button
                    className={`set-check-btn ${set.completed ? 'checked' : ''}`}
                    onClick={() => toggleSetComplete(index, si)}
                    title="Mark set complete"
                  >
                    ✓
                  </button>
                </div>
              );
            })}
            <div className="top-actions">
              <button className="link-btn" onClick={() => addSet(index)}>+ Add set</button>
              {se.actualSets.length > 1 && (
                <button className="link-btn" onClick={() => removeSet(index, se.actualSets.length - 1)} style={{ color: 'var(--danger)' }}>
                  Remove last set
                </button>
              )}
            </div>
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
            <div className="full">
              <button
                className={`btn btn-sm ${se.actualSets?.completed ? 'btn-lime' : 'btn-ghost'}`}
                onClick={() => toggleCardioComplete(index)}
              >
                {se.actualSets?.completed ? '✓ Completed' : 'Mark complete'}
              </button>
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
  }

  const blocks = buildBlocks(session.sessionExercises);

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

      {blocks.map((block, bi) =>
        block.type === 'superset' ? (
          <div className="superset-block" key={`ss-${bi}`}>
            <span className="superset-label">SUPERSET</span>
            {block.items.map((se) => renderExerciseCard(se, session.sessionExercises.indexOf(se)))}
          </div>
        ) : (
          <div key={`single-${bi}`}>{renderExerciseCard(block.item, session.sessionExercises.indexOf(block.item))}</div>
        )
      )}

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

      {restRemaining !== null && (
        <div className="rest-timer-bar">
          <div>Resting — {restLabel}</div>
          <div className="time">{fmtTimer(restRemaining)}</div>
          <button onClick={() => setRestRemaining(null)}>Skip</button>
        </div>
      )}
    </div>
  );
}

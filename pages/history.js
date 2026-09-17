import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import NavBar from '../components/NavBar';
import Calendar from '../components/Calendar';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function summarize(ex) {
  if (ex.type === 'STRENGTH') {
    return (ex.actualSets || []).map((s) => `${s.weightKg ?? '-'}kg×${s.reps ?? '-'}`).join(', ');
  }
  const c = ex.actualSets || {};
  const parts = [];
  if (c.timeSec) parts.push(`${Math.round(c.timeSec / 60)}min`);
  if (c.distanceKm) parts.push(`${c.distanceKm}km`);
  if (c.level) parts.push(`Lvl ${c.level}`);
  return parts.join(' · ') || '—';
}

function getTodayPosition(startDate) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today - start) / 86400000);
  if (diffDays < 0) return null;
  return { weekNumber: Math.floor(diffDays / 7) + 1, dayOfWeek: diffDays % 7 };
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [allDays, setAllDays] = useState([]);
  const [defaultTodayDayId, setDefaultTodayDayId] = useState('');
  const [performTarget, setPerformTarget] = useState(null); // sessionId currently picking a target for
  const [performDayId, setPerformDayId] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const cardRefs = useRef({});

  async function load() {
    const [sessRes, weeksRes, settingsRes] = await Promise.all([
      fetch('/api/history'),
      fetch('/api/weeks'),
      fetch('/api/settings'),
    ]);
    setSessions(await sessRes.json());

    const weeks = await weeksRes.json();
    const flat = [];
    weeks.forEach((w) => w.days.forEach((d) => flat.push({ id: d.id, label: `Week ${w.number} · ${DAY_NAMES[d.dayOfWeek]} (${d.name})`, weekNumber: w.number, dayOfWeek: d.dayOfWeek })));
    setAllDays(flat);

    const settings = await settingsRes.json();
    if (settings) {
      const pos = getTodayPosition(settings.startDate);
      if (pos) {
        const match = flat.find((d) => d.weekNumber === pos.weekNumber && d.dayOfWeek === pos.dayOfWeek);
        if (match) setDefaultTodayDayId(match.id);
      }
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (!e.target.closest('.exercise-menu-wrap')) setMenuId(null);
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  async function deleteSession(sessionId) {
    setMenuId(null);
    if (!confirm('Delete this workout from your history? This cannot be undone.')) return;
    await fetch(`/api/history/${sessionId}`, { method: 'DELETE' });
    load();
  }

  function openPerformAgain(sessionId) {
    setMenuId(null);
    setPerformTarget(sessionId);
    setPerformDayId(defaultTodayDayId);
  }

  async function confirmPerformAgain() {
    if (!performDayId) return;
    await fetch(`/api/history/${performTarget}/perform-again`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetDayId: performDayId }),
    });
    setPerformTarget(null);
    router.push(`/day/${performDayId}`);
  }

  async function saveAsTemplate(session) {
    setMenuId(null);
    const name = prompt('Name this template (e.g. "Push Day"):', session.workoutName);
    if (!name || !name.trim()) return;
    await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        exercises: session.exercises.map((ex, i) => ({
          exerciseId: ex.exerciseId,
          order: i,
          plannedSets: ex.actualSets,
          notes: ex.notes,
          supersetGroup: ex.supersetGroup,
          restSeconds: ex.restSeconds,
        })),
      }),
    });
    alert(`Saved as template "${name.trim()}".`);
  }

  function hasEntryOnDate(date) {
    return sessions.some((s) => s.completedAt && sameDay(new Date(s.completedAt), date));
  }

  function jumpToDate(date) {
    const match = sessions.find((s) => s.completedAt && sameDay(new Date(s.completedAt), date));
    if (!match) return;
    setShowCalendar(false);
    setOpenId(match.id);
    setTimeout(() => cardRefs.current[match.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 12 }}>
        <h1 className="title" style={{ marginBottom: 0 }}>History</h1>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowCalendar((s) => !s)}>
          📅 Calendar
        </button>
      </div>

      {showCalendar && (
        <Calendar
          month={calendarMonth}
          onMonthChange={setCalendarMonth}
          hasEntry={hasEntryOnDate}
          onSelectDate={jumpToDate}
        />
      )}

      {sessions.length === 0 && <p className="empty-state">No completed workouts yet.</p>}

      {sessions.map((s) => (
        <div className="card" key={s.id} ref={(el) => (cardRefs.current[s.id] = el)}>
          <div className="row tappable" onClick={() => setOpenId(openId === s.id ? null : s.id)}>
            <div>
              <div className="row-day-name">Week {s.weekNumber} · {s.dayName}</div>
              <div className="row-workout-name">{s.workoutName}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ textAlign: 'right' }}>
                <div className="pill done">Done</div>
                <div className="field-label" style={{ marginTop: 6 }}>
                  {s.completedAt ? new Date(s.completedAt).toLocaleDateString() : ''}
                </div>
              </div>
              <div className="exercise-menu-wrap" onClick={(e) => e.stopPropagation()}>
                <button className="exercise-menu-btn" onClick={() => setMenuId(menuId === s.id ? null : s.id)}>⋮</button>
                {menuId === s.id && (
                  <div className="exercise-menu">
                    <button onClick={() => router.push(`/day/${s.dayId}`)}>✏️ Edit Workout</button>
                    <hr />
                    <button onClick={() => saveAsTemplate(s)}>💾 Save as Template</button>
                    <hr />
                    <button onClick={() => openPerformAgain(s.id)}>↩ Perform Again</button>
                    <hr />
                    <button className="danger" onClick={() => deleteSession(s.id)}>✕ Delete</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {performTarget === s.id && (
            <div className="card" style={{ marginTop: 10 }}>
              <span className="field-label">Perform this workout on which day?</span>
              <select value={performDayId} onChange={(e) => setPerformDayId(e.target.value)} style={{ margin: '8px 0' }}>
                <option value="">Choose a day…</option>
                {allDays.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
              <div className="top-actions">
                <button className="btn btn-lime btn-sm" onClick={confirmPerformAgain} disabled={!performDayId}>Go</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setPerformTarget(null)}>Cancel</button>
              </div>
            </div>
          )}

          {openId === s.id && (
            <div style={{ marginTop: 12 }}>
              {s.exercises.map((ex, i) => (
                <div key={i} className="row" style={{ padding: '6px 0', borderTop: '1px solid #f0f0f0' }}>
                  <div>{ex.name}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>{summarize(ex)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <NavBar />
    </div>
  );
}

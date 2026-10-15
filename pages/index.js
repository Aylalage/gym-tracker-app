import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import NavBar from '../components/NavBar';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Maps "today" onto a week number + day-of-week index, treating the given
// start date as day 0 of Week 1. Each 7-day block after that is one week.
function getTodayPosition(startDate) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today - start) / 86400000);
  if (diffDays < 0) return null;
  return { weekNumber: Math.floor(diffDays / 7) + 1, dayOfWeek: diffDays % 7 };
}

export default function ProgramPage() {
  const router = useRouter();
  const [weeks, setWeeks] = useState([]);
  const [weekIndex, setWeekIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState(undefined); // undefined = not loaded yet, null = not set
  const [startDateInput, setStartDateInput] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [dayMenuId, setDayMenuId] = useState(null);
  const [dayMenuMode, setDayMenuMode] = useState('main');
  const [myGoal, setMyGoal] = useState(null);
  const autoJumped = useRef(false);

  async function loadWeeks(selectLast = false) {
    const res = await fetch('/api/weeks');
    const data = await res.json();
    setWeeks(data);
    if (data.length > 0 && selectLast) {
      setWeekIndex(data.length - 1);
    } else if (data.length > 0) {
      setWeekIndex((i) => Math.min(i, data.length - 1));
    }
    setLoading(false);
  }

  async function loadSettings() {
    const res = await fetch('/api/settings');
    const data = await res.json();
    setSettings(data);
  }

  useEffect(() => {
    loadWeeks();
    loadSettings();
    fetch('/api/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (p?.primaryGoal) setMyGoal(p.primaryGoal);
      });
  }, []);

  // Auto-jump to today's week the first time the app opens (once both
  // weeks and settings have loaded), so you never land back on Week 1.
  useEffect(() => {
    if (autoJumped.current) return;
    if (loading || settings === undefined || weeks.length === 0) return;
    autoJumped.current = true;
    if (!settings) return;
    const pos = getTodayPosition(settings.startDate);
    if (!pos) return;
    const idx = weeks.findIndex((w) => w.number === pos.weekNumber);
    if (idx !== -1) setWeekIndex(idx);
  }, [loading, settings, weeks]);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (!e.target.closest('.exercise-menu-wrap')) {
        setMenuOpen(false);
        setDayMenuId(null);
        setDayMenuMode('main');
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  async function createWeek(duplicateFromWeekId) {
    setMenuOpen(false);
    setBusy(true);
    await fetch('/api/weeks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(duplicateFromWeekId ? { duplicateFromWeekId } : {}),
    });
    await loadWeeks(true);
    setBusy(false);
  }

  async function deleteWeek(weekId, weekNumber) {
    setMenuOpen(false);
    if (!confirm(`Delete Week ${weekNumber}? This permanently removes its plan and any logged history for that week.`)) return;
    setBusy(true);
    await fetch(`/api/weeks/${weekId}`, { method: 'DELETE' });
    await loadWeeks();
    setBusy(false);
  }

  async function saveStartDate() {
    if (!startDateInput) return;
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: startDateInput }),
    });
    setSettings(await res.json());
  }

  function jumpToToday() {
    setMenuOpen(false);
    const pos = getTodayPosition(settings.startDate);
    if (!pos) return;
    const idx = weeks.findIndex((w) => w.number === pos.weekNumber);
    if (idx === -1) {
      alert(`You're up to Week ${pos.weekNumber}, but it hasn't been created yet. Use "New blank week" or "Duplicate this week" until you reach it.`);
      return;
    }
    setWeekIndex(idx);
  }

  async function swapDays(dayAId, dayBId) {
    setDayMenuId(null);
    setDayMenuMode('main');
    setBusy(true);
    await fetch('/api/days/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayAId, dayBId }),
    });
    await loadWeeks();
    setBusy(false);
  }

  async function deleteWorkoutDay(dayId, dayName) {
    setDayMenuId(null);
    setDayMenuMode('main');
    if (!confirm(`Delete the "${dayName}" workout? It'll go back to a blank Rest day, and any logged results for it are removed.`)) return;
    setBusy(true);
    await fetch(`/api/days/${dayId}/clear`, { method: 'POST' });
    await loadWeeks();
    setBusy(false);
  }

  if (loading || settings === undefined) return <div className="page">Loading…</div>;

  const week = weeks[weekIndex];
  const todayPos = settings ? getTodayPosition(settings.startDate) : null;
  const isViewingCurrentWeek = week && todayPos && week.number === todayPos.weekNumber;

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 4 }}>
        <h1 className="title" style={{ marginBottom: 0 }}>Program</h1>
        {weeks.length > 0 && (
          <div className="exercise-menu-wrap">
            <button className="exercise-menu-btn" onClick={() => setMenuOpen((o) => !o)}>⋮</button>
            {menuOpen && (
              <div className="exercise-menu">
                <button onClick={() => createWeek(null)} disabled={busy}>+ New blank week</button>
                <hr />
                <button onClick={() => createWeek(week.id)} disabled={busy}>⧉ Duplicate this week</button>
                <hr />
                {settings && <button onClick={jumpToToday}>📅 Jump to Today</button>}
                <hr />
                <button className="danger" onClick={() => deleteWeek(week.id, week.number)} disabled={busy}>🗑 Delete week</button>
              </div>
            )}
          </div>
        )}
      </div>

      <button className="btn btn-lime btn-block" style={{ marginBottom: myGoal ? 8 : 16 }} onClick={() => router.push('/template-library')}>
        📚 Use Template
      </button>
      {myGoal && (
        <button
          className="btn btn-ghost btn-block"
          style={{ marginBottom: 16 }}
          onClick={() => router.push(`/template-library?goal=${myGoal.key}`)}
        >
          ⭐ Recommended For You — {myGoal.label}
        </button>
      )}

      {!settings && (
        <div className="setup-banner">
          <span className="field-label">Track where you are automatically</span>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            Enter the date Week 1, Day 1 started, and the app will always open on today's workout.
          </p>
          <div className="row">
            <input type="date" value={startDateInput} onChange={(e) => setStartDateInput(e.target.value)} />
            <button className="btn btn-lime btn-sm" onClick={saveStartDate}>Save</button>
          </div>
        </div>
      )}

      {weeks.length === 0 ? (
        <div className="empty-state">
          <p>No weeks yet. Start your program below.</p>
          <button className="btn btn-lime" onClick={() => createWeek(null)} disabled={busy}>
            + Create Week 1
          </button>
        </div>
      ) : (
        <>
          <div className="week-switcher">
            <button
              className="btn-icon"
              onClick={() => setWeekIndex((i) => Math.max(0, i - 1))}
              disabled={weekIndex === 0}
            >
              ‹
            </button>
            <div className="week-label">Week {week.number}</div>
            <button
              className="btn-icon"
              onClick={() => setWeekIndex((i) => Math.min(weeks.length - 1, i + 1))}
              disabled={weekIndex === weeks.length - 1}
            >
              ›
            </button>
          </div>

          {week.days
            .slice()
            .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
            .map((day) => {
              const isRest = day.name.trim().toLowerCase() === 'rest';
              const isDone = day.session?.completed;
              const isToday = isViewingCurrentWeek && todayPos.dayOfWeek === day.dayOfWeek;
              const otherDays = week.days.filter((d) => d.id !== day.id).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
              return (
                <div
                  key={day.id}
                  className={`card tappable ${isRest ? 'rest' : ''} ${isToday ? 'day-today' : ''}`}
                  onClick={() => router.push(`/day/${day.id}`)}
                >
                  <div className="row">
                    <div>
                      <div className="row-day-name">{DAY_NAMES[day.dayOfWeek]}</div>
                      <div className="row-workout-name">{day.name}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {!isRest && <span className={`pill ${isDone ? 'done' : ''}`}>{isDone ? 'Done' : 'Plan'}</span>}
                      <div className="exercise-menu-wrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="exercise-menu-btn"
                          onClick={() => {
                            if (dayMenuId === day.id) {
                              setDayMenuId(null);
                            } else {
                              setDayMenuId(day.id);
                              setDayMenuMode('main');
                            }
                          }}
                        >
                          ⋮
                        </button>
                        {dayMenuId === day.id && dayMenuMode === 'main' && (
                          <div className="exercise-menu">
                            <button className="danger" onClick={() => deleteWorkoutDay(day.id, day.name)} disabled={busy}>
                              🗑 Delete Workout
                            </button>
                            <hr />
                            <button onClick={() => setDayMenuMode('swap')}>⇄ Swap Day</button>
                          </div>
                        )}
                        {dayMenuId === day.id && dayMenuMode === 'swap' && (
                          <div className="exercise-menu">
                            <button onClick={() => setDayMenuMode('main')}>‹ Back</button>
                            <hr />
                            <div style={{ padding: '10px 14px 4px', fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>
                              Swap with…
                            </div>
                            {otherDays.map((d, i) => (
                              <div key={d.id}>
                                <button onClick={() => swapDays(day.id, d.id)} disabled={busy}>
                                  {DAY_NAMES[d.dayOfWeek]} — {d.name}
                                </button>
                                {i < otherDays.length - 1 && <hr />}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </>
      )}

      <NavBar />
    </div>
  );
}

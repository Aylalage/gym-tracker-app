import { useEffect, useState } from 'react';
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

  async function loadWeeks(selectLast = false) {
    const res = await fetch('/api/weeks');
    const data = await res.json();
    setWeeks(data);
    if (data.length > 0) {
      setWeekIndex(selectLast ? data.length - 1 : Math.min(weekIndex, data.length - 1));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createWeek(duplicateFromWeekId) {
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
    const pos = getTodayPosition(settings.startDate);
    if (!pos) return;
    const idx = weeks.findIndex((w) => w.number === pos.weekNumber);
    if (idx === -1) {
      alert(`You're up to Week ${pos.weekNumber}, but it hasn't been created yet. Use "New blank week" or "Duplicate this week" until you reach it.`);
      return;
    }
    setWeekIndex(idx);
  }

  if (loading || settings === undefined) return <div className="page">Loading…</div>;

  const week = weeks[weekIndex];
  const todayPos = settings ? getTodayPosition(settings.startDate) : null;
  const isViewingCurrentWeek = week && todayPos && week.number === todayPos.weekNumber;

  return (
    <div className="page">
      <h1 className="title">Program</h1>

      {!settings && (
        <div className="setup-banner">
          <span className="field-label">Track where you are automatically</span>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            Enter the date Week 1, Day 1 started, and "Jump to Today" will always take you straight to today's workout.
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

          <div className="top-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => createWeek(null)} disabled={busy}>
              + New blank week
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => createWeek(week.id)} disabled={busy}>
              ⧉ Duplicate this week
            </button>
            {settings && (
              <button className="btn btn-ghost btn-sm" onClick={jumpToToday}>
                📅 Jump to Today
              </button>
            )}
            <button className="btn btn-danger btn-sm" onClick={() => deleteWeek(week.id, week.number)} disabled={busy}>
              🗑 Delete week
            </button>
          </div>

          {week.days
            .slice()
            .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
            .map((day) => {
              const isRest = day.name.trim().toLowerCase() === 'rest';
              const isDone = day.session?.completed;
              const isToday = isViewingCurrentWeek && todayPos.dayOfWeek === day.dayOfWeek;
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
                    {!isRest && <span className={`pill ${isDone ? 'done' : ''}`}>{isDone ? 'Done' : 'Plan'}</span>}
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

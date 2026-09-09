import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import NavBar from '../components/NavBar';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ProgramPage() {
  const router = useRouter();
  const [weeks, setWeeks] = useState([]);
  const [weekIndex, setWeekIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function loadWeeks(selectLast = false) {
    const res = await fetch('/api/weeks');
    const data = await res.json();
    setWeeks(data);
    if (data.length > 0) {
      setWeekIndex(selectLast ? data.length - 1 : Math.min(weekIndex, data.length - 1));
    }
    setLoading(false);
  }

  useEffect(() => {
    loadWeeks();
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

  if (loading) return <div className="page">Loading…</div>;

  const week = weeks[weekIndex];

  return (
    <div className="page">
      <h1 className="title">Program</h1>

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
          </div>

          {week.days
            .slice()
            .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
            .map((day) => {
              const isRest = day.name.trim().toLowerCase() === 'rest';
              const isDone = day.session?.completed;
              return (
                <div
                  key={day.id}
                  className={`card tappable ${isRest ? 'rest' : ''}`}
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

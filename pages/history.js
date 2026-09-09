import { useEffect, useState } from 'react';
import NavBar from '../components/NavBar';

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

export default function HistoryPage() {
  const [sessions, setSessions] = useState([]);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    fetch('/api/history').then((r) => r.json()).then(setSessions);
  }, []);

  return (
    <div className="page">
      <h1 className="title">History</h1>

      {sessions.length === 0 && <p className="empty-state">No completed workouts yet.</p>}

      {sessions.map((s) => (
        <div className="card tappable" key={s.id} onClick={() => setOpenId(openId === s.id ? null : s.id)}>
          <div className="row">
            <div>
              <div className="row-day-name">Week {s.weekNumber} · {s.dayName}</div>
              <div className="row-workout-name">{s.workoutName}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="pill done">Done</div>
              <div className="field-label" style={{ marginTop: 6 }}>
                {s.completedAt ? new Date(s.completedAt).toLocaleDateString() : ''}
              </div>
            </div>
          </div>

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

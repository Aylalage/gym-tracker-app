import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import NavBar from '../components/NavBar';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function TemplateLibraryPage() {
  const router = useRouter();
  const [goals, setGoals] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState('');
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/goals').then((r) => r.json()).then(setGoals);
  }, []);

  useEffect(() => {
    if (router.isReady && router.query.goal) {
      setSelectedGoal(router.query.goal);
    }
  }, [router.isReady, router.query.goal]);

  useEffect(() => {
    setLoading(true);
    const qs = selectedGoal ? `?goal=${encodeURIComponent(selectedGoal)}` : '';
    fetch(`/api/master-templates${qs}`)
      .then((r) => r.json())
      .then((data) => {
        setTemplates(data);
        setLoading(false);
      });
  }, [selectedGoal]);

  async function useTemplate(template) {
    if (!confirm(`Add "${template.name}" as a new week in your Program?`)) return;
    setBusy(true);
    await fetch(`/api/master-templates/${template.id}/use`, { method: 'POST' });
    setBusy(false);
    router.push('/');
  }

  return (
    <div className="page">
      <button className="back-btn" onClick={() => (viewing ? setViewing(null) : router.push('/'))}>‹</button>
      <h1 className="title">{viewing ? viewing.name : 'Template Library'}</h1>

      {!viewing && (
        <>
          <div className="top-actions" style={{ marginBottom: 16 }}>
            <button className={`btn btn-sm ${selectedGoal === '' ? 'btn-lime' : 'btn-ghost'}`} onClick={() => setSelectedGoal('')}>
              All Goals
            </button>
            {goals.map((g) => (
              <button
                key={g.id}
                className={`btn btn-sm ${selectedGoal === g.key ? 'btn-lime' : 'btn-ghost'}`}
                onClick={() => setSelectedGoal(g.key)}
              >
                {g.label}
              </button>
            ))}
          </div>

          {loading && <p className="empty-state">Loading…</p>}
          {!loading && templates.length === 0 && <p className="empty-state">No templates published yet — check back soon.</p>}

          {templates.map((t) => (
            <div className="card tappable" key={t.id} onClick={() => setViewing(t)}>
              <div className="row-workout-name">{t.name}</div>
              {t.description && <p style={{ fontSize: 13, color: 'var(--muted)', margin: '6px 0' }}>{t.description}</p>}
              <div className="row" style={{ marginTop: 8 }}>
                {t.goal && <span className="pill">{t.goal.label}</span>}
                {t.difficulty && <span className="pill">{t.difficulty}</span>}
                <span className="pill">{t.daysPerWeek} days/week</span>
              </div>
            </div>
          ))}
        </>
      )}

      {viewing && (
        <>
          {viewing.description && <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 14 }}>{viewing.description}</p>}
          <div className="row" style={{ marginBottom: 18 }}>
            {viewing.goal && <span className="pill">{viewing.goal.label}</span>}
            {viewing.difficulty && <span className="pill">{viewing.difficulty}</span>}
            <span className="pill">{viewing.daysPerWeek} days/week</span>
            {viewing.recommendedWeeks && <span className="pill">~{viewing.recommendedWeeks} weeks</span>}
          </div>

          {viewing.days
            .slice()
            .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
            .map((day) => (
              <div className="card" key={day.id}>
                <div className="row-day-name">{DAY_NAMES[day.dayOfWeek]}</div>
                <div className="row-workout-name" style={{ marginBottom: 8 }}>{day.workoutName}</div>
                {day.exercises.map((ex) => (
                  <div key={ex.id} className="row" style={{ padding: '6px 0', borderTop: '1px solid #f0f0f0' }}>
                    <div>{ex.name}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                      {ex.sets}x{ex.reps || `${ex.repRangeMin}-${ex.repRangeMax}`}
                    </div>
                  </div>
                ))}
              </div>
            ))}

          <button className="btn btn-lime btn-block" style={{ marginTop: 16 }} onClick={() => useTemplate(viewing)} disabled={busy}>
            Use Template
          </button>
        </>
      )}

      <NavBar />
    </div>
  );
}

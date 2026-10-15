import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const STEPS = [
  'goal',
  'goalDescription',
  'trainingDaysPerWeek',
  'experienceLevel',
  'preferredTrainingType',
  'equipmentAvailable',
  'bodyAreaPriorities',
  'exerciseRestrictions',
  'bodyMetrics',
  'aiSupport',
];

export default function OnboardingPage() {
  const router = useRouter();
  const [goals, setGoals] = useState([]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [metrics, setMetrics] = useState({ weightKg: '', bodyFatPct: '', muscleMassKg: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/goals').then((r) => r.json()).then(setGoals);
  }, []);

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function set(field, value) {
    setAnswers((a) => ({ ...a, [field]: value }));
  }

  async function finish() {
    setSaving(true);
    await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...answers, onboardingCompleted: true }),
    });
    if (metrics.weightKg || metrics.bodyFatPct || metrics.muscleMassKg) {
      await fetch('/api/body-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weightKg: metrics.weightKg ? Number(metrics.weightKg) : null,
          bodyFatPct: metrics.bodyFatPct ? Number(metrics.bodyFatPct) : null,
          muscleMassKg: metrics.muscleMassKg ? Number(metrics.muscleMassKg) : null,
        }),
      });
    }
    setSaving(false);
    router.push('/');
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="page" style={{ paddingTop: 40 }}>
      <div className="field-label" style={{ marginBottom: 10 }}>Step {step + 1} of {STEPS.length}</div>
      <div className="progress-bar-outer" style={{ marginBottom: 24 }}>
        <div className="progress-bar-inner" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      {current === 'goal' && (
        <>
          <h1 className="title">What are you working towards?</h1>
          {goals.map((g) => (
            <button
              key={g.id}
              className={`btn btn-block ${answers.primaryGoalId === g.id ? 'btn-lime' : 'btn-ghost'}`}
              style={{ marginBottom: 10 }}
              onClick={() => {
                set('primaryGoalId', g.id);
                next();
              }}
            >
              {g.label}
            </button>
          ))}
        </>
      )}

      {current === 'goalDescription' && (
        <>
          <h1 className="title">Tell us about your goal in your own words</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 14 }}>e.g. "I want to increase muscle mass and particularly build my shoulders."</p>
          <textarea
            rows={4}
            value={answers.goalDescription || ''}
            onChange={(e) => set('goalDescription', e.target.value)}
            style={{ marginBottom: 14 }}
          />
          <button className="btn btn-lime btn-block" onClick={next}>Continue</button>
        </>
      )}

      {current === 'trainingDaysPerWeek' && (
        <>
          <h1 className="title">How many days per week would you like to train?</h1>
          <div className="top-actions" style={{ marginBottom: 14 }}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button
                key={n}
                className={`btn btn-sm ${answers.trainingDaysPerWeek === n ? 'btn-lime' : 'btn-ghost'}`}
                onClick={() => {
                  set('trainingDaysPerWeek', n);
                  next();
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </>
      )}

      {current === 'experienceLevel' && (
        <>
          <h1 className="title">What experience level would you describe yourself as?</h1>
          {['Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
            <button
              key={lvl}
              className={`btn btn-block ${answers.experienceLevel === lvl ? 'btn-lime' : 'btn-ghost'}`}
              style={{ marginBottom: 10 }}
              onClick={() => {
                set('experienceLevel', lvl);
                next();
              }}
            >
              {lvl}
            </button>
          ))}
        </>
      )}

      {current === 'preferredTrainingType' && (
        <>
          <h1 className="title">Do you prefer strength training, cardio, or a mixture?</h1>
          {['Strength', 'Cardio', 'Mixture'].map((t) => (
            <button
              key={t}
              className={`btn btn-block ${answers.preferredTrainingType === t ? 'btn-lime' : 'btn-ghost'}`}
              style={{ marginBottom: 10 }}
              onClick={() => {
                set('preferredTrainingType', t);
                next();
              }}
            >
              {t}
            </button>
          ))}
        </>
      )}

      {current === 'equipmentAvailable' && (
        <>
          <h1 className="title">Do you have any equipment available?</h1>
          <textarea
            rows={3}
            placeholder="e.g. Full gym, or just dumbbells at home"
            value={answers.equipmentAvailable || ''}
            onChange={(e) => set('equipmentAvailable', e.target.value)}
            style={{ marginBottom: 14 }}
          />
          <button className="btn btn-lime btn-block" onClick={next}>Continue</button>
        </>
      )}

      {current === 'bodyAreaPriorities' && (
        <>
          <h1 className="title">Any particular body areas you want to focus on?</h1>
          <textarea
            rows={3}
            placeholder="e.g. Shoulders and upper body"
            value={answers.bodyAreaPriorities || ''}
            onChange={(e) => set('bodyAreaPriorities', e.target.value)}
            style={{ marginBottom: 14 }}
          />
          <button className="btn btn-lime btn-block" onClick={next}>Continue</button>
        </>
      )}

      {current === 'exerciseRestrictions' && (
        <>
          <h1 className="title">Any movements or exercises you want to avoid?</h1>
          <textarea
            rows={3}
            placeholder="e.g. No overhead pressing — shoulder niggle"
            value={answers.exerciseRestrictions || ''}
            onChange={(e) => set('exerciseRestrictions', e.target.value)}
            style={{ marginBottom: 14 }}
          />
          <button className="btn btn-lime btn-block" onClick={next}>Continue</button>
        </>
      )}

      {current === 'bodyMetrics' && (
        <>
          <h1 className="title">Do you know your current stats?</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 14 }}>Totally optional — skip anything you don't know.</p>
          <span className="field-label">Weight (kg)</span>
          <input type="number" value={metrics.weightKg} onChange={(e) => setMetrics({ ...metrics, weightKg: e.target.value })} style={{ marginBottom: 10 }} />
          <span className="field-label">Body fat %</span>
          <input type="number" value={metrics.bodyFatPct} onChange={(e) => setMetrics({ ...metrics, bodyFatPct: e.target.value })} style={{ marginBottom: 10 }} />
          <span className="field-label">Muscle mass (kg)</span>
          <input type="number" value={metrics.muscleMassKg} onChange={(e) => setMetrics({ ...metrics, muscleMassKg: e.target.value })} style={{ marginBottom: 14 }} />
          <button className="btn btn-lime btn-block" onClick={next}>Continue</button>
        </>
      )}

      {current === 'aiSupport' && (
        <>
          <h1 className="title">Turn on Claude AI support?</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 14 }}>
            Claude AI features (chat, voice logging) aren't built yet — this just saves your preference for when they launch. You can change it anytime in Profile.
          </p>
          <div className="top-actions" style={{ marginBottom: 14 }}>
            <button className={`btn btn-block ${answers.aiSupportEnabled === true ? 'btn-lime' : 'btn-ghost'}`} onClick={() => set('aiSupportEnabled', true)}>ON</button>
            <button className={`btn btn-block ${answers.aiSupportEnabled === false ? 'btn-lime' : 'btn-ghost'}`} onClick={() => set('aiSupportEnabled', false)}>OFF</button>
          </div>
        </>
      )}

      <div className="top-actions" style={{ marginTop: 20 }}>
        {!isLast && (
          <button className="link-btn" onClick={next}>Skip / Not sure</button>
        )}
        {isLast && (
          <button className="btn btn-lime btn-block" onClick={finish} disabled={saving}>
            {saving ? 'Saving…' : 'Finish'}
          </button>
        )}
      </div>
    </div>
  );
}

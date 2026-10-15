import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import NavBar from '../components/NavBar';
import calc from '../lib/calculations';

export default function ProfilePage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState([]);
  const [form, setForm] = useState({ weightKg: '', heightCm: '', bodyFatPct: '', muscleMassKg: '', age: '', sex: '' });
  const [saved, setSaved] = useState(false);

  const [goals, setGoals] = useState([]);
  const [profile, setProfile] = useState(null);
  const [profileSaved, setProfileSaved] = useState(false);

  async function load() {
    const res = await fetch('/api/body-metrics');
    const data = await res.json();
    setMetrics(data);
    const latest = data[data.length - 1];
    if (latest) {
      setForm({
        weightKg: latest.weightKg ?? '',
        heightCm: latest.heightCm ?? '',
        bodyFatPct: latest.bodyFatPct ?? '',
        muscleMassKg: latest.muscleMassKg ?? '',
        age: latest.age ?? '',
        sex: latest.sex ?? '',
      });
    }
  }

  async function loadProfile() {
    const [goalsRes, profileRes] = await Promise.all([fetch('/api/goals'), fetch('/api/profile')]);
    setGoals(await goalsRes.json());
    setProfile(await profileRes.json());
  }

  useEffect(() => {
    load();
    loadProfile();
  }, []);

  async function save() {
    await fetch('/api/body-metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weightKg: form.weightKg === '' ? null : Number(form.weightKg),
        heightCm: form.heightCm === '' ? null : Number(form.heightCm),
        bodyFatPct: form.bodyFatPct === '' ? null : Number(form.bodyFatPct),
        muscleMassKg: form.muscleMassKg === '' ? null : Number(form.muscleMassKg),
        age: form.age === '' ? null : Number(form.age),
        sex: form.sex || null,
      }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    load();
  }

  async function saveProfile() {
    await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        primaryGoalId: profile.primaryGoalId || null,
        goalDescription: profile.goalDescription || null,
        experienceLevel: profile.experienceLevel || null,
        trainingDaysPerWeek: profile.trainingDaysPerWeek ? Number(profile.trainingDaysPerWeek) : null,
        preferredTrainingType: profile.preferredTrainingType || null,
        equipmentAvailable: profile.equipmentAvailable || null,
        bodyAreaPriorities: profile.bodyAreaPriorities || null,
        exerciseRestrictions: profile.exerciseRestrictions || null,
        aiSupportEnabled: !!profile.aiSupportEnabled,
      }),
    });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 1500);
  }

  const bmi = calc.calcBMI(Number(form.weightKg), Number(form.heightCm));
  const bmr = calc.calcBMR(Number(form.weightKg), Number(form.heightCm), Number(form.age), form.sex);

  return (
    <div className="page">
      <h1 className="title">Profile</h1>

      {profile && (
        <div className="card">
          <div className="row" style={{ marginBottom: 10 }}>
            <div className="section-title" style={{ margin: 0 }}>Goals & Training</div>
            <button className="link-btn" onClick={() => router.push('/onboarding')}>Retake questionnaire</button>
          </div>

          <span className="field-label">Primary goal</span>
          <select value={profile.primaryGoalId || ''} onChange={(e) => setProfile({ ...profile, primaryGoalId: e.target.value })} style={{ marginBottom: 10 }}>
            <option value="">—</option>
            {goals.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>

          <span className="field-label">Goal description</span>
          <textarea rows={2} value={profile.goalDescription || ''} onChange={(e) => setProfile({ ...profile, goalDescription: e.target.value })} style={{ marginBottom: 10 }} />

          <span className="field-label">Experience level</span>
          <select value={profile.experienceLevel || ''} onChange={(e) => setProfile({ ...profile, experienceLevel: e.target.value })} style={{ marginBottom: 10 }}>
            <option value="">—</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>

          <span className="field-label">Training days per week</span>
          <input type="number" value={profile.trainingDaysPerWeek || ''} onChange={(e) => setProfile({ ...profile, trainingDaysPerWeek: e.target.value })} style={{ marginBottom: 10 }} />

          <span className="field-label">Preferred training type</span>
          <select value={profile.preferredTrainingType || ''} onChange={(e) => setProfile({ ...profile, preferredTrainingType: e.target.value })} style={{ marginBottom: 10 }}>
            <option value="">—</option>
            <option value="Strength">Strength</option>
            <option value="Cardio">Cardio</option>
            <option value="Mixture">Mixture</option>
          </select>

          <span className="field-label">Equipment available</span>
          <textarea rows={2} value={profile.equipmentAvailable || ''} onChange={(e) => setProfile({ ...profile, equipmentAvailable: e.target.value })} style={{ marginBottom: 10 }} />

          <span className="field-label">Body area priorities</span>
          <textarea rows={2} value={profile.bodyAreaPriorities || ''} onChange={(e) => setProfile({ ...profile, bodyAreaPriorities: e.target.value })} style={{ marginBottom: 10 }} />

          <span className="field-label">Exercises to avoid</span>
          <textarea rows={2} value={profile.exerciseRestrictions || ''} onChange={(e) => setProfile({ ...profile, exerciseRestrictions: e.target.value })} style={{ marginBottom: 10 }} />

          <div className="row" style={{ margin: '4px 0 12px' }}>
            <span className="field-label" style={{ margin: 0 }}>AI Support (Claude features — coming soon)</span>
            <button
              className={`btn btn-sm ${profile.aiSupportEnabled ? 'btn-lime' : 'btn-ghost'}`}
              onClick={() => setProfile({ ...profile, aiSupportEnabled: !profile.aiSupportEnabled })}
            >
              {profile.aiSupportEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <button className="btn btn-lime btn-block" onClick={saveProfile}>{profileSaved ? 'Saved ✓' : 'Save'}</button>
        </div>
      )}

      <div className="card">
        <span className="field-label">Weight (kg)</span>
        <input type="number" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} style={{ marginBottom: 10 }} />

        <span className="field-label">Height (cm)</span>
        <input type="number" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} style={{ marginBottom: 10 }} />

        <span className="field-label">Body fat %</span>
        <input type="number" value={form.bodyFatPct} onChange={(e) => setForm({ ...form, bodyFatPct: e.target.value })} style={{ marginBottom: 10 }} />

        <span className="field-label">Muscle mass (kg)</span>
        <input type="number" value={form.muscleMassKg} onChange={(e) => setForm({ ...form, muscleMassKg: e.target.value })} style={{ marginBottom: 10 }} />

        <span className="field-label">Age (for BMR)</span>
        <input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} style={{ marginBottom: 10 }} />

        <span className="field-label">Sex (for BMR)</span>
        <select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })} style={{ marginBottom: 12 }}>
          <option value="">—</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>

        <button className="btn btn-lime btn-block" onClick={save}>{saved ? 'Saved ✓' : 'Save measurement'}</button>
      </div>

      <div className="card">
        <div className="row">
          <div><span className="field-label">BMI</span>{bmi ?? '—'}</div>
          <div><span className="field-label">Estimated BMR</span>{bmr ? `${bmr} kcal/day` : '—'}</div>
        </div>
      </div>

      <div className="section-title">History</div>
      {metrics.length === 0 && <p className="empty-state">No measurements logged yet.</p>}
      {metrics.slice().reverse().map((m) => (
        <div className="card" key={m.id}>
          <div className="row">
            <div className="field-label">{new Date(m.date).toLocaleDateString()}</div>
            <div style={{ fontSize: 13 }}>
              {m.weightKg ? `${m.weightKg}kg` : ''} {m.bodyFatPct ? `· ${m.bodyFatPct}% BF` : ''} {m.muscleMassKg ? `· ${m.muscleMassKg}kg muscle` : ''}
            </div>
          </div>
        </div>
      ))}

      <NavBar />
    </div>
  );
}

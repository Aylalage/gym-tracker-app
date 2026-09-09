import { useEffect, useState } from 'react';
import NavBar from '../components/NavBar';
import calc from '../lib/calculations';

export default function ProfilePage() {
  const [metrics, setMetrics] = useState([]);
  const [form, setForm] = useState({ weightKg: '', heightCm: '', bodyFatPct: '', muscleMassKg: '', age: '', sex: '' });
  const [saved, setSaved] = useState(false);

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

  useEffect(() => {
    load();
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

  const bmi = calc.calcBMI(Number(form.weightKg), Number(form.heightCm));
  const bmr = calc.calcBMR(Number(form.weightKg), Number(form.heightCm), Number(form.age), form.sex);

  return (
    <div className="page">
      <h1 className="title">Profile</h1>

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

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import NavBar from '../../components/NavBar';

export default function AdminTemplatesPage() {
  const router = useRouter();
  const [me, setMe] = useState(undefined);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch('/api/admin/templates');
    if (res.status === 403 || res.status === 401) {
      setTemplates(null);
      setLoading(false);
      return;
    }
    setTemplates(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setMe(data);
        if (data?.role !== 'admin') {
          setLoading(false);
        } else {
          load();
        }
      });
  }, []);

  async function createTemplate() {
    const name = prompt('Template name (e.g. "Upper Body Muscle Builder"):');
    if (!name || !name.trim()) return;
    const daysPerWeek = prompt('Days per week:', '4');
    if (!daysPerWeek) return;
    const res = await fetch('/api/admin/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), daysPerWeek: Number(daysPerWeek) }),
    });
    const template = await res.json();
    router.push(`/admin/templates/${template.id}`);
  }

  async function togglePublish(t) {
    await fetch(`/api/admin/templates/${t.id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !t.published }),
    });
    load();
  }

  async function duplicateTemplate(t) {
    await fetch(`/api/admin/templates/${t.id}/duplicate`, { method: 'POST' });
    load();
  }

  async function deleteTemplate(t) {
    if (!confirm(`Delete "${t.name}" permanently? Anyone who already copied it keeps their own copy.`)) return;
    await fetch(`/api/admin/templates/${t.id}`, { method: 'DELETE' });
    load();
  }

  if (me === undefined || loading) return <div className="page">Loading…</div>;

  if (me?.role !== 'admin') {
    return (
      <div className="page">
        <p className="empty-state">You don't have access to this page.</p>
        <NavBar />
      </div>
    );
  }

  return (
    <div className="page">
      <button className="back-btn" onClick={() => router.push('/')}>‹</button>
      <h1 className="title">Admin: Templates</h1>

      <button className="btn btn-lime btn-block" style={{ marginBottom: 16 }} onClick={createTemplate}>
        + New Template
      </button>

      {templates.length === 0 && <p className="empty-state">No templates yet.</p>}

      {templates.map((t) => (
        <div className="card" key={t.id}>
          <div className="row">
            <div>
              <div className="row-workout-name">{t.name}</div>
              <div className="row" style={{ marginTop: 6, gap: 6 }}>
                <span className={`pill ${t.published ? 'done' : ''}`}>{t.published ? 'Published' : 'Draft'}</span>
                <span className="pill">{t.daysPerWeek} days/week</span>
                {t.goal && <span className="pill">{t.goal.label}</span>}
              </div>
            </div>
          </div>
          <div className="top-actions" style={{ marginTop: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/admin/templates/${t.id}`)}>✏️ Edit</button>
            <button className="btn btn-ghost btn-sm" onClick={() => togglePublish(t)}>
              {t.published ? '👁️ Unpublish' : '📢 Publish'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => duplicateTemplate(t)}>⧉ Duplicate</button>
            <button className="btn btn-danger btn-sm" onClick={() => deleteTemplate(t)}>🗑 Delete</button>
          </div>
        </div>
      ))}

      <NavBar />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function LoginPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');

  async function load() {
    const res = await fetch('/api/users');
    setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function enter(userId, pinValue) {
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, pin: pinValue }),
    });
    if (!res.ok) {
      setError('Incorrect PIN');
      return;
    }
    router.push('/');
  }

  function pickProfile(user) {
    if (!user.hasPin) {
      enter(user.id, '');
    } else {
      setSelected(user);
      setPin('');
      setError('');
    }
  }

  async function createProfile() {
    if (!newName.trim()) return;
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), pin: newPin.trim() || undefined }),
    });
    const user = await res.json();
    await enter(user.id, newPin.trim());
  }

  if (loading) return <div className="page">Loading…</div>;

  return (
    <div className="page" style={{ paddingTop: 60 }}>
      <h1 className="title" style={{ textAlign: 'center' }}>Who's training?</h1>

      {users.map((u) => (
        <div key={u.id} className="card">
          {selected?.id === u.id ? (
            <>
              <div className="row-workout-name" style={{ marginBottom: 10 }}>{u.name} — enter PIN</div>
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="PIN"
                style={{ marginBottom: 8 }}
              />
              {error && <p style={{ color: 'var(--danger)', fontSize: 13, margin: '0 0 8px' }}>{error}</p>}
              <div className="top-actions">
                <button className="btn btn-lime btn-sm" onClick={() => enter(u.id, pin)}>Enter</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>Cancel</button>
              </div>
            </>
          ) : (
            <div className="row tappable" onClick={() => pickProfile(u)}>
              <div className="row-workout-name">{u.name}</div>
              {u.hasPin && <span className="pill">🔒 PIN</span>}
            </div>
          )}
        </div>
      ))}

      {showNew ? (
        <div className="card">
          <span className="field-label">Name</span>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} style={{ marginBottom: 10 }} />
          <span className="field-label">PIN (optional — keeps your data private from other profiles)</span>
          <input
            type="password"
            inputMode="numeric"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            placeholder="e.g. 1234"
            style={{ marginBottom: 10 }}
          />
          <div className="top-actions">
            <button className="btn btn-lime btn-sm" onClick={createProfile}>Create & Enter</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowNew(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-ghost btn-block" onClick={() => setShowNew(true)}>+ New profile</button>
      )}
    </div>
  );
}

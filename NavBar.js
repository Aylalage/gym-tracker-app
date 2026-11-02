import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const ITEMS = [
  { href: '/', label: 'Program', icon: '🏋️' },
  { href: '/progress', label: 'Progress', icon: '📈' },
  { href: '/history', label: 'History', icon: '🗓️' },
  { href: '/profile', label: 'Profile', icon: '👤' },
];

export default function NavBar() {
  const router = useRouter();
  const [me, setMe] = useState(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then(setMe);
  }, []);

  async function switchProfile() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <>
      <header className="topbar">
        {me && (
          <>
            <span className="who">{me.name}</span>
            <span>·</span>
            <button className="link-btn" onClick={switchProfile}>Switch</button>
            {me.role === 'admin' && (
              <>
                <span>·</span>
                <Link href="/admin/templates" className="link-btn">Admin</Link>
              </>
            )}
          </>
        )}
      </header>
      <nav className="navbar">
        {ITEMS.map((item) => {
          const active = router.pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={active ? 'active' : ''}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

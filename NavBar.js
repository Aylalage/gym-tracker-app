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
  return (
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
  );
}

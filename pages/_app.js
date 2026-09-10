import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [status, setStatus] = useState('checking'); // checking | authed | guest

  useEffect(() => {
    if (router.pathname === '/login') {
      setStatus('guest');
      return;
    }
    let cancelled = false;
    fetch('/api/auth/me').then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setStatus('authed');
      } else {
        setStatus('guest');
        router.replace('/login');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router, router.pathname]);

  if (router.pathname === '/login') return <Component {...pageProps} />;
  if (status !== 'authed') return null;

  return <Component {...pageProps} />;
}

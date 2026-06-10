'use client';
import { signIn, useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const { status } = useSession();
  const router = useRouter();
  useEffect(() => { if (status === 'authenticated') router.replace('/'); }, [status, router]);
  return (
    <div className="app">
      <div className="center">
        <div style={{ fontSize: 54 }}>⚽</div>
        <h1 style={{ margin: '10px 0 4px' }}>Polla Mundialista 2026</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 320, marginBottom: 24 }}>
          Predice los marcadores, gana puntos y compite por el bote. Inicia sesión para jugar.
        </p>
        <button className="btn-google" onClick={() => signIn('google', { callbackUrl: '/' })}>
          <span>🔵</span> Entrar con Google
        </button>
        <p style={{ marginTop: 28, fontSize: 12, color: 'var(--muted)' }}>
          Desarrollado por <a href="https://www.yachaydeep.com/labs" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', fontWeight: 700 }}>YachayDeep</a>
        </p>
      </div>
    </div>
  );
}

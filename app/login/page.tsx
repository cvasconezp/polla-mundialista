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
      </div>
    </div>
  );
}

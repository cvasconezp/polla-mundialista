'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';

type Head = { pot?: number; currency?: string; myPts?: number; myRank?: string };

export default function Shell({ children, head }: { children: React.ReactNode; head?: Head }) {
  const path = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.isAdmin;
  const tabs = [
    { href: '/', ic: '📝', label: 'Predicciones' },
    { href: '/tabla', ic: '🏆', label: 'Tabla' },
    { href: '/campeon', ic: '⭐', label: 'Campeón' },
    ...(isAdmin ? [{ href: '/admin', ic: '⚙️', label: 'Admin' }] : []),
  ];
  return (
    <div className="app">
      <header className="hd">
        <div className="brand">
          <div className="ball">⚽</div>
          <div><h1>Polla Mundialista 2026</h1><small>Canadá · USA · México</small></div>
        </div>
        <div className="hdrow">
          <div className="stat"><div className="k">Bote</div><div className="v">{head?.currency === 'USD' ? '$' : ''}{head?.pot ?? 0}</div></div>
          <div className="stat"><div className="k">Mis puntos</div><div className="v">{head?.myPts ?? 0}</div></div>
          <div className="stat"><div className="k">Mi puesto</div><div className="v">{head?.myRank ?? '—'}</div></div>
        </div>
        <div className="whoami">
          <span>👤 {session?.user?.name ?? session?.user?.email ?? 'Invitado'}</span>
          {session && <a onClick={() => signOut()} style={{ cursor: 'pointer' }}>Salir</a>}
        </div>
      </header>
      <main className="mn">{children}</main>
      <nav className="bn">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className={path === t.href ? 'active' : ''}>
            <span className="ic">{t.ic}</span>{t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import Tutorial from './Tutorial';
import PhoneGate from './PhoneGate';

type Head = { pot?: number; currency?: string; myPts?: number; myRank?: string };

export default function Shell({ children, head }: { children: React.ReactNode; head?: Head }) {
  const path = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.isAdmin;
  const [calOpen, setCalOpen] = useState(false);
  const tabs = [
    { href: '/', ic: '📝', label: 'Predicciones' },
    { href: '/tabla', ic: '🏆', label: 'Tabla' },
    { href: '/campeon', ic: '⭐', label: 'Campeón' },
    ...(isAdmin ? [{ href: '/admin', ic: '⚙️', label: 'Admin' }] : []),
  ];
  return (
    <div className="app">
      <PhoneGate />
      <Tutorial />
      {calOpen && <CalModal onClose={() => setCalOpen(false)} />}
      <header className="hd">
        <div className="brand">
          <div className="brand-l">
            <div className="ball">⚽</div>
            <div><h1>Polla Mundialista 2026</h1><small>Canadá · USA · México</small></div>
          </div>
          <div className="brand-r">
            <button className="hd-bell" onClick={() => setCalOpen(true)} aria-label="Suscribir calendario y alertas" title="Suscribir calendario y alertas">🔔</button>
            {session?.user?.image
              ? <img className="hd-avatar" src={session.user.image} alt="" referrerPolicy="no-referrer" />
              : <div className="hd-avatar hd-avatar-i">{(session?.user?.name ?? '·').slice(0, 1).toUpperCase()}</div>}
          </div>
        </div>
        <div className="hdrow">
          <div className="stat"><div className="k">💰 Bote</div><div className="v">{head?.currency === 'USD' ? '$' : ''}{head?.pot ?? 0}</div></div>
          <div className="stat"><div className="k">⭐ Mis puntos</div><div className="v">{head?.myPts ?? 0}</div></div>
          <div className="stat"><div className="k">📊 Mi puesto</div><div className="v">{head?.myRank ?? '—'}</div></div>
        </div>
        <div className="whoami">
          <span className="wa-name">{session?.user?.name ?? session?.user?.email ?? 'Invitado'}</span>
          <button className="wa-rules" onClick={() => window.dispatchEvent(new Event('open-tutorial'))}>📖 Cómo jugar</button>
          {session && <a className="wa-link" onClick={() => signOut({ callbackUrl: '/' })}>Salir</a>}
        </div>
      </header>
      <main className="mn">{children}
        <div className="app-credit">Desarrollado por <a href="https://www.yachaydeep.com/labs" target="_blank" rel="noopener noreferrer">YachayDeep</a></div>
      </main>
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

function CalModal({ onClose }: { onClose: () => void }) {
  const host = typeof window !== 'undefined' ? window.location.host : '';
  const httpsUrl = `https://${host}/api/calendar`;
  const webcalUrl = `webcal://${host}/api/calendar`;
  const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(httpsUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }
  return (
    <div className="cal-overlay" onClick={onClose}>
      <div className="cal-sheet" onClick={(e) => e.stopPropagation()}>
        <h3>🔔 Suscribir calendario</h3>
        <p>Recibe los partidos y una alerta para predecir antes de cada inicio (en hora de Ecuador).</p>
        <a className="cal-opt" href={googleUrl} target="_blank" rel="noopener noreferrer"><span>🟢</span> Google Calendar</a>
        <a className="cal-opt" href={webcalUrl}><span>🍎</span> iPhone / Apple Calendar</a>
        <button className="cal-opt" onClick={copy}><span>🔗</span> {copied ? '¡Enlace copiado!' : 'Copiar enlace (otros)'}</button>
        <a className="cal-opt" href={httpsUrl} download="polla-mundialista.ics"><span>⬇️</span> Descargar (.ics) e importar</a>
        <p className="cal-tip">📱 En Android, si no aparece: abre Google Calendar → Menú → Ajustes → activa "Polla Mundialista 2026". Google sincroniza el calendario suscrito cada cierto tiempo (no al instante). Si lo quieres ya, usa "Descargar (.ics)".</p>
        <button className="cal-close" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}

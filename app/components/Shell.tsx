'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Tutorial from './Tutorial';
import PhoneGate from './PhoneGate';
import { api } from '../lib-client';

type Head = { pot?: number; currency?: string; myPts?: number; myRank?: string };

export default function Shell({ children, head }: { children: React.ReactNode; head?: Head }) {
  const path = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.isAdmin;
  const [calOpen, setCalOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
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
      {payOpen && <PayModal onClose={() => setPayOpen(false)} playerName={session?.user?.name ?? ''} />}
      <header className="hd">
        <div className="brand">
          <div className="brand-l">
            <div className="ball">⚽</div>
            <div><h1>Polla Mundialista 2026</h1><small>Canadá · USA · México</small></div>
          </div>
          <div className="brand-r">
            <button className="hd-bell" onClick={() => setPayOpen(true)} aria-label="Pagos y datos de cuenta" title="Pagos y datos de cuenta">💵</button>
            <button className="hd-bell" onClick={() => setCalOpen(true)} aria-label="Suscribir calendario y alertas" title="Suscribir calendario y alertas">📅</button>
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
        <h3>📅 Suscribir calendario</h3>
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

function PayModal({ onClose, playerName }: { onClose: () => void; playerName: string }) {
  const [d, setD] = useState<{ paidPhases: string[]; phases: { phase: string; label: string }[]; isAdmin: boolean } | null>(null);
  useEffect(() => { api('/api/my-payments').then(setD).catch(() => setD({ paidPhases: [], phases: [], isAdmin: false })); }, []);
  const isAdmin = d?.isAdmin ?? false;
  const phases = d?.phases ?? [];
  const paidPhases = d?.paidPhases ?? [];
  const num = '593981442865';
  const msg = `Hola, te envío el comprobante de pago de la Polla Mundialista 2026.${playerName ? ' Jugador: ' + playerName : ''}`;
  const waUrl = `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  return (
    <div className="cal-overlay" onClick={onClose}>
      <div className="cal-sheet" onClick={(e) => e.stopPropagation()}>
        <h3>💵 Pagos por fase</h3>
        {isAdmin ? (
          <p>Eres organizador, no participas en la polla. Estos son los datos de pago que usan los jugadores para abonar cada fase ($5 c/u) y enviar el comprobante.</p>
        ) : (
          <p>Cada fase cuesta $5. Aquí ves qué fases tienes pagadas. Para jugar una fase, realiza el pago y envía el comprobante; el organizador la habilita.</p>
        )}
        {!isAdmin && phases.map((p) => {
          const paid = paidPhases.includes(p.phase);
          return (
            <div key={p.phase} className="pay-row">
              <span className="nm">{p.label}</span>
              <span style={{ fontWeight: 700, fontSize: 12, color: paid ? 'var(--green)' : 'var(--red)' }}>{paid ? '✓ Pagado' : 'Pendiente'}</span>
            </div>
          );
        })}
        <div style={{ background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px', margin: '12px 0', fontSize: 13, lineHeight: 1.6 }}>
          <b>Datos para el pago</b><br />
          Banco Pichincha · Cuenta de ahorros<br />
          N.º <b>2207078855</b><br />
          Víctor Hugo Sánchez Chicaiza
        </div>
        <a className="cal-opt" href={waUrl} target="_blank" rel="noopener noreferrer"><span>💬</span> Enviar comprobante por WhatsApp</a>
        <p className="cal-tip">Envía tu comprobante al +593 98 144 2865. Cuando el organizador confirme tu pago, se habilitan tus pronósticos de esa fase.</p>
        <button className="cal-close" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}

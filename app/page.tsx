'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Shell from './components/Shell';
import Landing from './components/Landing';
import { api, flagUrl } from './lib-client';

type Match = {
  id: number; stage: string; group: string | null;
  home: { code: string; name: string; flag: string };
  away: { code: string; name: string; flag: string };
  kickoff: string; status: string; homeScore: number | null; awayScore: number | null;
  open: boolean; prediction: { homeScore: number; awayScore: number; points: number | null } | null;
};

const TZ = 'America/Guayaquil';
const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'short', timeZone: TZ });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', timeZone: TZ });

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [head, setHead] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [hint, setHint] = useState<number | null>(null);
  const [calOpen, setCalOpen] = useState(false);


  const load = useCallback(async () => {
    try {
      const [p, lb] = await Promise.all([api('/api/predictions'), api('/api/leaderboard')]);
      setMatches(p.matches);
      const myId = (session?.user as any)?.id;
      const idx = lb.standings.findIndex((s: any) => s.userId === myId);
      const mine = idx >= 0 ? lb.standings[idx] : null;
      setHead({ pot: lb.pot, currency: lb.currency, myPts: mine?.points ?? 0, myRank: mine ? '#' + (idx + 1) : '—' });
    } catch {} finally { setLoading(false); }
  }, [session]);
  useEffect(() => { if (status === 'authenticated') load(); }, [status, load]);

  async function save(m: Match, h: string, a: string) {
    if (h === '' || a === '' || !paid) return;
    try {
      await api('/api/predictions', { method: 'POST', body: JSON.stringify({ matchId: m.id, homeScore: +h, awayScore: +a }) });
      setHint(m.id); setTimeout(() => setHint(null), 1200);
    } catch (e: any) { alert(e.message); load(); }
  }

  const paid = (session?.user as any)?.hasPaid;

  if (status === 'unauthenticated') return <Landing />;
  if (status !== 'authenticated' || loading) return <Shell head={head}><div className="spinner">Cargando…</div></Shell>;

  let lastDay = '';
  return (
    <Shell head={head}>
      <div className="sec-title">Mis predicciones</div>
      <button className="cal-btn" onClick={() => setCalOpen(true)}>
        📅 Suscribir calendario (horarios + alertas)
      </button>
      {calOpen && <CalModal onClose={() => setCalOpen(false)} />}
      {!paid && (
        <div className="pay-banner">
          🔒 <b>Tu aporte está pendiente.</b> Podrás cargar tus pronósticos cuando el organizador confirme tu pago. Mientras tanto puedes ver los partidos y elegir tu campeón.
        </div>
      )}
      {matches.map((m) => {
        const day = fmtDay(m.kickoff); const showDay = day !== lastDay; lastDay = day;
        const badge = m.status === 'FINISHED'
          ? <span className="badge lock">🔒 Finalizado</span>
          : m.status === 'LIVE'
            ? <span className="badge live">🔴 En juego · cerrado</span>
            : <span className="badge">🕑 {fmtTime(m.kickoff)} · abierto</span>;
        const pred = m.prediction;
        return (
          <div key={m.id}>
            {showDay && <div className="day">📅 {day}{m.group ? ` · Grupo ${m.group}` : ''}</div>}
            <div className="match">
              <div className="meta"><span>Partido {m.id}</span>{badge}</div>
              <div className="row">
                <div className="team"><img className="flag" src={flagUrl(m.home.flag)} alt={m.home.name} loading="lazy" /><span>{m.home.name}</span></div>
                <ScoreBox def={pred?.homeScore} disabled={!m.open || !paid}
                  onSave={(v, other) => save(m, v, other)} pairId={`${m.id}`} side="h" />
                <span className="vs">vs</span>
                <ScoreBox def={pred?.awayScore} disabled={!m.open || !paid}
                  onSave={(v, other) => save(m, other, v)} pairId={`${m.id}`} side="a" />
                <div className="team away"><img className="flag" src={flagUrl(m.away.flag)} alt={m.away.name} loading="lazy" /><span>{m.away.name}</span></div>
              </div>
              {m.status === 'FINISHED' && (
                <div className="result">
                  Resultado: <b>{m.home.name} {m.homeScore}–{m.awayScore} {m.away.name}</b>
                  {pred && <> · ganaste <span className={`pts p${pred.points ?? 0}`}>{pred.points ?? 0} pts</span></>}
                </div>
              )}
              {m.status === 'LIVE' && <div className="result">En vivo: <b>{m.homeScore ?? 0}–{m.awayScore ?? 0}</b> · puntos al finalizar</div>}
              {hint === m.id && <div className="save-hint">✓ Predicción guardada</div>}
            </div>
          </div>
        );
      })}
      <div className="note">⏱️ Las predicciones se bloquean automáticamente al pitazo inicial. Los puntos se calculan solos cuando la API confirma el resultado.</div>
    </Shell>
  );
}

function ScoreBox({ def, disabled, onSave, pairId, side }:
  { def?: number; disabled: boolean; onSave: (v: string, other: string) => void; pairId: string; side: 'h' | 'a' }) {
  const [val, setVal] = useState(def != null ? String(def) : '');
  return (
    <input className="score-in" inputMode="numeric" maxLength={2} disabled={disabled} value={val}
      data-pair={pairId} data-side={side}
      onChange={(e) => setVal(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
      onBlur={(e) => {
        const other = (document.querySelector(`[data-pair="${pairId}"][data-side="${side === 'h' ? 'a' : 'h'}"]`) as HTMLInputElement)?.value ?? '';
        onSave(e.target.value, other);
      }} />
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
        <button className="cal-close" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}
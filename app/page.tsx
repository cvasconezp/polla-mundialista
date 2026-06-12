'use client';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
  phase: string | null; paidPhase: boolean; open: boolean; prediction: { homeScore: number; awayScore: number; points: number | null } | null;
};

const TZ = 'America/Guayaquil';
const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'short', timeZone: TZ });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
const dayKey = (iso: string) =>
  new Date(iso).toLocaleDateString('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TZ });

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [head, setHead] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [hint, setHint] = useState<number | null>(null);
  const [openDays, setOpenDays] = useState<Set<string>>(new Set());
  const activeRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);

  // Agrupa partidos por día (ya vienen ordenados por hora).
  const days = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const m of matches) {
      const k = dayKey(m.kickoff);
      (map.get(k) ?? map.set(k, []).get(k)!).push(m);
    }
    return Array.from(map, ([key, ms]) => ({ key, label: fmtDay(ms[0].kickoff), matches: ms }));
  }, [matches]);

  // Día "actual": el del próximo partido sin finalizar (o el último si ya todo terminó).
  const activeKey = useMemo(() => {
    const next = matches.find((m) => m.status !== 'FINISHED') ?? matches[matches.length - 1];
    return next ? dayKey(next.kickoff) : '';
  }, [matches]);

  // Al cargar: abre solo el día actual y desplázate hasta él,
  // dejando visible el encabezado fijo (resta su altura al scroll).
  useEffect(() => {
    if (!activeKey || scrolledRef.current) return;
    setOpenDays(new Set([activeKey]));
    scrolledRef.current = true;
    setTimeout(() => {
      const el = activeRef.current;
      if (!el) return;
      const header = document.querySelector('header.hd') as HTMLElement | null;
      const offset = (header?.offsetHeight ?? 0) + 10;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }, 250);
  }, [activeKey]);

  const toggleDay = (k: string) =>
    setOpenDays((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const load = useCallback(async () => {
    try {
      const [p, lb] = await Promise.all([api('/api/predictions'), api('/api/leaderboard')]);
      setMatches(p.matches);
      const myId = (session?.user as any)?.id;
      const g = lb.general?.standings ?? [];
      const idx = g.findIndex((s: any) => s.userId === myId);
      const pot = Math.round(((lb.money?.totalCollected ?? 0) - (lb.money?.adminTotal ?? 0)) * 100) / 100;
      setHead({ pot, currency: lb.currency ?? 'USD', myPts: idx >= 0 ? g[idx].points : 0, myRank: idx >= 0 ? '#' + (idx + 1) : '—' });
    } catch {} finally { setLoading(false); }
  }, [session]);
  useEffect(() => { if (status === 'authenticated') load(); }, [status, load]);

  async function save(m: Match, h: string, a: string) {
    if (h === '' || a === '' || !m.paidPhase) return;
    try {
      await api('/api/predictions', { method: 'POST', body: JSON.stringify({ matchId: m.id, homeScore: +h, awayScore: +a }) });
      setHint(m.id); setTimeout(() => setHint(null), 1200);
    } catch (e: any) { alert(e.message); load(); }
  }

  async function clearPred(m: Match) {
    if (!confirm('¿Borrar tu pronóstico de este partido y dejarlo en blanco?')) return;
    try {
      await api('/api/predictions', { method: 'DELETE', body: JSON.stringify({ matchId: m.id }) });
      load();
    } catch (e: any) { alert(e.message); }
  }

  if (status === 'unauthenticated') return <Landing />;
  if (status !== 'authenticated' || loading) return <Shell head={head}><div className="spinner">Cargando…</div></Shell>;

  const isAdminUser = !!(session?.user as any)?.isAdmin;

  const renderMatch = (m: Match) => {
    const badge = m.status === 'FINISHED'
      ? <span className="badge lock">🔒 Finalizado</span>
      : m.status === 'LIVE'
        ? <span className="badge live">🔴 En juego · cerrado</span>
        : !m.paidPhase
          ? (isAdminUser
              ? <span className="badge">🕑 {fmtTime(m.kickoff)}</span>
              : <span className="badge">🕑 {fmtTime(m.kickoff)} · 🔒 paga la fase</span>)
          : <span className="badge">🕑 {fmtTime(m.kickoff)} · abierto</span>;
    const pred = m.prediction;
    return (
      <div className="match" key={m.id}>
        <div className="meta"><span>Partido {m.id}</span>{badge}</div>
        <div className="row">
          <div className="team"><img className="flag" src={flagUrl(m.home.flag)} alt={m.home.name} loading="lazy" /><span>{m.home.name}</span></div>
          <ScoreBox key={`h${m.id}-${pred?.homeScore ?? 'n'}-${pred?.awayScore ?? 'n'}`} def={pred?.homeScore} disabled={!m.open}
            onSave={(v, other) => save(m, v, other)} pairId={`${m.id}`} side="h" />
          <span className="vs">vs</span>
          <ScoreBox key={`a${m.id}-${pred?.homeScore ?? 'n'}-${pred?.awayScore ?? 'n'}`} def={pred?.awayScore} disabled={!m.open}
            onSave={(v, other) => save(m, other, v)} pairId={`${m.id}`} side="a" />
          <div className="team away"><img className="flag" src={flagUrl(m.away.flag)} alt={m.away.name} loading="lazy" /><span>{m.away.name}</span></div>
        </div>
        {m.open && pred && (
          <button className="del-pred" onClick={() => clearPred(m)}>🗑️ Borrar pronóstico</button>
        )}
        {m.status === 'FINISHED' && (
          <div className="result">
            Resultado: <b>{m.home.name} {m.homeScore}–{m.awayScore} {m.away.name}</b>
            {pred && <> · ganaste <span className={`pts p${pred.points ?? 0}`}>{pred.points ?? 0} pts</span></>}
          </div>
        )}
        {m.status === 'LIVE' && <div className="result">En vivo: <b>{m.homeScore ?? 0}–{m.awayScore ?? 0}</b> · puntos al finalizar</div>}
        {hint === m.id && <div className="save-hint">✓ Predicción guardada</div>}
      </div>
    );
  };

  return (
    <Shell head={head}>
      <div className="sec-title">Mis predicciones</div>
      {isAdminUser ? (
        <div className="pay-banner">👑 <b>Eres organizador.</b> Puedes ver los partidos y las tablas, pero no participas en la polla: no pronosticas, no pagas y no cuentas como jugador.</div>
      ) : matches.some((m) => m.status === 'SCHEDULED' && !m.paidPhase) && (
        <div className="pay-banner">
          🔒 <b>Tienes fases sin pagar.</b> Cada fase cuesta $5. Podrás pronosticar los partidos de una fase cuando el organizador confirme tu pago de esa fase.
        </div>
      )}
      {days.map((d) => {
        const isOpen = openDays.has(d.key);
        const isActive = d.key === activeKey;
        const pend = d.matches.filter((m) => m.status === 'SCHEDULED' && m.paidPhase && !m.prediction).length;
        let lastGroup = '';
        return (
          <div key={d.key} className="day-sec" ref={isActive ? activeRef : undefined}>
            <button className={`day-head${isOpen ? ' open' : ''}${isActive ? ' active' : ''}`} onClick={() => toggleDay(d.key)}>
              <span className="dh-l">📅 {d.label}{isActive && <span className="dh-now">HOY</span>}</span>
              <span className="dh-r">
                {pend > 0 && <span className="dh-pend">{pend} por jugar</span>}
                <span className="dh-chev">{isOpen ? '▾' : '▸'}</span>
              </span>
            </button>
            {isOpen && (
              <div className="day-body">
                {d.matches.map((m) => {
                  const grp = m.group ?? '';
                  const showGroup = grp !== '' && grp !== lastGroup;
                  lastGroup = grp;
                  return (
                    <div key={m.id}>
                      {showGroup && <div className="grp">Grupo {grp}</div>}
                      {renderMatch(m)}
                    </div>
                  );
                })}
              </div>
            )}
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

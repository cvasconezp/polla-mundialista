'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Shell from '../components/Shell';
import { api, flagUrl } from '../lib-client';

const SHORT: Record<string, string> = { GROUP: 'Gru', R32: '16', R16: '8', QF: 'Cua', SF: 'Sem' };
const money = (n: number) => '$' + (Math.round(n * 100) / 100).toLocaleString('es-EC', { maximumFractionDigits: 2 });

export default function Admin() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<any>(null);

  useEffect(() => { if (status === 'authenticated' && !(session?.user as any)?.isAdmin) router.replace('/'); }, [status, session, router]);
  const load = useCallback(() => { api('/api/admin/data').then(setData).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  async function togglePay(userId: string, phase: string, paid: boolean) {
    await api('/api/admin/phase-payment', { method: 'POST', body: JSON.stringify({ userId, phase, paid }) });
    load();
  }
  async function saveResult(m: any, h: string, a: string, adv: string | null) {
    await api('/api/admin/result', { method: 'POST', body: JSON.stringify({ matchId: m.id, homeScore: +h, awayScore: +a, advancingCode: adv, markFinished: true }) });
    load();
  }
  async function saveChampionWinner(code: string) {
    await api('/api/admin/champion-winner', { method: 'POST', body: JSON.stringify({ teamCode: code || null }) });
    load();
  }
  function exportPhones() {
    const lines = data.users.filter((u: any) => u.phone).map((u: any) => `${u.name ?? u.email}: ${u.phone}`).join('\n');
    navigator.clipboard?.writeText(lines);
    alert('Teléfonos copiados al portapapeles:\n\n' + (lines || 'ninguno'));
  }

  if (!data) return <Shell><div className="spinner">Cargando…</div></Shell>;
  const phases = data.phases as { phase: string; label: string }[];

  return (
    <Shell head={{ pot: Math.round((data.money.totalCollected - data.money.adminTotal) * 100) / 100, currency: data.currency }}>
      <div className="sec-title">Panel de administrador</div>

      <div className="panel">
        <h4>📊 Estadísticas</h4>
        <div className="stat-grid">
          <div className="sg"><b>{data.stats.players}</b><span>Jugadores</span></div>
          <div className="sg"><b>{data.stats.withPhone}</b><span>Con WhatsApp</span></div>
          <div className="sg"><b>{data.stats.predictions}</b><span>Pronósticos</span></div>
          <div className="sg"><b>{data.stats.avgPredictions}</b><span>Prom./jugador</span></div>
          <div className="sg"><b>{data.stats.matchesFinished}/{data.stats.matchesTotal}</b><span>Partidos</span></div>
          <div className="sg"><b>{money(data.money.adminTotal)}</b><span>Administración</span></div>
        </div>
        <button className="pay-btn" style={{ marginTop: 10 }} onClick={exportPhones}>📋 Copiar teléfonos (WhatsApp)</button>
      </div>

      <div className="panel">
        <h4>💰 Botes y repartos</h4>
        <div className="desc">Recaudado: <b>{money(data.money.totalCollected)}</b> · Administración: <b>{money(data.money.adminTotal)}</b>. La app calcula; el dinero lo repartes tú.</div>
        {phases.map((p) => {
          const m = data.money.phases[p.phase];
          return <div key={p.phase} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
            <div><b>{p.label}</b><br /><small style={{ color: 'var(--muted)' }}>{m.paid} pagaron · bote {money(m.pot)}</small></div>
            <div style={{ textAlign: 'right' }}><b>{money(m.prizePool)}</b><br /><small style={{ color: 'var(--muted)' }}>🥇{money(m.split[0])} 🥈{money(m.split[1])} 🥉{money(m.split[2])}</small></div>
          </div>;
        })}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 13 }}>
          <div><b>Tabla general</b><br /><small style={{ color: 'var(--muted)' }}>acumulada (40% de cada fase)</small></div>
          <div style={{ textAlign: 'right' }}><b>{money(data.money.generalPool)}</b><br /><small style={{ color: 'var(--muted)' }}>🥇{money(data.money.generalSplit[0])} 🥈{money(data.money.generalSplit[1])} 🥉{money(data.money.generalSplit[2])}</small></div>
        </div>
      </div>

      <div className="panel">
        <h4>💵 Pagos por fase ($5 c/u)</h4>
        <div className="desc">Marca quién pagó cada fase. Verde = pagó.</div>
        <div className="pay-grid-head">
          <span>Jugador</span>
          {phases.map((p) => <span key={p.phase} className="pgh">{SHORT[p.phase]}</span>)}
        </div>
        {data.users.map((u: any) => (
          <div key={u.id} className="pay-grid-row">
            <span className="pgn">{u.name ?? u.email}</span>
            {phases.map((p) => {
              const paid = u.paidPhases.includes(p.phase);
              return <button key={p.phase} className={`pg-cell ${paid ? 'on' : ''}`} onClick={() => togglePay(u.id, p.phase, !paid)}>{paid ? '✓' : ''}</button>;
            })}
          </div>
        ))}
      </div>

      <div className="panel">
        <h4>🏆 Campeón del torneo (cierre)</h4>
        <div className="desc">Al final, elige al campeón real. Se otorgan los puntos (50/25/10/5) a quienes lo acertaron.</div>
        <ChampionWinner teams={data.teams ?? []} current={data.championWinner ?? ''} onSave={saveChampionWinner} />
      </div>

      <div className="panel">
        <h4>✏️ Corregir resultado</h4>
        <div className="desc">Si la API se equivoca o hay penales. En eliminatorias, define quién avanza.</div>
        {data.matches.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Aún no hay partidos jugados.</div>}
        {data.matches.map((m: any) => <ResultRow key={m.id} m={m} onSave={saveResult} />)}
      </div>

      <div className="note">⚠️ Solo visible para administradores.</div>
    </Shell>
  );
}

function ChampionWinner({ teams, current, onSave }: { teams: any[]; current: string; onSave: (c: string) => void }) {
  const [code, setCode] = useState(current);
  const [saved, setSaved] = useState(false);
  useEffect(() => setCode(current), [current]);
  return (
    <div className="miniform" style={{ marginTop: 0 }}>
      <select value={code} onChange={(e) => setCode(e.target.value)} style={{ flex: 1, height: 36, borderRadius: 8, border: '1.5px solid var(--line)', padding: '0 8px', fontWeight: 600 }}>
        <option value="">— Sin definir —</option>
        {teams.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
      </select>
      <button onClick={() => { onSave(code); setSaved(true); setTimeout(() => setSaved(false), 1500); }}>{saved ? '✓' : 'Guardar'}</button>
    </div>
  );
}

function ResultRow({ m, onSave }: { m: any; onSave: (m: any, h: string, a: string, adv: string | null) => void }) {
  const [h, setH] = useState(String(m.homeScore ?? 0));
  const [a, setA] = useState(String(m.awayScore ?? 0));
  const [adv, setAdv] = useState<string>(m.advancingCode ?? '');
  const isKO = m.stage === 'KNOCKOUT';
  return (
    <div style={{ borderBottom: '1px solid var(--line)', padding: '8px 0' }}>
      <div className="miniform" style={{ marginTop: 0 }}>
        <img className="flag" src={flagUrl(m.home.flag)} alt={m.home.name} loading="lazy" />
        <input value={h} maxLength={2} onChange={(e) => setH(e.target.value.replace(/[^0-9]/g, ''))} />–
        <input value={a} maxLength={2} onChange={(e) => setA(e.target.value.replace(/[^0-9]/g, ''))} />
        <img className="flag" src={flagUrl(m.away.flag)} alt={m.away.name} loading="lazy" />
        <button onClick={() => onSave(m, h, a, isKO ? (adv || null) : null)}>Guardar</button>
      </div>
      {isKO && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 12 }}>
          <span style={{ color: 'var(--muted)' }}>Avanza:</span>
          <select value={adv} onChange={(e) => setAdv(e.target.value)} style={{ flex: 1, height: 32, borderRadius: 8, border: '1.5px solid var(--line)', padding: '0 8px', fontWeight: 600 }}>
            <option value="">— Definir —</option>
            <option value={m.homeCode}>{m.home.name}</option>
            <option value={m.awayCode}>{m.away.name}</option>
          </select>
        </div>
      )}
    </div>
  );
}

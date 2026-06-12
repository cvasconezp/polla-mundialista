'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Shell from '../components/Shell';
import { api, flagUrl } from '../lib-client';

const SHORT: Record<string, string> = { GROUP: 'Gru', R32: '16', R16: '8', QF: 'Cua', SF: 'Sem' };
const money = (n: number) => '$' + (Math.round(n * 100) / 100).toLocaleString('es-EC', { maximumFractionDigits: 2 });
const KIND_LABEL: Record<string, string> = { UNMARK_PAYMENT: 'Desmarcar pago', DELETE_USER: 'Eliminar usuario' };
const WA_GROUP = 'https://chat.whatsapp.com/FXmuSnDCRRWE8xrfknaOs6';
function waNumber(phone: string): string {
  let d = (phone || '').replace(/\D/g, '');
  if (d.startsWith('593')) return d;
  if (d.startsWith('0')) return '593' + d.slice(1);
  if (d.length === 9) return '593' + d;
  return d;
}
function waLink(u: any): string {
  const name = (u.name ?? '').split(' ')[0] || '';
  const msg = `¡Hola ${name}! 👋 Bienvenido/a a la Polla Mundialista 2026. ¡Mucha suerte con tus pronósticos! 🍀⚽\n\nÚnete al grupo de WhatsApp para los avisos y la coordinación: ${WA_GROUP}`;
  return `https://wa.me/${waNumber(u.phone)}?text=${encodeURIComponent(msg)}`;
}

export default function Admin() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<any>(null);

  useEffect(() => { if (status === 'authenticated' && !(session?.user as any)?.isAdmin) router.replace('/'); }, [status, session, router]);
  const load = useCallback(() => { api('/api/admin/data').then(setData).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  async function togglePay(userId: string, phase: string, paid: boolean) {
    try {
      const res = await api('/api/admin/phase-payment', { method: 'POST', body: JSON.stringify({ userId, phase, paid }) });
      if (res?.pending) alert('Solicitud enviada al super admin para confirmar el desmarcado del pago.');
    } catch (e: any) { alert(e.message); }
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
  async function deleteUser(u: any) {
    const sup = !!data?.me?.superAdmin;
    const msg = sup
      ? `¿Eliminar a ${u.name ?? u.email}? Se borran sus pronósticos y pagos. No se puede deshacer.`
      : `¿Solicitar la eliminación de ${u.name ?? u.email}? El super admin deberá confirmarla.`;
    if (!confirm(msg)) return;
    try {
      const res = await api('/api/admin/delete-user', { method: 'POST', body: JSON.stringify({ userId: u.id }) });
      if (res?.pending) alert('Solicitud enviada al super admin para confirmar la eliminación.');
    } catch (e: any) { alert(e.message); }
    load();
  }
  async function setRole(u: any, makeAdmin: boolean) {
    if (!confirm(makeAdmin ? `¿Hacer administrador a ${u.name ?? u.email}?` : `¿Quitar el rol de administrador a ${u.name ?? u.email}?`)) return;
    try { await api('/api/admin/role', { method: 'POST', body: JSON.stringify({ userId: u.id, makeAdmin }) }); }
    catch (e: any) { alert(e.message); }
    load();
  }
  async function resolveReq(id: number, action: 'approve' | 'reject') {
    try { await api('/api/admin/requests', { method: 'POST', body: JSON.stringify({ id, action }) }); }
    catch (e: any) { alert(e.message); }
    load();
  }

  if (!data) return <Shell><div className="spinner">Cargando…</div></Shell>;
  const phases = data.phases as { phase: string; label: string }[];
  const isSuper = !!data?.me?.superAdmin;
  const requests = (data.requests ?? []) as any[];

  return (
    <Shell head={{ pot: Math.round((data.money.totalCollected - data.money.adminTotal) * 100) / 100, currency: data.currency }}>
      <div className="sec-title">Panel de administrador {isSuper ? '· 👑 Super admin' : ''}</div>

      {isSuper && (
        <div className="panel">
          <h4>🔔 Solicitudes pendientes {requests.length > 0 && <span style={{ background: 'var(--red)', color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 11 }}>{requests.length}</span>}</h4>
          <div className="desc">Acciones que un administrador pidió y requieren tu confirmación.</div>
          {requests.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted)' }}>No hay solicitudes pendientes.</div>}
          {requests.map((r) => (
            <div key={r.id} style={{ borderBottom: '1px solid var(--line)', padding: '9px 0' }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {KIND_LABEL[r.kind] ?? r.kind}: {r.targetUserName ?? r.targetUserId}
                {r.kind === 'UNMARK_PAYMENT' && r.phase && <span style={{ color: 'var(--muted)', fontWeight: 500 }}> · fase {SHORT[r.phase] ?? r.phase}</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 8px' }}>Pedido por {r.requestedByName ?? '—'}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="pay-btn paid" onClick={() => resolveReq(r.id, 'approve')}>✓ Aprobar</button>
                <button className="pay-btn" onClick={() => resolveReq(r.id, 'reject')}>✕ Rechazar</button>
              </div>
            </div>
          ))}
        </div>
      )}

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
      </div>

      {isSuper && (
        <div className="panel">
          <h4>👑 Roles y administradores</h4>
          <div className="desc">Delega el rol de administrador a cualquier jugador. Un admin puede marcar pagos, corregir resultados y definir al campeón; desmarcar pagos y eliminar usuarios requieren tu confirmación.</div>
          {data.users.map((u: any) => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{u.name ?? u.email} {u.superAdmin && '👑'} {u.isAdmin && !u.superAdmin && <span style={{ fontSize: 10, color: 'var(--green-d)', background: 'var(--soft)', borderRadius: 20, padding: '1px 7px' }}>admin</span>}</span>
              {u.superAdmin
                ? <span style={{ fontSize: 11, color: 'var(--muted)' }}>tú</span>
                : <button className={`pay-btn ${u.isAdmin ? 'paid' : ''}`} onClick={() => setRole(u, !u.isAdmin)}>{u.isAdmin ? 'Quitar admin' : 'Hacer admin'}</button>}
            </div>
          ))}
        </div>
      )}

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
        <div className="desc">Marca quién pagó cada fase. Verde = pagó.{!isSuper && ' Para desmarcar un pago se enviará una solicitud al super admin.'}</div>
        <div className="pay-grid-head">
          <span>Jugador</span>
          {phases.map((p) => <span key={p.phase} className="pgh">{SHORT[p.phase]}</span>)}
        </div>
        {data.users.map((u: any) => (
          <div key={u.id} className="pay-grid-row">
            <span className="pgn">{u.name ?? u.email}{u.superAdmin && ' 👑'}</span>
            {phases.map((p) => {
              const paid = u.paidPhases.includes(p.phase);
              return <button key={p.phase} className={`pg-cell ${paid ? 'on' : ''}`} onClick={() => togglePay(u.id, p.phase, !paid)}>{paid ? '✓' : ''}</button>;
            })}
            {u.phone && <a className="pg-wa" title="Enviar bienvenida por WhatsApp" href={waLink(u)} target="_blank" rel="noopener noreferrer" style={{ width: 30, height: 30, border: '1.5px solid #bfe6c8', background: '#eafaf0', borderRadius: 8, display: 'grid', placeItems: 'center', textDecoration: 'none', fontSize: 14, flexShrink: 0 }}>💬</a>}
            {!u.isAdmin && <button className="pg-del" title={isSuper ? 'Eliminar usuario' : 'Solicitar eliminación'} onClick={() => deleteUser(u)}>🗑️</button>}
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

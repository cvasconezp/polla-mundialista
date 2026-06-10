'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Shell from '../components/Shell';
import { api, flagUrl } from '../lib-client';

export default function Admin() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (status === 'authenticated' && !(session?.user as any)?.isAdmin) router.replace('/');
  }, [status, session, router]);

  const load = useCallback(() => { api('/api/admin/data').then(setData).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  async function togglePay(u: any) {
    await api('/api/admin/payment', { method: 'POST', body: JSON.stringify({ userId: u.id, paid: !u.hasPaid }) });
    load();
  }
  async function saveResult(m: any, h: string, a: string) {
    await api('/api/admin/result', { method: 'POST', body: JSON.stringify({ matchId: m.id, homeScore: +h, awayScore: +a, markFinished: true }) });
    load();
  }

  if (!data) return <Shell><div className="spinner">Cargando…</div></Shell>;

  const autos = [
    ['Sincronizar resultados', 'cada 5 min vía football-data.org'],
    ['Recalcular puntos al final', 'automático tras el pitazo final'],
    ['Bloquear predicciones', 'al inicio de cada partido'],
  ];

  return (
    <Shell head={{ pot: data.pot, currency: data.currency }}>
      <div className="sec-title">Panel de administrador</div>

      {data.stats && (
        <div className="panel">
          <h4>📊 Estadísticas de uso</h4>
          <div className="stat-grid">
            <div className="sg"><b>{data.stats.players}</b><span>Jugadores</span></div>
            <div className="sg"><b>{data.stats.paid}</b><span>Pagaron</span></div>
            <div className="sg"><b>{data.stats.unpaid}</b><span>Pendientes</span></div>
            <div className="sg"><b>{data.stats.predictions}</b><span>Pronósticos</span></div>
            <div className="sg"><b>{data.stats.avgPredictions}</b><span>Prom./jugador</span></div>
            <div className="sg"><b>{data.stats.matchesFinished}/{data.stats.matchesTotal}</b><span>Partidos jugados</span></div>
          </div>
          {data.stats.champTop && <div className="note">⭐ Campeón más elegido: <b>{data.stats.champTop}</b> ({data.stats.champTopCount} {data.stats.champTopCount === 1 ? 'voto' : 'votos'})</div>}
        </div>
      )}

      <div className="panel">
        <h4>🤖 Automatización (activa)</h4>
        <div className="desc">Corre sola en el servidor. No necesitas estar disponible.</div>
        {autos.map(([t, s]) => (
          <div key={t} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
            <div><b>{t}</b><br /><small style={{ color: 'var(--muted)' }}>{s}</small></div>
            <span style={{ color: 'var(--green)', fontWeight: 800 }}>● ON</span>
          </div>
        ))}
      </div>

      <div className="panel">
        <h4>💵 Aportes y bote</h4>
        <div className="desc">Registro manual. Bote actual: <b>{data.currency === 'USD' ? '$' : ''}{data.pot}</b> ({data.users.filter((u: any) => u.hasPaid).length}/{data.users.length} pagaron).</div>
        {data.users.map((u: any) => (
          <div key={u.id} className="pay-row">
            <span className="nm">{u.name ?? u.email}</span>
            <button className={`pay-btn ${u.hasPaid ? 'paid' : ''}`} onClick={() => togglePay(u)}>{u.hasPaid ? '✓ Pagó' : 'Marcar pago'}</button>
          </div>
        ))}
      </div>

      <div className="panel">
        <h4>✏️ Corregir resultado (manual)</h4>
        <div className="desc">Solo si la API se equivoca o hay penales. Recalcula puntos al instante.</div>
        {data.matches.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Aún no hay partidos jugados.</div>}
        {data.matches.map((m: any) => <ResultRow key={m.id} m={m} onSave={saveResult} />)}
      </div>

      <div className="note">⚠️ Solo visible para administradores. Lo demás corre automático.</div>
    </Shell>
  );
}

function ResultRow({ m, onSave }: { m: any; onSave: (m: any, h: string, a: string) => void }) {
  const [h, setH] = useState(String(m.homeScore ?? 0));
  const [a, setA] = useState(String(m.awayScore ?? 0));
  return (
    <div className="miniform">
      <img className="flag" src={flagUrl(m.home.flag)} alt={m.home.name} loading="lazy" />
      <input value={h} maxLength={2} onChange={(e) => setH(e.target.value.replace(/[^0-9]/g, ''))} />–
      <input value={a} maxLength={2} onChange={(e) => setA(e.target.value.replace(/[^0-9]/g, ''))} />
      <img className="flag" src={flagUrl(m.away.flag)} alt={m.away.name} loading="lazy" />
      <button onClick={() => onSave(m, h, a)}>Guardar</button>
    </div>
  );
}

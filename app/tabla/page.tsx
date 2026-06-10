'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Shell from '../components/Shell';
import { api } from '../lib-client';

const money = (n: number) => '$' + (Math.round(n * 100) / 100).toLocaleString('es-EC', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export default function Tabla() {
  const { data: session } = useSession();
  const myId = (session?.user as any)?.id;
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState('GENERAL');

  useEffect(() => { api('/api/leaderboard').then(setData).catch(() => {}); }, []);

  if (!data) return <Shell><div className="spinner">Cargando…</div></Shell>;

  const tabs = [{ key: 'GENERAL', label: 'General' }, ...data.phases.map((p: any) => ({ key: p.phase, label: p.label.replace('Fase de ', '').replace(' de final', '') }))];
  const view = tab === 'GENERAL'
    ? { standings: data.general.standings, pool: data.general.pool, split: data.general.split, label: 'Tabla general (acumulada)' }
    : (() => { const p = data.phases.find((x: any) => x.phase === tab); return { standings: p.standings, pool: p.prizePool, split: p.split, label: p.label, paid: p.paid }; })();

  const myRow = view.standings.find((s: any) => s.userId === myId);
  const myRank = view.standings.findIndex((s: any) => s.userId === myId);
  const head = { pot: Math.round((data.money.totalCollected - data.money.adminTotal) * 100) / 100, currency: 'USD', myPts: myRow?.points ?? 0, myRank: myRank >= 0 ? '#' + (myRank + 1) : '—' };

  return (
    <Shell head={head}>
      <div className="sec-title">Tablas</div>
      <div className="ph-tabs">
        {tabs.map((t) => <button key={t.key} className={`ph-tab ${tab === t.key ? 'on' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>

      <div className="prize-card">
        <div className="pz-pool">{view.label}</div>
        <div className="pz-amt">Premio: <b>{money(view.pool)}</b></div>
        <div className="pz-split">🥇 {money(view.split[0])} · 🥈 {money(view.split[1])} · 🥉 {money(view.split[2])}</div>
      </div>

      {view.standings.length === 0 ? (
        <div className="note">Aún no hay jugadores con pagos/puntos en esta tabla.</div>
      ) : (
        <div className="lb">
          {view.standings.map((p: any, i: number) => (
            <div key={p.userId} className={`lb-row ${p.userId === myId ? 'me' : ''}`}>
              <div className={`rank ${i === 0 ? 'r1' : i === 1 ? 'r2' : i === 2 ? 'r3' : ''}`}>{i + 1}</div>
              <div className="lb-name">{p.name}<small>{p.exact} exacto(s){i < 3 ? ` · gana ${money(view.split[i])}` : ''}</small></div>
              <div className="lb-pts">{p.points}<small>pts</small></div>
            </div>
          ))}
        </div>
      )}
      <div className="note">Cada fase reparte su bote entre el top 3; la tabla general acumula el 40% de cada fase para su propio top 3.{tab === 'GENERAL' && ' Jugar las 5 fases te da más puntos y más opciones de ganar la general.'}</div>
    </Shell>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Shell from '../components/Shell';
import { api } from '../lib-client';

export default function Tabla() {
  const { data: session } = useSession();
  const myId = (session?.user as any)?.id;
  const [data, setData] = useState<any>(null);
  useEffect(() => { api('/api/leaderboard').then(setData).catch(() => {}); }, []);

  const myRow = data?.standings?.find((s: any) => s.userId === myId);
  const myRank = data ? '#' + (data.standings.findIndex((s: any) => s.userId === myId) + 1) : '—';
  const head = { pot: data?.pot, currency: data?.currency, myPts: myRow?.points ?? 0, myRank: myRow ? myRank : '—' };

  return (
    <Shell head={head}>
      <div className="sec-title">Tabla de posiciones <span style={{ fontWeight: 600, textTransform: 'none', color: 'var(--muted)' }}>{data?.standings?.length ?? 0} jugadores</span></div>
      {!data ? <div className="spinner">Cargando…</div> : (
        <div className="lb">
          {data.standings.map((p: any, i: number) => (
            <div key={p.userId} className={`lb-row ${p.userId === myId ? 'me' : ''}`}>
              <div className={`rank ${i === 0 ? 'r1' : i === 1 ? 'r2' : i === 2 ? 'r3' : ''}`}>{i + 1}</div>
              <div className="lb-name">{p.name}<small>{p.exactCount} marcador(es) exacto(s)</small></div>
              <div className={`paid-dot ${p.paid ? '' : 'no'}`} title={p.paid ? 'Pagó' : 'No ha pagado'} />
              <div className="lb-pts">{p.points}<small>puntos</small></div>
            </div>
          ))}
        </div>
      )}
      <div className="note">🟢 pagó · 🔴 pendiente. Desempate por <b>más marcadores exactos</b>.</div>
    </Shell>
  );
}

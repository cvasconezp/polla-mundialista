'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Shell from '../components/Shell';
import { api, flagUrl } from '../lib-client';

export default function Campeon() {
  const { data: session, update } = useSession();
  const [teams, setTeams] = useState<any[]>([]);
  const [pick, setPick] = useState<string | null>((session?.user as any)?.championPick ?? null);
  const [locked, setLocked] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api('/api/teams').then((d) => { setTeams(d.teams); setLocked(d.championLocked); }).catch(() => {});
  }, []);

  const paid = (session?.user as any)?.hasPaid;
  async function choose(code: string) {
    if (locked || !paid) return;
    try {
      await api('/api/champion', { method: 'POST', body: JSON.stringify({ teamCode: code }) });
      setPick(code); setMsg('✓ Guardado'); setTimeout(() => setMsg(''), 1500);
    } catch (e: any) { setMsg(e.message); }
  }

  return (
    <Shell>
      <div className="sec-title">Predicción de campeón</div>
      {!paid && <div className="pay-banner">🔒 <b>Tu aporte está pendiente.</b> Podrás elegir campeón cuando el organizador confirme tu pago.</div>}
      <div className="champ-card">
        <div className="trophy">🏆</div>
        <h3>¿Quién levanta la copa?</h3>
        <p>Acertar el campeón vale <b>10 puntos</b>. {locked ? 'El pick ya está cerrado.' : 'Se cierra cuando todos los equipos hayan debutado (1ª jornada).'}</p>
        <div className="champ-grid">
          {teams.map((t) => (
            <button key={t.code} className={`ch ${pick === t.code ? 'sel' : ''}`} disabled={locked || !paid} onClick={() => choose(t.code)}>
              <img className="flag" src={flagUrl(t.flag)} alt={t.name} loading="lazy" />{t.name}
            </button>
          ))}
        </div>
        {msg && <p style={{ marginTop: 12, color: 'var(--green)', fontWeight: 700 }}>{msg}</p>}
      </div>
      <div className="note">Solo se puede elegir un campeón. Tienes hasta que todos los equipos jueguen su primer partido.</div>
    </Shell>
  );
}

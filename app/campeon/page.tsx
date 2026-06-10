'use client';
import { useEffect, useState } from 'react';
import Shell from '../components/Shell';
import { api, flagUrl } from '../lib-client';

export default function Campeon() {
  const [teams, setTeams] = useState<any[]>([]);
  const [info, setInfo] = useState<any>(null);
  const [msg, setMsg] = useState('');

  async function load() {
    const [t, c] = await Promise.all([api('/api/teams'), api('/api/champion')]);
    setTeams(t.teams); setInfo(c);
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function choose(code: string) {
    if (!info || info.locked || !info.paid) return;
    try { await api('/api/champion', { method: 'POST', body: JSON.stringify({ teamCode: code }) }); setMsg('✓ Guardado'); setTimeout(() => setMsg(''), 1500); load(); }
    catch (e: any) { setMsg(e.message); }
  }

  if (!info) return <Shell><div className="spinner">Cargando…</div></Shell>;

  return (
    <Shell>
      <div className="sec-title">Campeón del Mundial</div>

      <div className="champ-card">
        <div className="trophy">🏆</div>
        <h3>¿Quién levanta la copa?</h3>
        {info.locked ? (
          <p>La elección de campeón ya está cerrada.</p>
        ) : (
          <p>Estás en <b>{info.phaseLabel}</b>. Elegir o cambiar ahora vale <b>{info.currentPhaseTier} pts</b> si tu campeón gana. Si cambias de equipo, el bono se recalcula desde esta fase (solo cuenta tu elección actual).</p>
        )}
      </div>

      {info.currentPick && (() => { const t = teams.find((x) => x.code === info.currentPick); return (
        <div className="note" style={{ textAlign: 'center' }}>⭐ Tu campeón actual: <b>{t?.name ?? info.currentPick}</b> · elegido en <b>{info.pickPhase}</b> · vale <b>{info.pickTier} pts</b> si gana.</div>
      ); })()}

      {!info.locked && !info.paid && (
        <div className="pay-banner">🔒 Paga la fase actual ({info.phaseLabel}) para poder elegir campeón.</div>
      )}

      {!info.locked && info.paid && (
        <div className="champ-grid" style={{ marginTop: 14 }}>
          {teams.map((t) => (
            <button key={t.code} className={`ch ${info.currentPick === t.code ? 'sel' : ''}`} onClick={() => choose(t.code)}>
              <img className="flag" src={flagUrl(t.flag)} alt={t.name} loading="lazy" />{t.name}
            </button>
          ))}
        </div>
      )}
      {msg && <p style={{ textAlign: 'center', color: 'var(--green)', fontWeight: 700, marginTop: 10 }}>{msg}</p>}

      {info.picksByPhase && Object.keys(info.picksByPhase).length > 0 && (
        <div className="panel" style={{ marginTop: 14 }}>
          <h4>Tus elecciones por fase</h4>
          {Object.entries(info.picksByPhase).map(([ph, code]: any) => {
            const t = teams.find((x) => x.code === code);
            return <div key={ph} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, borderBottom: '1px solid var(--line)' }}><span style={{ color: 'var(--muted)' }}>{ph}</span><b>{t?.name ?? code}</b></div>;
          })}
        </div>
      )}

      <div className="note">Tiers: Grupos 50 · 16avos 25 · 8vos 10 · Cuartos 5 · Semis 0. Se resuelve con el campeón real (tras la final).</div>
    </Shell>
  );
}

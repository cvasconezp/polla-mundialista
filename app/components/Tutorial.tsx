'use client';
import { useEffect, useState } from 'react';

const CARDS = [
  { icon: '⚽', title: '¡Bienvenido a la Polla Mundialista!', body: 'Predice los partidos del Mundial 2026 por fases y compite por el bote con todos.' },
  { icon: '🗂️', title: 'El torneo va por 5 fases', body: 'Grupos · Dieciseisavos · Octavos · Cuartos · Semifinales. Cada fase es su propia competencia con su propio bote.' },
  { icon: '💵', title: 'Pago por fase', body: 'Cada fase cuesta $5: $4 van al bote y $1 cubre los costos de la app. Pagas solo las fases que juegas y puedes unirte en cualquier fase.' },
  { icon: '📝', title: 'Predice y gana puntos', body: 'Marcador exacto: 5 · Ganador y diferencia: 3 · Solo ganador: 1 · En eliminatorias, +2 por acertar quién avanza. Se bloquea al pitazo inicial.' },
  { icon: '🏆', title: 'Elige al campeón', body: 'Vale más mientras antes lo aciertes: Grupos 50 · 16avos 25 · 8vos 10 · Cuartos 5 (en Semis ya no suma). Puedes cambiar de equipo, pero el bono cuenta desde la fase en que elegiste al campeón real: cambiarlo cada fase no te da el puntaje alto.' },
  { icon: '💰', title: 'Premios', body: 'De cada fase, el 60% de su bote premia al top 3 de esa fase (60/30/10%) y el 40% se acumula a la tabla general, que al cierre premia a su propio top 3. El bono del campeón se confirma con la final real.' },
  { icon: '📱', title: 'Tu WhatsApp', body: 'Te pedimos tu número para sumarte al grupo/canal de la polla y avisarte de los partidos.' },
];

export default function Tutorial() {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    try { if (!sessionStorage.getItem('pollaTutorialSeen')) setOpen(true); } catch {}
    const handler = () => { setI(0); setOpen(true); };
    window.addEventListener('open-tutorial', handler);
    return () => window.removeEventListener('open-tutorial', handler);
  }, []);

  function close() {
    try { sessionStorage.setItem('pollaTutorialSeen', '1'); } catch {}
    setOpen(false);
  }
  if (!open) return null;
  const last = i === CARDS.length - 1;
  const c = CARDS[i];

  return (
    <div className="tut-overlay" onClick={close}>
      <div className="tut-card" onClick={(e) => e.stopPropagation()}>
        <button className="tut-skip" onClick={close}>Saltar</button>
        <div className="tut-icon">{c.icon}</div>
        <h3 className="tut-title">{c.title}</h3>
        <p className="tut-body">{c.body}</p>
        <div className="tut-dots">
          {CARDS.map((_, k) => <span key={k} className={`tut-dot ${k === i ? 'on' : ''}`} />)}
        </div>
        <div className="tut-nav">
          {i > 0 ? <button className="tut-back" onClick={() => setI(i - 1)}>Atrás</button> : <span />}
          {last
            ? <button className="tut-next" onClick={close}>¡Empezar!</button>
            : <button className="tut-next" onClick={() => setI(i + 1)}>Siguiente</button>}
        </div>
      </div>
    </div>
  );
}

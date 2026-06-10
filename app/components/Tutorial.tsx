'use client';
import { useEffect, useState } from 'react';

const CARDS = [
  { icon: '⚽', title: '¡Bienvenido a la Polla Mundialista!', body: 'Predice los marcadores de los partidos del Mundial 2026 y compite con todos por el bote.' },
  { icon: '📝', title: 'Cómo predecir', body: 'Escribe el marcador que crees para cada partido. Puedes editarlo hasta el pitazo inicial — al empezar el partido, se bloquea automáticamente.' },
  { icon: '🎯', title: 'Cómo se ganan puntos', body: 'Marcador exacto: 5 pts · Acertar ganador y diferencia: 3 pts · Solo el ganador: 1 pt · En eliminatorias, +2 por acertar quién avanza.' },
  { icon: '🏆', title: 'Campeón y bote', body: 'Elige al campeón del torneo (vale 10 pts). El pick se cierra cuando todos los equipos hayan debutado. Gana quien más puntos sume; el desempate es por más marcadores exactos.' },
  { icon: '💵', title: 'Tu aporte', body: 'Para jugar por el bote, paga tu aporte al organizador. Podrás cargar tus pronósticos cuando confirme tu pago.' },
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

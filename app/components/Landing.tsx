'use client';
import { signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';

function useCountdown(target: number | null) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now === null || target === null) return null;
  const diff = target - now;
  if (diff <= 0) return 'live';
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
}

export default function Landing() {
  const [target, setTarget] = useState<number | null>(null);
  useEffect(() => {
    fetch('/api/first-match').then((r) => r.json()).then((d) => { if (d.kickoff) setTarget(new Date(d.kickoff).getTime()); }).catch(() => {});
  }, []);
  const cd = useCountdown(target);

  const ecText = target
    ? new Date(target).toLocaleString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'America/Guayaquil' })
    : null;

  return (
    <div className="landing">
      <div className="land-bg" aria-hidden="true">
        <span className="fl" style={{ left: '8%', animationDelay: '0s' }}>🇦🇷</span>
        <span className="fl" style={{ left: '22%', animationDelay: '3s' }}>🇧🇷</span>
        <span className="fl" style={{ left: '40%', animationDelay: '6s' }}>🇪🇨</span>
        <span className="fl" style={{ left: '58%', animationDelay: '1.5s' }}>🇲🇽</span>
        <span className="fl" style={{ left: '72%', animationDelay: '4.5s' }}>🇪🇸</span>
        <span className="fl" style={{ left: '88%', animationDelay: '7.5s' }}>🇫🇷</span>
      </div>

      <div className="land-hero">
        <div className="land-ball">⚽</div>
        <div className="land-ball-shadow" aria-hidden="true" />
        <h1 className="anim" style={{ animationDelay: '.05s' }}>Polla Mundialista 2026</h1>
        <p className="land-sub anim" style={{ animationDelay: '.15s' }}>
          Predice los partidos del Mundial, gana puntos y compite por el bote con tus amigos.
        </p>

        <div className="land-count anim" style={{ animationDelay: '.25s' }}>
          {cd === null ? (
            <span className="lc-label">Cargando…</span>
          ) : cd === 'live' ? (
            <span className="lc-live">🔴 ¡El Mundial está en juego!</span>
          ) : (
            <>
              <span className="lc-label">Faltan para el primer partido</span>
              <div className="lc-row">
                <div className="lc-box"><b>{cd.d}</b><span>días</span></div>
                <div className="lc-box"><b>{String(cd.h).padStart(2, '0')}</b><span>hrs</span></div>
                <div className="lc-box"><b>{String(cd.m).padStart(2, '0')}</b><span>min</span></div>
                <div className="lc-box"><b>{String(cd.s).padStart(2, '0')}</b><span>seg</span></div>
              </div>
              {ecText && <span className="lc-when">{ecText} · hora de Ecuador</span>}
            </>
          )}
        </div>

        <button className="land-cta anim" style={{ animationDelay: '.35s' }} onClick={() => signIn('google', { callbackUrl: '/' })}>
          <span>🔵</span> Entrar con Google
        </button>
        <p className="land-note anim" style={{ animationDelay: '.45s' }}>Entras con tu cuenta de Google · para jugar por el bote coordina tu aporte con el organizador</p>
      </div>

      <div className="land-features">
        <div className="land-feat anim" style={{ animationDelay: '.5s' }}><div className="lf-ic">📝</div><b>Predice</b><span>Pon tu marcador antes del pitazo inicial.</span></div>
        <div className="land-feat anim" style={{ animationDelay: '.6s' }}><div className="lf-ic">🎯</div><b>Gana puntos</b><span>Acierta el marcador, el ganador o quién avanza.</span></div>
        <div className="land-feat anim" style={{ animationDelay: '.7s' }}><div className="lf-ic">🏆</div><b>Gana el bote</b><span>Quien más sume al final se lo lleva.</span></div>
      </div>

      <footer className="land-foot">
        Desarrollado por <a href="https://www.yachaydeep.com/labs" target="_blank" rel="noopener noreferrer">YachayDeep</a>
      </footer>
    </div>
  );
}

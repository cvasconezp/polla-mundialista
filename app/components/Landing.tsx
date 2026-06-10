'use client';
import { signIn } from 'next-auth/react';

export default function Landing() {
  return (
    <div className="landing">
      <div className="land-hero">
        <div className="land-ball">⚽</div>
        <h1>Polla Mundialista 2026</h1>
        <p className="land-sub">Predice los partidos del Mundial 🇨🇦🇺🇸🇲🇽, gana puntos y compite por el bote con tus amigos.</p>
        <button className="land-cta" onClick={() => signIn('google', { callbackUrl: '/' })}>
          <span>🔵</span> Entrar con Google
        </button>
        <p className="land-note">Gratis · entras con tu cuenta de Google</p>
      </div>

      <div className="land-features">
        <div className="land-feat"><div className="lf-ic">📝</div><b>Predice</b><span>Pon tu marcador de cada partido antes del pitazo inicial.</span></div>
        <div className="land-feat"><div className="lf-ic">🎯</div><b>Gana puntos</b><span>Acierta el marcador, el ganador o quién avanza.</span></div>
        <div className="land-feat"><div className="lf-ic">🏆</div><b>Gana el bote</b><span>Quien sume más puntos al final del torneo se lo lleva.</span></div>
      </div>

      <footer className="land-foot">
        Desarrollado por <a href="https://www.yachaydeep.com/" target="_blank" rel="noopener noreferrer">YachayDeep</a>
      </footer>
    </div>
  );
}

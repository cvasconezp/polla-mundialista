'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '../lib-client';

export default function PhoneGate() {
  const { data: session, status, update } = useSession();
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  if (status !== 'authenticated') return null;
  if ((session?.user as any)?.phone) return null;

  async function save() {
    setErr(''); setSaving(true);
    try {
      await api('/api/profile', { method: 'POST', body: JSON.stringify({ phone }) });
      await update();
      window.location.reload();
    } catch (e: any) { setErr(e.message); setSaving(false); }
  }

  return (
    <div className="tut-overlay">
      <div className="tut-card">
        <div className="tut-icon">📱</div>
        <h3 className="tut-title">Tu número de WhatsApp</h3>
        <p className="tut-body">Lo usamos para sumarte al grupo/canal de la polla y avisarte de los partidos. Es obligatorio para jugar.</p>
        <input
          inputMode="tel" placeholder="+593 99 123 4567" value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ width: '100%', height: 44, border: '2px solid var(--line)', borderRadius: 12, padding: '0 12px', fontSize: 15, fontWeight: 600, textAlign: 'center', marginBottom: 10 }} />
        {err && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{err}</p>}
        <button className="tut-next" style={{ width: '100%', marginLeft: 0 }} disabled={saving} onClick={save}>
          {saving ? 'Guardando…' : 'Guardar y continuar'}
        </button>
      </div>
    </div>
  );
}

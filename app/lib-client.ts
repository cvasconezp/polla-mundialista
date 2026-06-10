'use client';
export async function api(path: string, opts?: RequestInit) {
  const res = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) } });
  if (res.status === 401) { window.location.href = '/login'; throw new Error('401'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Error');
  return data;
}

// Bandera como imagen real (flagcdn) a partir del código ISO-3166 alpha-2 guardado en team.flag.
// Soporta home nations: gb-eng, gb-sct, gb-wls.
export function flagUrl(iso?: string | null) {
  const code = (iso || 'xx').toLowerCase();
  return `https://flagcdn.com/h40/${code}.png`;
}

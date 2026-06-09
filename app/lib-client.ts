'use client';
export async function api(path: string, opts?: RequestInit) {
  const res = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) } });
  if (res.status === 401) { window.location.href = '/login'; throw new Error('401'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Error');
  return data;
}

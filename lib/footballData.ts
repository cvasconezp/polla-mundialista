// Cliente de football-data.org para el Mundial 2026 (competición WC).
// Doc: https://www.football-data.org/documentation/quickstart
// Plan gratuito: incluye la FIFA World Cup. Header: X-Auth-Token.

const BASE = 'https://api.football-data.org/v4';
const WORLD_CUP_CODE = 'WC';

export type FDMatch = {
  id: number;
  utcDate: string;
  status: 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'SUSPENDED' | 'POSTPONED' | 'CANCELLED';
  stage: string; // GROUP_STAGE, LAST_16, QUARTER_FINALS, ...
  group: string | null;
  homeTeam: { id: number; name: string; tla: string | null };
  awayTeam: { id: number; name: string; tla: string | null };
  score: {
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
    fullTime: { home: number | null; away: number | null };
  };
};

async function fdFetch(path: string): Promise<any> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error('Falta FOOTBALL_DATA_TOKEN en variables de entorno');
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-Auth-Token': token },
    // Evita cache de Next en server: queremos datos frescos en el cron
    cache: 'no-store',
  });
  if (res.status === 429) throw new Error('Rate limit de football-data.org (espera un minuto)');
  if (!res.ok) throw new Error(`football-data.org ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Trae todos los partidos del Mundial. */
export async function fetchWorldCupMatches(): Promise<FDMatch[]> {
  const data = await fdFetch(`/competitions/${WORLD_CUP_CODE}/matches`);
  return data.matches ?? [];
}

/** Mapea estados de la API a nuestros estados internos. */
export function mapStatus(s: FDMatch['status']): 'SCHEDULED' | 'LIVE' | 'FINISHED' {
  if (s === 'FINISHED') return 'FINISHED';
  if (s === 'IN_PLAY' || s === 'PAUSED') return 'LIVE';
  return 'SCHEDULED'; // TIMED, SCHEDULED, POSTPONED, etc.
}

export function isKnockout(stage: string): boolean {
  return stage !== 'GROUP_STAGE';
}

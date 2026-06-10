// Configuración del torneo por fases (v2).

export type Phase = 'GROUP' | 'R32' | 'R16' | 'QF' | 'SF' | 'THIRD' | 'FINAL';

// Las 5 fases jugables de la polla (en orden)
export const ACTIVE_PHASES: Phase[] = ['GROUP', 'R32', 'R16', 'QF', 'SF'];

export const PHASE_LABEL: Record<Phase, string> = {
  GROUP: 'Fase de grupos',
  R32: 'Dieciseisavos',
  R16: 'Octavos',
  QF: 'Cuartos de final',
  SF: 'Semifinales',
  THIRD: 'Tercer puesto',
  FINAL: 'Final',
};

export const PHASE_SHORT: Record<Phase, string> = {
  GROUP: 'Grupos', R32: '16avos', R16: '8vos', QF: 'Cuartos', SF: 'Semis', THIRD: '3er', FINAL: 'Final',
};

// Bono de campeón según la fase más temprana en que se eligió al campeón real.
export const CHAMPION_TIER: Record<Phase, number> = {
  GROUP: 50, R32: 25, R16: 10, QF: 5, SF: 0, THIRD: 0, FINAL: 0,
};

// Dinero
export const ENTRY_FEE = 5;        // por fase
export const ADMIN_FEE = 1;        // por jugador por fase (administración/costos)
export const PHASE_POT = ENTRY_FEE - ADMIN_FEE; // 4 al bote
export const PHASE_SHARE = 0.6;    // 60% del bote de fase a los ganadores de la fase
export const GENERAL_SHARE = 0.4;  // 40% se acumula al bote general
export const TOP3_SPLIT = [0.6, 0.3, 0.1]; // 1°/2°/3°

// football-data.org stage -> nuestra fase
export function fdStageToPhase(stage: string): Phase | null {
  const s = (stage || '').toUpperCase();
  if (s === 'GROUP_STAGE' || s === 'GROUP') return 'GROUP';
  if (s === 'LAST_32' || s === 'ROUND_OF_32') return 'R32';
  if (s === 'LAST_16' || s === 'ROUND_OF_16') return 'R16';
  if (s === 'QUARTER_FINALS' || s === 'QUARTER_FINAL') return 'QF';
  if (s === 'SEMI_FINALS' || s === 'SEMI_FINAL') return 'SF';
  if (s === 'THIRD_PLACE' || s === '3RD_PLACE') return 'THIRD';
  if (s === 'FINAL') return 'FINAL';
  return null;
}

export function isActivePhase(phase: Phase | null | undefined): boolean {
  return !!phase && (ACTIVE_PHASES as string[]).includes(phase);
}

export function phaseIndex(phase: Phase): number {
  return ACTIVE_PHASES.indexOf(phase);
}

// ===== Tablas, bono de campeón y reparto (v2) =====

export type MatchPoint = { phase: Phase | null; points: number; exact: boolean };

export type PlayerV2 = {
  userId: string;
  name: string;
  paidPhases: Phase[];                       // fases que pagó
  championPicks: Partial<Record<Phase, string>>; // pick de campeón por fase
  matchPoints: MatchPoint[];                 // puntos de partidos FINALIZADOS
};

export type Row = { userId: string; name: string; points: number; exact: number };

/** Bono de campeón: fase MÁS TEMPRANA en que el pick coincide con el campeón real. */
export function championBonus(picks: Partial<Record<Phase, string>>, realChampion: string | null): number {
  if (!realChampion) return 0;
  for (const ph of ACTIVE_PHASES) {
    if (picks[ph] && picks[ph] === realChampion) return CHAMPION_TIER[ph];
  }
  return 0;
}

function pointsInPhase(mp: MatchPoint[], phase: Phase): { points: number; exact: number } {
  let points = 0, exact = 0;
  for (const m of mp) if (m.phase === phase) { points += m.points; if (m.exact) exact++; }
  return { points, exact };
}

function totalPoints(mp: MatchPoint[]): { points: number; exact: number } {
  let points = 0, exact = 0;
  for (const m of mp) { points += m.points; if (m.exact) exact++; }
  return { points, exact };
}

function sortRows(rows: Row[]): Row[] {
  return rows.sort((a, b) => b.points - a.points || b.exact - a.exact || a.name.localeCompare(b.name));
}

/** Tabla de una fase: solo jugadores que pagaron esa fase, por puntos de los partidos de esa fase. */
export function phaseStandings(players: PlayerV2[], phase: Phase): Row[] {
  const rows = players
    .filter((p) => p.paidPhases.includes(phase))
    .map((p) => { const { points, exact } = pointsInPhase(p.matchPoints, phase); return { userId: p.userId, name: p.name, points, exact }; });
  return sortRows(rows);
}

/** Tabla general: todos, por puntos totales + bono de campeón. */
export function generalStandings(players: PlayerV2[], realChampion: string | null): Row[] {
  const rows = players.map((p) => {
    const { points, exact } = totalPoints(p.matchPoints);
    return { userId: p.userId, name: p.name, points: points + championBonus(p.championPicks, realChampion), exact };
  });
  return sortRows(rows);
}

export type Money = {
  totalCollected: number;
  adminTotal: number;
  phases: Record<string, { paid: number; pot: number; prizePool: number; split: number[] }>;
  generalPool: number;
  generalSplit: number[];
};

/** Reparto de dinero a partir de cuántos pagaron cada fase. */
export function prizeDistribution(paidByPhase: Partial<Record<Phase, number>>): Money {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const phases: Money['phases'] = {};
  let generalPool = 0, totalCollected = 0, totalPaid = 0;

  for (const ph of ACTIVE_PHASES) {
    const paid = paidByPhase[ph] ?? 0;
    totalPaid += paid;
    totalCollected += paid * ENTRY_FEE;
    const pot = paid * PHASE_POT;
    const prizePool = pot * PHASE_SHARE;
    generalPool += pot * GENERAL_SHARE;
    phases[ph] = { paid, pot: round2(pot), prizePool: round2(prizePool), split: TOP3_SPLIT.map((s) => round2(prizePool * s)) };
  }

  return {
    totalCollected: round2(totalCollected),
    adminTotal: round2(totalPaid * ADMIN_FEE),
    phases,
    generalPool: round2(generalPool),
    generalSplit: TOP3_SPLIT.map((s) => round2(generalPool * s)),
  };
}

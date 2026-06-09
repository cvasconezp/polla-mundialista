// Lógica de puntuación de la polla — función PURA y sin dependencias.
// Se mantiene aislada para poder testearla fácilmente y reusarla en el cron.

export type Rules = {
  exact: number;    // marcador exacto
  diff: number;     // mismo ganador + misma diferencia de goles
  winner: number;   // solo mismo ganador (o empate acertado)
  advance: number;  // bonus por acertar equipo que avanza (eliminatorias)
  champion: number; // acertar al campeón del torneo
};

export const DEFAULT_RULES: Rules = {
  exact: 5,
  diff: 3,
  winner: 1,
  advance: 2,
  champion: 10,
};

export type MatchResult = {
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED';
  homeScore: number | null;
  awayScore: number | null;
  stage: 'GROUP' | 'KNOCKOUT';
  advancingTeam?: string | null; // código del equipo que avanzó (solo KNOCKOUT)
};

export type Prediction = {
  homeScore: number | null;
  awayScore: number | null;
  advancingTeam?: string | null;
};

/**
 * Puntos del marcador para un partido FINALIZADO.
 * Devuelve null si el partido aún no terminó o faltan datos.
 */
export function scoreMatch(pred: Prediction | null | undefined, match: MatchResult, rules: Rules = DEFAULT_RULES): number | null {
  if (!pred) return null;
  if (match.status !== 'FINISHED') return null;
  if (match.homeScore == null || match.awayScore == null) return null;
  if (pred.homeScore == null || pred.awayScore == null) return 0; // no predijo marcador -> 0

  const ph = pred.homeScore, pa = pred.awayScore;
  const rh = match.homeScore, ra = match.awayScore;

  let pts = 0;
  if (ph === rh && pa === ra) {
    pts = rules.exact;
  } else {
    const pw = Math.sign(ph - pa);
    const rw = Math.sign(rh - ra);
    if (pw === rw) {
      pts = (ph - pa) === (rh - ra) ? rules.diff : rules.winner;
    } else {
      pts = 0;
    }
  }

  // Bonus por acertar quién avanza en fase eliminatoria
  if (match.stage === 'KNOCKOUT' && match.advancingTeam && pred.advancingTeam) {
    if (pred.advancingTeam === match.advancingTeam) pts += rules.advance;
  }

  return pts;
}

/** ¿Está abierta la predicción? Se bloquea al pitazo inicial. */
export function isPredictionOpen(match: { status: string; kickoff: Date | string }, now: Date = new Date()): boolean {
  if (match.status !== 'SCHEDULED') return false;
  const k = typeof match.kickoff === 'string' ? new Date(match.kickoff) : match.kickoff;
  return now.getTime() < k.getTime();
}

/** Marca si una predicción de marcador fue exacta (para desempates). */
export function isExact(pred: Prediction | null | undefined, match: MatchResult): boolean {
  return scoreMatch(pred, match) === DEFAULT_RULES.exact &&
    pred?.homeScore === match.homeScore && pred?.awayScore === match.awayScore;
}

export type StandingInput = {
  userId: string;
  name: string;
  paid: boolean;
  championPick?: string | null;
  predictions: Array<{ match: MatchResult & { kickoff?: Date | string }; pred: Prediction }>;
};

export type StandingRow = {
  userId: string;
  name: string;
  paid: boolean;
  points: number;
  exactCount: number;
};

/**
 * Calcula la tabla de posiciones. Desempate: más marcadores exactos, luego nombre.
 * championWinner = código del campeón real (o null si el torneo no terminó).
 */
export function computeStandings(players: StandingInput[], championWinner: string | null = null, rules: Rules = DEFAULT_RULES): StandingRow[] {
  const rows = players.map((p) => {
    let points = 0;
    let exactCount = 0;
    for (const { match, pred } of p.predictions) {
      const s = scoreMatch(pred, match, rules);
      if (s != null) {
        points += s;
        if (s >= rules.exact && pred.homeScore === match.homeScore && pred.awayScore === match.awayScore) {
          exactCount += 1;
        }
      }
    }
    if (championWinner && p.championPick && p.championPick === championWinner) {
      points += rules.champion;
    }
    return { userId: p.userId, name: p.name, paid: p.paid, points, exactCount };
  });

  rows.sort((a, b) => b.points - a.points || b.exactCount - a.exactCount || a.name.localeCompare(b.name));
  return rows;
}

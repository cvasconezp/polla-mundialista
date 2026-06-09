// Sincroniza resultados desde football-data.org y recalcula puntos.
// Se ejecuta desde el cron (Vercel Cron o Railway cron) cada pocos minutos.

import { prisma } from './prisma';
import { fetchWorldCupMatches, mapStatus, isKnockout } from './footballData';
import { scoreMatch, type MatchResult } from './scoring';
import { getSettings, rulesFromSettings } from './settings';

export type SyncReport = {
  matchesSeen: number;
  matchesUpdated: number;
  newlyFinished: number;
  pointsRecomputed: number;
  startedAt: string;
  finishedAt: string;
};

export async function runSync(): Promise<SyncReport> {
  const startedAt = new Date().toISOString();
  const settings = await getSettings();
  const rules = rulesFromSettings(settings);

  const fdMatches = await fetchWorldCupMatches();
  let matchesUpdated = 0;
  let newlyFinished = 0;
  let pointsRecomputed = 0;

  for (const fd of fdMatches) {
    const existing = await prisma.match.findUnique({ where: { externalId: fd.id } });
    if (!existing) continue; // solo actualizamos partidos ya sembrados en la BD

    const newStatus = mapStatus(fd.status);
    const homeScore = fd.score.fullTime.home;
    const awayScore = fd.score.fullTime.away;

    const wasFinished = existing.status === 'FINISHED';

    // ¿cambió algo relevante?
    const changed =
      existing.status !== newStatus ||
      existing.homeScore !== homeScore ||
      existing.awayScore !== awayScore;

    if (!changed) continue;

    // advancingCode en eliminatorias: ganador del partido
    let advancingCode = existing.advancingCode;
    if (isKnockout(fd.stage) && newStatus === 'FINISHED' && fd.score.winner) {
      advancingCode = fd.score.winner === 'HOME_TEAM' ? existing.homeCode
        : fd.score.winner === 'AWAY_TEAM' ? existing.awayCode
        : existing.advancingCode; // empate -> definir por admin (penales)
    }

    await prisma.match.update({
      where: { id: existing.id },
      data: { status: newStatus, homeScore, awayScore, advancingCode },
    });
    matchesUpdated++;

    // Si acaba de finalizar (o cambió un resultado finalizado), recalcular puntos
    if (newStatus === 'FINISHED') {
      if (!wasFinished) newlyFinished++;
      pointsRecomputed += await recomputeMatchPoints(existing.id, rules);
    }
  }

  return {
    matchesSeen: fdMatches.length,
    matchesUpdated,
    newlyFinished,
    pointsRecomputed,
    startedAt,
    finishedAt: new Date().toISOString(),
  };
}

/** Recalcula y cachea los puntos de todas las predicciones de un partido. */
export async function recomputeMatchPoints(matchId: number, rules: ReturnType<typeof rulesFromSettings>): Promise<number> {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return 0;
  const mr: MatchResult = {
    status: match.status as MatchResult['status'],
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    stage: match.stage as MatchResult['stage'],
    advancingTeam: match.advancingCode,
  };
  const preds = await prisma.prediction.findMany({ where: { matchId } });
  let n = 0;
  for (const p of preds) {
    const pts = scoreMatch(
      { homeScore: p.homeScore, awayScore: p.awayScore, advancingTeam: p.advancingCode },
      mr, rules,
    );
    await prisma.prediction.update({ where: { id: p.id }, data: { points: pts } });
    n++;
  }
  return n;
}

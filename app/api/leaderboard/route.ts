import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { scoreMatch, type MatchResult } from '@/lib/scoring';
import { getSettings, rulesFromSettings } from '@/lib/settings';
import {
  ACTIVE_PHASES, PHASE_LABEL, phaseStandings, generalStandings, prizeDistribution,
  type PlayerV2, type Phase,
} from '@/lib/phases';

export const dynamic = 'force-dynamic';

// Caché en memoria (1 réplica): la tabla no cambia segundo a segundo.
let cache: { at: number; data: any } | null = null;
const TTL = 30_000;

export async function GET() {
  if (cache && Date.now() - cache.at < TTL) return NextResponse.json(cache.data);

  const settings = await getSettings();
  const rules = rulesFromSettings(settings);

  // Consultas planas y mínimas (sin joins anidados pesados).
  const finished = await prisma.match.findMany({
    where: { status: 'FINISHED' },
    select: { id: true, phase: true, homeScore: true, awayScore: true, stage: true, advancingCode: true },
  });
  const matchMap = new Map(finished.map((m) => [m.id, m]));
  const finishedIds = finished.map((m) => m.id);

  const [users, predictions] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true, name: true, email: true, championPick: true, championPickPhase: true,
        phasePayments: { where: { paid: true }, select: { phase: true } },
      },
    }),
    finishedIds.length
      ? prisma.prediction.findMany({
          where: { matchId: { in: finishedIds } },
          select: { userId: true, matchId: true, homeScore: true, awayScore: true, advancingCode: true },
        })
      : Promise.resolve([] as any[]),
  ]);

  const predsByUser = new Map<string, typeof predictions>();
  for (const p of predictions) {
    const arr = predsByUser.get(p.userId) ?? [];
    arr.push(p); predsByUser.set(p.userId, arr);
  }

  const players: PlayerV2[] = users.map((u) => {
    const mine = predsByUser.get(u.id) ?? [];
    const matchPoints = mine.map((p) => {
      const m = matchMap.get(p.matchId)!;
      const mr: MatchResult = { status: 'FINISHED', homeScore: m.homeScore, awayScore: m.awayScore, stage: m.stage as MatchResult['stage'], advancingTeam: m.advancingCode };
      const pts = scoreMatch({ homeScore: p.homeScore, awayScore: p.awayScore, advancingTeam: p.advancingCode }, mr, rules) ?? 0;
      const exact = pts >= rules.exact && p.homeScore === m.homeScore && p.awayScore === m.awayScore;
      return { phase: (m.phase as Phase) ?? null, points: pts, exact };
    });
    return {
      userId: u.id,
      name: u.name ?? u.email,
      paidPhases: u.phasePayments.map((x) => x.phase as Phase),
      championPick: u.championPick,
      championPickPhase: u.championPickPhase as Phase | null,
      matchPoints,
    };
  });

  const paidByPhase: Partial<Record<Phase, number>> = {};
  for (const ph of ACTIVE_PHASES) paidByPhase[ph] = players.filter((p) => p.paidPhases.includes(ph)).length;
  const money = prizeDistribution(paidByPhase);

  const phases = ACTIVE_PHASES.map((ph) => ({
    phase: ph, label: PHASE_LABEL[ph], paid: paidByPhase[ph] ?? 0,
    prizePool: money.phases[ph].prizePool, split: money.phases[ph].split,
    standings: phaseStandings(players, ph),
  }));

  const general = { standings: generalStandings(players, settings.championWinner), pool: money.generalPool, split: money.generalSplit };
  const data = { currency: settings.currency, money, phases, general };
  cache = { at: Date.now(), data };
  return NextResponse.json(data);
}

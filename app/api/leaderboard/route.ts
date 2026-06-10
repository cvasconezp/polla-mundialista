import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { scoreMatch, type MatchResult } from '@/lib/scoring';
import { getSettings, rulesFromSettings } from '@/lib/settings';
import {
  ACTIVE_PHASES, PHASE_LABEL, phaseStandings, generalStandings, prizeDistribution,
  type PlayerV2, type Phase,
} from '@/lib/phases';

export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = await getSettings();
  const rules = rulesFromSettings(settings);

  const users = await prisma.user.findMany({
    include: {
      predictions: { include: { match: true } },
      phasePayments: true,
      championPicks: true,
    },
  });

  const players: PlayerV2[] = users.map((u) => {
    const matchPoints = u.predictions
      .filter((p) => p.match.status === 'FINISHED')
      .map((p) => {
        const mr: MatchResult = {
          status: 'FINISHED', homeScore: p.match.homeScore, awayScore: p.match.awayScore,
          stage: p.match.stage as MatchResult['stage'], advancingTeam: p.match.advancingCode,
        };
        const pts = scoreMatch({ homeScore: p.homeScore, awayScore: p.awayScore, advancingTeam: p.advancingCode }, mr, rules) ?? 0;
        const exact = pts >= rules.exact && p.homeScore === p.match.homeScore && p.awayScore === p.match.awayScore;
        return { phase: (p.match.phase as Phase) ?? null, points: pts, exact };
      });
    return {
      userId: u.id,
      name: u.name ?? u.email,
      paidPhases: u.phasePayments.filter((x) => x.paid).map((x) => x.phase as Phase),
      championPicks: Object.fromEntries(u.championPicks.map((c) => [c.phase, c.teamCode])) as Partial<Record<Phase, string>>,
      matchPoints,
    };
  });

  const paidByPhase: Partial<Record<Phase, number>> = {};
  for (const ph of ACTIVE_PHASES) paidByPhase[ph] = players.filter((p) => p.paidPhases.includes(ph)).length;
  const money = prizeDistribution(paidByPhase);

  const phases = ACTIVE_PHASES.map((ph) => ({
    phase: ph,
    label: PHASE_LABEL[ph],
    paid: paidByPhase[ph] ?? 0,
    prizePool: money.phases[ph].prizePool,
    split: money.phases[ph].split,
    standings: phaseStandings(players, ph),
  }));

  const general = {
    standings: generalStandings(players, settings.championWinner),
    pool: money.generalPool,
    split: money.generalSplit,
  };

  return NextResponse.json({
    currency: settings.currency,
    money,
    phases,
    general,
  });
}

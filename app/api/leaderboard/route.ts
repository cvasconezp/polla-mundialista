import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeStandings, type MatchResult } from '@/lib/scoring';
import { getSettings, rulesFromSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = await getSettings();
  const rules = rulesFromSettings(settings);

  const users = await prisma.user.findMany({ include: { predictions: { include: { match: true } } } });

  const players = users.map((u) => ({
    userId: u.id,
    name: u.name ?? u.email,
    paid: u.hasPaid,
    championPick: u.championPick,
    predictions: u.predictions.map((p) => ({
      match: {
        status: p.match.status as MatchResult['status'],
        homeScore: p.match.homeScore,
        awayScore: p.match.awayScore,
        stage: p.match.stage as MatchResult['stage'],
        advancingTeam: p.match.advancingCode,
      },
      pred: { homeScore: p.homeScore, awayScore: p.awayScore, advancingTeam: p.advancingCode },
    })),
  }));

  const standings = computeStandings(players, settings.championWinner, rules);
  const pot = users.filter((u) => u.hasPaid).length * settings.entryFee;

  return NextResponse.json({ standings, pot, currency: settings.currency, entryFee: settings.entryFee });
}

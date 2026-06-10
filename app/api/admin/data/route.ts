import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/session';
import { getSettings } from '@/lib/settings';
import { ACTIVE_PHASES, PHASE_LABEL, prizeDistribution, type Phase } from '@/lib/phases';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await currentUser();
  if (!admin?.isAdmin) return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });

  const [users, matches, settings, totalPredictions, totalMatches, finishedMatches, champGroups, teams] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: 'asc' }, include: { phasePayments: true } }),
    prisma.match.findMany({ where: { status: { not: 'SCHEDULED' } }, orderBy: { kickoff: 'asc' }, include: { home: true, away: true } }),
    getSettings(),
    prisma.prediction.count(),
    prisma.match.count(),
    prisma.match.count({ where: { status: 'FINISHED' } }),
    prisma.user.groupBy({ by: ['championPick'], _count: { championPick: true }, where: { championPick: { not: null } } }),
    prisma.team.findMany({ orderBy: { name: 'asc' }, select: { code: true, name: true } }),
  ]);

  const usersOut = users.map((u) => ({
    id: u.id, name: u.name, email: u.email, phone: u.phone, isAdmin: u.isAdmin,
    paidPhases: u.phasePayments.filter((p) => p.paid).map((p) => p.phase),
  }));

  const paidByPhase: Partial<Record<Phase, number>> = {};
  for (const ph of ACTIVE_PHASES) paidByPhase[ph] = usersOut.filter((u) => u.paidPhases.includes(ph)).length;
  const money = prizeDistribution(paidByPhase);

  const stats = {
    players: users.length,
    predictions: totalPredictions,
    avgPredictions: users.length ? Math.round((totalPredictions / users.length) * 10) / 10 : 0,
    matchesTotal: totalMatches,
    matchesFinished: finishedMatches,
    withPhone: users.filter((u) => u.phone).length,
  };

  return NextResponse.json({
    users: usersOut,
    phases: ACTIVE_PHASES.map((p) => ({ phase: p, label: PHASE_LABEL[p] })),
    money,
    matches,
    teams,
    championWinner: settings.championWinner,
    currency: settings.currency,
    stats,
  });
}

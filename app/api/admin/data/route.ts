import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/session';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await currentUser();
  if (!admin?.isAdmin) return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });

  const [users, matches, settings, totalPredictions, totalMatches, finishedMatches, champGroups] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, email: true, hasPaid: true, championPick: true } }),
    prisma.match.findMany({ where: { status: { not: 'SCHEDULED' } }, orderBy: { kickoff: 'asc' }, include: { home: true, away: true } }),
    getSettings(),
    prisma.prediction.count(),
    prisma.match.count(),
    prisma.match.count({ where: { status: 'FINISHED' } }),
    prisma.user.groupBy({ by: ['championPick'], _count: { championPick: true }, where: { championPick: { not: null } } }),
  ]);

  const paidCount = users.filter((u) => u.hasPaid).length;
  const pot = paidCount * settings.entryFee;

  // Campeón más elegido
  let topChamp: { code: string; count: number } | null = null;
  for (const g of champGroups) {
    if (g.championPick && (!topChamp || (g._count.championPick ?? 0) > topChamp.count)) {
      topChamp = { code: g.championPick, count: g._count.championPick ?? 0 };
    }
  }
  let topChampName: string | null = null;
  if (topChamp) {
    const t = await prisma.team.findUnique({ where: { code: topChamp.code } });
    topChampName = t?.name ?? topChamp.code;
  }

  const stats = {
    players: users.length,
    paid: paidCount,
    unpaid: users.length - paidCount,
    predictions: totalPredictions,
    avgPredictions: users.length ? Math.round((totalPredictions / users.length) * 10) / 10 : 0,
    matchesTotal: totalMatches,
    matchesFinished: finishedMatches,
    champTop: topChampName,
    champTopCount: topChamp?.count ?? 0,
    championWinner: settings.championWinner,
  };

  return NextResponse.json({ users, matches, pot, entryFee: settings.entryFee, currency: settings.currency, stats });
}

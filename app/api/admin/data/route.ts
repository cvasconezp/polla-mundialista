import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/session';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await currentUser();
  if (!admin?.isAdmin) return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });

  const [users, matches, settings] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, email: true, hasPaid: true } }),
    prisma.match.findMany({ where: { status: { not: 'SCHEDULED' } }, orderBy: { kickoff: 'asc' }, include: { home: true, away: true } }),
    getSettings(),
  ]);
  const pot = users.filter((u) => u.hasPaid).length * settings.entryFee;
  return NextResponse.json({ users, matches, pot, entryFee: settings.entryFee, currency: settings.currency });
}

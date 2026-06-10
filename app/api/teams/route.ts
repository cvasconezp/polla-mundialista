import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isChampionLocked } from '@/lib/championLock';

export const dynamic = 'force-dynamic';

export async function GET() {
  const teams = await prisma.team.findMany({ orderBy: { name: 'asc' } });
  const { locked: championLocked, deadline } = await isChampionLocked();
  return NextResponse.json({ teams, championLocked, championDeadline: deadline });
}

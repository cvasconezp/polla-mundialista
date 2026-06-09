import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const teams = await prisma.team.findMany({ orderBy: { name: 'asc' } });
  const first = await prisma.match.findFirst({ orderBy: { kickoff: 'asc' } });
  const championLocked = first ? new Date() >= new Date(first.kickoff) : false;
  return NextResponse.json({ teams, championLocked });
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const m = await prisma.match.findFirst({ orderBy: { kickoff: 'asc' }, select: { kickoff: true } });
  return NextResponse.json({ kickoff: m?.kickoff ?? null });
}

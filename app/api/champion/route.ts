import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

// El pick de campeón se cierra cuando arranca el primer partido del torneo.
async function championLocked(): Promise<boolean> {
  const first = await prisma.match.findFirst({ orderBy: { kickoff: 'asc' } });
  if (!first) return false;
  return new Date() >= new Date(first.kickoff);
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (await championLocked()) return NextResponse.json({ error: 'El pick de campeón ya está cerrado' }, { status: 403 });

  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { hasPaid: true } });
  if (!me?.hasPaid) return NextResponse.json({ error: 'Tu aporte está pendiente. Podrás elegir campeón cuando el organizador confirme tu pago.' }, { status: 403 });

  const { teamCode } = await req.json();
  const team = await prisma.team.findUnique({ where: { code: teamCode } });
  if (!team) return NextResponse.json({ error: 'Equipo inválido' }, { status: 400 });

  await prisma.user.update({ where: { id: user.id }, data: { championPick: teamCode } });
  return NextResponse.json({ ok: true, championPick: teamCode });
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/session';
import { isChampionLocked } from '@/lib/championLock';

export const dynamic = 'force-dynamic';

async function championLocked(): Promise<boolean> {
  return (await isChampionLocked()).locked;
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

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/session';
import { adminCan } from '@/lib/perms';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const admin = await currentUser();
  if (!admin?.isAdmin || !adminCan(admin as any, 'champion')) return NextResponse.json({ error: 'No tienes permiso para definir al campeón' }, { status: 403 });

  const { teamCode } = await req.json();
  const code: string | null = teamCode || null;
  if (code) {
    const t = await prisma.team.findUnique({ where: { code } });
    if (!t) return NextResponse.json({ error: 'Equipo inválido' }, { status: 400 });
  }
  await prisma.settings.update({ where: { id: 1 }, data: { championWinner: code } });
  return NextResponse.json({ ok: true, championWinner: code });
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/session';
import { adminCan } from '@/lib/perms';
import { ACTIVE_PHASES } from '@/lib/phases';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const admin = await currentUser();
  if (!admin?.isAdmin || !adminCan(admin as any, 'payments')) return NextResponse.json({ error: 'No tienes permiso para gestionar pagos' }, { status: 403 });
  const { userId, phase, paid } = await req.json();
  if (!(ACTIVE_PHASES as string[]).includes(phase)) return NextResponse.json({ error: 'Fase inválida' }, { status: 400 });

  // Cualquier administrador puede marcar y desmarcar pagos directamente.
  if (paid) {
    await prisma.phasePayment.upsert({
      where: { userId_phase: { userId, phase } },
      update: { paid: true },
      create: { userId, phase, paid: true },
    });
  } else {
    await prisma.phasePayment.deleteMany({ where: { userId, phase } });
  }
  return NextResponse.json({ ok: true });
}

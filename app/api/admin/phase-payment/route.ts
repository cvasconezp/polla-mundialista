import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/session';
import { ACTIVE_PHASES } from '@/lib/phases';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const admin = await currentUser();
  if (!admin?.isAdmin) return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
  const isSuper = !!(admin as any).superAdmin;

  const { userId, phase, paid } = await req.json();
  if (!(ACTIVE_PHASES as string[]).includes(phase)) return NextResponse.json({ error: 'Fase inválida' }, { status: 400 });

  // Marcar pago: cualquier administrador, de forma directa.
  if (paid) {
    await prisma.phasePayment.upsert({
      where: { userId_phase: { userId, phase } },
      update: { paid: true },
      create: { userId, phase, paid: true },
    });
    return NextResponse.json({ ok: true });
  }

  // Desmarcar pago: el super admin lo hace directo; un admin debe pedir confirmación.
  if (isSuper) {
    await prisma.phasePayment.deleteMany({ where: { userId, phase } });
    return NextResponse.json({ ok: true });
  }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  const existing = await prisma.adminRequest.findFirst({ where: { status: 'PENDING', kind: 'UNMARK_PAYMENT', targetUserId: userId, phase } });
  if (!existing) {
    await prisma.adminRequest.create({ data: {
      kind: 'UNMARK_PAYMENT', requestedById: admin.id, requestedByName: admin.name ?? admin.email ?? null,
      targetUserId: userId, targetUserName: target?.name ?? target?.email ?? null, phase,
    } });
  }
  return NextResponse.json({ ok: true, pending: true });
}

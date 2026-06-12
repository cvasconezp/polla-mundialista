import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await currentUser();
  if (!(admin as any)?.superAdmin) return NextResponse.json({ error: 'Solo el super admin' }, { status: 403 });
  const requests = await prisma.adminRequest.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ requests });
}

// Aprobar o rechazar una solicitud (solo super admin). Al aprobar, se ejecuta la acción.
export async function POST(req: NextRequest) {
  const admin = await currentUser();
  if (!(admin as any)?.superAdmin) return NextResponse.json({ error: 'Solo el super admin' }, { status: 403 });

  const { id, action } = await req.json();
  const r = await prisma.adminRequest.findUnique({ where: { id: Number(id) } });
  if (!r || r.status !== 'PENDING') return NextResponse.json({ error: 'Solicitud no válida' }, { status: 404 });

  if (action === 'approve') {
    if (r.kind === 'UNMARK_PAYMENT' && r.phase) {
      await prisma.phasePayment.deleteMany({ where: { userId: r.targetUserId, phase: r.phase as any } });
    } else if (r.kind === 'DELETE_USER') {
      const t = await prisma.user.findUnique({ where: { id: r.targetUserId }, select: { superAdmin: true } });
      if (t && !(t as any).superAdmin) await prisma.user.delete({ where: { id: r.targetUserId } });
    }
    await prisma.adminRequest.update({ where: { id: r.id }, data: { status: 'APPROVED', resolvedAt: new Date(), resolvedByName: admin!.name ?? admin!.email ?? null } });
  } else if (action === 'reject') {
    await prisma.adminRequest.update({ where: { id: r.id }, data: { status: 'REJECTED', resolvedAt: new Date(), resolvedByName: admin!.name ?? admin!.email ?? null } });
  } else {
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/session';
import { ACTIVE_PHASES, PHASE_LABEL } from '@/lib/phases';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const pays = await prisma.phasePayment.findMany({ where: { userId: user.id, paid: true }, select: { phase: true } });
  return NextResponse.json({
    paidPhases: pays.map((p) => p.phase),
    phases: ACTIVE_PHASES.map((p) => ({ phase: p, label: PHASE_LABEL[p] })),
    isAdmin: !!(user as any).isAdmin,
  });
}

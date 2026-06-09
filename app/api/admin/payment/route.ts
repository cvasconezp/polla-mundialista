import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/session';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const admin = await currentUser();
  if (!admin?.isAdmin) return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });

  const { userId, paid } = await req.json();
  const settings = await getSettings();
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { hasPaid: !!paid, paidAmount: paid ? settings.entryFee : 0 },
  });
  return NextResponse.json({ ok: true, user: { id: updated.id, hasPaid: updated.hasPaid } });
}

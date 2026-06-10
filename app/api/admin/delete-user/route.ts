import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const admin = await currentUser();
  if (!admin?.isAdmin) return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });

  const { userId } = await req.json();
  if (userId === admin.id) return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  if (!target) return NextResponse.json({ error: 'Usuario no existe' }, { status: 404 });
  if (target.isAdmin) return NextResponse.json({ error: 'No puedes eliminar a otro administrador' }, { status: 400 });

  // Cascade borra sus predicciones, pagos, picks, cuentas y sesiones.
  await prisma.user.delete({ where: { id: userId } });
  return NextResponse.json({ ok: true });
}

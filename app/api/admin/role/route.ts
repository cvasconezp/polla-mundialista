import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/session';
import { DEFAULT_PERMS } from '@/lib/perms';

export const dynamic = 'force-dynamic';

// Solo el super admin puede delegar / quitar el rol de administrador.
export async function POST(req: NextRequest) {
  const admin = await currentUser();
  if (!(admin as any)?.superAdmin) return NextResponse.json({ error: 'Solo el super admin' }, { status: 403 });

  const { userId, makeAdmin } = await req.json();
  if (userId === admin!.id) return NextResponse.json({ error: 'No puedes cambiar tu propio rol' }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { superAdmin: true } });
  if (!target) return NextResponse.json({ error: 'Usuario no existe' }, { status: 404 });
  if ((target as any).superAdmin) return NextResponse.json({ error: 'No puedes cambiar a otro super admin' }, { status: 400 });

  await prisma.user.update({ where: { id: userId }, data: { isAdmin: !!makeAdmin, ...(makeAdmin ? { permissions: DEFAULT_PERMS } : {}) } });
  return NextResponse.json({ ok: true });
}

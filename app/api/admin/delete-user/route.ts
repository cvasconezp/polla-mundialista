import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const admin = await currentUser();
  if (!admin?.isAdmin) return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
  const isSuper = !!(admin as any).superAdmin;

  const { userId } = await req.json();
  if (userId === admin.id) return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true, superAdmin: true, name: true, email: true } });
  if (!target) return NextResponse.json({ error: 'Usuario no existe' }, { status: 404 });
  if ((target as any).superAdmin) return NextResponse.json({ error: 'No puedes eliminar al super admin' }, { status: 400 });

  // Super admin: elimina directo (incluye a administradores). Cascade borra todo lo del usuario.
  if (isSuper) {
    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ ok: true });
  }

  // Admin no-super: no puede eliminar a otro admin; lo demás requiere confirmación del super admin.
  if (target.isAdmin) return NextResponse.json({ error: 'No puedes eliminar a otro administrador' }, { status: 400 });
  const existing = await prisma.adminRequest.findFirst({ where: { status: 'PENDING', kind: 'DELETE_USER', targetUserId: userId } });
  if (!existing) {
    await prisma.adminRequest.create({ data: {
      kind: 'DELETE_USER', requestedById: admin.id, requestedByName: admin.name ?? admin.email ?? null,
      targetUserId: userId, targetUserName: target.name ?? target.email ?? null,
    } });
  }
  return NextResponse.json({ ok: true, pending: true });
}

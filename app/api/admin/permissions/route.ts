import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/session';
import { PERMISSION_KEYS, DEFAULT_PERMS, type PermKey } from '@/lib/perms';

export const dynamic = 'force-dynamic';

// Solo el super admin ajusta los accesos de un administrador.
export async function POST(req: NextRequest) {
  const admin = await currentUser();
  if (!(admin as any)?.superAdmin) return NextResponse.json({ error: 'Solo el super admin' }, { status: 403 });

  const { userId, key, value } = await req.json();
  if (!(PERMISSION_KEYS as readonly string[]).includes(key)) return NextResponse.json({ error: 'Permiso inválido' }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true, superAdmin: true, permissions: true } });
  if (!target) return NextResponse.json({ error: 'Usuario no existe' }, { status: 404 });
  if ((target as any).superAdmin) return NextResponse.json({ error: 'El super admin tiene todos los permisos' }, { status: 400 });
  if (!target.isAdmin) return NextResponse.json({ error: 'El usuario no es administrador' }, { status: 400 });

  const current = ((target as any).permissions ?? DEFAULT_PERMS) as Record<string, boolean>;
  const next = { ...DEFAULT_PERMS, ...current, [key as PermKey]: !!value };
  await prisma.user.update({ where: { id: userId }, data: { permissions: next } });
  return NextResponse.json({ ok: true, permissions: next });
}

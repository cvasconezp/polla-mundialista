import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const { phone } = await req.json();
  const clean = String(phone || '').trim();
  // Validación simple: 8-15 dígitos (admite +, espacios, guiones)
  const digits = clean.replace(/[^0-9]/g, '');
  if (digits.length < 8 || digits.length > 15) {
    return NextResponse.json({ error: 'Número de WhatsApp inválido' }, { status: 400 });
  }
  await prisma.user.update({ where: { id: user.id }, data: { phone: clean } });
  return NextResponse.json({ ok: true, phone: clean });
}

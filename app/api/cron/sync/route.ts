import { NextRequest, NextResponse } from 'next/server';
import { runSync } from '@/lib/sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Protegido por secreto. Vercel Cron envía Authorization: Bearer <CRON_SECRET>.
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization');
  const url = new URL(req.url);
  return auth === `Bearer ${secret}` || url.searchParams.get('key') === secret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'no autorizado' }, { status: 401 });
  try {
    const report = await runSync();
    return NextResponse.json({ ok: true, report });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export const POST = GET;

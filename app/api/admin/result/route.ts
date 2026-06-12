import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/session';
import { adminCan } from '@/lib/perms';
import { recomputeMatchPoints } from '@/lib/sync';
import { getSettings, rulesFromSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

// Override manual de un resultado (cuando la API se equivoca o hay penales).
export async function POST(req: NextRequest) {
  const admin = await currentUser();
  if (!admin?.isAdmin || !adminCan(admin as any, 'results')) return NextResponse.json({ error: 'No tienes permiso para corregir resultados' }, { status: 403 });

  const { matchId, homeScore, awayScore, advancingCode, markFinished } = await req.json();
  const match = await prisma.match.findUnique({ where: { id: Number(matchId) } });
  if (!match) return NextResponse.json({ error: 'Partido no existe' }, { status: 404 });

  await prisma.match.update({
    where: { id: match.id },
    data: {
      homeScore: Number(homeScore),
      awayScore: Number(awayScore),
      advancingCode: advancingCode ?? match.advancingCode,
      status: markFinished ? 'FINISHED' : match.status,
    },
  });

  const settings = await getSettings();
  const recomputed = await recomputeMatchPoints(match.id, rulesFromSettings(settings));
  return NextResponse.json({ ok: true, recomputed });
}

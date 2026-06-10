import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/session';
import { isPredictionOpen } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

// GET: partidos + mis predicciones
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const matches = await prisma.match.findMany({
    orderBy: { kickoff: 'asc' },
    include: { home: true, away: true },
  });
  const preds = await prisma.prediction.findMany({ where: { userId: user.id } });
  const byMatch = Object.fromEntries(preds.map((p) => [p.matchId, p]));

  const now = new Date();
  return NextResponse.json({
    matches: matches.map((m) => ({
      id: m.id, stage: m.stage, group: m.group,
      home: m.home, away: m.away,
      kickoff: m.kickoff, status: m.status,
      homeScore: m.homeScore, awayScore: m.awayScore,
      open: isPredictionOpen({ status: m.status, kickoff: m.kickoff }, now),
      prediction: byMatch[m.id]
        ? { homeScore: byMatch[m.id].homeScore, awayScore: byMatch[m.id].awayScore, advancingCode: byMatch[m.id].advancingCode, points: byMatch[m.id].points }
        : null,
    })),
  });
}

// POST: guardar/actualizar una predicción (con bloqueo por hora en el servidor)
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await req.json();
  const matchId = Number(body.matchId);
  const homeScore = Number(body.homeScore);
  const awayScore = Number(body.awayScore);
  const advancingCode: string | null = body.advancingCode ?? null;

  if (!Number.isInteger(matchId) || !Number.isInteger(homeScore) || !Number.isInteger(awayScore) ||
      homeScore < 0 || awayScore < 0 || homeScore > 99 || awayScore > 99) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  // Bloqueo: solo pueden predecir quienes pagaron el aporte (confirmado por el admin).
  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { hasPaid: true } });
  if (!me?.hasPaid) return NextResponse.json({ error: 'Tu aporte está pendiente. Podrás predecir cuando el organizador confirme tu pago.' }, { status: 403 });

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return NextResponse.json({ error: 'Partido no existe' }, { status: 404 });

  // BLOQUEO en el servidor: nunca confiar solo en el frontend
  if (!isPredictionOpen({ status: match.status, kickoff: match.kickoff })) {
    return NextResponse.json({ error: 'Predicciones cerradas para este partido' }, { status: 403 });
  }

  const saved = await prisma.prediction.upsert({
    where: { userId_matchId: { userId: user.id, matchId } },
    update: { homeScore, awayScore, advancingCode },
    create: { userId: user.id, matchId, homeScore, awayScore, advancingCode },
  });
  return NextResponse.json({ ok: true, prediction: saved });
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/session';
import { currentPhase } from '@/lib/phaseState';
import { CHAMPION_TIER, PHASE_LABEL } from '@/lib/phases';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const phase = await currentPhase();
  const picks = await prisma.championPick.findMany({ where: { userId: user.id } });
  const byPhase = Object.fromEntries(picks.map((p) => [p.phase, p.teamCode]));
  const paid = phase ? !!(await prisma.phasePayment.findUnique({ where: { userId_phase: { userId: user.id, phase } } }))?.paid : false;
  return NextResponse.json({
    phase, phaseLabel: phase ? PHASE_LABEL[phase] : null,
    tier: phase ? CHAMPION_TIER[phase] : 0,
    currentPick: phase ? (byPhase[phase] ?? null) : null,
    picksByPhase: byPhase,
    paid,
    locked: !phase,
  });
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const phase = await currentPhase();
  if (!phase) return NextResponse.json({ error: 'La elección de campeón está cerrada' }, { status: 403 });

  const paid = (await prisma.phasePayment.findUnique({ where: { userId_phase: { userId: user.id, phase } } }))?.paid;
  if (!paid) return NextResponse.json({ error: `Debes pagar la fase (${PHASE_LABEL[phase]}) para elegir campeón.` }, { status: 403 });

  const { teamCode } = await req.json();
  const team = await prisma.team.findUnique({ where: { code: teamCode } });
  if (!team) return NextResponse.json({ error: 'Equipo inválido' }, { status: 400 });

  await prisma.championPick.upsert({
    where: { userId_phase: { userId: user.id, phase } },
    update: { teamCode },
    create: { userId: user.id, phase, teamCode },
  });
  return NextResponse.json({ ok: true, phase, teamCode });
}

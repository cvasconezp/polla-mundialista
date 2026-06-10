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
  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { championPick: true, championPickPhase: true } });
  const history = await prisma.championPick.findMany({ where: { userId: user.id } });
  const paid = phase ? !!(await prisma.phasePayment.findUnique({ where: { userId_phase: { userId: user.id, phase } } }))?.paid : false;
  return NextResponse.json({
    phase, phaseLabel: phase ? PHASE_LABEL[phase] : null,
    currentPhaseTier: phase ? CHAMPION_TIER[phase] : 0,
    currentPick: me?.championPick ?? null,
    pickPhase: me?.championPickPhase ?? null,
    pickTier: me?.championPickPhase ? CHAMPION_TIER[me.championPickPhase] : 0,
    picksByPhase: Object.fromEntries(history.map((h) => [h.phase, h.teamCode])),
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

  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { championPick: true } });
  const changed = me?.championPick !== teamCode;
  // Si cambia de equipo, el crédito se reinicia a la fase actual.
  await prisma.user.update({
    where: { id: user.id },
    data: { championPick: teamCode, ...(changed ? { championPickPhase: phase } : {}) },
  });
  // Historial por fase (informativo)
  await prisma.championPick.upsert({
    where: { userId_phase: { userId: user.id, phase } },
    update: { teamCode }, create: { userId: user.id, phase, teamCode },
  });
  return NextResponse.json({ ok: true, phase, teamCode });
}

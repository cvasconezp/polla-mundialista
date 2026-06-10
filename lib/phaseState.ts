import { prisma } from './prisma';
import { ACTIVE_PHASES, type Phase } from './phases';

// Fase "en curso": la del próximo partido no finalizado entre las fases activas.
export async function currentPhase(): Promise<Phase | null> {
  const m = await prisma.match.findFirst({
    where: { status: { not: 'FINISHED' }, phase: { in: ACTIVE_PHASES as any } },
    orderBy: { kickoff: 'asc' },
    select: { phase: true },
  });
  if (m?.phase && (ACTIVE_PHASES as string[]).includes(m.phase)) return m.phase as Phase;
  return null; // todas las fases activas finalizaron
}

// Fases que ya tienen al menos un partido (para mostrar/pagar)
export async function phasesWithMatches(): Promise<Phase[]> {
  const rows = await prisma.match.findMany({ where: { phase: { in: ACTIVE_PHASES as any } }, select: { phase: true }, distinct: ['phase'] });
  const set = new Set(rows.map((r) => r.phase as Phase));
  return ACTIVE_PHASES.filter((p) => set.has(p));
}

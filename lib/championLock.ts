import { prisma } from './prisma';

// El pick de campeón se cierra cuando TODOS los equipos ya debutaron, es decir,
// al iniciar el último "primer partido" entre todos los competidores.
// Así los jugadores tienen margen durante los primeros días del torneo.
export async function isChampionLocked(now: Date = new Date()): Promise<{ locked: boolean; deadline: Date | null }> {
  const matches = await prisma.match.findMany({ select: { homeCode: true, awayCode: true, kickoff: true } });
  if (matches.length === 0) return { locked: false, deadline: null };

  // Primer partido (kickoff más temprano) de cada equipo
  const firstByTeam = new Map<string, Date>();
  for (const m of matches) {
    for (const code of [m.homeCode, m.awayCode]) {
      const cur = firstByTeam.get(code);
      if (!cur || m.kickoff < cur) firstByTeam.set(code, m.kickoff);
    }
  }
  // El cierre = el más tardío de esos "primeros partidos"
  let deadline = new Date(0);
  for (const d of firstByTeam.values()) if (d > deadline) deadline = d;

  return { locked: now >= deadline, deadline };
}

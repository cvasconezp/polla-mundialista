import { prisma } from './prisma';
import type { Rules } from './scoring';

export async function getSettings() {
  let s = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!s) s = await prisma.settings.create({ data: { id: 1 } });
  return s;
}

export function rulesFromSettings(s: {
  ptsExact: number; ptsDiff: number; ptsWinner: number; ptsAdvance: number; ptsChampion: number;
}): Rules {
  return {
    exact: s.ptsExact, diff: s.ptsDiff, winner: s.ptsWinner,
    advance: s.ptsAdvance, champion: s.ptsChampion,
  };
}

// Seed: configuración, equipos y partidos.
// - Settings + equipos (nombres en español + código ISO para banderas).
// - Si hay FOOTBALL_DATA_TOKEN, importa los partidos reales del Mundial.
// - Si no, crea partidos de ejemplo.

import { PrismaClient } from '@prisma/client';
import { fetchWorldCupMatches, mapStatus, isKnockout } from '../lib/footballData';

const prisma = new PrismaClient();

// code (FIFA tla) -> [nombre en español, código ISO-3166 alpha-2 para flagcdn]
const TEAM_INFO: Record<string, [string, string]> = {
  ARG: ['Argentina', 'ar'], BRA: ['Brasil', 'br'], URY: ['Uruguay', 'uy'], COL: ['Colombia', 'co'],
  ECU: ['Ecuador', 'ec'], PAR: ['Paraguay', 'py'], PER: ['Perú', 'pe'], CHI: ['Chile', 'cl'],
  BOL: ['Bolivia', 'bo'], VEN: ['Venezuela', 've'],
  MEX: ['México', 'mx'], USA: ['Estados Unidos', 'us'], CAN: ['Canadá', 'ca'], CRC: ['Costa Rica', 'cr'],
  PAN: ['Panamá', 'pa'], HON: ['Honduras', 'hn'], JAM: ['Jamaica', 'jm'], HAI: ['Haití', 'ht'], CUW: ['Curazao', 'cw'],
  ESP: ['España', 'es'], FRA: ['Francia', 'fr'], GER: ['Alemania', 'de'], ENG: ['Inglaterra', 'gb-eng'],
  POR: ['Portugal', 'pt'], NED: ['Países Bajos', 'nl'], BEL: ['Bélgica', 'be'], ITA: ['Italia', 'it'],
  CRO: ['Croacia', 'hr'], SUI: ['Suiza', 'ch'], AUT: ['Austria', 'at'], SWE: ['Suecia', 'se'],
  NOR: ['Noruega', 'no'], DEN: ['Dinamarca', 'dk'], POL: ['Polonia', 'pl'], SRB: ['Serbia', 'rs'],
  TUR: ['Turquía', 'tr'], SCO: ['Escocia', 'gb-sct'], WAL: ['Gales', 'gb-wls'], CZE: ['Chequia', 'cz'],
  BIH: ['Bosnia y Herzegovina', 'ba'], UKR: ['Ucrania', 'ua'],
  MAR: ['Marruecos', 'ma'], SEN: ['Senegal', 'sn'], CIV: ['Costa de Marfil', 'ci'], GHA: ['Ghana', 'gh'],
  NGA: ['Nigeria', 'ng'], CMR: ['Camerún', 'cm'], EGY: ['Egipto', 'eg'], ALG: ['Argelia', 'dz'],
  TUN: ['Túnez', 'tn'], RSA: ['Sudáfrica', 'za'], CPV: ['Cabo Verde', 'cv'], COD: ['RD del Congo', 'cd'],
  JPN: ['Japón', 'jp'], KOR: ['Corea del Sur', 'kr'], AUS: ['Australia', 'au'], IRN: ['Irán', 'ir'],
  KSA: ['Arabia Saudita', 'sa'], QAT: ['Catar', 'qa'], JOR: ['Jordania', 'jo'], IRQ: ['Irak', 'iq'],
  UZB: ['Uzbekistán', 'uz'], UAE: ['Emiratos Árabes Unidos', 'ae'], NZL: ['Nueva Zelanda', 'nz'],
};

function infoFor(code: string, apiName?: string): { name: string; iso: string } {
  const t = TEAM_INFO[code];
  if (t) return { name: t[0], iso: t[1] };
  return { name: apiName ?? code, iso: 'xx' };
}

async function upsertTeam(code: string, apiName?: string) {
  const { name, iso } = infoFor(code, apiName);
  return prisma.team.upsert({
    where: { code },
    update: { name, flag: iso },     // flag ahora guarda el código ISO (para flagcdn)
    create: { code, name, flag: iso },
  });
}

async function seedSettings() {
  await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

async function seedSampleMatches() {
  const base = ['ARG', 'ECU', 'ESP', 'USA', 'BRA', 'COL', 'FRA', 'GER', 'ENG', 'POR', 'MEX', 'CAN'];
  for (const c of base) await upsertTeam(c);
  const now = Date.now();
  const sample = [
    { ext: 900001, g: 'A', h: 'MEX', a: 'CAN', t: now - 30 * 60000, st: 'LIVE', hs: 1, as: 1 },
    { ext: 900002, g: 'A', h: 'ARG', a: 'ECU', t: now - 3 * 3600000, st: 'FINISHED', hs: 2, as: 1 },
    { ext: 900003, g: 'B', h: 'ESP', a: 'USA', t: now + 24 * 3600000, st: 'SCHEDULED' },
    { ext: 900004, g: 'B', h: 'BRA', a: 'COL', t: now + 27 * 3600000, st: 'SCHEDULED' },
    { ext: 900005, g: 'C', h: 'FRA', a: 'GER', t: now + 48 * 3600000, st: 'SCHEDULED' },
    { ext: 900006, g: 'C', h: 'ENG', a: 'POR', t: now + 51 * 3600000, st: 'SCHEDULED' },
  ];
  for (const m of sample) {
    await prisma.match.upsert({
      where: { externalId: m.ext }, update: {},
      create: { externalId: m.ext, stage: 'GROUP', group: m.g, homeCode: m.h, awayCode: m.a,
        kickoff: new Date(m.t), status: m.st as any, homeScore: m.hs ?? null, awayScore: m.as ?? null },
    });
  }
  console.log('Seed: 6 partidos de ejemplo creados.');
}

async function importRealMatches() {
  const fd = await fetchWorldCupMatches();
  let n = 0;
  for (const m of fd) {
    const hCode = m.homeTeam.tla; const aCode = m.awayTeam.tla;
    if (!hCode || !aCode) continue;
    await upsertTeam(hCode, m.homeTeam.name);
    await upsertTeam(aCode, m.awayTeam.name);
    await prisma.match.upsert({
      where: { externalId: m.id },
      update: { kickoff: new Date(m.utcDate), status: mapStatus(m.status), homeScore: m.score.fullTime.home, awayScore: m.score.fullTime.away },
      create: { externalId: m.id, stage: isKnockout(m.stage) ? 'KNOCKOUT' : 'GROUP',
        group: m.group?.replace('GROUP_', '') ?? null, homeCode: hCode, awayCode: aCode,
        kickoff: new Date(m.utcDate), status: mapStatus(m.status), homeScore: m.score.fullTime.home, awayScore: m.score.fullTime.away },
    });
    n++;
  }
  console.log(`Seed: ${n} partidos reales importados de football-data.org.`);
}

async function main() {
  await seedSettings();
  if (process.env.FOOTBALL_DATA_TOKEN) {
    try { await importRealMatches(); }
    catch (e) { console.warn('No se pudo importar de la API, usando ejemplos:', (e as Error).message); await seedSampleMatches(); }
  } else { await seedSampleMatches(); }
  console.log('Seed completo ✅');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

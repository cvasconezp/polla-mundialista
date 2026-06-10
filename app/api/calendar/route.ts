import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Feed iCalendar (.ics) con todos los partidos, anclados a HORA DE ECUADOR
// (America/Guayaquil, UTC-5 fijo, sin horario de verano). Así se ve igual en
// cualquier dispositivo. Los jugadores se suscriben una vez (webcal://) en
// Google Calendar / iPhone y reciben las horas + una alerta para predecir.

const EC_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC-5

// Componentes de fecha/hora en UTC (para DTSTAMP)
function fmtUTC(d: Date) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}
// Hora local de Ecuador (sin sufijo Z) para usar con TZID=America/Guayaquil
function fmtEC(d: Date) {
  const local = new Date(d.getTime() - EC_OFFSET_MS);
  return local.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, '');
}
function esc(s: string) {
  return s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
}

export async function GET() {
  const matches = await prisma.match.findMany({ orderBy: { kickoff: 'asc' }, include: { home: true, away: true } });
  const base = process.env.NEXTAUTH_URL || '';
  const now = fmtUTC(new Date());

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Polla Mundialista 2026//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Polla Mundialista 2026',
    'NAME:Polla Mundialista 2026',
    'X-WR-TIMEZONE:America/Guayaquil',
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    'X-PUBLISHED-TTL:PT12H',
    // Definición de zona horaria de Ecuador (UTC-5 fijo)
    'BEGIN:VTIMEZONE',
    'TZID:America/Guayaquil',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0500',
    'TZNAME:-05',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];

  for (const m of matches) {
    const start = new Date(m.kickoff);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const title = `⚽ ${m.home.name} vs ${m.away.name}`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:match-${m.id}@polla-mundialista`,
      `DTSTAMP:${now}`,
      `DTSTART;TZID=America/Guayaquil:${fmtEC(start)}`,
      `DTEND;TZID=America/Guayaquil:${fmtEC(end)}`,
      `SUMMARY:${esc(title)}`,
      `DESCRIPTION:${esc(`Carga tu pronóstico antes del inicio: ${base}`)}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT3H',
      'ACTION:DISPLAY',
      `DESCRIPTION:${esc(`Predice ${m.home.name} vs ${m.away.name}`)}`,
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');

  return new Response(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="polla-mundialista.ics"',
    },
  });
}

// Mapa compartido de equipos: code (FIFA tla) -> [nombre en español, código ISO-3166 alpha-2 para flagcdn].
// Usado por el seed y por la sincronización del cron, para que los nombres/banderas
// queden correctos también en los partidos que se importen automáticamente.

export const TEAM_INFO: Record<string, [string, string]> = {
  ARG: ['Argentina', 'ar'], BRA: ['Brasil', 'br'], URY: ['Uruguay', 'uy'], COL: ['Colombia', 'co'],
  ECU: ['Ecuador', 'ec'], PAR: ['Paraguay', 'py'], PER: ['Perú', 'pe'], CHI: ['Chile', 'cl'],
  BOL: ['Bolivia', 'bo'], VEN: ['Venezuela', 've'],
  MEX: ['México', 'mx'], USA: ['Estados Unidos', 'us'], CAN: ['Canadá', 'ca'], CRC: ['Costa Rica', 'cr'],
  PAN: ['Panamá', 'pa'], HON: ['Honduras', 'hn'], JAM: ['Jamaica', 'jm'], HAI: ['Haití', 'ht'], CUW: ['Curazao', 'cw'],
  ESP: ['España', 'es'], FRA: ['Francia', 'fr'], GER: ['Alemania', 'de'], ENG: ['Inglaterra', 'gb-eng'],
  POR: ['Portugal', 'pt'], NED: ['Países Bajos', 'nl'], BEL: ['Bélgica', 'be'], ITA: ['Italia', 'it'],
  CRO: ['Croacia', 'hr'], SUI: ['Suiza', 'ch'], AUT: ['Austria', 'at'], SWE: ['Suecia', 'se'],
  NOR: ['Noruega', 'no'], DEN: ['Dinamarca', 'dk'], POL: ['Polonia', 'pl'], SRB: ['Serbia', 'rs'],
  TUR: ['Turquía', 'tr'], SCO: ['Escocia', 'gb-sct'], WAL: ['Gales', 'gb-wls'], CZE: ['Rep\u00fablica Checa', 'cz'],
  BIH: ['Bosnia y Herzegovina', 'ba'], UKR: ['Ucrania', 'ua'], GRE: ['Grecia', 'gr'], ROU: ['Rumania', 'ro'],
  MAR: ['Marruecos', 'ma'], SEN: ['Senegal', 'sn'], CIV: ['Costa de Marfil', 'ci'], GHA: ['Ghana', 'gh'],
  NGA: ['Nigeria', 'ng'], CMR: ['Camerún', 'cm'], EGY: ['Egipto', 'eg'], ALG: ['Argelia', 'dz'],
  TUN: ['Túnez', 'tn'], RSA: ['Sudáfrica', 'za'], CPV: ['Cabo Verde', 'cv'], COD: ['RD del Congo', 'cd'],
  JPN: ['Japón', 'jp'], KOR: ['Corea del Sur', 'kr'], AUS: ['Australia', 'au'], IRN: ['Irán', 'ir'],
  KSA: ['Arabia Saudita', 'sa'], QAT: ['Catar', 'qa'], JOR: ['Jordania', 'jo'], IRQ: ['Irak', 'iq'],
  UZB: ['Uzbekistán', 'uz'], UAE: ['Emiratos Árabes Unidos', 'ae'], NZL: ['Nueva Zelanda', 'nz'],
};

export function teamInfo(code: string, apiName?: string): { name: string; iso: string } {
  const t = TEAM_INFO[code];
  if (t) return { name: t[0], iso: t[1] };
  return { name: apiName ?? code, iso: 'xx' };
}

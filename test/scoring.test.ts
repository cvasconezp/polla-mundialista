import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreMatch, computeStandings, isPredictionOpen, DEFAULT_RULES,
  type MatchResult, type Prediction,
} from '../lib/scoring.ts';

const FINAL = (h: number, a: number, extra: Partial<MatchResult> = {}): MatchResult => ({
  status: 'FINISHED', homeScore: h, awayScore: a, stage: 'GROUP', ...extra,
});

test('marcador exacto = 5 pts', () => {
  assert.equal(scoreMatch({ homeScore: 2, awayScore: 1 }, FINAL(2, 1)), 5);
});

test('mismo ganador + misma diferencia = 3 pts', () => {
  // predijo 3-2 (gana local por 1), real 2-1 (gana local por 1)
  assert.equal(scoreMatch({ homeScore: 3, awayScore: 2 }, FINAL(2, 1)), 3);
});

test('solo mismo ganador (distinta diferencia) = 1 pt', () => {
  // predijo 3-0 (gana local por 3), real 2-1 (gana local por 1)
  assert.equal(scoreMatch({ homeScore: 3, awayScore: 0 }, FINAL(2, 1)), 1);
});

test('empate exacto = 5 pts', () => {
  assert.equal(scoreMatch({ homeScore: 1, awayScore: 1 }, FINAL(1, 1)), 5);
});

test('empate acertado pero distinto marcador = 3 pts (misma diferencia 0)', () => {
  assert.equal(scoreMatch({ homeScore: 0, awayScore: 0 }, FINAL(2, 2)), 3);
});

test('ganador equivocado = 0 pts', () => {
  assert.equal(scoreMatch({ homeScore: 1, awayScore: 1 }, FINAL(2, 1)), 0);
  assert.equal(scoreMatch({ homeScore: 0, awayScore: 2 }, FINAL(2, 1)), 0);
});

test('partido no finalizado = null (no puntua aun)', () => {
  assert.equal(scoreMatch({ homeScore: 2, awayScore: 1 }, { ...FINAL(1, 1), status: 'LIVE' }), null);
  assert.equal(scoreMatch({ homeScore: 2, awayScore: 1 }, { status: 'SCHEDULED', homeScore: null, awayScore: null, stage: 'GROUP' }), null);
});

test('sin prediccion = null; prediccion incompleta = 0', () => {
  assert.equal(scoreMatch(null, FINAL(2, 1)), null);
  assert.equal(scoreMatch({ homeScore: null, awayScore: null }, FINAL(2, 1)), 0);
});

test('bonus eliminatoria: acertar quien avanza suma +2 sobre el marcador', () => {
  const m = FINAL(1, 1, { stage: 'KNOCKOUT', advancingTeam: 'ARG' });
  // marcador exacto (5) + avanza correcto (2) = 7
  assert.equal(scoreMatch({ homeScore: 1, awayScore: 1, advancingTeam: 'ARG' }, m), 7);
  // marcador exacto (5) + avanza incorrecto (0) = 5
  assert.equal(scoreMatch({ homeScore: 1, awayScore: 1, advancingTeam: 'BRA' }, m), 5);
  // ganador equivocado (0) pero acierta quien avanza (+2) = 2
  assert.equal(scoreMatch({ homeScore: 0, awayScore: 1, advancingTeam: 'ARG' }, m), 2);
});

test('bloqueo: predicciones cerradas al pitazo inicial', () => {
  const future = { status: 'SCHEDULED', kickoff: new Date(Date.now() + 3600_000) };
  const past = { status: 'SCHEDULED', kickoff: new Date(Date.now() - 60_000) };
  const live = { status: 'LIVE', kickoff: new Date(Date.now() + 3600_000) };
  assert.equal(isPredictionOpen(future), true);
  assert.equal(isPredictionOpen(past), false);   // ya empezó por hora
  assert.equal(isPredictionOpen(live), false);    // estado en juego
});

test('tabla: orden por puntos y desempate por exactos', () => {
  const m1 = FINAL(2, 1); const m2 = FINAL(0, 0);
  const players = [
    { userId: 'a', name: 'Ana', paid: true, predictions: [
      { match: m1, pred: { homeScore: 2, awayScore: 1 } as Prediction },   // 5 exacto
      { match: m2, pred: { homeScore: 1, awayScore: 1 } as Prediction },   // 3 (empate, dif 0)
    ]},
    { userId: 'b', name: 'Beto', paid: false, predictions: [
      { match: m1, pred: { homeScore: 2, awayScore: 1 } as Prediction },   // 5 exacto
      { match: m2, pred: { homeScore: 0, awayScore: 0 } as Prediction },   // 5 exacto
    ]},
  ];
  const s = computeStandings(players);
  // Beto: 10 pts, 2 exactos ; Ana: 8 pts, 1 exacto
  assert.equal(s[0].name, 'Beto');
  assert.equal(s[0].points, 10);
  assert.equal(s[0].exactCount, 2);
  assert.equal(s[1].name, 'Ana');
  assert.equal(s[1].points, 8);
});

test('tabla: desempate a igualdad de puntos por mas exactos', () => {
  const m1 = FINAL(2, 1); const m2 = FINAL(1, 0);
  const players = [
    { userId: 'a', name: 'Ana', paid: true, predictions: [
      { match: m1, pred: { homeScore: 2, awayScore: 1 } as Prediction }, // 5 exacto
      { match: m2, pred: { homeScore: 3, awayScore: 0 } as Prediction }, // 1 (gana local, dif distinta)
    ]},
    { userId: 'b', name: 'Beto', paid: true, predictions: [
      { match: m1, pred: { homeScore: 4, awayScore: 3 } as Prediction }, // 3 (dif 1)
      { match: m2, pred: { homeScore: 4, awayScore: 3 } as Prediction }, // 3 (dif 1)
    ]},
  ];
  const s = computeStandings(players);
  // Ambos 6 pts; Ana tiene 1 exacto, Beto 0 -> Ana primero
  assert.equal(s[0].points, 6);
  assert.equal(s[1].points, 6);
  assert.equal(s[0].name, 'Ana');
});

test('campeon: suma 10 si acierta y el torneo termino', () => {
  const base = { userId: 'a', name: 'Ana', paid: true, predictions: [] as any[] };
  assert.equal(computeStandings([{ ...base, championPick: 'ARG' }], 'ARG')[0].points, 10);
  assert.equal(computeStandings([{ ...base, championPick: 'BRA' }], 'ARG')[0].points, 0);
  assert.equal(computeStandings([{ ...base, championPick: 'ARG' }], null)[0].points, 0); // torneo no terminó
});

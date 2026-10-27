import test from 'node:test';
import assert from 'node:assert/strict';
import { EXERCISE_SEQUENCE, PASS_SCENARIO, RUN_CHOICE_PATHS, SPACE_MAKING_SCENARIO } from './scenarios.js';
import { isExerciseChoiceValid, validateExerciseSequence, validateKvcScenarioGeometry, validatePassTargets, validateRunChoicePaths } from './exercise-contract.js';

test('de bestaande reeks koppelt beide oefeningstypes aan de juiste speler en drie keuzes', () => {
  assert.deepEqual(validateExerciseSequence(EXERCISE_SEQUENCE), []);
});

test('een loopoefening kan niet per ongeluk de balbezitter laten besturen', () => {
  const invalidRun = { ...EXERCISE_SEQUENCE[1], controllerId: 'me' };
  assert.match(validateExerciseSequence([invalidRun]).join(' '), /speler zonder bal/);
});

test('een passoefening kan niet aan een speler zonder bal worden gekoppeld', () => {
  const invalidPass = { ...EXERCISE_SEQUENCE[0], controllerId: 'forward' };
  assert.match(validateExerciseSequence([invalidPass]).join(' '), /balbezitter/);
});

test('elke oefening moet exact A, B en C aanbieden', () => {
  const incomplete = { ...EXERCISE_SEQUENCE[0], choiceLabels: { A: 'Pass', B: 'Steun' } };
  assert.match(validateExerciseSequence([incomplete]).join(' '), /precies drie/);
});

test('een timeout is een geldige keuze-uitkomst; onbekende knopcodes niet', () => {
  assert.equal(isExerciseChoiceValid(EXERCISE_SEQUENCE[0], null), true);
  assert.equal(isExerciseChoiceValid(EXERCISE_SEQUENCE[0], 'D'), false);
});

test('beide situaties houden K, C, LF, RF en S op hun herkenbare basisposities', () => {
  assert.deepEqual(validateKvcScenarioGeometry(PASS_SCENARIO, 'pass'), []);
  assert.deepEqual(validateKvcScenarioGeometry(SPACE_MAKING_SCENARIO, 'run'), []);
});

test('de loopanimaties blijven aan de juiste flankzijde en gebruiken geloofwaardige snelheden', () => {
  assert.deepEqual(validateRunChoicePaths(RUN_CHOICE_PATHS, SPACE_MAKING_SCENARIO.watch), []);
});

test('keuze C trekt de centrale verdediger links weg vóór RF naar binnen loopt', () => {
  const [pullDefender, passToRightFlank] = RUN_CHOICE_PATHS.C;
  assert.ok(pullDefender.players.forward.x < 50);
  assert.ok(pullDefender.players.interceptor.x < 50);
  assert.equal(pullDefender.players.wide.x, SPACE_MAKING_SCENARIO.watch.wide.x);
  assert.ok(passToRightFlank.players.wide.x > 50);
  assert.equal(passToRightFlank.players.farDef.x, 70);
  assert.deepEqual(passToRightFlank.ballTo, passToRightFlank.players.wide);
});

test('de passkeuzes komen overeen met ontvangers en de onderschepping ligt in de passlijn', () => {
  assert.deepEqual(validatePassTargets(PASS_SCENARIO), []);
});

test('de passknoppen noemen de speler die de bijbehorende animatie ontvangt', () => {
  const passExercise=EXERCISE_SEQUENCE[0];
  assert.match(passExercise.choiceLabels.A,/RF\s*\(7\)/);
  assert.match(passExercise.choiceLabels.B,/SP\s*\(9\)/);
  assert.match(passExercise.choiceLabels.C,/LF\s*\(11\)/);
  assert.equal(PASS_SCENARIO.passTargets["A"].receiver,'wide');
  assert.equal(PASS_SCENARIO.passTargets["B"].receiver,'forward');
  assert.equal(PASS_SCENARIO.passTargets["C"].receiver,'support');
});

test('alle tien spelers hebben een positie in elke loopvervolgfase', () => {
  const playerIds = ['gk', 'support', 'wide', 'me', 'forward', 'oppGk', 'press', 'cover', 'interceptor', 'farDef'].sort();
  for (const phases of Object.values(RUN_CHOICE_PATHS)) {
    for (const phase of phases) assert.deepEqual(Object.keys(phase.players).sort(), playerIds);
  }
});

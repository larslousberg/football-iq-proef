import test from 'node:test';
import assert from 'node:assert/strict';
import { EXERCISE_SEQUENCE, PASS_CHOICE_PATHS, PASS_SCENARIO, RUN_CHOICE_PATHS, SPACE_MAKING_SCENARIO } from './scenarios.js';
import { isExerciseChoiceValid, validateExerciseSequence, validateKvcScenarioGeometry, validatePassChoicePaths, validatePassTargets, validateRunChoicePaths } from './exercise-contract.js';
import { HOME_ROLES, KVC_DIAMOND_START, OPPONENT_ATTACK_DIRECTION, PITCH, buildKvcDefensiveDiamond, fieldToScene, getFormationAnchors, getKvcZone, sceneToField, validateLineup } from './football-model.js';

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

test('keuze C trekt de centrale verdediger omhoog weg vóór RF naar binnen loopt', () => {
  const [pullDefender, passToRightFlank] = RUN_CHOICE_PATHS.C;
  assert.ok(pullDefender.players.forward.y < 50);
  assert.ok(pullDefender.players.interceptor.y < 50);
  assert.equal(pullDefender.players.wide.y, SPACE_MAKING_SCENARIO.watch.wide.y);
  assert.ok(passToRightFlank.players.wide.x > 50);
  assert.ok(passToRightFlank.players.wide.y < SPACE_MAKING_SCENARIO.watch.wide.y);
  assert.equal(passToRightFlank.players.farDef.x, 66);
  assert.deepEqual(passToRightFlank.ballTo, passToRightFlank.players.wide);
});

test('de passkeuzes komen overeen met ontvangers en de onderschepping ligt in de passlijn', () => {
  assert.deepEqual(validatePassTargets(PASS_SCENARIO), []);
  assert.deepEqual(validatePassChoicePaths(PASS_CHOICE_PATHS, PASS_SCENARIO.watch), []);
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

test('de KVC-formatie gebruikt veldcoördinaten en vaste positienummers', () => {
  assert.deepEqual(Object.values(HOME_ROLES).map(({ number }) => number), [1, 4, 11, 7, 9]);
  assert.deepEqual(validateLineup(KVC_DIAMOND_START), []);
  assert.deepEqual(sceneToField({ x: 15, y: 58 }), { x: 42, y: 15 });
  assert.deepEqual(getKvcZone({ x: 8, y: 50 }), 'E2');
  assert.deepEqual(getKvcZone({ x: 42, y: 15 }), 'C1');
  assert.deepEqual(getKvcZone({ x: 92, y: 85 }), 'A3');
  assert.equal(PITCH.lengthMeters,35);
  assert.equal(PITCH.widthMeters,25);
  assert.deepEqual(sceneToField(fieldToScene({x:42,y:15})),{x:42,y:15});
  assert.deepEqual(PASS_SCENARIO.start.gk,KVC_DIAMOND_START.gk);
  assert.deepEqual(PASS_SCENARIO.start.me,KVC_DIAMOND_START.me);
  assert.deepEqual(PASS_SCENARIO.start.support,KVC_DIAMOND_START.support);
  assert.deepEqual(PASS_SCENARIO.start.wide,KVC_DIAMOND_START.wide);
  assert.deepEqual(PASS_SCENARIO.start.forward,KVC_DIAMOND_START.forward);
  assert.equal(PASS_SCENARIO.start.oppGk.x,96);
  assert.ok(PASS_SCENARIO.start.interceptor.x>PASS_SCENARIO.start.press.x);
});

test('de drie tegenstanderformaties hebben twee kanten, een keeper en de juiste veldrichting', () => {
  for (const formation of ['1-2-1', '2-2', '2-1-1']) {
    const anchors = getFormationAnchors(formation, OPPONENT_ATTACK_DIRECTION);
    assert.equal(Object.keys(anchors).length, 5);
    assert.ok(anchors.keeper.x > 90, `${formation}: keeper hoort bij het eigen doel van de tegenstander`);
  }
  const twoTwo = getFormationAnchors('2-2', OPPONENT_ATTACK_DIRECTION);
  assert.equal(twoTwo.backLeft.y > 50, true);
  assert.equal(twoTwo.backRight.y < 50, true);
  assert.ok(twoTwo.frontLeft.x < twoTwo.backLeft.x);
});

test('bij balverlies vormt KVC een compacte ruit rond de bal', () => {
  const shape=buildKvcDefensiveDiamond({x:47,y:50});
  assert.deepEqual(shape.me,{x:44,y:50});
  assert.ok(shape.support.x<shape.me.x && shape.wide.x<shape.me.x);
  assert.ok(shape.support.y<50 && shape.wide.y>50);
  assert.ok(shape.gk.x<shape.support.x && shape.gk.x<shape.wide.x);
});

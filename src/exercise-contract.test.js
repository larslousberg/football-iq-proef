import test from 'node:test';
import assert from 'node:assert/strict';
import { EXERCISE_SEQUENCE, RUN_CHOICE_PATHS, SPACE_MAKING_SCENARIO } from './scenarios.js';
import { KEEPER_BUILD_UP_SCENARIO, buildKeeperBuildUpOutcome, isKeeperPassLaneOpen, validateKeeperBuildUpScenario } from './keeper-build-up.js';
import { isExerciseChoiceValid, validateExerciseSequence, validateKvcScenarioGeometry, validateRunChoicePaths } from './exercise-contract.js';
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
  assert.deepEqual(validateKeeperBuildUpScenario(), []);
  assert.deepEqual(validateKvcScenarioGeometry(SPACE_MAKING_SCENARIO, 'run'), []);
});

test('de keeperopbouw begint bij K en opent de passlijn pas na de drukfout', () => {
  const scenario=KEEPER_BUILD_UP_SCENARIO;
  const [angle,pass]=scenario.openingPhases;
  assert.deepEqual(scenario.start.ball,scenario.start.gk);
  assert.equal(isKeeperPassLaneOpen(scenario.start.gk,scenario.start.me,[scenario.start.press]),false);
  assert.equal(isKeeperPassLaneOpen(angle.players.gk,pass.ballTo,[pass.players.press,pass.players.cover]),true);
  assert.equal(pass.receiver,'me');
  assert.deepEqual(pass.ballTo,pass.players.me);
});

test('de rode 2-2 start hoog, houdt twee herkenbare lijnen en schermt SP af', () => {
  const s=KEEPER_BUILD_UP_SCENARIO;
  assert.ok(s.start.press.x<50&&s.start.cover.x<50);
  assert.ok(s.start.interceptor.x>s.start.press.x&&s.start.farDef.x>s.start.cover.x);
  const lineClosed=!isKeeperPassLaneOpen(s.openingPhases[1].players.me,s.openingPhases[1].players.forward,[s.openingPhases[1].players.interceptor]);
  assert.equal(lineClosed,true);
});

test('de drie keeperopbouwkeuzes maken elk hun eigen geanimeerde vervolg', () => {
  const s=KEEPER_BUILD_UP_SCENARIO;
  const decision={...s.openingPhases[1].players,ball:{...s.openingPhases[1].ballTo}};
  const a=buildKeeperBuildUpOutcome('A',structuredClone(decision),0);
  const b=buildKeeperBuildUpOutcome('B',structuredClone(decision),0);
  const c=buildKeeperBuildUpOutcome('C',structuredClone(decision),0);
  assert.equal(a.reading.receiver,'wide');
  assert.equal(a.phases[0].receiver,'wide');
  assert.deepEqual(a.phases[0].ballTo,a.phases[0].players.wide);
  assert.equal(b.reading.laneOpen,false);
  assert.equal(b.phases[0].carrier,'interceptor');
  assert.equal(b.phases[0].interceptionBy,'interceptor');
  assert.equal(c.reading.action,'dribble');
  assert.ok(c.phases.every(phase=>phase.carrier==='me'));
  for(const outcome of [a,b,c])for(const phase of outcome.phases){
    assert.deepEqual(Object.keys(phase.players).sort(),['gk','me','support','wide','forward','oppGk','press','cover','interceptor','farDef'].sort());
    assert.ok(phase.duration>0);
  }
  assert.notDeepEqual(a.phases[0].players,b.phases[0].players);
  assert.notDeepEqual(a.phases[0].players,c.phases[0].players);
});

test('dribbelen reageert op de afstand tot de naderende drukker', () => {
  const s=KEEPER_BUILD_UP_SCENARIO;
  const decision={...s.openingPhases[1].players,ball:{...s.openingPhases[1].ballTo}};
  const early=buildKeeperBuildUpOutcome('C',structuredClone(decision),0);
  const lateState={...structuredClone(decision),press:{...s.decision.pressureTarget}};
  const late=buildKeeperBuildUpOutcome('C',lateState,s.timerMs);
  assert.equal(early.reading.hasRoom,true);
  assert.equal(late.reading.hasRoom,false);
  assert.equal(early.feedback.points,100);
  assert.equal(late.feedback.points,50);
  assert.ok(early.phases[0].players.me.x>late.phases[0].players.me.x);
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

test('de nieuwe pass-/dribbelknoppen horen bij de centrale balbezitter', () => {
  const passExercise=EXERCISE_SEQUENCE[0];
  assert.equal(passExercise.id,KEEPER_BUILD_UP_SCENARIO.id);
  assert.equal(passExercise.type,'pass');
  assert.equal(passExercise.controllerId,'me');
  assert.equal(passExercise.ballCarrierId,'me');
  assert.match(passExercise.choiceLabels.A,/RF\s*\(7\)/);
  assert.match(passExercise.choiceLabels.B,/SP\s*\(9\)/);
  assert.match(passExercise.choiceLabels.C,/Dribbel/);
  assert.equal(KEEPER_BUILD_UP_SCENARIO.choices.A.receiver,'wide');
  assert.equal(KEEPER_BUILD_UP_SCENARIO.choices.B.receiver,'forward');
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
  assert.deepEqual(KEEPER_BUILD_UP_SCENARIO.start.gk,KVC_DIAMOND_START.gk);
  assert.deepEqual(KEEPER_BUILD_UP_SCENARIO.start.me,KVC_DIAMOND_START.me);
  assert.deepEqual(KEEPER_BUILD_UP_SCENARIO.start.support,KVC_DIAMOND_START.support);
  assert.deepEqual(KEEPER_BUILD_UP_SCENARIO.start.wide,KVC_DIAMOND_START.wide);
  assert.deepEqual(KEEPER_BUILD_UP_SCENARIO.start.forward,KVC_DIAMOND_START.forward);
  assert.equal(KEEPER_BUILD_UP_SCENARIO.start.oppGk.x,96);
  assert.ok(KEEPER_BUILD_UP_SCENARIO.start.interceptor.x>KEEPER_BUILD_UP_SCENARIO.start.press.x);
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

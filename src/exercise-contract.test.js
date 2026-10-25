import test from 'node:test';
import assert from 'node:assert/strict';
import { EXERCISE_SEQUENCE } from './scenarios.js';
import { validateExerciseSequence } from './exercise-contract.js';

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

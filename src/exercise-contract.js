const REQUIRED_CHOICES = ['A', 'B', 'C'];

export function isExerciseChoiceValid(exercise, choice) {
  return Boolean(exercise) && (choice === null || REQUIRED_CHOICES.includes(choice));
}

function hasExactChoices(value) {
  if (!value || typeof value !== 'object') return false;
  const keys = Object.keys(value).sort();
  return keys.length === REQUIRED_CHOICES.length && REQUIRED_CHOICES.every((key, index) => keys[index] === key);
}

export function validateExerciseSequence(sequence) {
  const errors = [];
  if (!Array.isArray(sequence) || sequence.length === 0) return ['De oefenreeks moet minstens één oefening bevatten.'];

  const ids = new Set();
  sequence.forEach((exercise, index) => {
    const location = `Oefening ${index + 1}`;
    if (!exercise?.id || ids.has(exercise.id)) errors.push(`${location}: ontbrekende of dubbele id.`);
    else ids.add(exercise.id);
    if (!['pass', 'run'].includes(exercise?.type)) errors.push(`${location}: type moet pass of run zijn.`);
    if (!hasExactChoices(exercise?.choiceLabels) || REQUIRED_CHOICES.some(key => typeof exercise.choiceLabels?.[key] !== 'string' || !exercise.choiceLabels[key].trim())) {
      errors.push(`${location}: er moeten precies drie benoemde keuzes A, B en C zijn.`);
    }
    if (!exercise?.controllerId || !exercise?.ballCarrierId) errors.push(`${location}: bestuurder en balbezitter moeten zijn opgegeven.`);
    else if (exercise.type === 'pass' && exercise.controllerId !== exercise.ballCarrierId) errors.push(`${location}: bij een passoefening bestuurt het kind de balbezitter.`);
    else if (exercise.type === 'run' && exercise.controllerId === exercise.ballCarrierId) errors.push(`${location}: bij een loopoefening bestuurt het kind een speler zonder bal.`);
  });

  return errors;
}

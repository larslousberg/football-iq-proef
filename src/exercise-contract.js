const REQUIRED_CHOICES = ['A', 'B', 'C'];
import { buildKvcDefensiveDiamond } from './football-model.js';

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

function samePoint(a, b) {
  return Boolean(a && b && a.x === b.x && a.y === b.y);
}

function inField(point) {
  return Number.isFinite(point?.x) && Number.isFinite(point?.y)
    && point.x >= 0 && point.x <= 100 && point.y >= 0 && point.y <= 100;
}

export function validateKvcScenarioGeometry(scenario, type) {
  const errors = [];
  if (!scenario?.start || !scenario?.watch || !['pass', 'run'].includes(type)) return ['KVC-scenario mist start, kijkfase of geldig type.'];

  for (const phase of ['start', 'watch']) {
    const players = scenario[phase];
    const label = `${scenario.id || 'Situatie'} (${phase})`;
    for (const id of ['gk', 'me', 'support', 'wide', 'forward', 'ball']) {
      if (!inField(players[id])) errors.push(`${label}: ${id} ligt buiten het veld.`);
    }
    if (players.gk.x >= players.me.x) errors.push(`${label}: K (1) moet achter C (4) staan.`);
    if (players.forward.x <= players.me.x || Math.abs(players.forward.y - 50) > 20) errors.push(`${label}: S (9) moet hoog en centraal blijven.`);
    if (!(players.support.y < players.me.y && players.me.y < players.wide.y)) errors.push(`${label}: LF (11), C (4) en RF (7) moeten hun eigen veldzijde houden.`);
    const defenders = ['press', 'cover', 'interceptor', 'farDef'].map(id => players[id]);
    if (defenders.some(point => !inField(point))) errors.push(`${label}: alle vier tegenstanders moeten op het veld staan.`);
    if (new Set(defenders.map(point => `${point?.x},${point?.y}`)).size !== defenders.length) errors.push(`${label}: tegenstanders mogen niet op dezelfde plek starten.`);
    if (scenario.opponentProfile?.includes('2-2') && defenders.every(inField)) {
      const frontAverage = (players.press.x + players.cover.x) / 2;
      const backAverage = (players.interceptor.x + players.farDef.x) / 2;
      if (frontAverage > backAverage - 5) errors.push(`${label}: de 2-2-ploegen moeten twee herkenbare verdedigingslijnen hebben.`);
    }
  }

  if (type === 'pass' && (!samePoint(scenario.start.ball, scenario.start.support) || !samePoint(scenario.watch.ball, scenario.watch.me))) {
    errors.push('Passsituatie: LF (11) moet de beginsituatie inspelen en C (4) moet de bal op het keuzemoment hebben.');
  }
  if (type === 'run' && (!samePoint(scenario.start.ball, scenario.start.gk) || !samePoint(scenario.watch.ball, scenario.watch.me))) {
    errors.push('Loopoefening: K (1) moet naar C (4) opbouwen; C (4) heeft de bal vóór de loopkeuze.');
  }
  return errors;
}

export function validatePassTargets(scenario) {
  const errors = [];
  if (!hasExactChoices(scenario?.passTargets)) return ['De passoefening moet precies drie ontvangstroutes A, B en C bevatten.'];
  const { watch, passTargets } = scenario;
  if (passTargets.A.receiver !== 'wide' || !inField(watch[passTargets.A.receiver]) || watch[passTargets.A.receiver]?.y <= 50 || !samePoint(watch.ball, watch.me)) errors.push('Pass A moet vertrekken bij C (4) en RF (7) op diens rechterpositie bereiken.');
  if (passTargets.C.receiver !== 'support' || !inField(passTargets.C.reception) || passTargets.C.reception.y >= 50) errors.push('Pass C moet LF (11) links van het veld bereiken.');
  if (passTargets.B.receiver !== 'forward' || !inField(passTargets.B.interception)) errors.push('Pass B moet richting S (9) gaan en een geldige onderscheppositie hebben.');
  else {
    const from = watch.me, to = watch.forward, point = passTargets.B.interception;
    const dx = to.x - from.x, dy = to.y - from.y;
    const lengthSquared = dx * dx + dy * dy;
    const projection = ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared;
    const nearest = { x: from.x + projection * dx, y: from.y + projection * dy };
    if (projection < 0 || projection > 1 || Math.hypot(point.x - nearest.x, point.y - nearest.y) > 2) {
      errors.push('De verdediger moet fysiek in de zichtbare passlijn naar S (9) kunnen onderscheppen.');
    }
  }
  return errors;
}

export function validatePassChoicePaths(paths, watchPositions) {
  const errors=[];
  if(!hasExactChoices(paths))return ['De passoefening moet precies A, B en C als vervolg bevatten.'];
  const playerIds=['gk','support','wide','me','forward','oppGk','press','cover','interceptor','farDef'].sort();
  for(const choice of REQUIRED_CHOICES){
    const phases=paths[choice],label=`Passkeuze ${choice}`;
    if(!Array.isArray(phases)||phases.length<2){errors.push(`${label}: er moeten meerdere vervolgfasen zijn.`);continue;}
    const positions=Object.fromEntries(Object.entries(watchPositions).filter(([id])=>id!=='ball').map(([id,p])=>[id,{...p}]));
    let ball={...watchPositions.ball};
    for(const [index,phase] of phases.entries()){
      if(!Number.isFinite(phase.duration)||phase.duration<=0){errors.push(`${label}, fase ${index+1}: duur moet positief zijn.`);continue;}
      const targets={...phase.players};
      if(Object.keys(targets).sort().join(',')!==playerIds.join(','))errors.push(`${label}, fase ${index+1}: alle tien spelers moeten een doelpositie hebben.`);
      if(phase.defensiveShape==='compactKvcDiamond'&&phase.ballTo){
        const compact=buildKvcDefensiveDiamond(phase.ballTo);
        for(const id of ['gk','me','support','wide','forward'])targets[id]=compact[id];
      }
      for(const [id,target] of Object.entries(targets)){
        if(!positions[id]||!inField(target))errors.push(`${label}, fase ${index+1}: ongeldige speler of doelpositie voor ${id}.`);
        if(positions[id]&&inField(target)){
          const speed=Math.hypot(target.x-positions[id].x,target.y-positions[id].y)/(phase.duration/1000);
          if(speed>32)errors.push(`${label}, fase ${index+1}: ${id} beweegt te ver voor de beschikbare tijd.`);
          positions[id]={...target};
        }
      }
      const ballTarget=phase.carrier?targets[phase.carrier]:phase.receiver||phase.ballTo?phase.ballTo:phase.shot;
      if(phase.receiver&&(!samePoint(phase.ballTo,targets[phase.receiver])))errors.push(`${label}, fase ${index+1}: de pass moet bij de gekozen ontvanger aankomen.`);
      if(phase.carrier&&!targets[phase.carrier])errors.push(`${label}, fase ${index+1}: de baldrager moet een doelpositie hebben.`);
      if(!inField(ballTarget))errors.push(`${label}, fase ${index+1}: de bal heeft geen geldige bestemming.`);
      else{
        const speed=Math.hypot(ballTarget.x-ball.x,ballTarget.y-ball.y)/(phase.duration/1000);
        if(speed>32)errors.push(`${label}, fase ${index+1}: de bal beweegt te snel.`);
        ball={...ballTarget};
      }
    }
  }
  return errors;
}

export function validateRunChoicePaths(paths, watchPositions) {
  const errors = [];
  if (!hasExactChoices(paths)) return ['De loopanimaties moeten precies A, B en C bevatten.'];

  for (const choice of REQUIRED_CHOICES) {
    const phases = paths[choice];
    const label = `Loopkeuze ${choice}`;
    if (!Array.isArray(phases) || phases.length < 2) {
      errors.push(`${label}: er moeten meerdere vervolgfasen zijn.`);
      continue;
    }
    const positions = Object.fromEntries(Object.entries(watchPositions).map(([id, point]) => [id, { ...point }]));
    let ball = { ...watchPositions.ball };
    for (const [index, phase] of phases.entries()) {
      if (!Number.isFinite(phase.duration) || phase.duration <= 0) {
        errors.push(`${label}, fase ${index + 1}: duur moet positief zijn.`);
        continue;
      }
      for (const [id, target] of Object.entries(phase.players || {})) {
        if (!positions[id] || !inField(target)) errors.push(`${label}, fase ${index + 1}: onbekende speler of doelpositie voor ${id}.`);
        if (id === 'support' && target.y >= 50) errors.push(`${label}: LF (11) mag niet naar de rechterkant oversteken.`);
        if (id === 'wide' && target.y <= 50) errors.push(`${label}: RF (7) mag niet naar de linkerkant oversteken.`);
        if (id === 'forward' && (target.x <= positions.me.x || Math.abs(target.y - 50) > 20)) errors.push(`${label}: S (9) moet hoog en betrokken blijven.`);
        if (positions[id] && inField(target)) {
          const distance = Math.hypot(target.x - positions[id].x, target.y - positions[id].y);
          if (distance / (phase.duration / 1000) > 32) errors.push(`${label}, fase ${index + 1}: ${id} beweegt te ver voor de beschikbare tijd.`);
          positions[id] = { ...target };
        }
      }
      let ballTarget = null;
      if (phase.carrier) ballTarget = phase.players?.[phase.carrier];
      else if (phase.receiver) {
        ballTarget = phase.ballTo;
        if (!samePoint(ballTarget, phase.players?.[phase.receiver])) errors.push(`${label}, fase ${index + 1}: bal en ontvanger vallen niet samen.`);
      } else if (phase.shot) ballTarget = phase.shot;
      if (!inField(ballTarget)) errors.push(`${label}, fase ${index + 1}: bal heeft geen geldige bestemming.`);
      else {
        if (Math.hypot(ballTarget.x - ball.x, ballTarget.y - ball.y) / (phase.duration / 1000) > 32) errors.push(`${label}, fase ${index + 1}: bal beweegt te snel.`);
        ball = { ...ballTarget };
      }
    }
  }
  return errors;
}

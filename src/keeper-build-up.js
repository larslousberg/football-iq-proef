import { KVC_DIAMOND_START, OPPONENT_ATTACK_DIRECTION, getFormationAnchors } from './football-model.js';

const opponent = getFormationAnchors('2-2', OPPONENT_ATTACK_DIRECTION);

const actorIds = ['gk', 'me', 'support', 'wide', 'forward', 'oppGk', 'press', 'cover', 'interceptor', 'farDef'];

function targets(overrides) {
  return Object.fromEntries(actorIds.map(id => [id, { ...overrides[id] }]));
}

export const KEEPER_BUILD_UP_SCENARIO = {
  id: 'keeper-leest-hoge-druk-01',
  title: 'Kijk vóór je de bal krijgt',
  type: 'pass',
  opponentFormation: '2-2',
  opponentAttackDirection: OPPONENT_ATTACK_DIRECTION,
  timerMs: 2700,
  start: {
    ...KVC_DIAMOND_START,
    oppGk: opponent.keeper,
    // The first red attacker starts in the keeper-to-C lane; the second
    // attacker screens the lower flank. Both are already high in KVC territory.
    press: { x: 18, y: 50 },
    cover: { x: 38, y: 68 },
    interceptor: { x: 55, y: 39 },
    farDef: { x: 61, y: 80 },
    ball: { ...KVC_DIAMOND_START.gk },
  },
  openingPhases: [
    {
      name: 'central-makes-angle',
      duration: 1300,
      carrier: 'gk',
      players: targets({
        gk: { x: 9, y: 50 },
        me: { x: 34, y: 41 },
        support: { x: 43, y: 14 },
        wide: { x: 43, y: 86 },
        forward: { x: 60, y: 52 },
        oppGk: { x: 96, y: 50 },
        // The attacker chooses the wrong angle and runs toward the keeper's
        // near side instead of continuing to screen C's new passing lane.
        press: { x: 17, y: 37 },
        cover: { x: 36, y: 64 },
        interceptor: { x: 53, y: 46 },
        farDef: { x: 61, y: 79 },
      }),
    },
    {
      name: 'keeper-plays-to-central',
      duration: 1550,
      receiver: 'me',
      ballTo: { x: 34, y: 41 },
      players: targets({
        gk: { x: 9, y: 50 },
        me: { x: 34, y: 41 },
        support: { x: 43, y: 14 },
        wide: { x: 43, y: 86 },
        forward: { x: 60, y: 52 },
        oppGk: { x: 96, y: 50 },
        press: { x: 20, y: 35 },
        cover: { x: 36, y: 63 },
        interceptor: { x: 53, y: 47 },
        farDef: { x: 60, y: 79 },
      }),
    },
  ],
  decision: {
    controllerId: 'me',
    ballCarrierId: 'me',
    pressurePlayerId: 'press',
    pressureTarget: { x: 33, y: 40.5 },
    pressureDescription: 'De verdediger komt op C af.',
  },
  choices: {
    A: { label: 'Naar RF (7)', action: 'pass', receiver: 'wide' },
    B: { label: 'Zoek SP (9)', action: 'pass', receiver: 'forward' },
    C: { label: 'Dribbel vooruit', action: 'dribble' },
  },
};

function metersBetween(a, b) {
  const dx = (a.x - b.x) * 0.35;
  const dy = (a.y - b.y) * 0.25;
  return Math.hypot(dx, dy);
}

function pointSegmentDistanceMeters(point, from, to) {
  const scale = p => ({ x: p.x * 0.35, y: p.y * 0.25 });
  const p = scale(point), a = scale(from), b = scale(to);
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (!lenSq) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0.08, Math.min(0.92, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function isKeeperPassLaneOpen(from, to, defenders, clearanceMeters = 1.15) {
  return defenders.every(defender => pointSegmentDistanceMeters(defender, from, to) > clearanceMeters);
}

function makePhase(duration, players, extra = {}) {
  return { duration, players: targets(players), ...extra };
}

function allOpponents(world) {
  return ['press', 'cover', 'interceptor', 'farDef'].map(id => world[id]);
}

export function buildKeeperBuildUpOutcome(choice, world, elapsedMs = 0) {
  const definition = KEEPER_BUILD_UP_SCENARIO.choices[choice];
  if (!definition || !world?.me || !world?.ball) throw new Error('Ongeldige keuze of veldsituatie voor de keeperopbouw.');

  const pressureMeters = metersBetween(world.press, world.me);
  const route = {
    A: { receiver: 'wide', target: { x: 47, y: 85 } },
    B: { receiver: 'forward', target: { ...world.forward }, interception: { x: 48, y: 47 } },
  }[choice];

  if (choice === 'A') {
    // A nearby presser can threaten the first touch without blocking the
    // passing corridor several metres farther downfield.
    const corridorDefenders = allOpponents(world).filter(defender => metersBetween(defender, world.me) > 1.3);
    const clear = isKeeperPassLaneOpen(world.me, route.target, corridorDefenders);
    if (!clear) {
      // The scenario deliberately keeps RF free; fail loudly if later edits
      // accidentally put a red player in the actual passing corridor.
      throw new Error('De passlijn van C (4) naar RF (7) is niet vrij in de keeperopbouw.');
    }
    return {
      phases: [
        makePhase(1800, {
          gk: { x: 12, y: 50 }, me: { x: 37, y: 42 }, support: { x: 43, y: 14 }, wide: route.target,
          forward: { x: 64, y: 52 }, oppGk: { x: 96, y: 50 }, press: { x: 31, y: 40 },
          cover: { x: 36, y: 63 }, interceptor: { x: 53, y: 47 }, farDef: { x: 60, y: 79 },
        }, { receiver: 'wide', ballTo: route.target }),
        makePhase(900, {
          gk: { x: 14, y: 50 }, me: { x: 40, y: 43 }, support: { x: 44, y: 14 }, wide: { x: 53, y: 85 },
          forward: { x: 67, y: 51 }, oppGk: { x: 96, y: 50 }, press: { x: 39, y: 45 },
          cover: { x: 43, y: 74 }, interceptor: { x: 57, y: 48 }, farDef: { x: 60, y: 80 },
        }, { carrier: 'wide' }),
      ],
      feedback: {
        title: 'Goede keuze: de flank was vrij.',
        text: 'RF (7) stond breed en vrij. Je speelde naar de open kant en hielp je ploeg vooruit.',
        points: 100, mark: '✓', className: '',
      },
      reading: { action: 'pass', receiver: 'wide', laneOpen: true, pressureMeters, elapsedMs },
    };
  }

  if (choice === 'B') {
    const lineClosed = !isKeeperPassLaneOpen(world.me, world.forward, [world.interceptor], 1.15);
    if (!lineClosed) throw new Error('De passlijn naar SP (9) is onverwacht vrij; pas de oefensituatie aan.');
    const interception = route.interception;
    const homeShape = {
      ...world,
      ...{
        gk: { x: 22, y: 50 }, me: { x: 45, y: 47 }, support: { x: 37, y: 29 },
        wide: { x: 37, y: 65 }, forward: { x: 56, y: 50 },
      },
    };
    return {
      phases: [
        makePhase(1050, {
          gk: { x: 13, y: 50 }, me: { x: 35, y: 42 }, support: { x: 42, y: 15 }, wide: { x: 42, y: 85 },
          forward: { x: 58, y: 51 }, oppGk: { x: 96, y: 50 }, press: { x: 27, y: 39 },
          cover: { x: 38, y: 63 }, interceptor: interception, farDef: { x: 60, y: 78 },
        }, { carrier: 'interceptor', interceptionBy: 'interceptor' }),
        makePhase(900, {
          ...homeShape,
          oppGk: { x: 96, y: 50 }, press: { x: 24, y: 40 }, cover: { x: 39, y: 64 },
          interceptor: { x: 46, y: 47 }, farDef: { x: 58, y: 77 },
        }, { carrier: 'interceptor' }),
      ],
      feedback: {
        title: 'Je zag SP (9), maar de lijn was dicht.',
        text: 'Goed dat je vooruit keek. De rode verdediger stond in de passlijn. RF (7) was vrij aan de zijkant.',
        points: 20, mark: '↗', className: 'retry-mark',
      },
      reading: { action: 'pass', receiver: 'forward', laneOpen: false, interception, pressureMeters, elapsedMs },
    };
  }

  if (choice === 'C') {
    const hasRoom = pressureMeters > 2.0;
    const firstTarget = hasRoom ? { x: 43, y: 41 } : { x: 36, y: 42 };
    const secondTarget = hasRoom ? { x: 49, y: 41 } : { x: 34, y: 44 };
    const nextPress = hasRoom ? { x: 31, y: 40 } : { x: 33, y: 42 };
    return {
      phases: [
        makePhase(hasRoom ? 1300 : 850, {
          gk: { x: 12, y: 50 }, me: firstTarget, support: { x: 43, y: 14 }, wide: { x: 44, y: 86 },
          forward: { x: 63, y: 52 }, oppGk: { x: 96, y: 50 }, press: nextPress,
          cover: hasRoom ? { x: 39, y: 60 } : { x: 38, y: 61 },
          interceptor: hasRoom ? { x: 51, y: 44 } : { x: 52, y: 45 }, farDef: { x: 60, y: 79 },
        }, { carrier: 'me' }),
        makePhase(hasRoom ? 950 : 800, {
          gk: { x: 14, y: 50 }, me: secondTarget, support: { x: 44, y: 14 }, wide: { x: 45, y: 86 },
          forward: { x: 65, y: 51 }, oppGk: { x: 96, y: 50 },
          press: hasRoom ? { x: 38, y: 40 } : { x: 33, y: 43 },
          cover: hasRoom ? { x: 42, y: 58 } : { x: 37, y: 60 },
          interceptor: hasRoom ? { x: 48, y: 43 } : { x: 51, y: 45 }, farDef: { x: 60, y: 79 },
        }, { carrier: 'me' }),
      ],
      feedback: hasRoom ? {
        title: 'Je zag ruimte voor je.',
        text: 'Je dribbelde vooruit. De druk kwam van achteren en jij won terrein met de bal aan je voet.',
        points: 100, mark: '✓', className: '',
      } : {
        title: 'De ruimte werd kleiner.',
        text: 'Je probeerde vooruit te dribbelen. De verdediger kwam dichtbij; kijk dan ook naar de vrije flank.',
        points: 50, mark: '✓', className: '',
      },
      reading: { action: 'dribble', receiver: null, laneOpen: true, pressureMeters, hasRoom, elapsedMs },
    };
  }

  return null;
}

export function validateKeeperBuildUpScenario(scenario = KEEPER_BUILD_UP_SCENARIO) {
  const errors = [];
  const required = new Set(actorIds);
  const lineupKeys = Object.keys(scenario?.start || {}).filter(id => id !== 'ball').sort();
  if (!scenario || scenario.type !== 'pass') errors.push('Keeperopbouw moet een passoefening zijn.');
  if (lineupKeys.length !== 10 || lineupKeys.some(id => !required.has(id)) || [...required].some(id => !lineupKeys.includes(id))) {
    errors.push('De keeperopbouw moet tien spelers bevatten.');
  }
  if (!scenario?.start || scenario.start.ball?.x !== scenario.start.gk?.x || scenario.start.ball?.y !== scenario.start.gk?.y) {
    errors.push('K (1) moet met de bal beginnen.');
  }
  if (scenario?.start?.gk?.x >= scenario?.start?.me?.x
    || scenario?.start?.support?.y >= 50 || scenario?.start?.wide?.y <= 50
    || scenario?.start?.forward?.x <= scenario?.start?.me?.x) {
    errors.push('De KVC-ploeg moet in een herkenbare aanvallende ruit starten.');
  }
  if (scenario?.opponentAttackDirection !== OPPONENT_ATTACK_DIRECTION
    || scenario?.start?.oppGk?.x < 90
    || scenario?.start?.press?.x >= 50 || scenario?.start?.cover?.x >= 50
    || scenario?.start?.interceptor?.x <= scenario?.start?.press?.x
    || scenario?.start?.farDef?.x <= scenario?.start?.cover?.x) {
    errors.push('De rode 2-2 moet naar links aanvallen met twee hoge aanvallers en twee spelers erachter.');
  }
  if (!scenario?.openingPhases || scenario.openingPhases.length !== 2) errors.push('De keeperopbouw moet eerst de druk lezen en daarna naar C opbouwen.');
  if (scenario?.openingPhases?.length === 2) {
    const [angle, pass] = scenario.openingPhases;
    for (const [index, phase] of scenario.openingPhases.entries()) {
      if (!Number.isFinite(phase.duration) || phase.duration <= 0) errors.push(`Openingsfase ${index + 1} moet een geldige duur hebben.`);
      if (Object.keys(phase.players || {}).length !== 10) errors.push(`Openingsfase ${index + 1} moet alle tien spelers bewegen of positioneren.`);
      for (const id of actorIds) {
        if (!Number.isFinite(phase.players?.[id]?.x) || !Number.isFinite(phase.players?.[id]?.y)
          || phase.players[id].x < 0 || phase.players[id].x > 100 || phase.players[id].y < 0 || phase.players[id].y > 100) {
          errors.push(`Openingsfase ${index + 1}: ${id} moet op het veld blijven.`);
        }
      }
    }
    if (angle.carrier !== 'gk' || pass.receiver !== 'me' || pass.players?.me?.x !== pass.ballTo?.x || pass.players?.me?.y !== pass.ballTo?.y) {
      errors.push('De keeper moet de bal naar de centrale speler spelen die de pass kan ontvangen.');
    }
    // The initial lane is intentionally blocked; after C moves and the attacker
    // chooses the wrong pressure angle, the keeper may play the pass.
    if (isKeeperPassLaneOpen(scenario.start.gk, scenario.start.me, [scenario.start.press])) {
      errors.push('De eerste rode aanvaller moet de aanvankelijke K-C-passlijn sluiten.');
    }
    if (!isKeeperPassLaneOpen(angle.players.gk, pass.ballTo, [pass.players.press, pass.players.cover])) {
      errors.push('K (1) mag niet door een afgedekte passlijn naar C (4) spelen.');
    }
    const pressureSpeed=metersBetween(pass.players[scenario.decision?.pressurePlayerId],scenario.decision?.pressureTarget)/(scenario.timerMs/1000);
    if (!Number.isFinite(pressureSpeed) || pressureSpeed < 1.1 || pressureSpeed > 3.6) {
      errors.push('De drukactie moet de balhouder tijdens de timer met geloofwaardige snelheid bereiken.');
    }
  }
  const choiceKeys = Object.keys(scenario?.choices || {}).sort();
  if (choiceKeys.join(',') !== 'A,B,C') errors.push('Er moeten precies drie pass-/dribbelkeuzes zijn.');
  if (scenario?.choices?.A?.action !== 'pass' || scenario.choices.A.receiver !== 'wide'
    || scenario?.choices?.B?.action !== 'pass' || scenario.choices.B.receiver !== 'forward'
    || scenario?.choices?.C?.action !== 'dribble') errors.push('De drie keuzes moeten een flankpass, pass naar de spits en voorwaartse dribbel bevatten.');
  if (!Number.isFinite(scenario?.timerMs) || scenario.timerMs < 1800 || scenario.timerMs > 4000
    || !scenario?.decision?.pressurePlayerId || !scenario?.decision?.pressureTarget) {
    errors.push('De beslissingstimer moet gekoppeld zijn aan de naderende verdediger.');
  }
  return errors;
}

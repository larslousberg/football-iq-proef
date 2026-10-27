// Canonical pitch coordinates are independent of the current camera:
// x=0 is KVC's own goal, x=100 the opponent goal, y=0 the top touchline.
export const PITCH = Object.freeze({ lengthMeters: 35, widthMeters: 25, grid: Object.freeze({ x: 20, y: 12 }) });
export const KVC_ATTACK_DIRECTION = 1;
export const OPPONENT_ATTACK_DIRECTION = -1;

export const HOME_ROLES = Object.freeze({
  gk: Object.freeze({ role: 'keeper', number: 1, label: 'K (1)' }),
  me: Object.freeze({ role: 'central', number: 4, label: 'C (4)' }),
  support: Object.freeze({ role: 'leftWing', number: 11, label: 'LF (11)' }),
  wide: Object.freeze({ role: 'rightWing', number: 7, label: 'RF (7)' }),
  forward: Object.freeze({ role: 'striker', number: 9, label: 'S (9)' }),
});

// Anchor coordinates from the master specification, expressed in the canonical
// field space. These are design anchors for a 1-2-1 diamond, not mandatory
// positions for every live moment in an exercise.
export const KVC_DIAMOND_START = Object.freeze({
  gk: Object.freeze({ x: 8, y: 50 }),
  me: Object.freeze({ x: 28, y: 50 }),
  support: Object.freeze({ x: 42, y: 15 }),
  wide: Object.freeze({ x: 42, y: 85 }),
  forward: Object.freeze({ x: 57, y: 50 }),
});

// Outfield anchor positions are written as if the team attacks to the right.
// Opponent coordinates are mirrored through the field's centre, including the
// lateral side, because that team attacks to the left.
const FORMATION_ANCHORS = Object.freeze({
  '1-2-1': Object.freeze({
    keeper: { x: 8, y: 50 }, back: { x: 28, y: 50 }, left: { x: 42, y: 15 },
    right: { x: 42, y: 85 }, forward: { x: 57, y: 50 },
  }),
  '2-2': Object.freeze({
    keeper: { x: 4, y: 50 }, backLeft: { x: 23, y: 34 }, backRight: { x: 23, y: 66 },
    frontLeft: { x: 45, y: 34 }, frontRight: { x: 45, y: 66 },
  }),
  '2-1-1': Object.freeze({
    keeper: { x: 4, y: 50 }, backLeft: { x: 22, y: 35 }, backRight: { x: 22, y: 65 },
    midfield: { x: 38, y: 50 }, forward: { x: 57, y: 50 },
  }),
});

export const KVC_ZONES = Object.freeze({
  length: Object.freeze(['E', 'D', 'C', 'B', 'A']), // E own goal, A opponent goal
  width: Object.freeze(['1', '2', '3']),
});

export function fieldPoint(x, y) { return { x, y }; }

export function mirrorPointForOpposition(point) {
  return { x: 100 - point.x, y: 100 - point.y };
}

export function getFormationAnchors(formation, direction = KVC_ATTACK_DIRECTION) {
  const anchors = FORMATION_ANCHORS[formation];
  if (!anchors) throw new Error(`Onbekende formatie: ${formation}`);
  const mirrored = direction === OPPONENT_ATTACK_DIRECTION;
  return Object.fromEntries(Object.entries(anchors).map(([role, point]) => [
    role,
    mirrored ? mirrorPointForOpposition(point) : { ...point },
  ]));
}

export function getKvcZone(point) {
  const x = Math.max(0, Math.min(99.999, point.x));
  const y = Math.max(0, Math.min(99.999, point.y));
  const lengthIndex = Math.floor(x / 20);
  const widthIndex = Math.min(2, Math.floor(y / (100 / 3)));
  return `${KVC_ZONES.length[lengthIndex]}${KVC_ZONES.width[widthIndex]}`;
}

// The existing Phaser actor layer uses the old vertical scene axes. These two
// adapters keep that animation data working while the tactical model stays in
// canonical, camera-independent field coordinates.
export function fieldToScene(point) { return { x: point.y, y: 100 - point.x }; }
export function sceneToField(point) { return { x: 100 - point.y, y: point.x }; }

export function migrateLegacyAnimationToField(value) {
  if (Array.isArray(value)) return value.map(migrateLegacyAnimationToField);
  if (!value || typeof value !== 'object') return value;
  if (Number.isFinite(value.x) && Number.isFinite(value.y)) return sceneToField(value);
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, migrateLegacyAnimationToField(child)]));
}

export function buildKvcDefensiveDiamond(ball) {
  const clamp = value => Math.max(8, Math.min(92, value));
  return {
    me: { x: clamp(ball.x - 3), y: clamp(ball.y) }, // nearest KVC player presses
    support: { x: clamp(ball.x - 11), y: Math.min(49, clamp(ball.y - 11)) },
    wide: { x: clamp(ball.x - 11), y: Math.max(51, clamp(ball.y + 11)) },
    forward: { x: clamp(ball.x + 8), y: 50 }, // closes the first central outlet
    gk: { x: clamp(ball.x - 23), y: 50 }, // supports behind the compact shape
  };
}

export function mapLineupToScene(lineup) {
  return Object.fromEntries(Object.entries(lineup).map(([id, point]) => [id, fieldToScene(point)]));
}

export function validateLineup(lineup, { formation = '1-2-1', direction = KVC_ATTACK_DIRECTION } = {}) {
  const errors = [];
  const expectedKeys = formation === '1-2-1'
    ? ['gk', 'me', 'support', 'wide', 'forward']
    : null;
  if (!lineup || typeof lineup !== 'object') return ['Opstelling ontbreekt.'];
  if (expectedKeys && (Object.keys(lineup).length !== 5 || expectedKeys.some(key => !lineup[key]))) {
    errors.push('Een opstelling moet een keeper en vier veldspelers bevatten.');
  }
  if (direction === KVC_ATTACK_DIRECTION && formation === '1-2-1') {
    if (lineup.gk?.x >= lineup.me?.x) errors.push('De KVC-keeper hoort achter de centrale speler.');
    if (lineup.support?.y >= 50) errors.push('De KVC-linkerflank hoort bovenaan bij aanvallen naar rechts.');
    if (lineup.wide?.y <= 50) errors.push('De KVC-rechterflank hoort onderaan bij aanvallen naar rechts.');
    if (lineup.forward?.x <= lineup.me?.x) errors.push('De spits hoort hoger dan de centrale speler.');
  }
  return errors;
}

export function validateScenarioLineups({ home, away }) {
  const errors = [];
  for (const [team, lineup] of [['KVC', home], ['tegenstander', away]]) {
    if (!lineup || Object.keys(lineup).length !== 5) errors.push(`${team}: exact vijf spelers vereist.`);
  }
  if (home && validateLineup(home).length) errors.push(...validateLineup(home).map(error => `KVC: ${error}`));
  return errors;
}

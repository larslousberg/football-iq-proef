// Coördinaten zijn percentages van het veld, zodat de scènes op mobiel schalen.
// De passscène begint in een aanvallende ruit: K ondersteunt, C heeft zicht,
// de flanken geven breedte en S blijft hoog. Na de bal naar C schuift RF hoger.
export const PASS_SCENARIO = {
  opponentProfile: 'Compact 2-2',
  passTargets: {
    A: { receiver: 'wide' },
    B: { receiver: 'forward', interception: { x: 51, y: 40 } },
    C: { receiver: 'support', reception: { x: 29, y: 66 } },
  },
  start: {
    gk: { x: 50, y: 90 }, support: { x: 27, y: 66 }, wide: { x: 76, y: 58 },
    me: { x: 50, y: 60 }, forward: { x: 52, y: 27 },
    oppGk: { x: 50, y: 5 }, press: { x: 45, y: 48 }, cover: { x: 61, y: 48 },
    interceptor: { x: 49, y: 38 }, farDef: { x: 70, y: 37 }, ball: { x: 27, y: 66 },
  },
  watch: {
    gk: { x: 50, y: 86 }, support: { x: 26, y: 64 }, wide: { x: 77, y: 47 },
    me: { x: 50, y: 57 }, forward: { x: 52, y: 25 },
    oppGk: { x: 50, y: 5 }, press: { x: 45, y: 46 }, cover: { x: 60, y: 46 },
    interceptor: { x: 50, y: 37 }, farDef: { x: 72, y: 35 }, ball: { x: 50, y: 57 },
  },
};

// Loopactie-oefening: keeper als steun achter C, beide flanken breed, S hoog.
export const SPACE_MAKING_SCENARIO = {
  id: 'spits-maakt-ruimte-01',
  title: 'Maak jij ruimte voor RF?',
  opponentProfile: 'Compact vierkant 2-2',
  playerLabels: {
    gk: 'K (1)', support: 'LF (11)', wide: 'RF (7)', me: 'C (4)', forward: 'S (9)',
    oppGk: 'K', press: 'T1', cover: 'T2', interceptor: 'T3', farDef: 'T4',
  },
  start: {
    gk: { x: 50, y: 90 }, support: { x: 26, y: 52 }, wide: { x: 75, y: 52 },
    me: { x: 50, y: 64 }, forward: { x: 52, y: 27 },
    oppGk: { x: 50, y: 5 }, press: { x: 44, y: 46 }, cover: { x: 59, y: 46 },
    interceptor: { x: 47, y: 32 }, farDef: { x: 76, y: 32 }, ball: { x: 50, y: 90 },
  },
  watch: {
    gk: { x: 50, y: 84 }, support: { x: 26, y: 54 }, wide: { x: 75, y: 44 },
    me: { x: 50, y: 61 }, forward: { x: 52, y: 26 },
    oppGk: { x: 50, y: 5 }, press: { x: 44, y: 46 }, cover: { x: 59, y: 46 },
    interceptor: { x: 47, y: 31 }, farDef: { x: 76, y: 32 }, ball: { x: 50, y: 61 },
  },
  choices: {
    A: { label: 'Kom naar de bal', points: 100, title: 'Je komt naar de bal.',
      feedback: 'Je werd kort aanspeelbaar. De verdediger kwam mee; kijk welke ruimte achter hem ontstond.' },
    B: { label: 'Blijf diep', points: 50, title: 'Je houdt de verdediger bezig.',
      feedback: 'Je bleef hoog en hield de verdediger bij het doel. RF bleef breed en C kon vooruit kijken.' },
    C: { label: 'Loop schuin weg', points: 100, title: 'Je maakt ruimte met je loopactie.',
      feedback: 'Je lokte de verdediger naar links. Daardoor kwam rechts ruimte voor RF. Mooi gezien!' },
  },
};

// Gevolgen van de loopkeuze zijn als scenario-mijlpalen vastgelegd; de Phaser
// scene speelt ze af. Zo blijven posities controleerbaar zonder wedstrijd-AI.
export const RUN_CHOICE_PATHS = {
  A: [
    { duration: 850, carrier: 'me', players: {
      forward: { x: 54, y: 38 }, interceptor: { x: 51, y: 35 }, wide: { x: 79, y: 43 },
      support: { x: 25, y: 57 }, press: { x: 48, y: 48 }, cover: { x: 57, y: 44 },
      farDef: { x: 75, y: 35 }, gk: { x: 51, y: 82 }, me: { x: 51, y: 60 }, oppGk: { x: 50, y: 6 },
    } },
    { duration: 1050, receiver: 'forward', ballTo: { x: 54, y: 38 }, players: {
      forward: { x: 54, y: 38 }, interceptor: { x: 53, y: 36 }, wide: { x: 79, y: 43 },
      support: { x: 26, y: 57 }, press: { x: 51, y: 49 }, cover: { x: 55, y: 43 },
      farDef: { x: 73, y: 36 }, gk: { x: 50, y: 82 }, me: { x: 50, y: 59 }, oppGk: { x: 50, y: 6 },
    } },
    { duration: 800, receiver: 'me', ballTo: { x: 50, y: 58 }, players: {
      forward: { x: 54, y: 37 }, interceptor: { x: 53, y: 35 }, wide: { x: 80, y: 42 },
      support: { x: 27, y: 56 }, press: { x: 52, y: 48 }, cover: { x: 54, y: 43 },
      farDef: { x: 73, y: 36 }, gk: { x: 50, y: 81 }, me: { x: 50, y: 58 }, oppGk: { x: 50, y: 6 },
    } },
  ],
  B: [
    { duration: 800, carrier: 'me', players: {
      forward: { x: 52, y: 24 }, interceptor: { x: 52, y: 29 }, wide: { x: 77, y: 43 },
      support: { x: 25, y: 57 }, press: { x: 49, y: 48 }, cover: { x: 57, y: 44 },
      farDef: { x: 75, y: 34 }, gk: { x: 51, y: 82 }, me: { x: 51, y: 60 }, oppGk: { x: 50, y: 6 },
    } },
    { duration: 1200, receiver: 'wide', ballTo: { x: 77, y: 43 }, players: {
      forward: { x: 52, y: 24 }, interceptor: { x: 52, y: 29 }, wide: { x: 77, y: 43 },
      support: { x: 26, y: 57 }, press: { x: 58, y: 49 }, cover: { x: 57, y: 43 },
      farDef: { x: 72, y: 39 }, gk: { x: 50, y: 81 }, me: { x: 54, y: 57 }, oppGk: { x: 50, y: 6 },
    } },
    { duration: 650, carrier: 'wide', players: {
      forward: { x: 52, y: 24 }, interceptor: { x: 52, y: 29 }, wide: { x: 77, y: 40 },
      support: { x: 26, y: 56 }, press: { x: 62, y: 47 }, cover: { x: 58, y: 41 },
      farDef: { x: 72, y: 37 }, gk: { x: 50, y: 80 }, me: { x: 56, y: 54 }, oppGk: { x: 50, y: 6 },
    } },
  ],
  C: [
    { duration: 850, carrier: 'me', players: {
      forward: { x: 43, y: 36 }, interceptor: { x: 45, y: 34 }, wide: { x: 75, y: 44 },
      support: { x: 26, y: 56 }, press: { x: 49, y: 47 }, cover: { x: 56, y: 43 },
      farDef: { x: 75, y: 32 }, gk: { x: 50, y: 82 }, me: { x: 50, y: 61 }, oppGk: { x: 50, y: 6 },
    } },
    { duration: 1450, receiver: 'wide', ballTo: { x: 64, y: 34 }, players: {
      forward: { x: 43, y: 36 }, interceptor: { x: 45, y: 34 }, wide: { x: 64, y: 34 },
      support: { x: 27, y: 56 }, press: { x: 50, y: 48 }, cover: { x: 57, y: 43 },
      farDef: { x: 70, y: 34 }, gk: { x: 50, y: 82 }, me: { x: 52, y: 57 }, oppGk: { x: 50, y: 6 },
    } },
    { duration: 1100, carrier: 'wide', players: {
      forward: { x: 43, y: 31 }, interceptor: { x: 45, y: 30 }, wide: { x: 61, y: 20 },
      support: { x: 27, y: 55 }, press: { x: 55, y: 44 }, cover: { x: 60, y: 34 },
      farDef: { x: 65, y: 27 }, gk: { x: 50, y: 78 }, me: { x: 53, y: 48 }, oppGk: { x: 55, y: 7 },
    } },
    { duration: 550, carrier: 'wide', players: {
      forward: { x: 45, y: 29 }, interceptor: { x: 48, y: 28 }, wide: { x: 59, y: 16 },
      support: { x: 28, y: 54 }, press: { x: 56, y: 43 }, cover: { x: 58, y: 32 },
      farDef: { x: 63, y: 22 }, gk: { x: 50, y: 78 }, me: { x: 55, y: 46 }, oppGk: { x: 56, y: 6 },
    } },
    { duration: 650, shot: { x: 47, y: 1 }, players: {
      forward: { x: 48, y: 20 }, interceptor: { x: 49, y: 27 }, wide: { x: 58, y: 15 },
      support: { x: 35, y: 51 }, press: { x: 56, y: 40 }, cover: { x: 54, y: 30 },
      farDef: { x: 62, y: 20 }, gk: { x: 50, y: 78 }, me: { x: 56, y: 44 }, oppGk: { x: 58, y: 5 },
    } },
  ],
};

// Eén centrale reeks houdt speler, keuze-etiketten en afhandeling per oefening bij elkaar.
export const EXERCISE_SEQUENCE = [
  {
    id: 'pass-centrale-speler', type: 'pass', role: 'centrale speler (4)', shortRole: 'C (4)',
    controllerId: 'me', ballCarrierId: 'me',
    choiceLabels: { A: 'Speel naar rechts', B: 'Speel centraal', C: 'Speel terug' },
  },
  {
    id: SPACE_MAKING_SCENARIO.id, type: 'run', role: 'spits (9)', shortRole: 'S (9)',
    controllerId: 'forward', ballCarrierId: 'me',
    choiceLabels: {
      A: SPACE_MAKING_SCENARIO.choices.A.label,
      B: SPACE_MAKING_SCENARIO.choices.B.label,
      C: SPACE_MAKING_SCENARIO.choices.C.label,
    },
  },
];

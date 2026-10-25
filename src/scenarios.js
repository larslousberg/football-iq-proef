// Coördinaten zijn percentages van het veld, zodat de scènes op mobiel schalen.
// De passscène begint in een aanvallende ruit: K ondersteunt, C heeft zicht,
// de flanken geven breedte en S blijft hoog. Na de bal naar C schuift RF hoger.
export const PASS_SCENARIO = {
  start: {
    gk: { x: 50, y: 90 }, support: { x: 29, y: 67 }, wide: { x: 76, y: 53 },
    me: { x: 50, y: 60 }, forward: { x: 52, y: 27 },
    oppGk: { x: 50, y: 5 }, press: { x: 60, y: 42 }, cover: { x: 42, y: 42 },
    interceptor: { x: 60, y: 50 }, farDef: { x: 42, y: 50 }, ball: { x: 29, y: 67 },
  },
  watch: {
    gk: { x: 50, y: 86 }, support: { x: 27, y: 63 }, wide: { x: 78, y: 48 },
    me: { x: 50, y: 57 }, forward: { x: 53, y: 25 },
    oppGk: { x: 50, y: 5 }, press: { x: 59, y: 42 }, cover: { x: 43, y: 42 },
    interceptor: { x: 59, y: 48 }, farDef: { x: 42, y: 50 }, ball: { x: 50, y: 57 },
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
    gk: { x: 50, y: 90 }, support: { x: 25, y: 50 }, wide: { x: 76, y: 50 },
    me: { x: 50, y: 64 }, forward: { x: 52, y: 28 },
    oppGk: { x: 50, y: 5 }, press: { x: 41, y: 45 }, cover: { x: 59, y: 45 },
    interceptor: { x: 45, y: 32 }, farDef: { x: 66, y: 32 }, ball: { x: 50, y: 90 },
  },
  watch: {
    gk: { x: 50, y: 84 }, support: { x: 26, y: 54 }, wide: { x: 75, y: 44 },
    me: { x: 50, y: 61 }, forward: { x: 52, y: 26 },
    oppGk: { x: 50, y: 5 }, press: { x: 44, y: 46 }, cover: { x: 58, y: 46 },
    interceptor: { x: 47, y: 31 }, farDef: { x: 66, y: 34 }, ball: { x: 50, y: 61 },
  },
  choices: {
    A: { label: 'Kom naar de bal', points: 100, title: 'Je komt naar de bal.',
      feedback: 'Je werd kort aanspeelbaar. De verdediger kwam mee; kijk welke ruimte achter hem ontstond.' },
    B: { label: 'Blijf diep', points: 50, title: 'Je houdt de verdediger bezig.',
      feedback: 'Je bleef hoog en hield de verdediger bij het doel. RF bleef breed en C kon vooruit kijken.' },
    C: { label: 'Lok de verdediger mee', points: 100, title: 'Je maakt ruimte met je loopactie.',
      feedback: 'Je lokte de verdediger naar links. Daardoor kwam rechts ruimte voor RF. Mooi gezien!' },
  },
};

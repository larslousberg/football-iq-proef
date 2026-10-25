// Vaste, inhoudelijk gecontroleerde configuratie voor de loopactie-oefening.
// Coördinaten zijn percentages van het veld zodat dezelfde scène schaalt op mobiel.
export const SPACE_MAKING_SCENARIO = {
  id: 'spits-maakt-ruimte-01',
  title: 'Maak jij ruimte voor RF?',
  opponentProfile: 'Compact vierkant 2-2',
  playerLabels: {
    gk: 'K (1)', support: 'LF (11)', wide: 'RF (7)', me: 'C (4)', forward: 'S (9)',
    oppGk: 'K', press: 'T1', cover: 'T2', interceptor: 'T3', farDef: 'T4',
  },
  start: {
    gk: { x: 51, y: 88 }, support: { x: 23, y: 55 }, wide: { x: 79, y: 43 },
    me: { x: 57, y: 65 }, forward: { x: 60, y: 29 },
    oppGk: { x: 50, y: 5 }, press: { x: 43, y: 43 }, cover: { x: 62, y: 40 },
    interceptor: { x: 55, y: 30 }, farDef: { x: 72, y: 28 }, ball: { x: 51, y: 88 },
  },
  watch: {
    gk: { x: 51, y: 81 }, support: { x: 23, y: 58 }, wide: { x: 81, y: 41 },
    me: { x: 57, y: 62 }, forward: { x: 62, y: 27 },
    press: { x: 48, y: 44 }, cover: { x: 61, y: 39 }, interceptor: { x: 55, y: 30 }, farDef: { x: 72, y: 27 },
    ball: { x: 57, y: 62 },
  },
  choices: {
    A: { label: 'Kom naar de bal', title: 'Je komt naar de bal.',
      feedback: 'Je werd kort aanspeelbaar. De verdediger kwam mee; kijk welke ruimte achter hem ontstond.' },
    B: { label: 'Blijf diep', title: 'Je houdt de verdediger bezig.',
      feedback: 'Je bleef hoog en hield de verdediger bij het doel. RF bleef breed en C kon vooruit kijken.' },
    C: { label: 'Lok de verdediger mee', title: 'Je maakt ruimte met je loopactie.',
      feedback: 'Je lokte de verdediger naar links. Daardoor kwam rechts ruimte voor RF. Mooi gezien!' },
  },
};

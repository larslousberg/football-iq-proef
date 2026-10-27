import Phaser from 'phaser';
import './style.css';
import { EXERCISE_SEQUENCE, PASS_SCENARIO, RUN_CHOICE_PATHS, SPACE_MAKING_SCENARIO } from './scenarios.js';
import { isExerciseChoiceValid, validateExerciseSequence, validateKvcScenarioGeometry, validatePassTargets, validateRunChoicePaths } from './exercise-contract.js';

const dom = {
  field: document.querySelector('#game'),
  directionArrow: document.querySelector('#fieldDirectionArrow'),
  welcome: document.querySelector('#welcomeScrim'),
  welcomeStart: document.querySelector('#welcomeStart'),
  roundLabel: document.querySelector('#roundLabel'),
  phase: document.querySelector('#phaseText'),
  prompt: document.querySelector('#prompt'),
  answers: document.querySelector('#answers'),
  countdown: document.querySelector('#countdown'),
  timerTrack: document.querySelector('#timerTrack'),
  timerFill: document.querySelector('#timerFill'),
  feedback: document.querySelector('#feedback'),
  feedbackMark: document.querySelector('#feedbackMark'),
  feedbackTitle: document.querySelector('#feedbackTitle'),
  feedbackText: document.querySelector('#feedbackText'),
  scoreSummary: document.querySelector('#scoreSummary'),
  nextButton: document.querySelector('#nextButton'),
  helper: document.querySelector('#helper'),
  welcomeCopy: document.querySelector('#welcomeCopy'),
};

const COPY = {
  A: {
    title: 'Goed gezien! Je speelde vooruit.',
    text: 'Rechterflank (7) had ruimte. De verdediger stond te ver weg om de bal te pakken. Zo kom je met je ploeg dichter bij het doel.',
    points: 100,
    mark: '✓', className: '',
  },
  B: {
    title: 'De verdediger kwam ertussen.',
    text: 'Je ploegmaat leek vrij, maar een verdediger liep de passlijn in. Kijk nog eens naar die loopactie. Wat zie je nu?',
    points: 20,
    mark: '↗', className: 'retry-mark',
  },
  C: {
    title: 'Slim en veilig gespeeld.',
    text: 'Je hield de bal bij je ploeg. Goed dat je de steun achter je zag. Kijk een volgende keer ook of je vooruit kunt spelen.',
    points: 50,
    mark: '✓', className: '',
  },
};

const exerciseContractErrors = validateExerciseSequence(EXERCISE_SEQUENCE);
if (exerciseContractErrors.length) throw new Error(`Ongeldige oefenreeks: ${exerciseContractErrors.join(' ')}`);
const scenarioErrors = [
  ...validateKvcScenarioGeometry(PASS_SCENARIO, 'pass'),
  ...validatePassTargets(PASS_SCENARIO),
  ...validateKvcScenarioGeometry(SPACE_MAKING_SCENARIO, 'run'),
  ...validateRunChoicePaths(RUN_CHOICE_PATHS, SPACE_MAKING_SCENARIO.watch),
];
if (scenarioErrors.length) throw new Error(`Ongeldige KVC-situatie: ${scenarioErrors.join(' ')}`);

class FootballScene extends Phaser.Scene {
  constructor() { super('football'); this.actors = {}; this.world = {}; this.busy = false; this.activeExercise = 'pass'; this.activeExerciseDefinition = null; this.activeControllerId = 'me'; this.currentExerciseIndex = 0; this.visualMode = 'pass'; }

  create() {
    this.pitch = this.add.graphics();
    this.ball = this.makeBall();
    this.ballLabel = this.add.text(0, 0, 'BAL', { fontFamily: 'DM Sans, sans-serif', fontSize: '9px', color: '#f6f7ef', fontStyle: 'bold', stroke: '#092217', strokeThickness: 3 }).setOrigin(.5, 1);
    this.goalBanner = this.add.text(0, 0, 'GOAL!', { fontFamily: 'Space Grotesk, sans-serif', fontSize: '34px', fontStyle: 'bold', color: '#d5ff70', stroke: '#082015', strokeThickness: 7 }).setOrigin(.5).setAlpha(0).setDepth(1000);
    this.makeActors();
    this.controlRing = this.add.ellipse(0, 0, 56, 52, 0x60f3c5, .10).setStrokeStyle(3, 0x6df2c8, 1).setDepth(0);
    this.controlTag = this.add.text(0, 0, 'JIJ', { fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#14200d', backgroundColor: '#d5ff70', padding: { x: 6, y: 3 } }).setOrigin(.5, 1).setDepth(1);
    this.scale.on('resize', this.handleResize, this);
    this.drawBoard();
    this.goalBanner.setPosition(this.scale.width/2,this.scale.height*.43);
    this.resetPositions();
    this.setVisualMode('pass');
    window.footballScene = this;
  }

  project(u, v) {
    const w = this.scale.width, h = this.scale.height;
    if (this.visualMode === 'pass') {
      // Fixed touchline view: our goal is left, the attacking goal right.
      // Scenario coordinates remain unchanged; only their projection changes.
      const depth = (100 - v) / 100;
      const side = .64 + .22 * depth;
      return { x: w * (.05 + .90 * depth), y: h * (.5 + (u - 50) * side / 100), s: .78 + .24 * depth };
    }
    const side = .60 + .35 * (v / 100);
    return { x: w / 2 + (u - 50) * w * side / 100, y: h * (.06 + .87 * v / 100), s: .64 + .46 * v / 100 };
  }

  drawBoard() {
    const g = this.pitch, w = this.scale.width, h = this.scale.height;
    g.clear();
    const point = (u, v) => this.project(u, v);
    if (this.visualMode === 'pass') {
      g.fillStyle(0x071720, 1); g.fillRect(0, 0, w, h);
      const shadow = [point(0,0),point(100,0),point(100,100),point(0,100)].map(({x,y})=>({x,y:y+7}));
      g.fillStyle(0x02080d,.65);g.fillPoints(shadow,true);
    } else g.fillStyle(0x11653d, 1).fillRect(0, 0, w, h);
    const corners = [point(2, 0), point(98, 0), point(100, 100), point(0, 100)].map(({x,y}) => ({x,y}));
    g.fillStyle(this.visualMode==='pass'?0x164843:0x147044, 1); g.fillPoints(corners, true);
    for (let i = 0; i < 8; i += 2) {
      const y1 = i * 12.5, y2 = (i + 2) * 12.5;
      const band = [point(0, y1), point(100, y1), point(100, y2), point(0, y2)].map(({x,y}) => ({x,y}));
      const passColor=i%4===0?0x1c5550:0x174b47;
      g.fillStyle(this.visualMode==='pass'?passColor:(i % 4 === 0 ? 0x0d6038 : 0x177448), this.visualMode==='pass'?.82:.48); g.fillPoints(band, true);
    }
    g.lineStyle(Math.max(1.3, w * .003), this.visualMode==='pass'?0xd7efea:0xd9f3de, this.visualMode==='pass'?.76:.69);
    const line = (a,b) => { const p1=point(...a), p2=point(...b); g.lineBetween(p1.x,p1.y,p2.x,p2.y); };
    line([2,0],[0,100]); line([98,0],[100,100]); line([2,0],[98,0]); line([0,100],[100,100]); line([1,50],[99,50]);
    const circle = (cx, cy, rx, ry, segments=48) => {
      const pts=[]; for(let i=0;i<=segments;i++){const a=2*Math.PI*i/segments;const p=point(cx+Math.cos(a)*rx,cy+Math.sin(a)*ry);pts.push(p.x,p.y);} g.beginPath();g.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)g.lineTo(pts[i],pts[i+1]);g.closePath();g.strokePath();
    };
    circle(50,50,11,8.5);
    const box = (left,right,top,bottom) => { line([left,top],[right,top]);line([left,top],[left,bottom]);line([right,top],[right,bottom]); };
    box(34,66,0,13); box(40,60,0,6);
    box(34,66,87,100); box(40,60,94,100);
    // Goal frames on both end lines make the target legible on small screens.
    const goal=(v, direction)=>{const left=point(45,v),right=point(55,v),backLeft=point(45,v+direction*3),backRight=point(55,v+direction*3);g.lineStyle(Math.max(2,w*.004),0xf4f6ea,.92);g.lineBetween(left.x,left.y,backLeft.x,backLeft.y);g.lineBetween(right.x,right.y,backRight.x,backRight.y);g.lineBetween(backLeft.x,backLeft.y,backRight.x,backRight.y);};
    goal(0,1);goal(100,-1);
    const spot1=point(50,10),spot2=point(50,90);g.fillStyle(0xe8f5e8,.8);g.fillCircle(spot1.x,spot1.y,2);g.fillCircle(spot2.x,spot2.y,2);
  }

  setVisualMode(type) {
    this.visualMode=type==='pass'?'pass':'classic';
    document.body.classList.toggle('pass-visual-trial',this.visualMode==='pass');
    if(dom.directionArrow)dom.directionArrow.textContent=this.visualMode==='pass'?'→':'↑';
    this.ballLabel.setVisible(this.visualMode!=='pass');
    this.drawBoard();
    for(const actor of Object.values(this.actors)){
      actor.tokenGroup.setVisible(this.visualMode==='pass');
      actor.legacyParts.forEach(part=>part.setVisible(this.visualMode!=='pass'));
      actor.label.setVisible(this.visualMode!=='pass');
      this.placeActor(actor);
    }
    this.placeBall();
    this.updateControlMarker(true);
  }

  handleResize() {
    this.drawBoard();
    for (const actor of Object.values(this.actors)) this.placeActor(actor);
    this.placeBall();
    this.goalBanner.setPosition(this.scale.width/2,this.scale.height*.43);
    this.updateControlMarker();
  }

  updateControlMarker(visible=this.controlRing.visible) {
    if (!this.controlRing || !this.controlTag) return;
    const actor = this.actors[this.activeControllerId];
    if (!actor) return;
    const p = this.project(actor.world.x, actor.world.y);
    const ringOffset=this.visualMode==='pass'?0:9*p.s;
    this.controlRing.setPosition(p.x, p.y + ringOffset).setScale(p.s).setDepth(p.y + .5).setVisible(visible);
    this.controlTag.setPosition(p.x, p.y - 25 * p.s).setScale(p.s).setDepth(p.y + 2).setVisible(visible);
  }

  makeBall() {
    const c = this.add.container(0,0);
    c.add(this.add.ellipse(1,5,14,6,0x06190e,.34));
    c.add(this.add.circle(0,0,6.6,0xf8f8ec,1).setStrokeStyle(1,0x152119,.9));
    const seam=this.add.graphics();seam.lineStyle(1,0x344338,.8);seam.strokeCircle(0,0,3);seam.lineBetween(-5,0,5,0);seam.lineBetween(0,-5,0,5);c.add(seam);
    c.setDepth(100); return c;
  }

  makeFootballer(id, team, kit, displayLabel, number, keeper=false) {
    const c=this.add.container(0,0);
    const shadow=this.add.ellipse(0,11,31,11,0x04160c,.36);
    const leftLeg=this.add.rectangle(-5,7,6,15,team==='home'?0xf3f4e8:0xa82f2c).setOrigin(.5,.05).setStrokeStyle(1,0x122118,.35);
    const rightLeg=this.add.rectangle(5,7,6,15,team==='home'?0xf3f4e8:0xa82f2c).setOrigin(.5,.05).setStrokeStyle(1,0x122118,.35);
    const leftBoot=this.add.ellipse(-6,21,8,4,0x14221a); const rightBoot=this.add.ellipse(6,21,8,4,0x14221a);
    const armL=this.add.ellipse(-11,-2,7,15,kit).setRotation(-.18);const armR=this.add.ellipse(11,-2,7,15,kit).setRotation(.18);
    const body=this.add.ellipse(0,-1,22,23,kit).setStrokeStyle(1.2,0xffffff,team==='home'?.75:.38);
    const stripe=this.add.rectangle(0,-1,3,18,team==='home'?0xd7dfd5:0xffd5cc,.72);
    const head=this.add.circle(0,-14,7.2,0xd9ab83).setStrokeStyle(1,0x463729,.5);
    const hair=this.add.ellipse(0,-18,13,6,team==='home'?0x49392c:0x38271f);
    const numberText=this.add.text(0,-2,String(number),{fontFamily:'Space Grotesk,sans-serif',fontSize:'8px',fontStyle:'bold',color:team==='home'?'#132218':'#fff6ee'}).setOrigin(.5);
    const legacyParts=[shadow,leftLeg,rightLeg,leftBoot,rightBoot,armL,armR,body,stripe,head,hair,numberText];
    c.add(legacyParts);
    const tokenGroup=this.add.container(0,0);
    const tokenShadow=this.add.ellipse(2,18,46,13,0x02080d,.48);
    const tokenRim=this.add.circle(0,0,22,team==='home'?0x829097:0xf0aaa1,.96);
    const tokenFace=this.add.circle(0,-1,19.5,team==='home'?0x101c27:0x9d2729,1);
    const tokenInset=this.add.circle(0,-1,17.6,team==='home'?0x070d13:0x791c20,1).setStrokeStyle(1,team==='home'?0xb7c7cd:0xffb8ae,.42);
    const tokenSheen=this.add.ellipse(0,-9,29,13,0xffffff,.13);
    const tokenHighlight=this.add.ellipse(-7,-9,12,4,0xffffff,.23).setRotation(-.22);
    const tokenNumber=this.add.text(0,-7,String(number),{fontFamily:'Space Grotesk,sans-serif',fontSize:team==='home'?'14px':'13px',fontStyle:'bold',color:'#f7fbff'}).setOrigin(.5);
    const tokenRole=this.add.text(0,8,team==='home'?displayLabel:(keeper?'K':'T'),{fontFamily:'DM Sans,sans-serif',fontSize:'9px',fontStyle:'bold',color:team==='home'?'#c6e4d7':'#ffe0dc',letterSpacing:.5}).setOrigin(.5);
    tokenGroup.add([tokenShadow,tokenRim,tokenFace,tokenInset,tokenSheen,tokenHighlight,tokenNumber,tokenRole]);
    tokenGroup.setVisible(this.visualMode==='pass');
    c.add(tokenGroup);
    const label=this.add.text(0,0,displayLabel,{fontFamily:'DM Sans,sans-serif',fontSize:'10px',fontStyle:'bold',color:team==='home'?'#f4f7e9':'#ffd7d1',stroke:'#102719',strokeThickness:3}).setOrigin(.5,0);
    const actor={id,team,displayLabel,keeper,container:c,label,leftLeg,rightLeg,leftBoot,rightBoot,armL,armR,numberText,tokenGroup,legacyParts,runTween:null,world:{x:50,y:50},baseScale:1};
    this.actors[id]=actor; return actor;
  }

  makeActors() {
    // Display numbers follow KVC positions; animation code retains stable internal IDs.
    this.makeFootballer('gk','home',0xf1f0e7,'K',1,true);
    this.makeFootballer('support','home',0xf1f0e7,'LF',11);
    this.makeFootballer('wide','home',0xf1f0e7,'RF',7);
    this.makeFootballer('me','home',0xb4ed47,'C',4);
    this.makeFootballer('forward','home',0xf1f0e7,'SP',9);
    this.makeFootballer('oppGk','away',0x8d514a,'KEEPER',1,true);
    this.makeFootballer('press','away',0xe75d50,'T1',1);
    this.makeFootballer('cover','away',0xe75d50,'T2',2);
    this.makeFootballer('interceptor','away',0xe75d50,'T3',3);
    this.makeFootballer('farDef','away',0xe75d50,'T4',4);
  }

  resetPositions() {
    this.world=structuredClone(PASS_SCENARIO.start);
    for(const [id,actor] of Object.entries(this.actors)) { actor.world={...this.world[id]};this.placeActor(actor);this.stopRun(actor); }
    this.updateControlMarker(true);
    this.resetPassLabels();
    this.goalBanner.setAlpha(0).setScale(1);
    this.placeBall();
  }

  resetPassLabels() {
    const labels={gk:'K (1)',support:'LF (11)',wide:'RF (7)',me:'C (4)',forward:'S (9)',oppGk:'K',press:'T1',cover:'T2',interceptor:'T3',farDef:'T4'};
    for(const [id,label] of Object.entries(labels))this.actors[id].label.setText(label);
  }

  setChoiceLabels(exercise) {
    for (const [choice, label] of Object.entries(exercise.choiceLabels)) {
      const target = dom.answers.querySelector(`[data-choice="${choice}"] .answer-label`);
      if (target) target.textContent = label;
    }
  }

  resetSpacePositions() {
    this.world=structuredClone(SPACE_MAKING_SCENARIO.start);
    for(const [id,actor] of Object.entries(this.actors)){actor.world={...this.world[id]};this.stopRun(actor);this.placeActor(actor);}
    for(const [id,label] of Object.entries(SPACE_MAKING_SCENARIO.playerLabels))this.actors[id].label.setText(label);
    this.updateControlMarker(true);
    this.goalBanner.setAlpha(0).setScale(1);this.placeBall();
  }

  placeActor(actor) {
    const p=this.project(actor.world.x,actor.world.y);
    actor.container.setPosition(p.x,p.y).setScale(p.s);actor.container.setDepth(p.y);
    actor.label.setPosition(p.x,p.y+21*p.s).setScale(p.s).setDepth(p.y+1);
    actor.baseScale=p.s;
    if (actor.id === this.activeControllerId) this.updateControlMarker();
  }
  placeBall() { const p=this.project(this.world.ball.x,this.world.ball.y),ballScale=this.visualMode==='pass'?1.5:1;this.ball.setPosition(p.x,p.y).setScale(p.s*ballScale);this.ball.setDepth(p.y+2);this.ballLabel.setPosition(p.x,p.y-10*p.s).setScale(p.s).setDepth(p.y+3); }
  async delay(ms) { await new Promise(resolve=>window.setTimeout(resolve,ms)); }
  cancelTimer() {
    if(this.timerFrame){cancelAnimationFrame(this.timerFrame);this.timerFrame=null;}
    if(this.timerDeadline){clearTimeout(this.timerDeadline);this.timerDeadline=null;}
  }
  stopRun(actor) { if(actor.runTween){actor.runTween.remove(false);actor.runTween=null;} actor.leftLeg.setAngle(0);actor.rightLeg.setAngle(0);actor.leftBoot.setY(21);actor.rightBoot.setY(21);actor.armL.setAngle(-.18);actor.armR.setAngle(.18); }
  runCycle(actor) {
    if(this.visualMode==='pass')return;
    this.stopRun(actor);
    let swap=false;
    actor.runTween=this.time.addEvent({delay:115,loop:true,callback:()=>{swap=!swap;actor.leftLeg.setAngle(swap?-24:20);actor.rightLeg.setAngle(swap?20:-24);actor.leftBoot.setY(swap?19:23);actor.rightBoot.setY(swap?23:19);actor.armL.setAngle(swap?-.45:.12);actor.armR.setAngle(swap?.12:-.45);}});
  }
  move(id,to,duration=650,ease='Sine.easeInOut') {
    const actor=this.actors[id];this.runCycle(actor);
    return new Promise(resolve=>{
      let fallback,completed=false;
      const finish=()=>{if(completed)return;completed=true;if(fallback)clearTimeout(fallback);this.stopRun(actor);this.placeActor(actor);resolve();};
      const tween=this.tweens.add({targets:actor.world,x:to.x,y:to.y,duration,ease,onUpdate:()=>this.placeActor(actor),onComplete:finish});
      // Avoid leaving an exercise stuck if a mobile browser suspends a tween callback.
      fallback=window.setTimeout(()=>{tween.stop();actor.world.x=to.x;actor.world.y=to.y;finish();},duration+1200);
    });
  }
  moveBall(to,duration=650,ease='Sine.easeInOut',air=false) {
    return new Promise(resolve=>{
      const start={...this.world.ball};const state={t:0};
      let fallback,completed=false;
      const finish=()=>{if(completed)return;completed=true;if(fallback)clearTimeout(fallback);this.world.ball={...to};this.placeBall();resolve();};
      const tween=this.tweens.add({targets:state,t:1,duration,ease,onUpdate:()=>{
        this.world.ball.x=Phaser.Math.Linear(start.x,to.x,state.t);this.world.ball.y=Phaser.Math.Linear(start.y,to.y,state.t);
        const p=this.project(this.world.ball.x,this.world.ball.y);const lift=air?Math.sin(Math.PI*state.t)*18:Math.sin(Math.PI*state.t)*3;
        const ballScale=this.visualMode==='pass'?1.5:1;
        this.ball.setPosition(p.x,p.y-lift).setScale(p.s*ballScale*(1+Math.sin(Math.PI*state.t)*.12));this.ballLabel.setPosition(p.x,p.y-10*p.s-lift).setScale(p.s);this.ball.setDepth(p.y+5);
      },onComplete:finish});
      fallback=window.setTimeout(()=>{tween.stop();finish();},duration+1200);
    });
  }

  async showWatchPhase() {
    if(this.activeExerciseDefinition?.type==='run'){return this.showRunWatchPhase();}
    this.busy=true;this.resetPositions();
    this.setChoiceLabels(this.activeExerciseDefinition);
    dom.phase.textContent='KIJK GOED';dom.prompt.textContent='LF (11) speelt naar jou.';
    dom.helper.textContent='Kijk om je heen.';dom.answers.hidden=true;dom.feedback.hidden=true;dom.timerTrack.classList.remove('active');dom.countdown.textContent='';this.updateControlMarker(true);
    await this.delay(350);
    await Promise.all([
      this.moveBall(PASS_SCENARIO.watch.ball,1250,'Sine.easeInOut'),
      ...['gk','support','wide','me','forward','press','cover','interceptor','farDef','oppGk'].map(id=>this.move(id,PASS_SCENARIO.watch[id],650)),
    ]);
    this.world.ball={...PASS_SCENARIO.watch.ball};this.placeBall();
    await this.delay(450);
    dom.phase.textContent='JIJ BENT C (4)';dom.prompt.textContent='Waar speel jij naartoe?';dom.helper.textContent='Kijk naar de verdedigers.';
    await this.revealChoices(8000);
  }

  async showRunWatchPhase() {
    if(this.activeExerciseDefinition?.type!=='run')throw new Error('De loopkijkfase hoort alleen bij een loopoefening.');
    this.busy=true;this.resetSpacePositions();
    this.setChoiceLabels(this.activeExerciseDefinition);
    dom.phase.textContent='KIJK GOED';
    dom.prompt.textContent='K (1) speelt naar C (4).';
    dom.helper.textContent='Kijk naar RF en de verdediger bij jou.';
    dom.answers.hidden=true;dom.feedback.hidden=true;dom.timerTrack.classList.remove('active');dom.countdown.textContent='';this.updateControlMarker(true);
    await this.delay(300);
    await Promise.all([
      ...['gk','support','wide','me','forward','press','cover','interceptor','farDef','oppGk'].map(id=>this.move(id,SPACE_MAKING_SCENARIO.watch[id],650)),
      this.moveBall(SPACE_MAKING_SCENARIO.watch.ball,1250),
    ]);
    dom.phase.textContent='JIJ BENT S (9)';dom.prompt.textContent='Welke loopactie kies jij?';
    dom.helper.textContent='Kies rustig. Kijk wat de verdediger doet.';await this.revealChoices(10000);
  }

  async revealChoices(totalMs) {
    dom.answers.hidden=false;
    this.busy=false;
    await new Promise(resolve=>window.setTimeout(resolve,75));
    if (!this.busy && !dom.answers.hidden) this.beginTimer(totalMs);
  }

  beginTimer(total=8000) {
    dom.timerTrack.classList.add('active');dom.timerFill.classList.remove('urgent');dom.timerFill.style.transform='scaleX(1)';dom.countdown.textContent=String((total/1000).toFixed(1)).replace('.',',')+' s';
    const start=performance.now();
    this.cancelTimer();
    this.timerDeadline=window.setTimeout(()=>{this.timerDeadline=null;this.resolveChoice(null);},total);
    const tick=(now)=>{
      const elapsed=now-start,ratio=Math.max(0,1-elapsed/total);
      dom.timerFill.style.transform=`scaleX(${ratio})`;
      dom.countdown.textContent=String(Math.max(0,Math.ceil(total-elapsed)/1000).toFixed(1)).replace('.',',')+' s';
      if(ratio<.3)dom.timerFill.classList.add('urgent');
      if(ratio<=0){this.timerFrame=null;this.resolveChoice(null);return;}
      this.timerFrame=requestAnimationFrame(tick);
    };
    this.timerFrame=requestAnimationFrame(tick);
  }

  async resolveChoice(choice) {
    const exercise=this.activeExerciseDefinition;
    if(!exercise||exercise.type!==this.activeExercise||!isExerciseChoiceValid(exercise,choice)){console.error('Keuze geweigerd: oefeningstype en actieve keuzes komen niet overeen.');return;}
    if(this.busy)return;this.busy=true;
    this.cancelTimer();
    dom.answers.hidden=true;dom.countdown.textContent='';dom.timerTrack.classList.remove('active');
    if(!choice){dom.phase.textContent='GEEN KEUZE';dom.prompt.textContent='Geen probleem. Kijk nog eens rustig.';dom.helper.textContent='Je kan dezelfde situatie opnieuw proberen.';await this.delay(500);this.showFeedback(null);this.busy=false;return;}
    dom.phase.textContent='KIJK WAT ER GEBEURT';
    if(exercise.type==='run'){
      dom.prompt.textContent=SPACE_MAKING_SCENARIO.choices[choice].title;dom.helper.textContent='Volg jouw loopactie en kijk wat de verdediger doet.';
      await this.playRunChoice(choice);
    }else{
      dom.prompt.textContent={A:'Je speelt naar RF (7).',B:'Je speelt naar S (9).',C:'Je speelt terug naar LF (11).'}[choice];dom.helper.textContent='Volg de bal en kijk hoe de spelers reageren.';
      if(choice==='A')await this.playA();if(choice==='B')await this.playB();if(choice==='C')await this.playC();
    }
    await this.delay(250);this.showFeedback(choice);this.busy=false;
  }

  async playA() {
    // RF (7) staat breed rechts; de verdediging schuift mee maar sluit de pass niet.
    const receiver=PASS_SCENARIO.watch[PASS_SCENARIO.passTargets.A.receiver];
    await Promise.all([
      this.moveBall(receiver,1150,'Sine.easeInOut'),
      this.move(PASS_SCENARIO.passTargets.A.receiver,receiver,1150),
      this.move('interceptor',{x:59,y:41},850),
      this.move('forward',{x:53,y:24},700),
      this.move('press',{x:52,y:49},850),
      this.move('farDef',{x:75,y:42},900),
      this.move('support',{x:27,y:65},700),
      this.move('gk',{x:49,y:84},700),
      this.move('cover',{x:59,y:43},700),
      this.move('me',{x:51,y:55},750),
      this.move('oppGk',{x:50,y:6},650),
    ]);
    // RF neemt een korte bal mee langs de rechterkant; LF blijft links als steun.
    await Promise.all([
      this.move('wide',{x:82,y:43},750),this.moveBall({x:82,y:43},750,'Sine.easeOut'),
      this.move('interceptor',{x:64,y:39},800),this.move('farDef',{x:79,y:42},700),
      this.move('me',{x:56,y:52},750),this.move('forward',{x:54,y:23},700),
      this.move('press',{x:57,y:48},750),this.move('cover',{x:56,y:41},750),
      this.move('support',{x:28,y:64},700),this.move('gk',{x:49,y:82},700),this.move('oppGk',{x:50,y:5},650),
    ]);
  }
  async playB() {
    // The central pass is intercepted in view: the defender runs across the ball's
    // path, arrives just ahead of it, then takes the loose ball toward the press.
    // The intended receiver is S (9); T3 crosses the actual central pass lane.
    const meet=PASS_SCENARIO.passTargets.B.interception;
    await Promise.all([
      this.moveBall(meet,1050,'Linear'),
      this.move('interceptor',meet,850,'Sine.easeIn'),
      this.move('forward',{x:52,y:34},700),
      this.move('press',{x:49,y:49},750),
      this.move('cover',{x:55,y:42},750),
      this.move('wide',{x:68,y:51},750),this.move('support',{x:39,y:67},750),
      this.move('me',{x:51,y:53},750),this.move('gk',{x:50,y:86},700),
      this.move('farDef',{x:70,y:43},750),this.move('oppGk',{x:50,y:6},650),
    ]);
    this.ball.setDepth(this.actors.interceptor.container.depth+2);
    await this.delay(180);
    await Promise.all([
      this.move('interceptor',{x:54,y:49},700,'Sine.easeIn'),
      this.moveBall({x:54,y:49},700,'Sine.easeOut'),
      this.move('press',{x:52,y:50},650),
      this.move('wide',{x:66,y:54},650),this.move('support',{x:41,y:66},650),
      this.move('me',{x:53,y:52},650),this.move('gk',{x:50,y:84},650),
      this.move('forward',{x:52,y:35},650),
      this.move('cover',{x:52,y:41},650),this.move('farDef',{x:68,y:45},650),this.move('oppGk',{x:50,y:6},650),
    ]);
  }
  async playC() {
    // Veilige terugpass naar LF (11); beide flanken houden hun eigen kant.
    const receiver=PASS_SCENARIO.passTargets.C.receiver;
    const reception=PASS_SCENARIO.passTargets.C.reception;
    await Promise.all([
      this.moveBall(reception,1100,'Sine.easeInOut'),
      this.move(receiver,reception,1100),
      this.move('press',{x:43,y:51},700),
      this.move('wide',{x:78,y:46},700),
      this.move('forward',{x:52,y:25},700),
      this.move('interceptor',{x:49,y:39},700),
      this.move('farDef',{x:69,y:39},700),
      this.move('me',{x:52,y:54},700),
      this.move('gk',{x:49,y:84},650),this.move('cover',{x:54,y:42},700),this.move('oppGk',{x:50,y:6},650),
    ]);
    await Promise.all([
      this.move(receiver,{x:33,y:65},650),this.moveBall({x:33,y:65},650,'Sine.easeOut'),
      this.move('me',{x:53,y:52},650),this.move('wide',{x:79,y:45},650),
      this.move('forward',{x:53,y:24},650),this.move('press',{x:45,y:50},650),
      this.move('cover',{x:53,y:41},650),this.move('interceptor',{x:50,y:38},650),
      this.move('farDef',{x:68,y:38},650),this.move('gk',{x:49,y:83},650),this.move('oppGk',{x:50,y:6},650),
    ]);
  }

  async playRunChoice(choice) {
    for(const phase of RUN_CHOICE_PATHS[choice]) await this.playRunPhase(phase);
    if(choice==='C'){
      this.goalBanner.setPosition(this.scale.width/2,this.scale.height*.40).setAlpha(1).setScale(.65);
      this.tweens.add({targets:this.goalBanner,scale:1,duration:350,ease:'Back.Out'});
      await this.delay(800);this.goalBanner.setAlpha(0);
    }
  }

  async playRunPhase(phase) {
    const { duration, players, carrier, receiver, ballTo, shot } = phase;
    if(receiver && (!ballTo || !players[receiver] || players[receiver].x!==ballTo.x || players[receiver].y!==ballTo.y)) {
      throw new Error('De pass in een loopvervolg moet bij de gekozen ontvanger aankomen.');
    }
    const tasks=Object.entries(players).map(([id,to])=>this.move(id,to,duration));
    if(carrier){
      if(!players[carrier])throw new Error('De baldrager moet tijdens de dribbel meebewegen.');
      tasks.push(this.moveBall(players[carrier],duration,'Sine.easeInOut'));
    }else if(receiver||ballTo){
      tasks.push(this.moveBall(ballTo,duration,'Sine.easeInOut'));
    }else if(shot){
      tasks.push(this.moveBall(shot,duration,'Sine.easeIn'));
    }else throw new Error('Elke loopfase heeft een baldrager, ontvanger of schot nodig.');
    await Promise.all(tasks);
  }

  showFeedback(choice) {
    const exercise=this.activeExerciseDefinition;
    const data=choice?(exercise.type==='run'?{title:choice==='C'?'Ruimte gemaakt!':choice==='A'?'Goed vrijgelopen!':'Goed diep gebleven.',text:SPACE_MAKING_SCENARIO.choices[choice].feedback,points:SPACE_MAKING_SCENARIO.choices[choice].points,mark:'✓',className:''}:COPY[choice]):{title:'Geen probleem.',text:'Kijk rustig nog eens. Je mag deze oefening opnieuw proberen.',mark:'↻',className:'warn'};
    dom.phase.textContent=choice==='B'&&exercise.type==='pass'?'KIJK NOG EENS':'GOED GEKEKEN';
    dom.prompt.textContent=choice?'Wat zag jij gebeuren?':'Neem rustig nog een kijkje.';
    dom.helper.textContent=exercise.type==='run'?'Je kan ook zonder bal ruimte maken.':'Onthoud: kijk vóór je de bal krijgt.';
    dom.feedbackTitle.textContent=data.title;dom.feedbackText.textContent=data.text;dom.feedbackMark.textContent=data.mark;dom.feedbackMark.className='feedback-mark '+data.className;
    if(choice){roundScore+=data.points;const finalExercise=this.currentExerciseIndex>=EXERCISE_SEQUENCE.length-1;dom.scoreSummary.textContent=finalExercise?`+${data.points} spelpunten · Eindscore: ${roundScore} spelpunten`:`+${data.points} spelpunten · Totaal: ${roundScore} spelpunten`;dom.scoreSummary.hidden=false;}
    else{dom.scoreSummary.hidden=true;dom.scoreSummary.textContent='';}
    dom.feedback.hidden=false;
    if(!choice){resultAction='retry';dom.nextButton.textContent='PROBEER OPNIEUW';}
    else if(this.currentExerciseIndex>=EXERCISE_SEQUENCE.length-1){
      dom.phase.textContent='KLAAR!';dom.prompt.textContent='Goed gespeeld! Je deed alle oefeningen.';
      resultAction='replay';dom.nextButton.textContent='SPEEL OPNIEUW';
    }else{resultAction='next';dom.nextButton.textContent='VOLGENDE OEFENING';}
    dom.nextButton.hidden=false;
  }

}

const scene=new FootballScene();
const game=new Phaser.Game({
  type:Phaser.AUTO, parent:dom.field, backgroundColor:'#11653d',
  scale:{mode:Phaser.Scale.RESIZE,width:'100%',height:'100%',autoCenter:Phaser.Scale.CENTER_BOTH},
  render:{antialias:true,roundPixels:false},
  input:{activePointers:1,touch:{capture:true}},
  scene:[scene],
});

// Exercise order stays separate from the opening screen. Add future scenarios here.
let resultAction='next';
let roundScore=0;

async function beginExercise(index) {
  if(index<0||index>=EXERCISE_SEQUENCE.length)return;
  scene.cancelTimer();
  scene.busy=true;scene.currentExerciseIndex=index;
  const exercise=EXERCISE_SEQUENCE[index];scene.activeExercise=exercise.type;scene.activeExerciseDefinition=exercise;scene.activeControllerId=exercise.controllerId;
  scene.setVisualMode(exercise.type);
  scene.setChoiceLabels(exercise);
  dom.roundLabel.textContent=`OEFENING ${index+1} / ${EXERCISE_SEQUENCE.length}`;
  dom.answers.hidden=true;dom.feedback.hidden=true;dom.nextButton.hidden=true;dom.timerTrack.classList.remove('active');dom.countdown.textContent='';
  if(exercise.type==='run')scene.resetSpacePositions();else scene.resetPositions();
  dom.phase.textContent=`JIJ BENT ${exercise.shortRole}`;
  dom.prompt.textContent=`Jij bent ${exercise.role}.`;
  dom.helper.textContent='Zoek de groene cirkel met JIJ.';
  for(let count=3;count>0;count--){dom.countdown.textContent=String(count);await scene.delay(1000);}
  dom.countdown.textContent='';
  if(exercise.type==='run')await scene.showRunWatchPhase();else await scene.showWatchPhase();
}

function continueSequence() {
  if(scene.busy)return;
  dom.feedback.hidden=true;dom.nextButton.hidden=true;
  if(resultAction==='retry')beginExercise(scene.currentExerciseIndex);
  else if(resultAction==='replay'){roundScore=0;beginExercise(0);}
  else beginExercise(scene.currentExerciseIndex+1);
}

dom.welcomeStart.addEventListener('click',()=>{roundScore=0;dom.welcome.hidden=true;beginExercise(0);});
dom.nextButton.addEventListener('click',continueSequence);
dom.answers.addEventListener('click',(event)=>{const button=event.target.closest('[data-choice]');if(button&&!button.disabled)scene.resolveChoice(button.dataset.choice);});

if('serviceWorker' in navigator && import.meta.env.PROD){window.addEventListener('load',()=>navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`,{scope:import.meta.env.BASE_URL}).catch(()=>{}));}

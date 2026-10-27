import Phaser from 'phaser';
import './style.css';
import { EXERCISE_SEQUENCE, RUN_CHOICE_PATHS, SPACE_MAKING_SCENARIO } from './scenarios.js';
import { KEEPER_BUILD_UP_SCENARIO, buildKeeperBuildUpOutcome, validateKeeperBuildUpScenario } from './keeper-build-up.js';
import { isExerciseChoiceValid, validateExerciseSequence, validateKvcScenarioGeometry, validateRunChoicePaths } from './exercise-contract.js';
import { HOME_ROLES, PITCH, buildKvcDefensiveDiamond } from './football-model.js';

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

const exerciseContractErrors = validateExerciseSequence(EXERCISE_SEQUENCE);
if (exerciseContractErrors.length) throw new Error(`Ongeldige oefenreeks: ${exerciseContractErrors.join(' ')}`);
const scenarioErrors = [
  ...validateKeeperBuildUpScenario(),
  ...validateKvcScenarioGeometry(SPACE_MAKING_SCENARIO, 'run'),
  ...validateRunChoicePaths(RUN_CHOICE_PATHS, SPACE_MAKING_SCENARIO.watch),
];
if (scenarioErrors.length) throw new Error(`Ongeldige KVC-situatie: ${scenarioErrors.join(' ')}`);

class FootballScene extends Phaser.Scene {
  constructor() { super('football'); this.actors = {}; this.world = {}; this.busy = false; this.activeExercise = 'pass'; this.activeExerciseDefinition = null; this.activeControllerId = 'me'; this.currentExerciseIndex = 0; this.visualMode = 'pass'; this.ballCarrierId = 'gk'; this.choiceElapsedMs = 0; }

  create() {
    this.pitch = this.add.graphics();
    this.ball = this.makeBall();
    this.goalBanner = this.add.text(0, 0, 'GOAL!', { fontFamily: 'Space Grotesk, sans-serif', fontSize: '34px', fontStyle: 'bold', color: '#d5ff70', stroke: '#082015', strokeThickness: 7 }).setOrigin(.5).setAlpha(0).setDepth(1000);
    this.makeActors();
    this.controlRing = this.add.circle(0, 0, 26, 0x60f3c5, .035).setStrokeStyle(2, 0x6df2c8, .9).setDepth(0);
    this.tweens.add({ targets: this.controlRing, alpha: { from: .45, to: .95 }, scale: { from: .96, to: 1.05 }, duration: 1450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.scale.on('resize', this.handleResize, this);
    this.drawBoard();
    this.goalBanner.setPosition(this.scale.width/2,this.scale.height*.43);
    this.resetPositions();
    this.setVisualMode('pass');
    window.footballScene = this;
  }

  project(u, v) {
    return this.projectField(u,v);
  }

  projectField(x, y) {
    const { left, top, width, height } = this.pitchRect();
    // Canonical world coordinates do not depend on the rendering camera.
    // Keep the 35 x 25 m pitch ratio and use a small size cue by touchline depth.
    return { x: left + width * x / 100, y: top + height * y / 100, s: .86 + .14 * (1 - y / 100) };
  }

  pitchRect() {
    const w=this.scale.width,h=this.scale.height,ratio=PITCH.lengthMeters/PITCH.widthMeters;
    const width=Math.min(w*.92,h*.88*ratio),height=width/ratio;
    return { left:(w-width)/2,top:(h-height)/2,width,height };
  }

  drawBoard() {
    const g = this.pitch, w = this.scale.width, h = this.scale.height;
    g.clear();
    const point = (x, y) => this.projectField(x, y);
    g.fillStyle(0x071720, 1); g.fillRect(0, 0, w, h);
    const corners = [[0,0],[100,0],[100,100],[0,100]].map(([x,y])=>point(x,y));
    const shadow = corners.map(({x,y})=>({x,y:y+7}));
    g.fillStyle(0x02080d,.65);g.fillPoints(shadow,true);
    g.fillStyle(0x164843, 1); g.fillPoints(corners, true);
    for (let i = 0; i < 8; i += 2) {
      const y1 = i * 12.5, y2 = (i + 2) * 12.5;
      const band = [[0,y1],[100,y1],[100,y2],[0,y2]].map(([x,y])=>point(x,y));
      const passColor=i%4===0?0x1c5550:0x174b47;
      g.fillStyle(passColor,.82); g.fillPoints(band, true);
    }
    g.lineStyle(Math.max(1.3, w * .003),0xd7efea,.76);
    const line = (a,b) => { const p1=point(...a), p2=point(...b); g.lineBetween(p1.x,p1.y,p2.x,p2.y); };
    line([0,0],[100,0]);line([0,100],[100,100]);line([0,0],[0,100]);line([100,0],[100,100]);line([50,0],[50,100]);
    const circle = (cx, cy, rx, ry, segments=48) => {
      const pts=[]; for(let i=0;i<=segments;i++){const a=2*Math.PI*i/segments;const p=point(cx+Math.cos(a)*rx,cy+Math.sin(a)*ry);pts.push(p.x,p.y);} g.beginPath();g.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)g.lineTo(pts[i],pts[i+1]);g.closePath();g.strokePath();
    };
    circle(50,50,9,15);
    const box = (left,right,top,bottom) => { line([left,top],[right,top]);line([left,top],[left,bottom]);line([right,top],[right,bottom]); };
    box(0,14,34,66);box(0,6,40,60);box(86,100,34,66);box(94,100,40,60);
    // Goal frames on both end lines make the target legible on small screens.
    const goal=(x, direction)=>{const top=point(x,45),bottom=point(x,55),backTop=point(x+direction*3,45),backBottom=point(x+direction*3,55);g.lineStyle(Math.max(2,w*.004),0xf4f6ea,.92);g.lineBetween(top.x,top.y,backTop.x,backTop.y);g.lineBetween(bottom.x,bottom.y,backBottom.x,backBottom.y);g.lineBetween(backTop.x,backTop.y,backBottom.x,backBottom.y);};
    goal(0,1);goal(100,-1);
    const spot1=point(10,50),spot2=point(90,50);g.fillStyle(0xe8f5e8,.8);g.fillCircle(spot1.x,spot1.y,2);g.fillCircle(spot2.x,spot2.y,2);
    if (new URLSearchParams(window.location.search).has('debugField')) this.drawDebugGrid(line, point);
  }

  drawDebugGrid(line, point) {
    const g=this.pitch;g.lineStyle(.7,0xc8f4d0,.28);
    for(let x=5;x<100;x+=5)line([x,0],[x,100]);
    for(let y=100/12;y<100;y+=100/12)line([0,y],[100,y]);
    const zoneNames=['E','D','C','B','A'];
    this.debugLabels?.forEach(label=>label.destroy());this.debugLabels=[];
    zoneNames.forEach((zone,index)=>{
      const p=point(index*20+10,4);
      this.debugLabels.push(this.add.text(p.x,p.y,zone,{fontFamily:'DM Sans,sans-serif',fontSize:'10px',fontStyle:'bold',color:'#c8f4d0'}).setOrigin(.5).setDepth(1200));
    });
  }

  setVisualMode(type) {
    this.visualMode='pass';
    document.body.classList.add('pass-visual-trial');
    if(dom.directionArrow)dom.directionArrow.textContent='→';
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
    if (!this.controlRing) return;
    const actor = this.actors[this.activeControllerId];
    if (!actor) return;
    const p = this.projectField(actor.world.x, actor.world.y);
    this.controlRing.setPosition(p.x, p.y).setScale(p.s).setDepth(p.y + .5).setVisible(visible);
  }

  makeBall() {
    const c = this.add.container(0,0);
    c.add(this.add.ellipse(0,4,12,4,0x02080d,.28));
    c.add(this.add.circle(0,0,6.8,0xf8f8ec,1).setStrokeStyle(.8,0x17211c,.9));
    const pattern=this.add.graphics();pattern.fillStyle(0x171d1b,1);pattern.lineStyle(.7,0x171d1b,.95);
    const pentagon=(cx,cy,r,rotation=0)=>{const points=[];for(let i=0;i<5;i++){const angle=rotation+i*Math.PI*2/5;points.push({x:cx+Math.cos(angle)*r,y:cy+Math.sin(angle)*r});}pattern.fillPoints(points,true);};
    pentagon(0,0,2.25,-Math.PI/2);
    for(let i=0;i<5;i++){const angle=-Math.PI/2+i*Math.PI*2/5;const x=Math.cos(angle),y=Math.sin(angle);pattern.lineBetween(x*2.2,y*2.2,x*6.1,y*6.1);pentagon(x*4.35,y*4.35,1.25,angle);}
    c.add(pattern);
    c.setDepth(100); return c;
  }

  makeFootballer(id, team, kit, displayLabel, number, keeper=false) {
    const c=this.add.container(0,0);
    const shadow=this.add.ellipse(0,0,34,34,0x04160c,.25);
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
    const tokenShadow=this.add.ellipse(0,1,42,42,0x02080d,.34);
    const tokenRim=this.add.circle(0,0,20,team==='home'?0x829097:0xf0aaa1,.96);
    const tokenFace=this.add.circle(0,-1,17.8,team==='home'?0x101c27:0x9d2729,1);
    const tokenInset=this.add.circle(0,-1,16.1,team==='home'?0x070d13:0x791c20,1).setStrokeStyle(1,team==='home'?0xb7c7cd:0xffb8ae,.42);
    const tokenSheen=this.add.ellipse(0,-8,26,11,0xffffff,.13);
    const tokenHighlight=this.add.ellipse(-7,-9,12,4,0xffffff,.23).setRotation(-.22);
    const tokenNumber=this.add.text(0,-7,String(number),{fontFamily:'Space Grotesk,sans-serif',fontSize:team==='home'?'14px':'13px',fontStyle:'bold',color:'#f7fbff'}).setOrigin(.5);
    const tokenRole=this.add.text(0,8,displayLabel,{fontFamily:'DM Sans,sans-serif',fontSize:'9px',fontStyle:'bold',color:team==='home'?'#c6e4d7':'#ffe0dc',letterSpacing:.5}).setOrigin(.5);
    tokenGroup.add([tokenShadow,tokenRim,tokenFace,tokenInset,tokenSheen,tokenHighlight,tokenNumber,tokenRole]);
    tokenGroup.setVisible(this.visualMode==='pass');
    c.add(tokenGroup);
    const label=this.add.text(0,0,displayLabel,{fontFamily:'DM Sans,sans-serif',fontSize:'10px',fontStyle:'bold',color:team==='home'?'#f4f7e9':'#ffd7d1',stroke:'#102719',strokeThickness:3}).setOrigin(.5,0);
    const actor={id,team,displayLabel,keeper,container:c,label,leftLeg,rightLeg,leftBoot,rightBoot,armL,armR,numberText,tokenGroup,legacyParts,runTween:null,world:{x:50,y:50},baseScale:1};
    this.actors[id]=actor; return actor;
  }

  makeActors() {
    // Display numbers follow KVC positions; animation code retains stable internal IDs.
    this.makeFootballer('gk','home',0xf1f0e7,'K',HOME_ROLES.gk.number,true);
    this.makeFootballer('support','home',0xf1f0e7,'LF',HOME_ROLES.support.number);
    this.makeFootballer('wide','home',0xf1f0e7,'RF',HOME_ROLES.wide.number);
    this.makeFootballer('me','home',0xb4ed47,'C',HOME_ROLES.me.number);
    this.makeFootballer('forward','home',0xf1f0e7,'S',HOME_ROLES.forward.number);
    this.makeFootballer('oppGk','away',0x8d514a,'K',1,true);
    this.makeFootballer('press','away',0xe75d50,'LA',1);
    this.makeFootballer('cover','away',0xe75d50,'RA',2);
    this.makeFootballer('interceptor','away',0xe75d50,'LV',3);
    this.makeFootballer('farDef','away',0xe75d50,'RV',4);
  }

  resetPositions() {
    this.world=structuredClone(KEEPER_BUILD_UP_SCENARIO.start);
    this.ballCarrierId='gk';
    for(const [id,actor] of Object.entries(this.actors)) { actor.world={...this.world[id]};this.placeActor(actor);this.stopRun(actor); }
    this.updateControlMarker(true);
    this.resetPassLabels();
    this.goalBanner.setAlpha(0).setScale(1);
    this.placeBall();
  }

  resetPassLabels() {
    const labels={gk:'K (1)',support:'LF (11)',wide:'RF (7)',me:'C (4)',forward:'S (9)',oppGk:'K',press:'LA',cover:'RA',interceptor:'LV',farDef:'RV'};
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
    this.ballCarrierId='gk';
    for(const [id,actor] of Object.entries(this.actors)){actor.world={...this.world[id]};this.stopRun(actor);this.placeActor(actor);}
    for(const [id,label] of Object.entries(SPACE_MAKING_SCENARIO.playerLabels))this.actors[id].label.setText(label);
    this.updateControlMarker(true);
    this.goalBanner.setAlpha(0).setScale(1);this.placeBall();
  }

  placeActor(actor) {
    const p=this.projectField(actor.world.x,actor.world.y);
    actor.container.setPosition(p.x,p.y).setScale(p.s);actor.container.setDepth(p.y);
    actor.label.setPosition(p.x,p.y+21*p.s).setScale(p.s).setDepth(p.y+1);
    actor.baseScale=p.s;
    if (actor.id === this.activeControllerId) this.updateControlMarker();
  }
  ballCarrierOffset(id, scale) { const actor=this.actors[id];return actor?{x:(actor.team==='home'?23:-23)*scale,y:6*scale}:{x:0,y:0}; }
  placeBall() { const p=this.projectField(this.world.ball.x,this.world.ball.y),offset=this.ballCarrierOffset(this.ballCarrierId,p.s);this.ball.setPosition(p.x+offset.x,p.y+offset.y).setScale(p.s*1.15);this.ball.setDepth(p.y+offset.y+3); }
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
  moveBall(to,duration=650,ease='Sine.easeInOut',air=false,carrierId=null) {
    return new Promise(resolve=>{
      const start={...this.world.ball};const state={t:0};
      let fallback,completed=false;
      const finish=()=>{if(completed)return;completed=true;if(fallback)clearTimeout(fallback);this.world.ball={...to};this.placeBall();resolve();};
      const tween=this.tweens.add({targets:state,t:1,duration,ease,onUpdate:()=>{
        this.world.ball.x=Phaser.Math.Linear(start.x,to.x,state.t);this.world.ball.y=Phaser.Math.Linear(start.y,to.y,state.t);
        const p=this.projectField(this.world.ball.x,this.world.ball.y);const lift=air?Math.sin(Math.PI*state.t)*18:0;
        const offset=this.ballCarrierOffset(carrierId,p.s);
        this.ball.setPosition(p.x+offset.x,p.y+offset.y-lift).setScale(p.s*1.15*(1+Math.sin(Math.PI*state.t)*.08));this.ball.setDepth(p.y+offset.y+5);
      },onComplete:finish});
      fallback=window.setTimeout(()=>{tween.stop();finish();},duration+1200);
    });
  }

  async showWatchPhase() {
    if(this.activeExerciseDefinition?.type==='run'){return this.showRunWatchPhase();}
    this.busy=true;this.resetPositions();
    this.setChoiceLabels(this.activeExerciseDefinition);
    dom.phase.textContent='KIJK GOED';dom.prompt.textContent='K (1) heeft de bal. Kijk naar de rode druk.';
    dom.helper.textContent='C (4) komt vrij. Kijk vóór de pass.';dom.answers.hidden=true;dom.feedback.hidden=true;dom.timerTrack.classList.remove('active');dom.countdown.textContent='';this.updateControlMarker(true);
    await this.delay(350);
    dom.prompt.textContent='C (4) maakt zich aanspeelbaar.';
    await this.playScenarioPhase(KEEPER_BUILD_UP_SCENARIO.openingPhases[0]);
    dom.prompt.textContent='K (1) speelt naar C (4).';
    await this.playScenarioPhase(KEEPER_BUILD_UP_SCENARIO.openingPhases[1]);
    dom.phase.textContent='JIJ BENT C (4)';dom.prompt.textContent='Wat doe jij met de bal?';
    dom.helper.textContent=KEEPER_BUILD_UP_SCENARIO.decision.pressureDescription;
    await this.revealChoices(KEEPER_BUILD_UP_SCENARIO.timerMs, KEEPER_BUILD_UP_SCENARIO.decision);
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
    this.ballCarrierId='me';this.placeBall();
    dom.phase.textContent='JIJ BENT S (9)';dom.prompt.textContent='Welke loopactie kies jij?';
    dom.helper.textContent='Kies rustig. Kijk wat de verdediger doet.';await this.revealChoices(10000);
  }

  async revealChoices(totalMs, pressure=null) {
    dom.answers.hidden=false;
    this.busy=false;
    await new Promise(resolve=>window.setTimeout(resolve,75));
    if (!this.busy && !dom.answers.hidden) this.beginTimer(totalMs,pressure);
  }

  beginTimer(total=8000,pressure=null) {
    dom.timerTrack.classList.add('active');dom.timerFill.classList.remove('urgent');dom.timerFill.style.transform='scaleX(1)';dom.countdown.textContent=String((total/1000).toFixed(1)).replace('.',',')+' s';
    const start=performance.now();this.choiceElapsedMs=0;
    const pressureActor=pressure?this.actors[pressure.pressurePlayerId]:null;
    const pressureStart=pressureActor?{...pressureActor.world}:null;
    this.cancelTimer();
    this.timerDeadline=window.setTimeout(()=>{this.timerDeadline=null;this.resolveChoice(null);},total);
    const tick=(now)=>{
      const elapsed=now-start,ratio=Math.max(0,1-elapsed/total);
      this.choiceElapsedMs=Math.min(total,elapsed);
      if(pressureActor&&pressureStart){
        pressureActor.world.x=Phaser.Math.Linear(pressureStart.x,pressure.pressureTarget.x,1-ratio);
        pressureActor.world.y=Phaser.Math.Linear(pressureStart.y,pressure.pressureTarget.y,1-ratio);
        this.placeActor(pressureActor);
      }
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
    if(!choice){dom.phase.textContent='DRUK OP C (4)';dom.prompt.textContent='De verdediger kwam dichtbij.';dom.helper.textContent='C schermt de bal af. Probeer daarna opnieuw.';if(exercise.type==='pass'&&exercise.id===KEEPER_BUILD_UP_SCENARIO.id)await this.playKeeperTimeout();else await this.delay(500);this.showFeedback(null,{title:'Geen probleem.',text:'De verdediger kwam dichtbij. Kijk nog eens naar de vrije speler en probeer opnieuw.',mark:'↻',className:'warn'});this.busy=false;return;}
    dom.phase.textContent='KIJK WAT ER GEBEURT';
    let outcomeFeedback=null;
    if(exercise.type==='run'){
      dom.prompt.textContent=SPACE_MAKING_SCENARIO.choices[choice].title;dom.helper.textContent='Volg jouw loopactie en kijk wat de verdediger doet.';
      await this.playRunChoice(choice);
    }else{
      if(exercise.id===KEEPER_BUILD_UP_SCENARIO.id){
        const action=KEEPER_BUILD_UP_SCENARIO.choices[choice];
        dom.prompt.textContent=action.action==='dribble'?'Je dribbelt vooruit.':`Je speelt naar ${action.receiver==='wide'?'RF (7)':'SP (9)'}.`;
        dom.helper.textContent='Kijk hoe de verdedigers en ploegmaats reageren.';
        outcomeFeedback=await this.playKeeperBuildUpChoice(choice);
      }else{
        dom.prompt.textContent='Volg de bal en kijk hoe de spelers reageren.';
        await this.delay(300);
      }
    }
    await this.delay(250);this.showFeedback(choice,outcomeFeedback);this.busy=false;
  }

  async playKeeperBuildUpChoice(choice) {
    const result=buildKeeperBuildUpOutcome(choice,this.world,this.choiceElapsedMs);
    for(const phase of result.phases)await this.playScenarioPhase(phase);
    return result.feedback;
  }

  async playKeeperTimeout() {
    await this.playScenarioPhase({duration:650,carrier:'me',players:{
      gk:{x:12,y:50},me:{x:32,y:44},support:{x:42,y:15},wide:{x:42,y:85},forward:{x:59,y:50},
      oppGk:{x:96,y:50},press:{x:33,y:42},cover:{x:37,y:62},interceptor:{x:53,y:47},farDef:{x:60,y:79},
    }});
  }

  async playRunChoice(choice) {
    for(const phase of RUN_CHOICE_PATHS[choice]) await this.playScenarioPhase(phase);
    if(choice==='C'){
      this.goalBanner.setPosition(this.scale.width/2,this.scale.height*.40).setAlpha(1).setScale(.65);
      this.tweens.add({targets:this.goalBanner,scale:1,duration:350,ease:'Back.Out'});
      await this.delay(800);this.goalBanner.setAlpha(0);
    }
  }

  async playScenarioPhase(phase) {
    const {duration,carrier,receiver,ballTo,shot}=phase;
    const targets={...phase.players};
    if(receiver&&(!ballTo||!targets[receiver]||targets[receiver].x!==ballTo.x||targets[receiver].y!==ballTo.y)){
      throw new Error('De pass moet bij de gekozen ontvanger aankomen.');
    }
    if(phase.defensiveShape==='compactKvcDiamond'){
      const ballReference=carrier?targets[carrier]:ballTo;
      if(!ballReference)throw new Error('Een compact verdedigingspatroon vereist een balpositie.');
      const compact=buildKvcDefensiveDiamond(ballReference);
      for(const id of ['gk','me','support','wide','forward'])targets[id]=compact[id];
    }
    let ballTarget;
    if(carrier){
      if(!targets[carrier])throw new Error('De baldrager moet meebewegen.');
      ballTarget=targets[carrier];
    }else if(receiver||ballTo)ballTarget=ballTo;
    else if(shot)ballTarget=shot;
    else throw new Error('Elke vervolgfase heeft een baldrager, ontvanger of schot nodig.');
    const tasks=Object.entries(targets).map(([id,to])=>this.move(id,to,duration));
    const attachedCarrier=phase.interceptionBy?null:carrier||null;
    tasks.push(this.moveBall(ballTarget,duration,phase.ballEase||'Sine.easeInOut',false,attachedCarrier));
    await Promise.all(tasks);
    this.ballCarrierId=phase.interceptionBy||carrier||receiver||null;
    this.placeBall();
    if(phase.interceptionBy&&this.actors[phase.interceptionBy])this.ball.setDepth(this.actors[phase.interceptionBy].container.depth+2);
    if(phase.pauseAfter)await this.delay(phase.pauseAfter);
  }

  showFeedback(choice, suppliedFeedback=null) {
    const exercise=this.activeExerciseDefinition;
    const data=choice?(exercise.type==='run'?{title:choice==='C'?'Ruimte gemaakt!':choice==='A'?'Goed vrijgelopen!':'Goed diep gebleven.',text:SPACE_MAKING_SCENARIO.choices[choice].feedback,points:SPACE_MAKING_SCENARIO.choices[choice].points,mark:'✓',className:''}:suppliedFeedback):suppliedFeedback||{title:'Geen probleem.',text:'Kijk rustig nog eens. Je mag deze oefening opnieuw proberen.',mark:'↻',className:'warn'};
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
  dom.helper.textContent='Zoek de mintgroene ring.';
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

import Phaser from 'phaser';
import './style.css';
import { SPACE_MAKING_SCENARIO } from './scenarios.js';

const dom = {
  field: document.querySelector('#game'),
  intro: document.querySelector('#intro'),
  welcome: document.querySelector('#welcomeScrim'),
  start: document.querySelector('#startButton'),
  welcomeStart: document.querySelector('#welcomeStart'),
  roleStart: document.querySelector('#roleStart'),
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
  watchAgain: document.querySelector('#watchAgain'),
  retry: document.querySelector('#retry'),
  helper: document.querySelector('#helper'),
  passExercise: document.querySelector('#passExercise'),
  runExercise: document.querySelector('#runExercise'),
  introTitle: document.querySelector('#introTitle'),
  introCopy: document.querySelector('#introCopy'),
  welcomeCopy: document.querySelector('#welcomeCopy'),
};

const COPY = {
  A: {
    title: 'Goed gezien! Je speelde vooruit.',
    text: 'De speler rechts had ruimte. De verdediger stond te ver weg om de bal te pakken. Zo kom je met je ploeg dichter bij het doel.',
    mark: '✓', className: '',
  },
  B: {
    title: 'De verdediger kwam ertussen.',
    text: 'Je ploegmaat leek vrij, maar een verdediger liep de passlijn in. Kijk nog eens naar die loopactie. Wat zie je nu?',
    mark: '↗', className: 'retry-mark',
  },
  C: {
    title: 'Slim en veilig gespeeld.',
    text: 'Je hield de bal bij je ploeg. Goed dat je de steun achter je zag. Kijk een volgende keer ook of je vooruit kunt spelen.',
    mark: '✓', className: '',
  },
};

class FootballScene extends Phaser.Scene {
  constructor() { super('football'); this.actors = {}; this.world = {}; this.busy = false; this.activeExercise = 'pass'; }

  create() {
    this.pitch = this.add.graphics();
    this.ball = this.makeBall();
    this.ballLabel = this.add.text(0, 0, 'BAL', { fontFamily: 'DM Sans, sans-serif', fontSize: '9px', color: '#f6f7ef', fontStyle: 'bold', stroke: '#092217', strokeThickness: 3 }).setOrigin(.5, 1);
    this.goalBanner = this.add.text(0, 0, 'GOAL!', { fontFamily: 'Space Grotesk, sans-serif', fontSize: '34px', fontStyle: 'bold', color: '#d5ff70', stroke: '#082015', strokeThickness: 7 }).setOrigin(.5).setAlpha(0).setDepth(1000);
    this.makeActors();
    this.controlRing = this.add.ellipse(0, 0, 52, 34, 0xb3f34a, .10).setStrokeStyle(4, 0xd5ff70, 1).setDepth(0);
    this.controlTag = this.add.text(0, 0, 'JIJ', { fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#14200d', backgroundColor: '#d5ff70', padding: { x: 6, y: 3 } }).setOrigin(.5, 1).setDepth(1);
    this.scale.on('resize', this.handleResize, this);
    this.drawBoard();
    this.goalBanner.setPosition(this.scale.width/2,this.scale.height*.43);
    this.resetPositions();
    window.footballScene = this;
  }

  project(u, v) {
    const w = this.scale.width, h = this.scale.height;
    const side = .60 + .35 * (v / 100);
    return { x: w / 2 + (u - 50) * w * side / 100, y: h * (.06 + .87 * v / 100), s: .64 + .46 * v / 100 };
  }

  drawBoard() {
    const g = this.pitch, w = this.scale.width, h = this.scale.height;
    g.clear();
    g.fillStyle(0x11653d, 1); g.fillRect(0, 0, w, h);
    const point = (u, v) => this.project(u, v);
    const corners = [point(2, 0), point(98, 0), point(100, 100), point(0, 100)].map(({x,y}) => ({x,y}));
    g.fillStyle(0x147044, 1); g.fillPoints(corners, true);
    for (let i = 0; i < 8; i += 2) {
      const y1 = i * 12.5, y2 = (i + 2) * 12.5;
      const band = [point(0, y1), point(100, y1), point(100, y2), point(0, y2)].map(({x,y}) => ({x,y}));
      g.fillStyle(i % 4 === 0 ? 0x0d6038 : 0x177448, .48); g.fillPoints(band, true);
    }
    g.lineStyle(Math.max(1.3, w * .003), 0xd9f3de, .69);
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

  handleResize() {
    this.drawBoard();
    for (const actor of Object.values(this.actors)) this.placeActor(actor);
    this.placeBall();
    this.goalBanner.setPosition(this.scale.width/2,this.scale.height*.43);
    this.updateControlMarker();
  }

  updateControlMarker(visible=this.controlRing.visible) {
    if (!this.controlRing || !this.controlTag) return;
    const actor = this.actors[this.activeExercise === 'run' ? 'forward' : 'me'];
    if (!actor) return;
    const p = this.project(actor.world.x, actor.world.y);
    this.controlRing.setPosition(p.x, p.y + 9 * p.s).setScale(p.s).setDepth(p.y + .5).setVisible(visible);
    this.controlTag.setPosition(p.x, p.y - 25 * p.s).setScale(p.s).setDepth(p.y + 2).setVisible(visible);
  }

  makeBall() {
    const c = this.add.container(0,0);
    c.add(this.add.ellipse(1,5,14,6,0x06190e,.34));
    c.add(this.add.circle(0,0,6.6,0xf8f8ec,1).setStrokeStyle(1,0x152119,.9));
    const seam=this.add.graphics();seam.lineStyle(1,0x344338,.8);seam.strokeCircle(0,0,3);seam.lineBetween(-5,0,5,0);seam.lineBetween(0,-5,0,5);c.add(seam);
    c.setDepth(100); return c;
  }

  makeFootballer(id, team, kit, name, number, keeper=false) {
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
    c.add([shadow,leftLeg,rightLeg,leftBoot,rightBoot,armL,armR,body,stripe,head,hair,numberText]);
    const label=this.add.text(0,0,name,{fontFamily:'DM Sans,sans-serif',fontSize:'10px',fontStyle:'bold',color:team==='home'?'#f4f7e9':'#ffd7d1',stroke:'#102719',strokeThickness:3}).setOrigin(.5,0);
    const actor={id,team,name,keeper,container:c,label,leftLeg,rightLeg,leftBoot,rightBoot,armL,armR,numberText,runTween:null,world:{x:50,y:50},baseScale:1};
    this.actors[id]=actor; return actor;
  }

  makeActors() {
    this.makeFootballer('gk','home',0xf1f0e7,'MATS',1,true);
    this.makeFootballer('support','home',0xf1f0e7,'NOAH',6);
    this.makeFootballer('wide','home',0xf1f0e7,'LOU',7);
    this.makeFootballer('me','home',0xb4ed47,'IK',8);
    this.makeFootballer('forward','home',0xf1f0e7,'BAS',9);
    this.makeFootballer('oppGk','away',0x8d514a,'KEEPER',1,true);
    this.makeFootballer('press','away',0xe75d50,'MILO',4);
    this.makeFootballer('cover','away',0xe75d50,'JENS',5);
    this.makeFootballer('interceptor','away',0xe75d50,'LARS',3);
    this.makeFootballer('farDef','away',0xe75d50,'ARNE',2);
  }

  resetPositions() {
    this.world={
      gk:{x:50,y:91},support:{x:38,y:72},wide:{x:79,y:48},me:{x:51,y:55},forward:{x:61,y:34},
      oppGk:{x:50,y:5},press:{x:54,y:62},cover:{x:38,y:39},interceptor:{x:72,y:42},farDef:{x:78,y:58},
      ball:{x:38,y:72},
    };
    for(const [id,actor] of Object.entries(this.actors)) { actor.world={...this.world[id]};this.placeActor(actor);this.stopRun(actor); }
    this.updateControlMarker(true);
    this.resetPassLabels();
    this.goalBanner.setAlpha(0).setScale(1);
    this.placeBall();
  }

  resetPassLabels() {
    const labels={gk:'MATS',support:'NOAH',wide:'LOU',me:'IK',forward:'BAS',oppGk:'KEEPER',press:'MILO',cover:'JENS',interceptor:'LARS',farDef:'ARNE'};
    for(const [id,label] of Object.entries(labels))this.actors[id].label.setText(label);
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
    if (actor.id === (this.activeExercise === 'run' ? 'forward' : 'me')) this.updateControlMarker();
  }
  placeBall() { const p=this.project(this.world.ball.x,this.world.ball.y);this.ball.setPosition(p.x,p.y).setScale(p.s);this.ball.setDepth(p.y+2);this.ballLabel.setPosition(p.x,p.y-10*p.s).setScale(p.s).setDepth(p.y+3); }
  async delay(ms) { await new Promise(resolve=>window.setTimeout(resolve,ms)); }
  stopRun(actor) { if(actor.runTween){actor.runTween.remove(false);actor.runTween=null;} actor.leftLeg.setAngle(0);actor.rightLeg.setAngle(0);actor.leftBoot.setY(21);actor.rightBoot.setY(21);actor.armL.setAngle(-.18);actor.armR.setAngle(.18); }
  runCycle(actor) {
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
        this.ball.setPosition(p.x,p.y-lift).setScale(p.s*(1+Math.sin(Math.PI*state.t)*.12));this.ballLabel.setPosition(p.x,p.y-10*p.s-lift).setScale(p.s);this.ball.setDepth(p.y+5);
      },onComplete:finish});
      fallback=window.setTimeout(()=>{tween.stop();finish();},duration+1200);
    });
  }

  async showWatchPhase({review=false}={}) {
    if(this.activeExercise==='run'){return this.showRunWatchPhase({review});}
    this.busy=true;this.resetPositions();
    dom.phase.textContent='KIJK GOED';dom.prompt.textContent='Noah speelt naar jou. Kijk om je heen.';
    dom.helper.textContent='Jij bent IK (8). Kijk naar je ploegmaats en verdedigers.';dom.answers.hidden=true;dom.feedback.hidden=true;dom.timerTrack.classList.remove('active');dom.countdown.textContent='';dom.roleStart.hidden=true;this.updateControlMarker(true);
    await this.delay(350);
    this.runCycle(this.actors.support);
    await Promise.all([this.moveBall({x:51,y:55},850,'Sine.easeInOut'),this.move('wide',{x:82,y:45},650),this.move('forward',{x:64,y:35},700),this.move('press',{x:53,y:59},700),this.move('interceptor',{x:68,y:43},700),this.move('farDef',{x:75,y:53},700)]);
    this.stopRun(this.actors.support);this.world.ball={x:51,y:55};this.placeBall();
    await this.delay(review?300:450);
    if(review){dom.phase.textContent='BEKIJK OPNIEUW';dom.prompt.textContent='Kijk nog eens rustig.';dom.helper.textContent='Tik op de knop om zelf te kiezen.';dom.roleStart.textContent='Start de kijkfase opnieuw';dom.roleStart.hidden=false;this.busy=false;return;}
    dom.phase.textContent='JIJ BENT IK (8)';dom.prompt.textContent='Waar speel jij naartoe?';dom.helper.textContent='Kies een oplossing. Kijk naar de verdedigers.';
    await this.revealChoices(8000);
  }

  async showRunWatchPhase({review=false}={}) {
    this.busy=true;this.resetSpacePositions();
    dom.phase.textContent=review?'KIJK NOG EENS':'KIJK GOED';
    dom.prompt.textContent='MATS (1) speelt naar C (4).';
    dom.helper.textContent='Jij bent S (9). Kijk naar RF en de verdediger bij jou.';
    dom.answers.hidden=true;dom.feedback.hidden=true;dom.timerTrack.classList.remove('active');dom.countdown.textContent='';dom.roleStart.hidden=true;this.updateControlMarker(true);
    await this.delay(300);
    await Promise.all([
      this.move('gk',{x:51,y:81},650),this.move('me',{x:57,y:62},550),
      this.move('wide',{x:81,y:41},650),this.move('support',{x:23,y:58},600),
      this.move('forward',{x:62,y:27},650),this.move('press',{x:48,y:44},700),
      this.move('cover',{x:61,y:39},700),this.move('interceptor',{x:56,y:31},700),
      this.move('farDef',{x:72,y:27},650),this.moveBall({x:57,y:62},650),
    ]);
    if(review){dom.phase.textContent='BEKIJK OPNIEUW';dom.prompt.textContent='Kijk hoe S en de verdediger bewegen.';dom.helper.textContent='Tik op de knop om zelf te kiezen.';dom.roleStart.textContent='Start de kijkfase opnieuw';dom.roleStart.hidden=false;this.busy=false;return;}
    dom.phase.textContent='JIJ BENT S (9)';dom.prompt.textContent='Welke loopactie kies jij?';
    dom.answers.querySelector('[data-choice="A"] .answer-label').textContent=SPACE_MAKING_SCENARIO.choices.A.label;
    dom.answers.querySelector('[data-choice="B"] .answer-label').textContent=SPACE_MAKING_SCENARIO.choices.B.label;
    dom.answers.querySelector('[data-choice="C"] .answer-label').textContent='Loop schuin weg';
    dom.helper.textContent='Kies rustig. Kijk wat de verdediger doet.';await this.revealChoices(10000);
  }

  async revealChoices(totalMs) {
    dom.answers.hidden=false;
    this.busy=false;
    await new Promise(requestAnimationFrame);
    if (!this.busy && !dom.answers.hidden) this.beginTimer(totalMs);
  }

  beginTimer(total=8000) {
    dom.timerTrack.classList.add('active');dom.timerFill.classList.remove('urgent');dom.countdown.textContent=String((total/1000).toFixed(1)).replace('.',',')+' s';
    const start=performance.now();
    if(this.timerFrame) cancelAnimationFrame(this.timerFrame);
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
    if(this.busy)return;this.busy=true;
    if(this.timerFrame){cancelAnimationFrame(this.timerFrame);this.timerFrame=null;}
    dom.answers.hidden=true;dom.countdown.textContent='';dom.timerTrack.classList.remove('active');
    if(!choice){dom.phase.textContent='GEEN KEUZE';dom.prompt.textContent='Geen probleem. Kijk nog eens rustig.';dom.helper.textContent='Je kan dezelfde situatie opnieuw proberen.';await this.delay(500);this.showFeedback(null);this.busy=false;return;}
    dom.phase.textContent='KIJK WAT ER GEBEURT';
    if(this.activeExercise==='run'){
      dom.prompt.textContent=SPACE_MAKING_SCENARIO.choices[choice].title;dom.helper.textContent='Volg jouw loopactie en kijk wat de verdediger doet.';
      await this.playRunChoice(choice);
    }else{
      dom.prompt.textContent={A:'Je speelt naar rechts.',B:'Je speelt centraal.',C:'Je speelt terug.'}[choice];dom.helper.textContent='Volg de bal en kijk hoe de spelers reageren.';
      if(choice==='A')await this.playA();if(choice==='B')await this.playB();if(choice==='C')await this.playC();
    }
    await this.delay(250);this.showFeedback(choice);this.busy=false;
  }

  async playA() {
    // A short ground pass to Lou keeps the right side wide; Lou continues up
    // the same flank instead of teleporting across the pitch.
    await Promise.all([
      this.moveBall({x:78,y:47},820,'Sine.easeInOut'),
      this.move('wide',{x:78,y:47},720),
      this.move('interceptor',{x:68,y:45},780),
      this.move('forward',{x:66,y:29},820),
      this.move('press',{x:55,y:54},650),
      this.move('farDef',{x:74,y:48},720),
      this.move('support',{x:34,y:67},720),
      this.move('gk',{x:49,y:84},650),
      this.move('cover',{x:48,y:39},760),
      this.move('oppGk',{x:50,y:6},650),
    ]);
    // Lou takes two measured touches forward, while the full team shifts with play.
    await Promise.all([
      this.move('wide',{x:83,y:42},620),this.moveBall({x:82,y:43},620,'Sine.easeOut'),
      this.move('interceptor',{x:75,y:42},620),this.move('farDef',{x:78,y:44},620),
      this.move('me',{x:56,y:51},620),this.move('forward',{x:69,y:27},620),
      this.move('press',{x:60,y:50},620),this.move('cover',{x:52,y:37},620),
      this.move('support',{x:31,y:65},620),this.move('gk',{x:48,y:82},620),this.move('oppGk',{x:50,y:5},620),
    ]);
  }
  async playB() {
    // The central pass is intercepted in view: the defender runs across the ball's
    // path, arrives just ahead of it, then takes the loose ball toward the press.
    const meet={x:57,y:44};
    await Promise.all([
      this.moveBall(meet,1050,'Linear'),
      this.move('interceptor',meet,850,'Sine.easeIn'),
      this.move('forward',{x:62,y:32},620),
      this.move('press',{x:53,y:53},600),
      this.move('cover',{x:46,y:37},760),
      this.move('wide',{x:79,y:47},760),this.move('support',{x:38,y:70},700),
      this.move('me',{x:53,y:54},700),this.move('gk',{x:50,y:88},700),
      this.move('farDef',{x:75,y:52},700),this.move('oppGk',{x:50,y:6},700),
    ]);
    this.ball.setDepth(this.actors.interceptor.container.depth+2);
    await this.delay(180);
    await Promise.all([
      this.move('interceptor',{x:54,y:50},520,'Sine.easeIn'),
      this.moveBall({x:53,y:51},520,'Sine.easeOut'),
      this.move('press',{x:53,y:52},430),
      this.move('wide',{x:76,y:45},430),this.move('support',{x:40,y:68},430),
      this.move('me',{x:55,y:52},430),this.move('gk',{x:50,y:86},430),
      this.move('cover',{x:48,y:40},430),this.move('farDef',{x:73,y:49},430),this.move('oppGk',{x:50,y:6},430),
    ]);
  }
  async playC() {
    // A safe return to Noah. Lou remains on the right touchline and offers
    // width; the rest of the team slides into supporting positions.
    await Promise.all([
      this.moveBall({x:39,y:72},780,'Sine.easeInOut'),
      this.move('support',{x:39,y:72},700),
      this.move('press',{x:53,y:56},650),
      this.move('wide',{x:81,y:46},700),
      this.move('forward',{x:63,y:31},720),
      this.move('interceptor',{x:66,y:40},680),
      this.move('farDef',{x:75,y:50},680),
      this.move('gk',{x:49,y:87},650),this.move('cover',{x:40,y:40},680),this.move('oppGk',{x:50,y:6},650),
    ]);
    await Promise.all([
      this.move('support',{x:34,y:67},420),this.moveBall({x:34,y:67},420,'Sine.easeOut'),
      this.move('me',{x:52,y:54},420),this.move('wide',{x:82,y:44},420),
      this.move('forward',{x:64,y:30},420),this.move('press',{x:54,y:53},420),
      this.move('cover',{x:42,y:41},420),this.move('interceptor',{x:64,y:40},420),
      this.move('farDef',{x:75,y:49},420),this.move('gk',{x:49,y:86},420),this.move('oppGk',{x:50,y:6},420),
    ]);
  }

  async playRunChoice(choice) {
    if(choice==='A'){
      await Promise.all([this.move('forward',{x:57,y:39},780),this.move('interceptor',{x:58,y:35},760),this.move('wide',{x:82,y:39},600),this.move('support',{x:22,y:60},620),this.move('me',{x:57,y:61},500),this.move('gk',{x:52,y:80},500),this.move('press',{x:49,y:45},600),this.move('cover',{x:63,y:38},620),this.move('farDef',{x:72,y:26},550),this.move('oppGk',{x:50,y:7},500)]);
      await Promise.all([this.moveBall({x:57,y:39},620,'Sine.easeOut'),this.move('me',{x:57,y:57},700)]);
      await Promise.all([this.move('forward',{x:54,y:37},420),this.move('interceptor',{x:56,y:36},420),this.move('wide',{x:83,y:38},420),this.move('cover',{x:61,y:37},420)]);
    }else if(choice==='B'){
      await Promise.all([this.move('forward',{x:61,y:24},650),this.move('interceptor',{x:61,y:27},620),this.move('wide',{x:83,y:40},650),this.move('support',{x:21,y:59},650),this.move('me',{x:59,y:58},650),this.move('gk',{x:51,y:79},650),this.move('press',{x:49,y:44},650),this.move('cover',{x:63,y:36},650),this.move('farDef',{x:73,y:25},650),this.move('oppGk',{x:50,y:6},500)]);
      await Promise.all([this.moveBall({x:82,y:40},760),this.move('wide',{x:82,y:40},700),this.move('farDef',{x:77,y:35},700)]);
      await Promise.all([this.move('me',{x:63,y:52},480),this.move('forward',{x:62,y:26},480),this.move('interceptor',{x:63,y:29},480)]);
    }else{
      // S trekt zijn marker mee. RF start pas naar binnen nadat de ruimte zichtbaar opent.
      await Promise.all([this.move('forward',{x:43,y:35},760),this.move('interceptor',{x:46,y:33},760),this.move('wide',{x:78,y:39},600),this.move('support',{x:22,y:59},620),this.move('press',{x:51,y:45},620),this.move('cover',{x:62,y:37},650),this.move('farDef',{x:72,y:27},650),this.move('gk',{x:52,y:80},550),this.move('me',{x:58,y:60},550),this.move('oppGk',{x:51,y:6},500)]);
      await Promise.all([this.move('wide',{x:67,y:34},700),this.moveBall({x:67,y:34},700,'Sine.easeOut'),this.move('me',{x:58,y:57},650),this.move('press',{x:53,y:46},620),this.move('cover',{x:64,y:35},650)]);
      // RF follows with short touches through the opened right channel, then
      // shoots from in front of goal. The goalkeeper moves to meet the shot.
      await Promise.all([this.move('wide',{x:59,y:19},850),this.moveBall({x:59,y:19},850,'Sine.easeInOut'),this.move('forward',{x:46,y:30},700),this.move('interceptor',{x:48,y:31},700),this.move('support',{x:20,y:57},600),this.move('gk',{x:52,y:76},600),this.move('press',{x:56,y:48},720),this.move('cover',{x:60,y:31},720),this.move('farDef',{x:65,y:23},720),this.move('oppGk',{x:52,y:4},700)]);
      await Promise.all([this.move('wide',{x:57,y:17},430),this.moveBall({x:57,y:17},430,'Sine.easeOut'),this.move('oppGk',{x:52,y:4},430),this.move('interceptor',{x:50,y:25},430),this.move('farDef',{x:60,y:20},430)]);
      await Promise.all([this.moveBall({x:51,y:1},560,'Sine.easeIn'),this.move('oppGk',{x:48,y:5},430),this.move('wide',{x:57,y:17},430)]);
      this.goalBanner.setPosition(this.scale.width/2,this.scale.height*.40).setAlpha(1).setScale(.65);
      this.tweens.add({targets:this.goalBanner,scale:1,duration:350,ease:'Back.Out'});
      await Promise.all([this.move('wide',{x:58,y:16},360),this.move('forward',{x:55,y:18},360),this.move('me',{x:61,y:48},500),this.move('support',{x:31,y:51},500)]);
      await this.delay(650);this.goalBanner.setAlpha(0);
    }
  }

  showFeedback(choice) {
    const data=choice?(this.activeExercise==='run'?{title:choice==='C'?'Ruimte gemaakt!':choice==='A'?'Goed vrijgelopen!':'Goed diep gebleven.',text:SPACE_MAKING_SCENARIO.choices[choice].feedback,mark:'✓',className:''}:COPY[choice]):{title:'Probeer het nog eens.',text:'Je hoeft niet snel te zijn. Kijk waar de vrije ruimte is en probeer opnieuw.',mark:'↻',className:'warn'};
    dom.phase.textContent=choice==='B'&&this.activeExercise==='pass'?'KIJK NOG EENS':'GOED GEKEKEN';
    dom.prompt.textContent=choice?'Wat zag jij gebeuren?':'Neem rustig nog een kijkje.';
    dom.helper.textContent=this.activeExercise==='run'?'Je kan ook zonder bal ruimte maken.':'Onthoud: kijk vóór je de bal krijgt.';
    dom.feedbackTitle.textContent=data.title;dom.feedbackText.textContent=data.text;dom.feedbackMark.textContent=data.mark;dom.feedbackMark.className='feedback-mark '+data.className;
    dom.feedback.hidden=false;
  }

  async restart() { if(this.timerFrame){cancelAnimationFrame(this.timerFrame);this.timerFrame=null;}this.busy=false;await this.showWatchPhase(); }
}

const scene=new FootballScene();
const game=new Phaser.Game({
  type:Phaser.AUTO, parent:dom.field, backgroundColor:'#11653d',
  scale:{mode:Phaser.Scale.RESIZE,width:'100%',height:'100%',autoCenter:Phaser.Scale.CENTER_BOTH},
  render:{antialias:true,roundPixels:false},
  input:{activePointers:1,touch:{capture:true}},
  scene:[scene],
});

function selectExercise(mode){
  if(scene.busy)return;
  scene.activeExercise=mode;
  scene.updateControlMarker(true);
  const running=mode==='run';
  dom.passExercise.classList.toggle('selected',!running);dom.runExercise.classList.toggle('selected',running);
  dom.passExercise.setAttribute('aria-pressed',String(!running));dom.runExercise.setAttribute('aria-pressed',String(running));
  dom.introTitle.textContent=running?'Maak jij ruimte voor je ploegmaat?':'Zie jij de vrije speler?';
  dom.introCopy.textContent=running?'Jij speelt S (9). Kijk wat de verdediger doet en kies jouw loopactie.':'Kijk waar je ploegmaats en tegenstanders lopen. De bal komt naar jou. Wat doe jij?';
  dom.welcomeCopy.textContent=running?'Jij speelt als spits. Kijk naar C, RF en de verdediger bij jou. Kies daarna hoe jij zonder bal beweegt.':'Let op wie vrij staat en waar de verdediger loopt. Daarna kies jij één van de drie oplossingen.';
  const labels=running?['Kom naar de bal','Blijf diep','Loop schuin weg']:['Speel naar rechts','Speel centraal','Speel terug'];
  const arrows=running?['↓','↑','↖']:['↗','↑','↙'];
  ['A','B','C'].forEach((letter,index)=>{const button=dom.answers.querySelector(`[data-choice="${letter}"]`);button.querySelector('.answer-label').textContent=labels[index];button.querySelector('.answer-arrow').textContent=arrows[index];});
  dom.prompt.textContent=running?'Kies een loopactie wanneer je klaar bent.':'Druk op start wanneer je klaar bent.';
}
function beginRoleIntro(){
  dom.intro.hidden=true;
  dom.answers.hidden=true;dom.feedback.hidden=true;dom.timerTrack.classList.remove('active');dom.countdown.textContent='';
  if(scene.activeExercise==='run'){
    scene.resetSpacePositions();
    dom.phase.textContent='WIE SPEEL JIJ?';dom.prompt.textContent='Jij bent de spits (9).';
    dom.helper.textContent='Zoek S (9) met de groene cirkel. De keeper heeft de bal.';
  }else{
    scene.resetPositions();
    dom.phase.textContent='WIE SPEEL JIJ?';dom.prompt.textContent='Jij bent IK (8).';
    dom.helper.textContent='Zoek IK (8) met de groene cirkel. Noah heeft de bal.';
  }
  scene.updateControlMarker(true);
  dom.roleStart.textContent='Start de kijkfase';dom.roleStart.hidden=false;
}
function startWatchPhase(){
  if(scene.busy)return;
  dom.roleStart.hidden=true;
  if(scene.activeExercise==='run')scene.showRunWatchPhase();else scene.showWatchPhase();
}
dom.passExercise.addEventListener('click',()=>selectExercise('pass'));dom.runExercise.addEventListener('click',()=>selectExercise('run'));
dom.start.addEventListener('click',beginRoleIntro);dom.welcomeStart.addEventListener('click',()=>{dom.welcome.hidden=true;});dom.roleStart.addEventListener('click',startWatchPhase);
dom.answers.addEventListener('click',(event)=>{const button=event.target.closest('[data-choice]');if(button&&!button.disabled)scene.resolveChoice(button.dataset.choice);});
dom.watchAgain.addEventListener('click',()=>{dom.feedback.hidden=true;scene.showWatchPhase({review:true});});
dom.retry.addEventListener('click',()=>{dom.feedback.hidden=true;scene.restart();});

if('serviceWorker' in navigator && import.meta.env.PROD){window.addEventListener('load',()=>navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`,{scope:import.meta.env.BASE_URL}).catch(()=>{}));}

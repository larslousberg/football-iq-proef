import Phaser from 'phaser';
import './style.css';

const dom = {
  field: document.querySelector('#game'),
  intro: document.querySelector('#intro'),
  welcome: document.querySelector('#welcomeScrim'),
  start: document.querySelector('#startButton'),
  welcomeStart: document.querySelector('#welcomeStart'),
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
  constructor() { super('football'); this.actors = {}; this.world = {}; this.busy = false; this.activeTweens = []; }

  create() {
    this.pitch = this.add.graphics();
    this.ball = this.makeBall();
    this.ballLabel = this.add.text(0, 0, 'BAL', { fontFamily: 'DM Sans, sans-serif', fontSize: '9px', color: '#f6f7ef', fontStyle: 'bold', stroke: '#092217', strokeThickness: 3 }).setOrigin(.5, 1);
    this.makeActors();
    this.scale.on('resize', this.handleResize, this);
    this.drawBoard();
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
    const spot1=point(50,10),spot2=point(50,90);g.fillStyle(0xe8f5e8,.8);g.fillCircle(spot1.x,spot1.y,2);g.fillCircle(spot2.x,spot2.y,2);
  }

  handleResize() {
    this.drawBoard();
    for (const actor of Object.values(this.actors)) this.placeActor(actor);
    this.placeBall();
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
    this.placeBall();
  }

  placeActor(actor) {
    const p=this.project(actor.world.x,actor.world.y);
    actor.container.setPosition(p.x,p.y).setScale(p.s);actor.container.setDepth(p.y);
    actor.label.setPosition(p.x,p.y+21*p.s).setScale(p.s).setDepth(p.y+1);
    actor.baseScale=p.s;
  }
  placeBall() { const p=this.project(this.world.ball.x,this.world.ball.y);this.ball.setPosition(p.x,p.y).setScale(p.s);this.ball.setDepth(p.y+2);this.ballLabel.setPosition(p.x,p.y-10*p.s).setScale(p.s).setDepth(p.y+3); }
  async delay(ms) { await new Promise(resolve=>this.time.delayedCall(ms,resolve)); }
  stopRun(actor) { if(actor.runTween){actor.runTween.remove(false);actor.runTween=null;} actor.leftLeg.setAngle(0);actor.rightLeg.setAngle(0);actor.leftBoot.setY(21);actor.rightBoot.setY(21);actor.armL.setAngle(-.18);actor.armR.setAngle(.18); }
  runCycle(actor) {
    this.stopRun(actor);
    let swap=false;
    actor.runTween=this.time.addEvent({delay:115,loop:true,callback:()=>{swap=!swap;actor.leftLeg.setAngle(swap?-24:20);actor.rightLeg.setAngle(swap?20:-24);actor.leftBoot.setY(swap?19:23);actor.rightBoot.setY(swap?23:19);actor.armL.setAngle(swap?-.45:.12);actor.armR.setAngle(swap?.12:-.45);}});
  }
  move(id,to,duration=650,ease='Sine.easeInOut') {
    const actor=this.actors[id];this.runCycle(actor);
    return new Promise(resolve=>this.tweens.add({targets:actor.world,x:to.x,y:to.y,duration,ease,onUpdate:()=>this.placeActor(actor),onComplete:()=>{this.stopRun(actor);this.placeActor(actor);resolve();}}));
  }
  moveBall(to,duration=650,ease='Sine.easeInOut',air=false) {
    return new Promise(resolve=>{
      const start={...this.world.ball};const state={t:0};
      this.tweens.add({targets:state,t:1,duration,ease,onUpdate:()=>{
        this.world.ball.x=Phaser.Math.Linear(start.x,to.x,state.t);this.world.ball.y=Phaser.Math.Linear(start.y,to.y,state.t);
        const p=this.project(this.world.ball.x,this.world.ball.y);const lift=air?Math.sin(Math.PI*state.t)*18:Math.sin(Math.PI*state.t)*3;
        this.ball.setPosition(p.x,p.y-lift).setScale(p.s*(1+Math.sin(Math.PI*state.t)*.12));this.ballLabel.setPosition(p.x,p.y-10*p.s-lift).setScale(p.s);this.ball.setDepth(p.y+5);
      },onComplete:()=>{this.world.ball={...to};this.placeBall();resolve();}});
    });
  }

  async showWatchPhase({review=false}={}) {
    this.busy=true;this.resetPositions();
    dom.phase.textContent='KIJK GOED';dom.prompt.textContent='Kijk waar iedereen loopt. De bal komt naar jou.';
    dom.helper.textContent='Kijk naar je ploegmaats én naar de verdedigers.';dom.answers.hidden=true;dom.feedback.hidden=true;dom.timerTrack.classList.remove('active');dom.countdown.textContent='';
    await this.delay(350);
    this.runCycle(this.actors.support);
    await Promise.all([this.moveBall({x:51,y:55},850,'Sine.easeInOut',true),this.move('wide',{x:82,y:45},650),this.move('forward',{x:64,y:35},700),this.move('press',{x:53,y:59},700),this.move('interceptor',{x:68,y:43},700),this.move('farDef',{x:75,y:53},700)]);
    this.stopRun(this.actors.support);this.world.ball={x:51,y:55};this.placeBall();
    await this.delay(review?300:450);
    if(review){dom.phase.textContent='BEKIJK OPNIEUW';dom.prompt.textContent='Je kan de kijkfase rustig bekijken.';dom.helper.textContent='Tik op “Probeer opnieuw” om zelf een keuze te maken.';this.busy=false;return;}
    dom.phase.textContent='JIJ HEBT DE BAL';dom.prompt.textContent='Waar speel jij naartoe?';dom.helper.textContent='Kies binnen 8 seconden. Twee oplossingen kunnen goed zijn.';
    dom.answers.hidden=false;this.beginTimer();this.busy=false;
  }

  beginTimer() {
    dom.timerTrack.classList.add('active');dom.timerFill.classList.remove('urgent');dom.countdown.textContent='8';
    const start=performance.now(), total=8000;
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
    dom.phase.textContent='KIJK WAT ER GEBEURT';dom.prompt.textContent={A:'Je speelt naar rechts.',B:'Je speelt centraal.',C:'Je speelt terug.'}[choice];dom.helper.textContent='Volg de bal en kijk hoe de spelers reageren.';
    if(choice==='A')await this.playA();if(choice==='B')await this.playB();if(choice==='C')await this.playC();
    await this.delay(250);this.showFeedback(choice);this.busy=false;
  }

  async playA() {
    await Promise.all([
      this.moveBall({x:82,y:44},1050,'Sine.easeInOut',true),
      this.move('wide',{x:83,y:43},850),
      this.move('interceptor',{x:65,y:45},850),
      this.move('forward',{x:68,y:24},900),
      this.move('press',{x:55,y:54},650),
      this.move('farDef',{x:73,y:47},700),
    ]);
    await this.delay(180);
    await Promise.all([this.move('wide',{x:87,y:38},520),this.moveBall({x:87,y:38},520,'Sine.easeOut')]);
  }
  async playB() {
    // The central pass is intercepted in view: the defender runs across the ball's
    // path, arrives just ahead of it, then takes the loose ball toward the press.
    const meet={x:57,y:44};
    await Promise.all([
      this.moveBall(meet,1050,'Linear',true),
      this.move('interceptor',meet,850,'Sine.easeIn'),
      this.move('forward',{x:62,y:32},620),
      this.move('press',{x:53,y:53},600),
      this.move('cover',{x:46,y:37},760),
    ]);
    this.ball.setDepth(this.actors.interceptor.container.depth+2);
    await this.delay(180);
    await Promise.all([
      this.move('interceptor',{x:54,y:50},520,'Sine.easeIn'),
      this.moveBall({x:53,y:51},520,'Sine.easeOut'),
      this.move('press',{x:53,y:52},430),
    ]);
  }
  async playC() {
    await Promise.all([
      this.moveBall({x:36,y:73},900,'Sine.easeInOut',true),
      this.move('support',{x:34,y:70},700),
      this.move('press',{x:53,y:56},600),
      this.move('wide',{x:16,y:39},650),
      this.move('forward',{x:65,y:31},700),
      this.move('interceptor',{x:67,y:40},650),
      this.move('farDef',{x:75,y:50},650),
    ]);
    await Promise.all([this.moveBall({x:34,y:70},300,'Sine.easeOut'),this.move('support',{x:34,y:70},300)]);
    await Promise.all([this.moveBall({x:31,y:66},420),this.move('support',{x:31,y:66},420)]);
  }

  showFeedback(choice) {
    const data=choice?COPY[choice]:{title:'Probeer het nog eens.',text:'Je hoeft niet snel te zijn. Kijk waar de vrije ruimte is en probeer opnieuw.',mark:'↻',className:'warn'};
    dom.phase.textContent=choice==='B'?'KIJK NOG EENS':'GOED GEKEKEN';
    dom.prompt.textContent=choice?'Wat zag jij gebeuren?':'Neem rustig nog een kijkje.';
    dom.helper.textContent='Onthoud: kijk vóór je de bal krijgt.';
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

function begin(){dom.welcome.hidden=true;dom.intro.hidden=true;dom.helper.textContent='Kijk naar je ploegmaats én naar de verdedigers.';game.scene.start('football');setTimeout(()=>{const active=game.scene.getScene('football');active.showWatchPhase();},100);}
dom.start.addEventListener('click',begin);dom.welcomeStart.addEventListener('click',begin);
dom.answers.addEventListener('click',(event)=>{const button=event.target.closest('[data-choice]');if(button&&!button.disabled)scene.resolveChoice(button.dataset.choice);});
dom.watchAgain.addEventListener('click',()=>{dom.feedback.hidden=true;scene.showWatchPhase({review:true});});
dom.retry.addEventListener('click',()=>{dom.feedback.hidden=true;scene.restart();});

if('serviceWorker' in navigator && import.meta.env.PROD){window.addEventListener('load',()=>navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`,{scope:import.meta.env.BASE_URL}).catch(()=>{}));}

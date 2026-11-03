/* NEON 04:19 · independent playable prototype · Phaser 3.90 + optional PixelFX.
 * Original art and level; no assets from The Last Night. */
const $ = (id) => document.getElementById(id);
const SCREEN = { w: 640, h: 360 };
const WORLD_W = 2800;
const GROUND = 283;
const FX_ROOT = 'https://cdn.jsdelivr.net/gh/patch-gg/pixelfx@a84159688af3ca37a4be05a0d422b94451b2e24e';
const COLOR = {cyan:0x51f3e5,pink:0xfa639f,amber:0xffad6a,blue:0x62a8e9};
const OBJECTIVES = [
  'Найди информатора у лапшичной',
  'Забери капсулу памяти из архива',
  'Отнеси капсулу к терминалу MEMORY',
  'Доберись до выходного шлюза'
];
let sound = null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.abs(a-b);

class Soundscape {
  constructor(){this.on=false;this.ctx=null;this.ambient=[];this.noise=null}
  enable(){
    this.on=true;
    if(!this.ctx) {
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return;
      this.ctx=new AC();
      const gain=this.ctx.createGain();gain.gain.value=0.035;gain.connect(this.ctx.destination);
      for(const [hz,vol,type] of [[55,.52,'sine'],[82.4,.20,'triangle'],[110,.09,'sine']]) {
        const osc=this.ctx.createOscillator(),g=this.ctx.createGain();osc.type=type;osc.frequency.value=hz;g.gain.value=vol;osc.connect(g);g.connect(gain);osc.start();this.ambient.push(osc);
      }
      const length=this.ctx.sampleRate*2,buf=this.ctx.createBuffer(1,length,this.ctx.sampleRate),arr=buf.getChannelData(0);
      let last=0;for(let i=0;i<length;i++){const white=Math.random()*2-1;arr[i]=(last=(last+white*.06)/1.05)}
      const source=this.ctx.createBufferSource();source.buffer=buf;source.loop=true;
      const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1200;
      const g=this.ctx.createGain();g.gain.value=.046;source.connect(filter);filter.connect(g);g.connect(this.ctx.destination);source.start();this.noise=source;
    }
    this.ctx?.resume();
  }
  disable(){this.on=false;this.ctx?.suspend()}
  beep(freq=320,duration=.1,kind='sine',volume=.08){
    if(!this.on||!this.ctx)return;
    const ctx=this.ctx,osc=ctx.createOscillator(),g=ctx.createGain();
    osc.type=kind;osc.frequency.setValueAtTime(freq,ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40,freq*.68),ctx.currentTime+duration);
    g.gain.setValueAtTime(volume,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+duration);
    osc.connect(g);g.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+duration+.01);
  }
  chirp(){this.beep(660,.07,'triangle',.04);setTimeout(()=>this.beep(940,.12,'sine',.035),85)}
}
sound=new Soundscape();

async function loadPixelFX(){
  // Local vendor is optional. Without it, use pinned CDN ES modules. If both fail, draw native fallbacks.
  async function fetchFX(root){
    const [core,emp,collect]=await Promise.all([
      import(`${root}/src/core/index.js`),
      import(`${root}/src/fx/scifi/emp-blast.js`),
      import(`${root}/src/fx/pickups/collect-burst.js`)
    ]);
    return {core,emp,collect};
  }
  try{return await fetchFX('../vendor/pixelfx');}
  catch{return fetchFX(FX_ROOT);}
}

class NightScene extends Phaser.Scene {
  constructor(){super({key:'NightScene'});this.mobile={left:false,right:false,jump:false};this.started=false;this.quest=0;this.hasChip=false;this.end=false;this.dialogue=null;this.dialogueAfter=null;this.dialogueIndex=0;this.fxBank=null;this.fxInstances=[];this.fxSeq=0;this.ambientTime=0;this.fallTime=0;this.pulseReady=0;this.droneDisabled=0;this.touchBound=false;this.lastRainTime=0;this.currentTarget=null;this.lastStep=0;this.alertNext=0;this.signs=[];}
  preload(){
    this.load.setPath('assets/');
    this.load.image('sky','sky.png');this.load.image('midcity','midcity.png');this.load.image('street','street.png');
    this.load.image('npc','npc.png');this.load.image('chip','chip.png');this.load.image('drone','drone.png');
    this.load.image('glow','glow.png');this.load.image('lamp','lamp-post.png');
    this.load.spritesheet('hero','hero-walk.png',{frameWidth:30,frameHeight:52});
    this.load.on('loaderror',(file)=>console.error('Asset failed to load:',file.key));
  }
  create(){
    this.cameras.main.setBounds(0,0,WORLD_W,SCREEN.h);
    this.physics.world.setBounds(0,0,WORLD_W,SCREEN.h);
    this.add.image(0,0,'sky').setOrigin(0).setScrollFactor(0).setDepth(-60);
    this.add.image(0,0,'midcity').setOrigin(0).setScrollFactor(.46).setDepth(-38);
    this.add.image(0,0,'street').setOrigin(0).setDepth(-20);
    this.makeLight(116,163,COLOR.cyan,2.4,.23);this.makeLight(553,170,COLOR.amber,2.5,.25);
    this.makeLight(905,171,COLOR.cyan,1.7,.21);this.makeLight(1140,135,COLOR.pink,2.3,.21);
    this.makeLight(1635,110,COLOR.cyan,2.2,.23);this.makeLight(2035,144,COLOR.pink,2.1,.18);
    this.makeLight(2257,162,COLOR.cyan,3.0,.22);this.makeLight(2650,172,COLOR.amber,2.0,.26);
    this.addWorldDecor();
    // Ground uses a static Arcade body. Scene is a compact cinematic slice, not a full platformer.
    const ground=this.add.rectangle(WORLD_W/2,331,WORLD_W,96,0x000000,0).setVisible(false);
    this.physics.add.existing(ground,true);
    this.anims.create({key:'player-walk',frames:this.anims.generateFrameNumbers('hero',{start:0,end:7}),frameRate:12,repeat:-1});
    this.anims.create({key:'player-idle',frames:[{key:'hero',frame:0}],frameRate:1,repeat:-1});
    this.player=this.physics.add.sprite(150,GROUND,'hero',0).setOrigin(.5,1).setDepth(55);
    this.player.body.setSize(15,44).setOffset(8,8);
    this.player.setMaxVelocity(200,620);this.player.setCollideWorldBounds(true);
    this.player.setDragX(950);
    this.player.setGravityY(880);
    // Mirrored silhouette on wet asphalt, below the physical sprite.
    this.reflection=this.add.sprite(150,GROUND+4,'hero',0).setOrigin(.5,0).setFlipY(true).setScale(1,.56).setAlpha(.16).setDepth(43);
    this.physics.add.collider(this.player,ground);
    this.cameras.main.startFollow(this.player,true,.09,.09,0,-13);
    this.npc=this.add.image(600,GROUND,'npc').setOrigin(.5,1).setDepth(52);
    this.npcHalo=this.add.image(600,241,'glow').setScale(.62).setTint(COLOR.pink).setAlpha(.14).setBlendMode(Phaser.BlendModes.ADD).setDepth(50);
    this.chip=this.add.image(1330,230,'chip').setDepth(55);
    this.chipGlow=this.add.image(1330,230,'glow').setTint(COLOR.cyan).setScale(.6).setAlpha(.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(52);
    this.tweens.add({targets:[this.chip,this.chipGlow],y:'-=6',duration:950,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    this.drone=this.add.image(1790,229,'drone').setDepth(54);
    this.droneGlow=this.add.image(1790,240,'glow').setTint(COLOR.cyan).setScale(.7).setAlpha(.4).setBlendMode(Phaser.BlendModes.ADD).setDepth(53);
    this.droneX=1790;
    this.signs.push(this.add.text(600,216,'◆',{fontFamily:'monospace',fontSize:'12px',color:'#f878a3'}).setOrigin(.5).setDepth(58));
    this.signs.push(this.add.text(1330,189,'◇',{fontFamily:'monospace',fontSize:'13px',color:'#78f3e9'}).setOrigin(.5).setDepth(58));
    this.signs.push(this.add.text(2290,203,'▣',{fontFamily:'monospace',fontSize:'11px',color:'#7ff9ed'}).setOrigin(.5).setDepth(58));
    this.signs.push(this.add.text(2665,204,'⌁',{fontFamily:'monospace',fontSize:'12px',color:'#f6bc87'}).setOrigin(.5).setDepth(58));
    this.createHoverCars();
    this.rain=[];
    const random=new Phaser.Math.RandomDataGenerator(['neon','0419']);
    for(let i=0;i<190;i++)this.rain.push({x:random.between(-60,700),y:random.between(-20,370),speed:random.between(76,215),len:random.between(3,10),layer:i%3,drift:random.between(-22,-6)});
    this.rainGraphicBack=this.add.graphics().setScrollFactor(0).setDepth(-1);
    this.rainGraphicFront=this.add.graphics().setScrollFactor(0).setDepth(88);
    this.tintFlash=this.add.rectangle(0,0,SCREEN.w,SCREEN.h,0x71f5f5,0).setOrigin(0).setScrollFactor(0).setDepth(91);
    this.keys=this.input.keyboard.addKeys({left:'A',right:'D',l:'LEFT',r:'RIGHT',jump:'SPACE',up:'W',e:'E',f:'F',sprint:'SHIFT',enter:'ENTER',esc:'ESC'});
    this.input.keyboard.on('keydown-E',()=>this.interact());
    this.input.keyboard.on('keydown-ENTER',()=>this.interact());
    this.input.keyboard.on('keydown-F',()=>this.pulse());
    this.input.keyboard.on('keydown-ESC',()=>this.escape());
    this.input.keyboard.on('keydown-SPACE',()=>{if(this.dialogue)this.interact()});
    this.bindUI();
    this.setQuest(0);
    $('loading').hidden=true;
    // Async optional PixelFX: show original repository effects when CDN works.
    loadPixelFX().then((fx)=>{this.fxBank=fx;window.__PIXELFX='loaded';console.info('PixelFX library loaded: EMP + Collect Burst');}).catch((e)=>{window.__PIXELFX='fallback';console.info('PixelFX not available; using local visual fallbacks:',e.message)});
    window.__NEON_SCENE=this; // exposed only for smoke tests and development
  }
  makeLight(x,y,tint,scale=1.8,alpha=.22){
    const light=this.add.image(x,y,'glow').setTint(tint).setScale(scale).setAlpha(alpha)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(12);
    this.tweens.add({targets:light,alpha:{from:alpha*.62,to:alpha*1.3},duration:1250+Math.round(Math.random()*1100),repeat:-1,yoyo:true,ease:'Sine.easeInOut'});
    return light;
  }
  addWorldDecor(){
    // Poles/urban furniture in a shallow foreground plane.
    for(const x of [364,1015,1448,1990,2395])this.add.image(x,GROUND,'lamp').setOrigin(.5,1).setDepth(68).setAlpha(.85);
    // A distant moving urban monorail: one simple silhouette, not a separate physics object.
    const train=this.add.container(0,153).setScrollFactor(.68).setDepth(-10);
    const hull=this.add.graphics();hull.fillStyle(0x0b2530,1);hull.fillRoundedRect(0,0,284,26,4);
    hull.lineStyle(1,0x2ebac0,.9);hull.strokeRoundedRect(0,0,284,26,4);
    for(let i=0;i<11;i++){hull.fillStyle(i%2?0x448a96:0x91a9a9,.84);hull.fillRect(14+i*24,5,15,10)}
    hull.fillStyle(0xef5c8b,1);hull.fillRect(272,19,7,2);train.add(hull);
    train.x=-390;
    this.tweens.add({targets:train,x:2800,duration:33000,repeat:-1,repeatDelay:6000,onRepeat:()=>{train.x=-400}});
    // Futuristic steam vents and the wet reflection line.
    this.steam=[];
    for(const x of [366,805,1590,2088,2445])for(let j=0;j<4;j++){
      const s=this.add.rectangle(x+Math.random()*9,GROUND-5-j*6,2+Math.random()*4,1.5,0x76bac5,.15).setDepth(61);
      this.steam.push({obj:s,x0:x+Math.random()*10,y0:GROUND-5,seed:Math.random()*5+1});
    }
    this.groundRef=this.add.graphics().setDepth(45);
  }
  createHoverCars(){
    this.cars=[];
    for(const o of [
      {x:215,y:104,s:0.45,c:0xea75a0,v:13},
      {x:840,y:90,s:0.6,c:0x5de4e1,v:-18},
      {x:1650,y:73,s:0.4,c:0xffb06f,v:22},
      {x:2250,y:123,s:0.4,c:0x57a9cc,v:-16}]){
      const g=this.add.container(o.x,o.y).setScrollFactor(.53).setDepth(-15);
      const sh=this.add.graphics();sh.fillStyle(0x081b2b,1);sh.fillRoundedRect(-23,-5,46,12,5);
      sh.fillStyle(o.c,.78);sh.fillRect(-13,-3,15,3);sh.fillRect(-26,1,5,2);sh.fillRect(22,1,4,2);
      sh.fillStyle(0xe7f6ea,1);sh.fillRect(18,-1,3,2);g.add(sh);
      this.cars.push({sprite:g,v:o.v,y:o.y,t:Math.random()*5});
    }
  }
  bindUI(){
    if(this.touchBound)return;this.touchBound=true;
    $('startBtn').addEventListener('click',()=>this.startMission());
    $('restartBtn').addEventListener('click',()=>location.reload());
    $('soundBtn').addEventListener('click',()=>{
      if(sound.on){sound.disable();$('soundLabel').textContent='ЗВУК ВЫКЛ.';$('soundBtn').setAttribute('aria-label','Включить звук');}
      else {sound.enable();sound.chirp();$('soundLabel').textContent='ЗВУК ВКЛ.';$('soundBtn').setAttribute('aria-label','Выключить звук');}
    });
    $('fullBtn').addEventListener('click',()=>{
      if(document.fullscreenElement)document.exitFullscreen?.();
      else $('frame').requestFullscreen?.();
    });
    $('dialogue').addEventListener('click',()=>this.interact());
    for(const b of document.querySelectorAll('[data-control]')){
      const name=b.dataset.control;
      b.addEventListener('pointerdown',(e)=>{
        e.preventDefault();b.setPointerCapture?.(e.pointerId);b.classList.add('pressed');
        if(name==='action')this.interact();else if(name==='pulse')this.pulse();else this.mobile[name]=true;
      });
      for(const evt of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(evt,()=>{b.classList.remove('pressed');this.mobile[name]=false;});
    }
    document.addEventListener('visibilitychange',()=>{
      // Keep game state stable on background tabs; Phaser handles its own timestep.
      if(document.hidden)this.mobile={left:false,right:false,jump:false};
    });
  }
  startMission(){
    if(this.started)return;
    this.started=true;$('intro').hidden=true;
    this.notify('СИГНАЛ ОБНАРУЖЕН · НАЙДИ ИНФОРМАТОРА',2200);
    sound.beep(610,.12,'triangle',.035);
  }
  setQuest(n){
    this.quest=n;
    $('objective').textContent=OBJECTIVES[n];
    $('phaseLabel').textContent=`0${n+1} / 04`;
    $('progressFill').style.width=`${(n+1)*25}%`;
    if(n>0)sound.chirp();
  }
  notify(text,ms=2100){
    const el=$('notification');el.textContent=text;el.classList.add('active');
    this.noticeToken=(this.noticeToken||0)+1;const tok=this.noticeToken;
    this.time.delayedCall(ms,()=>{if(tok===this.noticeToken)el.classList.remove('active')});
  }
  showDialogue(lines,after){
    this.dialogue=lines;this.dialogueAfter=after||null;this.dialogueIndex=0;
    this.player.setVelocityX(0);
    this.renderDialogue();$('prompt').hidden=true;
  }
  renderDialogue(){
    const data=this.dialogue[this.dialogueIndex];
    $('dialogueName').textContent=data[0];$('dialogueText').textContent=data[1];
    $('dialogue').hidden=false;sound.beep(500+this.dialogueIndex*120,.035,'sine',.02);
  }
  interact(){
    if(!this.started||this.end)return;
    if(this.dialogue){
      this.dialogueIndex++;
      if(this.dialogueIndex<this.dialogue.length)this.renderDialogue();
      else{
        $('dialogue').hidden=true;this.dialogue=null;
        const after=this.dialogueAfter;this.dialogueAfter=null;if(after)after();
      }
      return;
    }
    const target=this.nearestInteraction();if(!target)return;
    if(target.id==='npc'){
      if(this.quest===0)this.showDialogue([
        ['НЕИЗВЕСТНЫЙ // СЕКТОР 07','Ты опоздал. Канал связи уже прослушивается.'],
        ['НЕИЗВЕСТНЫЙ // СЕКТОР 07','В архиве к востоку есть капсула памяти. Забери её и донеси до терминала MEMORY.'],
        ['НЕИЗВЕСТНЫЙ // СЕКТОР 07','На улице патрульный дрон. Клавиша F — импульс ЭМИ, он выключит дрона на несколько секунд.']
      ],()=>this.setQuest(1));
      else this.showDialogue([['НЕИЗВЕСТНЫЙ','Не задерживайся. Город никогда не спит.']]);
    }else if(target.id==='chip'){
      if(this.quest<1){this.notify('СНАЧАЛА ПОГОВОРИ С ИНФОРМАТОРОМ');return}
      this.hasChip=true;this.chip.setVisible(false);this.chipGlow.setVisible(false);this.signs[1].setVisible(false);
      this.burst(1330,230,COLOR.cyan,'collect');this.notify('КАПСУЛА ПАМЯТИ ПОЛУЧЕНА');this.setQuest(2);sound.chirp();
    }else if(target.id==='terminal'){
      if(this.quest<2){this.showDialogue([['ТЕРМИНАЛ MEMORY // OFFLINE','Доступ закрыт. Требуется капсула памяти.']]);return}
      if(this.quest===2){
        this.showDialogue([
          ['ТЕРМИНАЛ MEMORY // UPLINK','Синхронизация... Пакет данных обнаружен.'],
          ['НЕИЗВЕСТНЫЙ // ПО РАДИО','Теперь уходи. Выходной шлюз прямо по коридору. Не оборачивайся.']
        ],()=>{this.setQuest(3);this.burst(2290,216,COLOR.cyan,'collect')});
      }
      else this.showDialogue([['ТЕРМИНАЛ MEMORY','Передача подтверждена. Покиньте сектор.']]);
    }else if(target.id==='exit'){
      if(this.quest===3){
        this.finishGame();
      }else this.notify('ДОСТУП ЗАКРЫТ · ТРЕБУЕТСЯ ПЕРЕДАЧА');
    }else if(target.id==='kiosk'){
      this.showDialogue([['ГОРОДСКАЯ СЕТЬ // ПУНКТ 7','Уровень осадков: высокий. Уровень доверия: нулевой.']]);
    }
  }
  nearestInteraction(){
    if(!this.player)return null;
    const items=[
      {id:'npc',x:600,range:58,label:'ПОГОВОРИТЬ'},
      {id:'kiosk',x:899,range:43,label:'ОСМОТРЕТЬ'},
      {id:'chip',x:1330,range:49,label:'ЗАБРАТЬ КАПСУЛУ',hidden:this.hasChip},
      {id:'terminal',x:2290,range:65,label:'ТЕРМИНАЛ'},
      {id:'exit',x:2665,range:80,label:'ВОЙТИ В ШЛЮЗ'}
    ];
    const near=items.filter(it=>!it.hidden&&dist(this.player.x,it.x)<it.range).sort((a,b)=>dist(this.player.x,a.x)-dist(this.player.x,b.x));
    return near[0]||null;
  }
  pulse(){
    if(!this.started||this.dialogue||this.end)return;
    if(this.time.now<this.pulseReady){this.notify('ЭМИ: ПЕРЕЗАРЯДКА',750);return}
    this.pulseReady=this.time.now+2600;
    const x=this.player.x,y=this.player.y-25;
    this.burst(x,y,COLOR.cyan,'emp');
    sound.beep(174,.4,'sawtooth',.08);
    this.cameras.main.shake(140,.002);
    this.tintFlash.setAlpha(.28);this.tweens.add({targets:this.tintFlash,alpha:0,duration:320});
    if(dist(x,this.drone.x)<230){
      this.droneDisabled=this.time.now+5500;this.drone.setTint(0x526d87);
      this.notify('ПАТРУЛЬНЫЙ ДРОН ОТКЛЮЧЁН',1400);
    }
    else this.notify('ЭМИ ИМПУЛЬС · РАДИУС 230',850);
  }
  escape(){
    if(!this.started){this.startMission();return}
    if(this.dialogue)this.interact();
  }
  burst(x,y,color,kind){
    const mod=this.fxBank&&(kind==='emp'?this.fxBank.emp:this.fxBank.collect);
    if(mod){
      try{this.makePixelFx(x,y,mod,kind);return;}catch(err){console.warn('PixelFX draw fallback:',err.message)}
    }
    this.fallbackBurst(x,y,color,kind);
  }
  makePixelFx(x,y,mod,kind){
    const core=this.fxBank.core;
    const [w,h]=mod.meta.size, [ox,oy]=mod.meta.origin;
    const key=`dynamic-fx-${++this.fxSeq}`;
    const texture=this.textures.createCanvas(key,w,h);
    const ctx=texture.getContext();
    const frame=core.createFrame(w,h);
    const imageData=ctx.createImageData(w,h);
    const fx=core.createFx(mod,{x:ox,y:oy,seed:this.fxSeq+11, ...(kind==='emp'?{radius:56}:{})});
    const image=this.add.image(x,y,key).setOrigin(ox/w,oy/h).setDepth(74);
    this.fxInstances.push({key,texture,ctx,frame,imageData,fx,image,core,tick:0});
  }
  fallbackBurst(x,y,color,kind){
    // The built-in fallback renders the same action even without PixelFX CDN.
    const big=kind==='emp';
    const ring=this.add.circle(x,y,8,color,.05).setStrokeStyle(2,color,.95).setDepth(77);
    this.tweens.add({targets:ring,scaleX:big?9:3.5,scaleY:big?9:3.5,alpha:0,duration:big?620:400,ease:'Cubic.easeOut',onComplete:()=>ring.destroy()});
    const flare=this.add.image(x,y,'glow').setTint(color).setAlpha(.75).setScale(big?.65:.48)
      .setDepth(76).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({targets:flare,alpha:0,scale:big?2.5:1.25,duration:big?450:350,onComplete:()=>flare.destroy()});
    for(let i=0;i<(big?26:17);i++){
      const ang=(Math.PI*2*i)/(big?26:17)+Math.random()*.17;
      const distance= (big?30:11)+Math.random()*(big?85:35);
      const p=this.add.rectangle(x,y,Math.random()<.35?3:2,1.5,Math.random()<.28?0xffffff:color,1).setDepth(78);
      this.tweens.add({targets:p,x:x+Math.cos(ang)*distance,y:y+Math.sin(ang)*distance*.8,rotation:ang,alpha:0,duration:300+Math.random()*550,ease:'Quad.easeOut',onComplete:()=>p.destroy()});
    }
  }
  tickFx(dt){
    for(let i=this.fxInstances.length-1;i>=0;i--){
      const f=this.fxInstances[i];
      try{
        f.fx.update(dt);
        f.tick+=dt;
        if(f.tick>=1/24){
          f.tick=0;f.core.clearFrame(f.frame);f.fx.draw(f.frame,'back');f.fx.draw(f.frame,'front');
          f.core.composite(f.frame,f.imageData.data,null);
          f.ctx.putImageData(f.imageData,0,0);f.texture.refresh();
        }
        if(f.fx.done()){
          f.image.destroy();this.textures.remove(f.key);this.fxInstances.splice(i,1);
        }
      }catch(e){
        console.warn('PixelFX runtime fallback:',e);
        f.image.destroy();this.textures.remove(f.key);this.fxInstances.splice(i,1);
      }
    }
  }
  finishGame(){
    if(this.end)return;this.end=true;this.player.setVelocity(0,0);this.player.anims.stop();
    this.burst(this.player.x+10,this.player.y-35,COLOR.amber,'collect');
    sound.chirp();this.cameras.main.fadeOut(950,5,15,29);
    this.time.delayedCall(1000,()=>{$('ending').hidden=false;$('hudTop').style.opacity='0';$('prompt').hidden=true;});
  }
  update(time,delta){
    if(!this.player)return;
    const dt=Math.min(delta/1000,.04);this.ambientTime+=dt;
    this.tickFx(dt);
    this.animateRain(dt);
    this.animateAtmosphere(time,dt);
    this.reflection.x=this.player.x;this.reflection.y=GROUND+4;
    this.reflection.setFrame(this.player.frame.name);
    this.reflection.setFlipX(this.player.flipX);
    this.reflection.setAlpha(this.player.y<GROUND-5?.04:.13+.05*Math.sin(this.ambientTime*2));
    this.updateDrone(time,dt);
    // HUD / mission never allow running before player confirms 'Start'.
    if(!this.started||this.end){this.player.setVelocityX(0);return}
    if(this.dialogue){this.player.setVelocityX(0);this.player.anims.play('player-idle',true);return}
    const left=this.keys.left.isDown||this.keys.l.isDown||this.mobile.left;
    const right=this.keys.right.isDown||this.keys.r.isDown||this.mobile.right;
    const jumping=this.keys.jump.isDown||this.keys.up.isDown||this.mobile.jump;
    const speed=this.keys.sprint.isDown?185:132;
    if(left!==right){
      this.player.setVelocityX(left?-speed:speed);
      this.player.setFlipX(left);
      if(this.player.body.blocked.down)this.player.anims.play('player-walk',true);
    }else{
      this.player.setVelocityX(0);
      if(this.player.body.blocked.down)this.player.anims.play('player-idle',true);
    }
    if(jumping&&this.player.body.blocked.down){
      this.player.setVelocityY(-335);sound.beep(300,.085,'triangle',.027);
      this.fallbackDust(this.player.x,GROUND);
    }
    // A light bump if the patrolling drone gets too close (no lives or irreversible fail).
    const nearDrone=dist(this.player.x,this.drone.x);
    if(nearDrone<35 && this.player.y>GROUND-48 && time>this.droneDisabled && time>this.alertNext){
      this.alertNext=time+3200;
      this.notify('ПАТРУЛЬ! ИСПОЛЬЗУЙ F — ЭМИ',1600);
      this.cameras.main.shake(120,.0025);
      sound.beep(190,.25,'sawtooth',.05);
      this.player.setVelocityX(this.player.x>this.drone.x?170:-170);
    }
    const nearest=this.nearestInteraction();this.currentTarget=nearest;
    $('prompt').hidden=!nearest;if(nearest)$('promptText').textContent=nearest.label;
    $('distance').textContent=(time<this.pulseReady?`ЭМИ ЗАРЯДКА ${((this.pulseReady-time)/1000).toFixed(1)}С`:'ЭМИ ГОТОВ · F ДЛЯ ИМПУЛЬСА');
    if((left||right)&&this.player.body.blocked.down&&time>this.lastStep+300){
      this.lastStep=time;sound.beep(60,.045,'triangle',.009);
    }
  }
  fallbackDust(x,y){
    for(let i=0;i<6;i++){
      const p=this.add.rectangle(x+(Math.random()-.5)*18,y,2.5,1.5,0x76aab3,.4).setDepth(47);
      this.tweens.add({targets:p,x:p.x+(Math.random()-.5)*18,y:y-6-Math.random()*9,alpha:0,duration:340,onComplete:()=>p.destroy()});
    }
  }
  animateAtmosphere(time,dt){
    // rain is screen-space; architecture, smoke, hover-traffic is in multiple world depth planes.
    for(const car of this.cars){
      car.t+=dt;car.sprite.x+=car.v*dt;
      car.sprite.y=car.y+Math.sin(car.t*1.8)*1.8;
      if(car.sprite.x>2850)car.sprite.x=-100;if(car.sprite.x<-100)car.sprite.x=2850;
    }
    for(const st of this.steam){
      const z=((this.ambientTime*14*st.seed)%45);
      st.obj.x=st.x0+Math.sin(this.ambientTime*1.7+st.seed)*4;
      st.obj.y=st.y0-z;
      st.obj.setAlpha(.16*(1-z/45));
    }
    if(this.npcHalo)this.npcHalo.setAlpha(.14+.06*Math.sin(this.ambientTime*1.8));
    if(this.chipGlow.visible)this.chipGlow.setAlpha(.37+.18*Math.sin(this.ambientTime*4));
  }
  animateRain(dt){
    if(!this.rainGraphicFront)return;
    const back=this.rainGraphicBack,front=this.rainGraphicFront;
    back.clear();front.clear();
    back.lineStyle(1,0x9accdd,.23);front.lineStyle(1,0xb1ddf2,.42);
    for(const r of this.rain){
      r.x+=r.drift*dt;r.y+=r.speed*dt;
      if(r.y>370){r.y=-r.len;r.x=Math.random()*710-30}
      if(r.x<-40)r.x=700;
      const g=r.layer<2?back:front;
      g.lineBetween(r.x,r.y-r.len,r.x-r.len*.19,r.y);
    }
    this.groundRef.clear();this.groundRef.lineStyle(1,0x7bd1d3,.12);
    const cam=this.cameras.main.scrollX;
    const rng=Math.floor(this.ambientTime*7);
    for(let i=0;i<16;i++){
      const x=cam+((i*127+rng*31)%650),y=293+(i*11)%57;
      this.groundRef.lineBetween(x,y,x+12+i%17,y);
    }
  }
  updateDrone(time,dt){
    if(!this.drone)return;
    const disabled=time<this.droneDisabled;
    this.droneX=1750+Math.sin(this.ambientTime*.62)*104;
    this.drone.x=this.droneX;
    this.drone.y=228+Math.sin(this.ambientTime*3)*5;
    this.droneGlow.x=this.drone.x;this.droneGlow.y=this.drone.y+12;
    this.droneGlow.setAlpha(disabled?.06:(.33+.13*Math.sin(this.ambientTime*3.5)));
    if(disabled){this.drone.angle=Math.sin(this.ambientTime*9)*4;this.drone.setAlpha(.68)}
    else {this.drone.angle=Math.sin(this.ambientTime*2)*1.5;this.drone.clearTint();this.drone.setAlpha(1)}
  }
}

if(window.__phaserLoadFailed||typeof window.Phaser==='undefined'){
  $('loading').hidden=true;$('fatal').hidden=false;
}else{
  const game=new Phaser.Game({
    type:Phaser.AUTO,
    parent:'game',
    width:SCREEN.w,height:SCREEN.h,
    backgroundColor:'#071524',
    pixelArt:true,roundPixels:true,
    antialias:false,
    render:{transparent:false,pixelArt:true},
    scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH,width:SCREEN.w,height:SCREEN.h},
    physics:{default:'arcade',arcade:{gravity:{y:0},debug:false}},
    scene:[NightScene],
    input:{activePointers:4},
  });
  window.__NEON_GAME=game;
}

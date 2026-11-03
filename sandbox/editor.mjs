/* NEON LAB. Phaser 3 editor + lazy PixelFX runtime, isolated from the game. */
import {FX_ROOT, EFFECT_IDS, EFFECT_SET, GROUPS, OBJECTS, OBJECT_MAP, PRESET_PALETTES, effectLabel} from './catalog.mjs';
import {STORAGE_KEY, WORLD, MAX_ITEMS, GRID_STEP, clamp, snap, objectItem, effectItem, emptyState, starterState, sanitizeState, serializeScene, canPlaceMore, selectedName} from './model.mjs';

const $=(id)=>document.getElementById(id);
const ui={};
for(const id of ['objectsTab','effectsTab','objectsLibrary','effectsLibrary','objectList','fxQuery','fxCategory','fxList','fxCount','fxState',
  'placementTip','coords','loading','fatal','gridToggle','rainToggle','cameraRange','cameraValue','cameraLeft','cameraRight','playAll',
  'pauseAll','resetFx','status','sceneCount','noSelection','selectedInspector','selectedType','selectedName','selectedId','propX',
  'propY','propScale','scaleValue','propAngle','propDepth','propAlpha','alphaValue','propFlip','effectInspector','objectInspector',
  'propPalette','propSpeed','speedValue','propRepeat','attachInfo','playSelected','stopSelected','detachEffect','effectMeta',
  'attachEffect','chosenEffect','sceneLayers','duplicateSelected','deleteSelected','undoBtn','redoBtn','exportBtn','importBtn','importFile','exampleBtn','clearBtn'])ui[id]=$(id);
const ICONS={hero:'♟',npc:'♙',drone:'⬡',chip:'◆',lamp:'♧',crate:'▣',barrel:'◉',terminal:'▥',sign:'▤',cone:'▲',holo:'◇',car:'▰'};
const CATEGORY_MAP=new Map(GROUPS);
const fmt=(v)=>Math.round(v).toString().padStart(4,'0');
const goodKeys=(target)=>target&&['INPUT','TEXTAREA','SELECT'].includes(target.tagName);
const byId=(state,id)=>state.items.find(it=>it.id===id);

class Sandbox {
  constructor(){
    this.state=this.readLocal();this.scene=null;this.selectedId=null;this.tool={type:'select',kind:null};this.lastEffect='scifi/emp-blast';
    this.libraryTab='objects';this.history=[serializeScene(this.state)];this.historyPos=0;
    this.corePromise=null;this.fxBase=null;this.fxCache=new Map();this.allEffectsPaused=false;
    this.bind();this.renderObjects();this.renderFxList();this.renderInspector();this.renderStatus();this.renderLayers();
    this.updateCameraUI();this.refreshToolbar();
  }
  readLocal(){try{const raw=localStorage.getItem(STORAGE_KEY);return raw?sanitizeState(JSON.parse(raw)):starterState();}
    catch(e){console.warn('Invalid saved scene, using starter scene',e);return starterState();}}
  notify(message){ui.status.textContent=message;}
  notifyFx(text,klass=''){ui.fxState.textContent=text;ui.fxState.className='live-indicator '+klass;}
  persist(){try{localStorage.setItem(STORAGE_KEY,serializeScene(this.state));}
    catch(e){this.notify('Сохранение в браузере недоступно; используйте экспорт JSON.');console.warn(e);}}
  commit(message){const next=serializeScene(this.state);
    if(next!==this.history[this.historyPos]){this.history=this.history.slice(0,this.historyPos+1);this.history.push(next);
      if(this.history.length>50)this.history.shift();this.historyPos=this.history.length-1;}
    this.persist();this.renderStatus();this.renderLayers();if(message)this.notify(message);}
  undo(direction){const next=this.historyPos+direction;if(next<0||next>=this.history.length)return;
    this.historyPos=next;this.replaceState(JSON.parse(this.history[this.historyPos]),false);this.notify(direction<0?'Действие отменено':'Действие повторено');}
  replaceState(raw,record=true){this.state=sanitizeState(raw);this.selectedId=null;this.allEffectsPaused=false;
    if(this.scene)this.scene.resetFromState();this.updateCameraUI();this.renderInspector();this.refreshToolbar();this.renderStatus();this.renderLayers();
    if(record)this.commit();else this.persist();}
  chooseTool(type,kind=null){if(type==='effect'&&!EFFECT_SET.has(kind))return;
    if(type==='object'&&!OBJECT_MAP.has(kind))return;
    this.tool={type,kind};if(type==='effect')this.lastEffect=kind;
    this.refreshToolbar();this.renderObjects();this.renderFxList();this.refreshTip();ui.chosenEffect.textContent='Эффект: '+effectLabel(this.lastEffect);
    this.notify(type==='select'?'Выделяй и перетаскивай объекты':type==='pan'?'Перетаскивай сцену для перемещения камеры':
      `Выбрано: ${type==='object'?OBJECT_MAP.get(kind).name:effectLabel(kind)}. Нажми на сцене для добавления.`);
  }
  refreshTip(){ui.placementTip.textContent=this.tool.type==='select'?'РЕЖИМ: ВЫДЕЛЕНИЕ / ПЕРЕТАСКИВАНИЕ':
    this.tool.type==='pan'?'РЕЖИМ: ПЕРЕМЕЩЕНИЕ КАМЕРЫ':
    'УСТАНОВИТЬ: '+(this.tool.type==='object'?OBJECT_MAP.get(this.tool.kind)?.name:effectLabel(this.tool.kind));}
  refreshToolbar(){document.querySelectorAll('[data-tool]').forEach(el=>el.classList.toggle('active',el.dataset.tool===this.tool.type));
    ui.gridToggle.checked=this.state.grid;ui.rainToggle.checked=this.state.rain;
    ui.undoBtn.disabled=this.historyPos===0;ui.redoBtn.disabled=this.historyPos===this.history.length-1;
    this.refreshTip();}
  switchTab(tab){this.libraryTab=tab;
    const isFx=tab==='effects';ui.objectsTab.classList.toggle('active',!isFx);ui.effectsTab.classList.toggle('active',isFx);
    ui.objectsTab.setAttribute('aria-selected',String(!isFx));ui.effectsTab.setAttribute('aria-selected',String(isFx));
    ui.objectsLibrary.hidden=isFx;ui.effectsLibrary.hidden=!isFx;}
  renderObjects(){const fragment=document.createDocumentFragment();
    for(const item of OBJECTS){const b=document.createElement('button');b.type='button';b.className='item-card';
      b.classList.toggle('active',this.tool.type==='object'&&this.tool.kind===item.id);
      b.draggable=true;b.dataset.type='object';b.dataset.kind=item.id;
      const icon=document.createElement('span');icon.className='item-icon';icon.textContent=ICONS[item.id]||'◆';
      const title=document.createElement('strong');title.textContent=item.name;b.append(icon,title);
      b.addEventListener('click',()=>this.chooseTool('object',item.id));
      b.addEventListener('dragstart',e=>this.startHtmlDrag(e,'object',item.id));fragment.append(b);
    }
    ui.objectList.replaceChildren(fragment);
  }
  renderFxList(){const group=ui.fxCategory.value||'all',q=ui.fxQuery.value.trim().toLowerCase();const fragment=document.createDocumentFragment();let n=0;
    for(const id of EFFECT_IDS){const [category,name]=id.split('/');
      if(group!=='all'&&group!==category)continue;
      if(q&&!id.includes(q)&&!effectLabel(id).toLowerCase().includes(q)&&!(CATEGORY_MAP.get(category)||'').toLowerCase().includes(q))continue;
      n++;
      const b=document.createElement('button');b.type='button';b.className='fx-item';
      b.classList.toggle('active',this.tool.type==='effect'&&this.tool.kind===id);b.draggable=true;
      const left=document.createElement('span');const title=document.createElement('strong');title.textContent=effectLabel(id);
      const code=document.createElement('small');code.textContent=category+' / '+name;
      left.append(title,document.createElement('br'),code);const icon=document.createElement('span');icon.className='fx-marker';icon.textContent='✧';b.append(left,icon);
      b.addEventListener('click',()=>this.chooseTool('effect',id));
      b.addEventListener('dragstart',e=>this.startHtmlDrag(e,'effect',id));fragment.append(b);
    }
    ui.fxList.replaceChildren(fragment);ui.fxCount.textContent=`НАЙДЕНО: ${n} / ${EFFECT_IDS.length}`;
  }
  startHtmlDrag(e,type,kind){e.dataTransfer?.setData('text/plain',JSON.stringify({type,kind}));if(e.dataTransfer)e.dataTransfer.effectAllowed='copy';}
  select(id){this.selectedId=byId(this.state,id)?id:null;this.renderInspector();this.renderLayers();this.scene?.drawSelection();}
  place(type,kind,x,y,anchor=null){if(!canPlaceMore(this.state)){this.notify('Достигнут лимит элементов ('+MAX_ITEMS+').');return null;}
    const X=clamp(snap(x,this.state.grid),0,WORLD.width),Y=clamp(snap(y,this.state.grid),0,WORLD.height);
    const item=type==='object'?objectItem(kind,X,Y):effectItem(kind,X,Y,undefined,anchor);
    this.state.items.push(item);this.scene?.addEntity(item);this.select(item.id);
    this.commit(`Добавлено: ${selectedName(item)}`);return item;}
  duplicate(){const item=byId(this.state,this.selectedId);if(!item||!canPlaceMore(this.state))return;
    const raw=structuredClone(item);raw.id=undefined;raw.x=clamp(raw.x+GRID_STEP,0,WORLD.width);raw.y=clamp(raw.y-GRID_STEP,0,WORLD.height);
    const dup=item.type==='object'?objectItem(item.kind,raw.x,raw.y):effectItem(item.kind,raw.x,raw.y);
    Object.assign(dup,{...item,id:dup.id,x:raw.x,y:raw.y});if(dup.type==='effect')dup.attachedTo=null;
    this.state.items.push(dup);this.scene?.addEntity(dup);this.select(dup.id);this.commit('Создан дубликат.');}
  remove(){const item=byId(this.state,this.selectedId);if(!item)return;
    this.state.items=this.state.items.filter(it=>it.id!==item.id);
    for(const fx of this.state.items){if(fx.type==='effect'&&fx.attachedTo===item.id)fx.attachedTo=null;}
    this.scene?.removeEntity(item.id);this.select(null);this.commit('Элемент удалён.');}
  attach(){const anchor=byId(this.state,this.selectedId);if(!anchor||anchor.type!=='object')return;
    const id=EFFECT_SET.has(this.lastEffect)?this.lastEffect:'scifi/emp-blast';
    this.place('effect',id,anchor.x,anchor.y,anchor.id);}
  detach(){const item=byId(this.state,this.selectedId);if(item?.type==='effect'&&item.attachedTo){item.attachedTo=null;this.commit('Эффект отвязан от предмета.');this.renderInspector();}}
  adjust(id,value){const item=byId(this.state,this.selectedId);if(!item)return;
    const numeric={propX:['x',0,WORLD.width],propY:['y',0,WORLD.height],propScale:['scale',.25,3],
      propAngle:['angle',-180,180],propDepth:['depth',0,95],propAlpha:['alpha',.15,1],propSpeed:['playSpeed',.25,3]};
    const [key,min,max]=numeric[id]||[];if(key){const n=Number(value);if(!Number.isFinite(n))return;item[key]=clamp(n,min,max);}
    else if(id==='propFlip')item.flipX=Boolean(value);
    else if(id==='propPalette'&&item.type==='effect')item.palette=Object.hasOwn(PRESET_PALETTES,value)?value:'original';
    else if(id==='propRepeat'&&item.type==='effect')item.repeat=Boolean(value);
    if(id==='propX'||id==='propY'){
      for(const linked of this.state.items){if(linked.type==='effect'&&linked.attachedTo===item.id){linked.x=item.x;linked.y=item.y;this.scene?.updateEntity(linked);}}
    }
    if(item.type==='effect'&&['propPalette','propRepeat'].includes(id))this.scene?.restartEffect(item.id);
    this.scene?.updateEntity(item);this.renderInspectorOutputs(item);
  }
  renderInspector(){const item=byId(this.state,this.selectedId);ui.noSelection.hidden=Boolean(item);ui.selectedInspector.hidden=!item;
    if(!item){return;}
    ui.selectedType.textContent=item.type==='effect'?'PIXELFX / ЭФФЕКТ':'ОБЪЕКТ';ui.selectedName.textContent=item.type==='effect'?effectLabel(item.kind):OBJECT_MAP.get(item.kind).name;
    ui.selectedId.textContent=item.kind;
    for(const [id,key] of [['propX','x'],['propY','y'],['propScale','scale'],['propAngle','angle'],['propDepth','depth'],['propAlpha','alpha']])ui[id].value=String(item[key]);
    ui.propFlip.checked=item.flipX;
    ui.effectInspector.hidden=item.type!=='effect';ui.objectInspector.hidden=item.type!=='object';
    if(item.type==='effect'){
      ui.propPalette.value=item.palette;ui.propSpeed.value=String(item.playSpeed);ui.propRepeat.checked=item.repeat;
      const a=byId(this.state,item.attachedTo);ui.attachInfo.textContent=a?`Привязан к: ${OBJECT_MAP.get(a.kind).name}`:'Эффект размещён свободно';
      ui.detachEffect.disabled=!a;ui.stopSelected.disabled=!item.playing;ui.playSelected.textContent=item.playing?'↻ С начала':'▶ Воспроизвести';
      ui.effectMeta.textContent=`Модуль: ${item.kind} · исходный PixelFX. Если CDN недоступен, показывается упрощённое превью.`;
    }
    this.renderInspectorOutputs(item);
  }
  renderInspectorOutputs(item){ui.scaleValue.textContent=item.scale.toFixed(2)+'×';ui.alphaValue.textContent=Math.round(item.alpha*100)+'%';
    if(item.type==='effect')ui.speedValue.textContent=item.playSpeed.toFixed(2)+'×';}
  renderLayers(){const fragment=document.createDocumentFragment();
    for(const item of [...this.state.items].sort((a,b)=>b.depth-a.depth)){
      const b=document.createElement('button');b.type='button';b.className='layer-item';
      b.classList.toggle('active',item.id===this.selectedId);
      const title=document.createElement('span');title.textContent=item.type==='object'?OBJECT_MAP.get(item.kind).name:effectLabel(item.kind);
      const type=document.createElement('span');type.className='layer-type';type.textContent=item.type==='effect'?'FX':'OBJ';
      b.append(title,type);b.addEventListener('click',()=>{this.chooseTool('select');this.select(item.id);});fragment.append(b);
    }
    ui.sceneLayers.replaceChildren(fragment);
  }
  renderStatus(){const n=this.state.items.filter(i=>i.type==='object').length,f=this.state.items.length-n;
    ui.sceneCount.textContent=`${n} объектов · ${f} эффектов`;this.refreshToolbar();}
  updateCameraUI(){ui.cameraRange.value=String(this.state.cameraX);ui.cameraValue.textContent=`X: ${fmt(this.state.cameraX)} / ${WORLD.width}`;}
  camera(x){this.state.cameraX=clamp(x,0,WORLD.width-WORLD.viewWidth);this.scene?.cameras.main.setScroll(this.state.cameraX,0);this.updateCameraUI();}
  markChangedAfterDrag(){this.commit('Положение элемента изменено.');this.renderInspector();}
  async getCore(){if(this.corePromise)return this.corePromise;
    this.corePromise=(async()=>{
      try{const core=await import('../vendor/pixelfx/src/core/index.js');this.fxBase='../vendor/pixelfx';this.notifyFx('PixelFX: локальная библиотека');return core;}
      catch{const core=await import(`${FX_ROOT}/src/core/index.js`);this.fxBase=FX_ROOT;this.notifyFx('PixelFX: подключён через CDN');return core;}
    })().catch(err=>{this.corePromise=null;this.notifyFx('PixelFX: нет связи — превью','warn');throw err;});
    return this.corePromise;
  }
  async getModule(id){if(!EFFECT_SET.has(id))throw new Error('Bad effect id');
    if(!this.fxCache.has(id))this.fxCache.set(id,(async()=>{
      const core=await this.getCore();const module=await import(`${this.fxBase}/src/fx/${id}.js`);
      return {core,module};
    })().catch(e=>{this.fxCache.delete(id);throw e;}));
    return this.fxCache.get(id);
  }
  bind(){
    ui.objectsTab.addEventListener('click',()=>this.switchTab('objects'));
    ui.effectsTab.addEventListener('click',()=>this.switchTab('effects'));
    for(const [id,name] of GROUPS){const op=document.createElement('option');op.value=id;op.textContent=name;ui.fxCategory.append(op);}
    for(const [value,def] of Object.entries(PRESET_PALETTES)){const op=document.createElement('option');op.value=value;op.textContent=def.label;ui.propPalette.append(op);}
    ui.fxQuery.addEventListener('input',()=>this.renderFxList());ui.fxCategory.addEventListener('change',()=>this.renderFxList());
    document.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>this.chooseTool(b.dataset.tool)));
    ui.gridToggle.addEventListener('change',()=>{this.state.grid=ui.gridToggle.checked;this.scene?.showGrid(this.state.grid);this.commit('Сетка '+(this.state.grid?'включена':'выключена'));});
    ui.rainToggle.addEventListener('change',()=>{this.state.rain=ui.rainToggle.checked;this.commit('Дождь '+(this.state.rain?'включён':'выключен'));});
    ui.cameraRange.addEventListener('input',()=>this.camera(Number(ui.cameraRange.value)));
    ui.cameraRange.addEventListener('change',()=>this.commit());
    ui.cameraLeft.addEventListener('click',()=>{this.camera(this.state.cameraX-160);this.commit();});
    ui.cameraRight.addEventListener('click',()=>{this.camera(this.state.cameraX+160);this.commit();});
    ui.playAll.addEventListener('click',()=>{this.allEffectsPaused=false;for(const i of this.state.items)if(i.type==='effect'){i.playing=true;this.scene?.restartEffect(i.id);}this.commit('Все эффекты запущены.');this.renderInspector();});
    ui.pauseAll.addEventListener('click',()=>{this.allEffectsPaused=true;for(const i of this.state.items)if(i.type==='effect')i.playing=false;this.commit('Воспроизведение приостановлено.');this.renderInspector();});
    ui.resetFx.addEventListener('click',()=>{this.allEffectsPaused=false;for(const i of this.state.items)if(i.type==='effect'){i.playing=true;this.scene?.restartEffect(i.id);}this.commit('Эффекты перезапущены.');this.renderInspector();});
    for(const id of ['propX','propY','propScale','propAngle','propDepth','propAlpha','propSpeed']){
      ui[id].addEventListener('input',e=>this.adjust(id,e.target.value));
      ui[id].addEventListener('change',()=>this.commit('Свойство изменено.'));}
    for(const id of ['propFlip','propPalette','propRepeat'])ui[id].addEventListener('change',e=>{this.adjust(id,e.target.type==='checkbox'?e.target.checked:e.target.value);this.commit('Свойство изменено.');});
    ui.playSelected.addEventListener('click',()=>{const i=byId(this.state,this.selectedId);if(i?.type==='effect'){i.playing=true;this.scene?.restartEffect(i.id);this.commit('Эффект запущен.');this.renderInspector();}});
    ui.stopSelected.addEventListener('click',()=>{const i=byId(this.state,this.selectedId);if(i?.type==='effect'){i.playing=false;this.commit('Эффект приостановлен.');this.renderInspector();}});
    ui.detachEffect.addEventListener('click',()=>this.detach());ui.attachEffect.addEventListener('click',()=>this.attach());
    ui.duplicateSelected.addEventListener('click',()=>this.duplicate());ui.deleteSelected.addEventListener('click',()=>this.remove());
    ui.undoBtn.addEventListener('click',()=>this.undo(-1));ui.redoBtn.addEventListener('click',()=>this.undo(1));
    ui.exportBtn.addEventListener('click',()=>this.exportJSON());ui.importBtn.addEventListener('click',()=>ui.importFile.click());
    ui.importFile.addEventListener('change',async()=>{const file=ui.importFile.files?.[0];ui.importFile.value='';if(!file)return;
      if(file.size>1000000){this.notify('Файл сцены слишком большой (лимит 1 МБ).');return;}
      try{const data=JSON.parse(await file.text());this.replaceState(data);this.notify('Сцена из JSON открыта.');}
      catch(e){this.notify('Не удалось открыть сцену: '+e.message);}});
    ui.exampleBtn.addEventListener('click',()=>{if(confirm('Заменить текущую сцену демонстрационной?')){this.replaceState(starterState());this.notify('Пример восстановлен.');}});
    ui.clearBtn.addEventListener('click',()=>{if(confirm('Удалить все элементы песочницы?')){this.replaceState(emptyState());this.notify('Сцена очищена.');}});
    $('canvasShell').addEventListener('dragover',e=>e.preventDefault());
    $('canvasShell').addEventListener('drop',e=>{
      e.preventDefault();let payload;try{payload=JSON.parse(e.dataTransfer.getData('text/plain'));}catch{return;}
      if(!this.scene||!payload||!['object','effect'].includes(payload.type))return;
      if(payload.type==='object'&&!OBJECT_MAP.has(payload.kind)||payload.type==='effect'&&!EFFECT_SET.has(payload.kind))return;
      const canvas=this.scene.game.canvas,rect=canvas.getBoundingClientRect();
      if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)return;
      const x=(e.clientX-rect.left)/rect.width*WORLD.viewWidth+this.scene.cameras.main.scrollX;
      const y=(e.clientY-rect.top)/rect.height*WORLD.height;
      this.place(payload.type,payload.kind,x,y);
    });
    window.addEventListener('keydown',e=>{
      if(goodKeys(e.target))return;
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();this.undo(e.shiftKey?1:-1);return;}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();this.undo(1);return;}
      if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();this.remove();return;}
      if(e.key==='Escape'){this.chooseTool('select');this.select(null);return;}
      if(e.key.toLowerCase()==='v')this.chooseTool('select');
      if(e.key.toLowerCase()==='h')this.chooseTool('pan');
      if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();this.camera(this.state.cameraX+(e.key==='ArrowRight'?100:-100));this.commit();}
    });
  }
  exportJSON(){const blob=new Blob([JSON.stringify(sanitizeState(this.state),null,2)+'\n'],{type:'application/json'});
    const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='neon-lab-scene.json';document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(u),2000);this.notify('Сцена экспортирована в JSON.');}
}

class EditorScene extends Phaser.Scene {
  constructor(){super('SandboxEditor');this.views=new Map();this.dragging=null;this.gfxTick=0;this.clock=0;this.effectsSeq=0;this.rain=[];}
  preload(){this.load.setPath('../assets/');for(const name of ['sky','midcity','street','npc','chip','drone','glow'])this.load.image(name,`${name}.png`);
    this.load.image('lamp','lamp-post.png');this.load.spritesheet('hero','hero-walk.png',{frameWidth:30,frameHeight:52});
    this.load.on('loaderror',file=>console.error('Sandbox asset missing:',file.key));}
  create(){this.cameras.main.setBounds(0,0,WORLD.width,WORLD.height);
    this.add.image(0,0,'sky').setOrigin(0).setScrollFactor(0).setDepth(-50);
    this.add.image(0,0,'midcity').setOrigin(0).setScrollFactor(.46).setDepth(-40);
    this.add.image(0,0,'street').setOrigin(0).setDepth(-30);
    this.buildProps();this.drawLights();
    this.gridGraphics=this.add.graphics().setDepth(90).setAlpha(.18);this.showGrid(app.state.grid);
    this.rainGraphics=this.add.graphics().setScrollFactor(0).setDepth(83);
    this.rain=Array.from({length:125},()=>({x:Math.random()*690,y:Math.random()*360,v:85+Math.random()*125,len:3+Math.random()*6}));
    this.selectionGraphics=this.add.graphics().setDepth(96);
    this.ghostGraphics=this.add.graphics().setDepth(97);
    this.cameras.main.setScroll(app.state.cameraX,0);
    this.input.on('pointerdown',(pointer,over)=>this.onDown(pointer,over));
    this.input.on('pointermove',pointer=>this.onMove(pointer));this.input.on('pointerup',()=>this.onUp());
    this.input.on('gameout',()=>this.onUp());
    this.input.on('wheel',(pointer,over,dx,dy)=>{app.camera(app.state.cameraX+dy*.75+dx);app.commit();});
    this.game.canvas.addEventListener('contextmenu',e=>e.preventDefault());
    this.resetFromState();app.scene=this;ui.loading.hidden=true;
    app.notify('Выбери элемент слева и нажми на сцену.');
    window.__PIX_LAST_LAB={app,scene:this};
  }
  drawLights(){
    for(const [x,y,color,r] of [[115,168,0x3fe8e0,2],[570,165,0xfe729f,1.6],[960,185,0x58c8e8,2],[1640,129,0xff699b,2.5],[2250,150,0x76e9de,2.6]]){
      this.add.image(x,y,'glow').setScale(r).setTint(color).setAlpha(.15).setBlendMode(Phaser.BlendModes.ADD).setDepth(-10);
    }
  }
  buildProps(){
    const create=(key,w,h,draw)=>{
      const g=this.add.graphics({x:0,y:0});draw(g,w,h);g.generateTexture(key,w,h);g.destroy();};
    const shade=(g,x,y,w,h,c)=>{g.fillStyle(c);g.fillRect(x,y,w,h);};
    create('crate',32,29,g=>{
      shade(g,1,1,30,27,0x071b27);shade(g,3,3,26,22,0x2a4652);shade(g,4,4,24,3,0x60818b);
      for(let i=0;i<3;i++)shade(g,5,9+i*5,22,2,0x0d2632);shade(g,6,4,3,21,0x5a737d);shade(g,23,4,3,21,0x0d2632);
      shade(g,2,25,27,2,0x0b2c3a);shade(g,9,16,12,3,0xf6a667);});
    create('barrel',22,29,g=>{
      shade(g,2,3,18,23,0x1e394b);shade(g,3,6,16,18,0x9a3855);shade(g,5,6,4,18,0xc66376);
      shade(g,2,3,18,4,0x4e7785);shade(g,2,23,18,4,0x396578);shade(g,5,13,12,3,0xf1b16f);
      shade(g,8,15,6,6,0x46293d);});
    create('terminal',37,67,g=>{
      shade(g,7,52,23,15,0x112a38);shade(g,15,40,9,15,0x294455);shade(g,5,3,28,41,0x132333);
      shade(g,7,6,24,33,0x3d5468);shade(g,10,9,18,23,0x092f3e);shade(g,11,12,16,4,0x58f4e1);
      shade(g,11,21,13,2,0x59bfc3);shade(g,11,26,9,2,0x396d80);
      shade(g,4,38,29,6,0x133e53);shade(g,11,54,17,3,0xee6c9e);});
    create('sign',88,33,g=>{
      shade(g,0,0,88,33,0x071221);shade(g,2,2,84,29,0x1c3040);
      g.lineStyle(2,0x55e8e2,1);g.strokeRect(4,3,80,27);
      shade(g,11,11,6,12,0xeb67a6);shade(g,19,11,3,12,0xeb67a6);shade(g,23,11,7,3,0xeb67a6);
      shade(g,38,11,5,12,0x6af0e4);shade(g,46,11,6,12,0x6af0e4);shade(g,58,11,3,12,0x6af0e4);shade(g,65,11,11,12,0xf2c17a);});
    create('cone',18,29,g=>{
      shade(g,1,25,16,4,0x293e50);shade(g,6,3,6,22,0xe39064);
      shade(g,5,11,8,5,0xf1e4cd);shade(g,4,22,10,3,0xbe664e);});
    create('holo',42,88,g=>{
      shade(g,8,77,27,11,0x1c3d50);shade(g,12,71,19,6,0x4cbec3);
      shade(g,19,14,4,54,0x2b9fae);shade(g,11,24,20,2,0x81e7ee);shade(g,13,45,17,2,0x5ce1e0);
      shade(g,7,22,2,33,0x367b8e);shade(g,33,22,2,33,0x367b8e);
      shade(g,16,5,11,3,0xe975ac);shade(g,18,9,7,4,0x76e9dc);});
    create('car',110,46,g=>{
      shade(g,8,23,94,16,0x0d2435);shade(g,17,16,66,15,0x254c61);shade(g,29,10,48,11,0x0b283c);
      shade(g,32,12,20,9,0x4791a1);shade(g,55,12,19,9,0x447b8f);
      shade(g,9,33,10,5,0xd95a86);shade(g,91,33,11,5,0x73ece3);
      shade(g,22,40,21,4,0x3ea8b8);shade(g,70,40,21,4,0x3ea8b8);});
  }
  showGrid(show){if(!this.gridGraphics)return;this.gridGraphics.clear();if(!show)return;
    this.gridGraphics.lineStyle(1,0x72b8bb,.75);
    for(let x=0;x<=WORLD.width;x+=GRID_STEP)this.gridGraphics.lineBetween(x,0,x,WORLD.height);
    for(let y=0;y<=WORLD.height;y+=GRID_STEP)this.gridGraphics.lineBetween(0,y,WORLD.width,y);
  }
  resetFromState(){
    for(const id of [...this.views.keys()])this.removeEntity(id);this.views.clear();
    for(const item of app.state.items)this.addEntity(item);
    this.cameras.main.setScroll(app.state.cameraX,0);this.showGrid(app.state.grid);this.drawSelection();
  }
  addEntity(item){if(this.views.has(item.id))this.removeEntity(item.id);
    const view={itemId:item.id};this.views.set(item.id,view);
    if(item.type==='object'){
      const meta=OBJECT_MAP.get(item.kind);
      const node=item.kind==='hero'?this.add.sprite(item.x,item.y,meta.sprite,0):this.add.image(item.x,item.y,meta.sprite);
      node.setOrigin(.5,meta.center?.5:1);node.setInteractive({useHandCursor:true});node.setData('labId',item.id);
      view.node=node;
    }else{
      view.fallback=this.add.graphics().setDepth(item.depth);
      const hit=this.add.rectangle(item.x,item.y,44,44,0xffffff,.001).setDepth(item.depth+.1).setInteractive({useHandCursor:true});
      hit.setData('labId',item.id);view.hit=hit;view.fx=null;
      this.loadEffect(item.id,view);
    }
    this.updateEntity(item);
  }
  updateEntity(item){const view=this.views.get(item.id);if(!view)return;
    if(item.type==='object'){
      view.node?.setPosition(item.x,item.y).setScale(item.scale).setFlipX(item.flipX)
        .setAngle(item.angle).setAlpha(item.alpha).setDepth(item.depth);
    }else{
      view.hit?.setPosition(item.x,item.y).setSize(Math.max(38,Math.min(110,(view.fx?.w||44)*item.scale*.48)),Math.max(34,Math.min(75,(view.fx?.h||44)*item.scale*.48)))
        .setDepth(item.depth+.1);
      view.sprite?.setPosition(item.x,item.y).setScale(item.scale).setFlipX(item.flipX).setAngle(item.angle)
        .setAlpha(item.alpha).setDepth(item.depth);
      view.fallback?.setPosition(item.x,item.y).setScale(item.scale).setAngle(item.angle).setAlpha(item.alpha).setDepth(item.depth);
    }
    this.drawSelection();
  }
  removeEntity(id){const view=this.views.get(id);if(!view)return;
    view.sprite?.destroy();if(view.fx?.textureName)this.textures.remove(view.fx.textureName);view.fallback?.destroy();view.hit?.destroy();view.node?.destroy();
    this.views.delete(id);
  }
  restartEffect(id){const view=this.views.get(id),item=byId(app.state,id);if(!view||!item||item.type!=='effect')return;
    if(view.fx){const {core,module,ox,oy}=view.fx;
      try{const opts={x:ox,y:oy,seed:this.hashId(id)};
        const colors=PRESET_PALETTES[item.palette]?.colors;if(colors)opts.palette=colors;
        view.fx.instance=core.createFx(module,opts);view.fx.elapsed=0;view.fx.refresh=0;}
      catch(e){console.warn('Could not restart PixelFX',e);this.removeFailedEffect(view,id);}}
    else {view.fallbackAge=0;this.drawFallback(item,view);}
  }
  hashId(id){let h=2166136261;for(const c of id){h=Math.imul(h^c.charCodeAt(0),16777619);}return h>>>0;}
  async loadEffect(id,view){const item=byId(app.state,id);if(!item)return;
    try{
      const {core,module}=await app.getModule(item.kind);
      if(this.views.get(id)!==view)return;
      const [w,h]=module.meta.size,[ox,oy]=module.meta.origin;
      if(w<1||w>1024||h<1||h>1024)throw new Error('Unsupported FX frame');
      const textureName=`sandbox-fx-${++this.effectsSeq}`;
      const tex=this.textures.createCanvas(textureName,w,h);
      if(!tex)throw new Error('Could not create PixelFX texture');
      const ctx=tex.getContext(),img=ctx.createImageData(w,h),frame=core.createFrame(w,h);
      view.fx={core,module,ox,oy,w,h,textureName,texture:tex,ctx,img,frame,instance:null,elapsed:0,refresh:1/30};
      view.sprite=this.add.image(item.x,item.y,textureName).setOrigin(ox/w,oy/h);
      view.fallback?.destroy();view.fallback=null;
      this.restartEffect(id);this.updateEntity(item);
      app.notifyFx('PixelFX: подключён'+(app.fxBase===FX_ROOT?' через CDN':' локально'));
    }catch(error){console.warn('PixelFX unavailable for',item.kind,error.message);
      if(this.views.get(id)!==view)return;
      this.removeFailedEffect(view,id);app.notifyFx('PixelFX: превью (недоступен)','warn');
    }
  }
  removeFailedEffect(view,id){view.sprite?.destroy();if(view.fx?.textureName)this.textures.remove(view.fx.textureName);view.sprite=null;view.fx=null;
    if(!view.fallback)view.fallback=this.add.graphics();
    const item=byId(app.state,id);if(item){this.drawFallback(item,view);this.updateEntity(item);}
  }
  onDown(pointer,over){if(pointer.rightButtonDown()){app.select(null);return;}
    const world=pointer.positionToCamera(this.cameras.main);
    if(app.tool.type==='object'||app.tool.type==='effect'){
      app.place(app.tool.type,app.tool.kind,world.x,world.y);return;
    }
    if(app.tool.type==='pan'){
      this.dragging={mode:'pan',startX:pointer.x,startScroll:app.state.cameraX};return;
    }
    const hit=(over||[]).find(obj=>obj.getData?.('labId'));
    const id=hit?.getData('labId');if(!id){app.select(null);return;}
    const item=byId(app.state,id);if(!item)return;
    app.select(id);
    this.dragging={mode:'item',id,dx:item.x-world.x,dy:item.y-world.y,fromX:item.x,fromY:item.y};
  }
  onMove(pointer){const world=pointer.positionToCamera(this.cameras.main);
    ui.coords.textContent=`X ${fmt(clamp(world.x,0,WORLD.width))} · Y ${fmt(clamp(world.y,0,WORLD.height))}`;
    if(this.dragging){
      if(this.dragging.mode==='pan'){app.camera(this.dragging.startScroll+(this.dragging.startX-pointer.x));return;}
      const it=byId(app.state,this.dragging.id);if(!it)return;
      it.x=clamp(snap(world.x+this.dragging.dx,app.state.grid),0,WORLD.width);
      it.y=clamp(snap(world.y+this.dragging.dy,app.state.grid),0,WORLD.height);
      for(const e of app.state.items){if(e.type==='effect'&&e.attachedTo===it.id){e.x=it.x;e.y=it.y;this.updateEntity(e);}}
      if(it.type==='effect'&&it.attachedTo)it.attachedTo=null;
      this.updateEntity(it);ui.propX.value=String(Math.round(it.x));ui.propY.value=String(Math.round(it.y));
    }
    this.drawGhost(app.tool.type==='object'||app.tool.type==='effect'?world:null);
  }
  onUp(){if(!this.dragging)return;
    const d=this.dragging;this.dragging=null;
    if(d.mode==='pan'){app.commit('Камера перемещена.');return;}
    const it=byId(app.state,d.id);if(it&&(it.x!==d.fromX||it.y!==d.fromY))app.markChangedAfterDrag();
  }
  drawGhost(world){this.ghostGraphics.clear();if(!world)return;
    const x=clamp(snap(world.x,app.state.grid),0,WORLD.width),y=clamp(snap(world.y,app.state.grid),0,WORLD.height);
    this.ghostGraphics.lineStyle(1,0x70fff3,.8);this.ghostGraphics.strokeCircle(x,y,12);
    this.ghostGraphics.lineBetween(x-18,y,x+18,y);this.ghostGraphics.lineBetween(x,y-18,x,y+18);
  }
  drawSelection(){if(!this.selectionGraphics)return;this.selectionGraphics.clear();
    const it=byId(app.state,app.selectedId);if(!it)return;
    const meta=it.type==='object'?OBJECT_MAP.get(it.kind):null;
    const w=(meta?.w||Math.min(80,this.views.get(it.id)?.fx?.w||42))*it.scale;
    const h=(meta?.h||Math.min(80,this.views.get(it.id)?.fx?.h||42))*it.scale;
    const cy=it.y-(meta&&!meta.center?h/2:0);
    this.selectionGraphics.lineStyle(1,0x78fff3,.95);this.selectionGraphics.strokeRect(it.x-w/2-3,cy-h/2-3,w+6,h+6);
    this.selectionGraphics.lineStyle(1,0xeb70a9,1);this.selectionGraphics.lineBetween(it.x-5,it.y,it.x+5,it.y);
    this.selectionGraphics.lineBetween(it.x,it.y-5,it.x,it.y+5);
  }
  drawFallback(item,view){const g=view.fallback;if(!g)return;
    const t=view.fallbackAge||0,ph=t*4,group=item.kind.split('/')[0];
    const color=group==='fire'||group==='explosions'?0xf0a45b:group==='shadow'?0x9874e2:group==='nature'?0x7be6a3:0x63e8e6;
    const radius=7+Math.abs(Math.sin(ph))*16;
    g.clear();g.lineStyle(2,color,.75);g.strokeCircle(0,-17,radius);
    g.lineStyle(1,0xffffff,.35);g.strokeCircle(0,-17,radius*.62);
    for(let j=0;j<8;j++){const a=j*Math.PI/4+ph*.5,r=radius+5+Math.sin(t*5+j)*3;
      g.fillStyle(j%2?color:0xf9e5e7,.55);g.fillRect(Math.round(Math.cos(a)*r)-1,Math.round(-17+Math.sin(a)*r)-1,2,2);}
    g.fillStyle(color,.2);g.fillCircle(0,-17,5);
  }
  tick(dt){const dtSec=Math.min(dt/1000,.05);this.clock+=dtSec;
    this.rainGraphics.clear();if(app.state.rain){this.rainGraphics.lineStyle(1,0xb4dbf1,.28);
      for(const r of this.rain){r.x-=dtSec*25;r.y+=dtSec*r.v;
        if(r.y>370){r.y=-12;r.x=Math.random()*690;}if(r.x<-30)r.x=690;
        this.rainGraphics.lineBetween(r.x,r.y,r.x-2,r.y+r.len);}}
    for(const item of app.state.items){if(item.type!=='effect')continue;
      const view=this.views.get(item.id);if(!view||!item.playing)continue;
      if(!view.fx){view.fallbackAge=(view.fallbackAge||0)+dtSec*item.playSpeed;this.drawFallback(item,view);continue;}
      const f=view.fx;if(!f.instance)continue;
      const duration=f.module.meta.duration||1;
      const speedDt=dtSec*item.playSpeed;f.elapsed+=speedDt;
      try{
        if(f.elapsed>=duration){if(item.repeat){this.restartEffect(item.id);}else{
          item.playing=false;app.renderInspector();continue;}}
        f.instance.update(speedDt);
        f.refresh+=dtSec;
        const visible=item.x+f.w*item.scale>=this.cameras.main.scrollX-160&&item.x-f.w*item.scale<=this.cameras.main.scrollX+WORLD.viewWidth+160;
        if(visible&&f.refresh>=1/24){f.refresh=0;f.core.clearFrame(f.frame);
          f.instance.draw(f.frame,'back');f.instance.draw(f.frame,'front');f.core.composite(f.frame,f.img.data,null);
          f.ctx.putImageData(f.img,0,0);f.texture.refresh();}
      }catch(e){console.warn('PixelFX effect failed',item.kind,e);this.removeFailedEffect(view,item.id);
        app.notifyFx('PixelFX: ошибка эффекта — превью','warn');}
    }
  }
  update(time,delta){this.tick(delta);}
}

const app=new Sandbox();
new Phaser.Game({type:Phaser.AUTO,parent:'sandboxGame',width:WORLD.viewWidth,height:WORLD.height,
  backgroundColor:'#071625',pixelArt:true,roundPixels:true,antialias:false,render:{pixelArt:true},
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH,width:WORLD.viewWidth,height:WORLD.height},
  input:{activePointers:3},scene:[EditorScene]});

// Pure, defensive editor state. No DOM or Phaser dependency — shared by browser and tests.
import {EFFECT_SET, OBJECT_MAP, PRESET_PALETTES} from './catalog.mjs';
export const STORAGE_KEY='pixlast.sandbox.v1';
export const WORLD={width:2800,height:360,viewWidth:640,ground:283};
export const MAX_ITEMS=90;
export const GRID_STEP=16;
export const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const validNum=(v,defaultValue,min,max)=>typeof v==='number'&&Number.isFinite(v)?clamp(v,min,max):defaultValue;
export function snap(value,enabled=true){return enabled?Math.round(value/GRID_STEP)*GRID_STEP:value;}
export function objectItem(kind,x,y,id){
  const meta=OBJECT_MAP.get(kind); if(!meta)throw new Error('Unknown object: '+kind);
  return {id:id||createId(),type:'object',kind,x:Math.round(x),y:Math.round(y),scale:1,flipX:false,angle:0,alpha:1,depth:meta.depth};
}
export function effectItem(kind,x,y,id,attachedTo=null){
  if(!EFFECT_SET.has(kind))throw new Error('Unknown PixelFX effect: '+kind);
  return {id:id||createId(),type:'effect',kind,x:Math.round(x),y:Math.round(y),scale:1,flipX:false,angle:0,
    alpha:1,depth:76,playSpeed:1,palette:'original',repeat:false,playing:true,attachedTo};
}
let idSeq=0;
export function createId(){idSeq+=1;return `n${Date.now().toString(36)}${idSeq.toString(36)}`;}
export function emptyState(){return {version:1,cameraX:0,grid:false,rain:true,items:[]};}
export function starterState(){return {
  ...emptyState(),cameraX:95,
  items:[
    objectItem('hero',220,283,'starter-hero'),
    objectItem('lamp',360,283,'starter-lamp'),
    objectItem('npc',575,283,'starter-npc'),
    objectItem('crate',750,283,'starter-crate'),
    objectItem('barrel',815,283,'starter-barrel'),
    objectItem('drone',930,215,'starter-drone'),
    objectItem('terminal',1090,283,'starter-terminal'),
    objectItem('holo',505,283,'starter-holo'),
    effectItem('scifi/energy-core',505,216,'starter-core','starter-holo')
  ]
};}
export function sanitizeState(raw){
  if(!raw||typeof raw!=='object'||raw.version!==1||!Array.isArray(raw.items))throw new Error('Неверный формат сцены (нужна версия 1).');
  if(raw.items.length>MAX_ITEMS)throw new Error(`Слишком много объектов (максимум ${MAX_ITEMS}).`);
  const result={...emptyState(),cameraX:validNum(raw.cameraX,0,0,WORLD.width-WORLD.viewWidth),grid:raw.grid===true,rain:raw.rain!==false};
  const ids=new Set();
  for(const original of raw.items){
    if(!original||typeof original!=='object')continue;
    const meta=original.type==='object'?OBJECT_MAP.get(original.kind):null;
    const isFx=original.type==='effect'&&EFFECT_SET.has(original.kind);
    if(!meta&&!isFx)continue;
    let id=typeof original.id==='string'&&/^[a-z0-9_-]{1,50}$/i.test(original.id)?original.id:createId();
    if(ids.has(id))id=createId();ids.add(id);
    const o={id,type:isFx?'effect':'object',kind:original.kind,
      x:validNum(original.x,WORLD.width/2,0,WORLD.width),
      y:validNum(original.y,meta?.y??240,0,WORLD.height),
      scale:validNum(original.scale,1,.25,3),
      flipX:original.flipX===true,
      angle:validNum(original.angle,0,-180,180),
      alpha:validNum(original.alpha,1,.15,1),
      depth:validNum(original.depth,meta?.depth??76,0,95)
    };
    if(isFx){o.playSpeed=validNum(original.playSpeed,1,.25,3);
      o.palette=Object.hasOwn(PRESET_PALETTES,original.palette)?original.palette:'original';
      o.repeat=original.repeat===true;o.playing=original.playing!==false;
      o.attachedTo=typeof original.attachedTo==='string'?original.attachedTo:null;}
    result.items.push(o);
  }
  for(const e of result.items){if(e.type==='effect'&&e.attachedTo){
    const anchor=result.items.find(x=>x.id===e.attachedTo&&x.type==='object');
    if(!anchor)e.attachedTo=null;
  }}
  return result;
}
export function serializeScene(state){return JSON.stringify(sanitizeState(state));}
export function canPlaceMore(state){return state.items.length<MAX_ITEMS;}
export function selectedName(item){
  if(!item)return 'Ничего не выбрано';
  return item.type==='effect'?`PixelFX: ${item.kind}`:OBJECT_MAP.get(item.kind)?.name||item.kind;
}

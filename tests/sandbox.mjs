import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {EFFECT_IDS,EFFECT_SET,OBJECTS,OBJECT_MAP,GROUPS,PRESET_PALETTES} from '../sandbox/catalog.mjs';
import {STORAGE_KEY,MAX_ITEMS,WORLD,GRID_STEP,snap,objectItem,effectItem,starterState,emptyState,sanitizeState,serializeScene,canPlaceMore} from '../sandbox/model.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source=(f)=>readFileSync(path.join(root,f),'utf-8');
assert.equal(EFFECT_IDS.length,244);assert.equal(EFFECT_SET.size,244);assert.equal(GROUPS.length,21);assert.equal(OBJECTS.length,12);
assert.ok(Object.keys(PRESET_PALETTES).length>=4);
for(const id of EFFECT_IDS)assert.match(id,/^[a-z]+\/[a-z0-9-]+$/);
for(const o of OBJECTS){assert.equal(OBJECT_MAP.get(o.id),o);assert.ok(o.sprite);}
const initial=starterState();const read=sanitizeState(JSON.parse(serializeScene(initial)));
assert.deepEqual(read,initial,'starter scene survives JSON export-import');
assert.equal(read.items.filter(i=>i.type==='effect').length,1);
assert.equal(read.items.find(i=>i.id==='starter-core').attachedTo,'starter-holo');
assert.equal(canPlaceMore(read),true);
assert.equal(snap(23),16);assert.equal(snap(25),32);assert.equal(snap(25,false),25);
assert.throws(()=>objectItem('invalid',3,7));assert.throws(()=>effectItem('invalid',3,7));
assert.throws(()=>sanitizeState({version:2,items:[]}));assert.throws(()=>sanitizeState({version:1,items:Array(MAX_ITEMS+1).fill({})}));
const invalid={...emptyState(),cameraX:1e6,grid:'yes',items:[
  {...objectItem('crate',100,100,'same'),x:Infinity,y:-20,angle:900,scale:8,depth:100,alpha:0},
  {...objectItem('npc',1,1,'same')},
  {...effectItem('fire/campfire',110,100,'fx','unknown'),palette:'not-real',playSpeed:-3,repeat:true},
  {id:'code',type:'object',kind:'<script>',x:1,y:3},
  null
]};
const safe=sanitizeState(invalid);
assert.equal(safe.items.length,3);assert.equal(safe.cameraX,WORLD.width-WORLD.viewWidth);
assert.equal(safe.grid,false);assert.equal(safe.items[0].x,WORLD.width/2);assert.equal(safe.items[0].y,0);
assert.equal(safe.items[0].scale,3);assert.equal(safe.items[0].alpha,.15);assert.equal(safe.items[0].angle,180);
assert.notEqual(safe.items[0].id,safe.items[1].id);
assert.equal(safe.items[2].attachedTo,null);assert.equal(safe.items[2].palette,'original');
assert.equal(safe.items[2].playSpeed,.25);
const live=source('sandbox/editor.mjs');const bootstrap=source('sandbox/bootstrap.js');const rootHtml=source('index.html');const html=source('sandbox/index.html');
assert.ok(rootHtml.includes('href="sandbox/index.html"'));
assert.ok(html.includes('../index.html'));
for(const key of ['playAll','pauseAll','fxCategory','fxQuery','importFile','exportBtn','sceneLayers','attachEffect','rainToggle'])
  assert.ok(html.includes('id="'+key+'"'),'Missing editor control '+key);
assert.ok(live.includes('getModule(id)'));assert.ok(live.includes('core.createFx'));
assert.ok(live.includes('localStorage.setItem'));assert.ok(live.includes('this.commit('));
assert.ok(!rootHtml.includes('sandbox/bootstrap.js'));
assert.ok(bootstrap.includes('phaser@3.90.0'));
assert.equal(STORAGE_KEY,'pixlast.sandbox.v1');assert.equal(GRID_STEP,16);
console.log('PASS: catalogue 244 FX, 12 objects, 21 groups, state validation, JSON export, UI navigation, PixelFX integration');

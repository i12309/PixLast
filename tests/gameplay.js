/* Deterministic mission smoke test with a light Phaser stub. No browser required. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const els=new Map();
function el(id){if(!els.has(id))els.set(id,{hidden:false,style:{},textContent:'',classList:{add(){},remove(){}},setAttribute(){}});return els.get(id)}
const gameConfig={};
class FakeGame{constructor(config){Object.assign(gameConfig,config)}}
const env={
  console,Math,Promise,Date,setTimeout,clearTimeout,
  document:{getElementById:el},
  window:{Phaser:{Scene:class {},Game:FakeGame,AUTO:'AUTO',Scale:{FIT:1,CENTER_BOTH:2}}},
};
env.Phaser=env.window.Phaser;
vm.runInNewContext(fs.readFileSync(path.join(root,'js/game.js'),'utf8'),env,{filename:'game.js'});
assert.equal(gameConfig.width,640);
assert.equal(gameConfig.height,360);
assert.equal(gameConfig.physics.default,'arcade');
const Scene=gameConfig.scene[0],s=new Scene();
s.player={x:600,y:283,setVelocityX(){},setVelocity(){},anims:{stop(){}}};
s.setQuest(0);
assert.equal(el('objective').textContent,'Найди информатора у лапшичной');
s.started=true;
s.time={now:1000,delayedCall(_ms,callback){ /* async not needed for tests */ }};
s.notify=function(t){this.lastNotice=t};
s.burst=function(x,y,c,kind){this.lastBurst={x,y,kind}};
s.chip={setVisible(flag){this.visible=flag}};
s.chipGlow={setVisible(flag){this.visible=flag}};
s.signs=[{}, {setVisible(flag){this.visible=flag}}];
s.cameras={main:{shake(){},fadeOut(){}}};
s.tintFlash={setAlpha(){}};
s.tweens={add(){}};
s.drone={x:1790,setTint(){}};
s.interact();
assert.equal(s.dialogue.length,3,'NPC has three lines');
s.interact();s.interact();s.interact();
assert.equal(s.quest,1,'dialogue advances to next mission');
assert.equal(el('phaseLabel').textContent,'02 / 04');
s.player.x=1330;s.interact();
assert.equal(s.quest,2);assert.equal(s.hasChip,true);assert.equal(s.lastBurst.kind,'collect');
s.player.x=2290;s.interact();
assert.equal(s.dialogue.length,2);s.interact();s.interact();
assert.equal(s.quest,3);
s.player.x=2665;s.finishGame=function(){this.finished=true};s.interact();
assert.equal(s.finished,true,'exit marks mission finished');
s.player.x=1790;s.end=false;s.dialogue=null;s.pulse();
assert.ok(s.droneDisabled>1000,'EMP stuns the drone');
assert.equal(s.lastBurst.kind,'emp');
console.log('PASS: Phaser config, NPC dialogue, pickup, memory terminal, exit, EMP stun');

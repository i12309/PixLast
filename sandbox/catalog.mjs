// PixelFX catalogue. IDs are taken from the pinned patch-gg/pixelfx src/fx/index.js.
// The effect modules are imported lazily, not bundled with the editor.
export const PIXELFX_COMMIT = 'a84159688af3ca37a4be05a0d422b94451b2e24e';
export const FX_ROOT = `https://cdn.jsdelivr.net/gh/patch-gg/pixelfx@${PIXELFX_COMMIT}`;
export const GROUPS = [
  ['moves','Боевые движения'],['fire','Огонь'],['explosions','Взрывы'],['water','Вода'],
  ['ice','Лёд'],['lightning','Электричество'],['scifi','Научная фантастика'],['melee','Ближний бой'],
  ['impacts','Удары'],['projectiles','Снаряды'],['spawn','Появление и исчезновение'],
  ['arcane','Магия'],['holy','Свет'],['shadow','Тьма'],['status','Состояния'],
  ['nature','Природа'],['weather','Погода'],['ui','Интерфейс'],['pickups','Предметы'],
  ['transitions','Переходы'],['critters','Существа']
];
const IDS = `moves/arrow-shot|moves/dash-strike|moves/earth-stomp|moves/fireball-throw|moves/ground-pound|moves/holy-smite|moves/ice-lance-throw|moves/lightning-call|moves/meteor-call|moves/pistol-shots|moves/rocket-launcher|moves/sword-combo|fire/brazier|fire/campfire|fire/candle|fire/fire-breath|fire/fire-ring|fire/fire-tornado|fire/fireball|fire/flame-pillar|fire/flamethrower|fire/meteor|fire/spirit-flame|fire/torch|explosions/barrel-explosion|explosions/big-explosion|explosions/cartoon-pow|explosions/dirt-explosion|explosions/firework-burst|explosions/firework-rocket|explosions/grenade|explosions/implosion|explosions/nuke|explosions/plasma-explosion|explosions/small-explosion|explosions/smoke-bomb|water/bubbles|water/drip|water/fountain|water/geyser|water/rain-splash|water/ripples|water/splash|water/water-jet|water/water-orb|water/waterfall|water/wave-crash|water/whirlpool|ice/blizzard-vortex|ice/freeze|ice/frost-breath|ice/frost-nova|ice/ice-crystal|ice/ice-lance|ice/ice-shatter|ice/ice-spikes|ice/icicle-fall|ice/snowflake-burst|lightning/ball-lightning|lightning/chain-lightning|lightning/charge-up|lightning/electrified|lightning/lightning-strike|lightning/plasma-ball|lightning/spark-arc|lightning/storm-cloud|lightning/tesla-coil|lightning/thunderclap|lightning/zap-hit|scifi/emp-blast|scifi/energy-core|scifi/force-field|scifi/glitch|scifi/hologram|scifi/jetpack|scifi/laser-grid|scifi/scanner|scifi/teleporter-pad|scifi/tractor-beam|scifi/warp-in|scifi/warp-out|melee/claw-swipe|melee/dagger-flurry|melee/double-slash|melee/hammer-smash|melee/heavy-cleave|melee/scythe-reap|melee/spear-sweep|melee/spin-slash|melee/sword-slash|melee/thrust|melee/uppercut|melee/whip-crack|impacts/blunt-hit|impacts/bullet-impact|impacts/crit-hit|impacts/ground-slam|impacts/heavy-landing|impacts/hit-flash|impacts/hit-spark|impacts/impact-frame|impacts/parry|impacts/ricochet|impacts/shield-block|projectiles/arrow|projectiles/bullet-tracer|projectiles/cannonball|projectiles/energy-disc|projectiles/flare|projectiles/homing-missile|projectiles/laser-bolt|projectiles/magic-missile|projectiles/muzzle-pistol|projectiles/muzzle-shotgun|projectiles/muzzle-smg|projectiles/plasma-shot|projectiles/rocket|spawn/coin-drop|spawn/disintegrate|spawn/dissolve-burn|spawn/egg-hatch|spawn/poof|spawn/respawn-beam|spawn/shatter-death|spawn/soul-rise|spawn/spawn-portal|spawn/summon-rise|arcane/arcane-beam|arcane/arcane-missiles|arcane/arcane-orb|arcane/blink-in|arcane/blink-out|arcane/magic-circle-cast|arcane/mana-burst|arcane/portal|arcane/rune-circle|arcane/spell-charge|arcane/star-fall|arcane/time-stop|holy/blessing|holy/divine-shield|holy/feather-burst|holy/halo|holy/heal|holy/heal-aoe|holy/holy-pillar|holy/resurrection|holy/smite|holy/sunburst|shadow/black-hole|shadow/curse|shadow/dark-explosion|shadow/eclipse|shadow/grasping-hands|shadow/hex-sigil|shadow/life-steal|shadow/necro-skulls|shadow/shadow-flames|shadow/shadow-tendrils|shadow/soul-drain|shadow/void-orb|status/bleeding|status/burning|status/charmed|status/confused|status/cursed|status/frozen|status/haste|status/petrified|status/poisoned|status/rage|status/sleep|status/slowed|status/stunned|nature/acid-splash|nature/boulder|nature/earth-spike|nature/healing-bloom|nature/leaf-storm|nature/poison-cloud|nature/quake|nature/root-snare|nature/spore-burst|nature/thorns|nature/tornado|nature/toxic-puddle|nature/vine-whip|weather/aurora|weather/blizzard|weather/cherry-blossoms|weather/clouds|weather/falling-leaves|weather/fireflies|weather/fog|weather/god-rays|weather/rain|weather/shooting-stars|weather/snow|weather/storm|ui/achievement|ui/coin-collect|ui/combo-counter|ui/confetti|ui/countdown|ui/crit-number|ui/damage-number|ui/exclamation|ui/health-bar-hit|ui/heart-lost|ui/level-up|ui/quest-complete|pickups/chest-open|pickups/coin-spin|pickups/collect-burst|pickups/crystal-shard|pickups/gem-spin|pickups/heart-pickup|pickups/key-glint|pickups/loot-beam|pickups/potion|pickups/power-star|pickups/xp-orb|transitions/blinds|transitions/burn-away|transitions/crt-off|transitions/diamond-wipe|transitions/glitch-wipe|transitions/iris|transitions/pixel-dissolve|transitions/shatter-wipe|transitions/slash-wipe|transitions/star-iris|critters/bat|critters/bird|critters/butterfly|critters/eyeball|critters/fish-school|critters/flying-skull|critters/frog|critters/ghost|critters/jellyfish|critters/slime|critters/snake|critters/wisp`;
export const EFFECT_IDS = Object.freeze(IDS.split('|'));
export const EFFECT_SET = new Set(EFFECT_IDS);
export const PRESET_PALETTES = {
  original: {label:'Оригинальная',colors:null},
  cyan: {label:'Неоновый голубой',colors:['#08131e','#153349','#176074','#199caa','#42d2da','#8af2ed','#c9ffff','#ffffff']},
  pink: {label:'Малиновый неон',colors:['#180c24','#3a173c','#672858','#aa2d83','#e44cad','#ff8aca','#ffcae4','#ffffff']},
  amber: {label:'Тёплый янтарь',colors:['#1e1210','#52301a','#895122','#c87c2d','#eca64e','#ffd077','#ffedbe','#ffffff']},
  lime: {label:'Зелёный сигнал',colors:['#0c1b19','#1b3e2f','#286b45','#3ba55e','#65d878','#9af4a6','#d2ffd8','#ffffff']}
};
export const LABELS = {
  'scifi/emp-blast':'ЭМИ-импульс','scifi/hologram':'Голограмма','scifi/energy-core':'Энергетическое ядро',
  'scifi/force-field':'Силовое поле','scifi/laser-grid':'Лазерная решётка','scifi/scanner':'Сканер',
  'arcane/portal':'Портал','fire/campfire':'Костёр','fire/torch':'Факел','fire/flame-pillar':'Столб огня',
  'fire/fireball':'Огненный шар','weather/rain':'Дождь','weather/fog':'Туман','weather/storm':'Шторм',
  'pickups/collect-burst':'Подбор предмета','pickups/gem-spin':'Вращение кристалла',
  'lightning/lightning-strike':'Удар молнии','lightning/spark-arc':'Электрические искры',
  'lightning/plasma-ball':'Плазменный шар','explosions/plasma-explosion':'Плазменный взрыв',
  'explosions/small-explosion':'Взрыв','explosions/smoke-bomb':'Дымовая шашка',
  'water/ripples':'Круги на воде','water/splash':'Всплеск','ui/quest-complete':'Задание выполнено',
  'ui/level-up':'Новый уровень','spawn/poof':'Исчезновение'
};
export function effectLabel(id) { return LABELS[id] || id.split('/')[1].replace(/-/g,' '); }
export const OBJECTS = Object.freeze([
  {id:'hero', name:'Герой',sprite:'hero',y:282,w:30,h:52,depth:55},
  {id:'npc', name:'Информатор',sprite:'npc',y:282,w:30,h:48,depth:54},
  {id:'drone', name:'Дрон',sprite:'drone',y:220,w:78,h:33,depth:56,center:true},
  {id:'chip', name:'Капсула',sprite:'chip',y:242,w:22,h:22,depth:56,center:true},
  {id:'lamp', name:'Фонарь',sprite:'lamp',y:283,w:70,h:150,depth:65},
  {id:'crate', name:'Контейнер',sprite:'crate',y:283,w:32,h:29,depth:52},
  {id:'barrel', name:'Бочка',sprite:'barrel',y:283,w:22,h:29,depth:52},
  {id:'terminal', name:'Терминал',sprite:'terminal',y:283,w:37,h:67,depth:54},
  {id:'sign', name:'Неоновая вывеска',sprite:'sign',y:181,w:88,h:33,depth:35,center:true},
  {id:'cone', name:'Дорожный конус',sprite:'cone',y:283,w:18,h:29,depth:56},
  {id:'holo', name:'Голографический маяк',sprite:'holo',y:283,w:42,h:88,depth:58},
  {id:'car', name:'Машина',sprite:'car',y:270,w:110,h:46,depth:47}
]);
export const OBJECT_MAP = new Map(OBJECTS.map(o=>[o.id,o]));

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../engine'),R=require('../realms'),C=require('../collision-data');
const real=()=>new E.Session(R.worlds,C);
function arena(wall=false){
 const point=(id,x,y,extra={})=>({id,uid:'sunhaven:'+id,x,y,...extra});
 const world={id:'sunhaven',name:'Test ground',width:1024,height:1024,spawn:{x:500,y:500},npcs:[],portals:[],stars:[],dummies:[],enemies:[point('slime',560,500,{type:'slime'})],crates:[point('crate',750,700)],chests:[point('cache',350,350,{coins:40,potions:2,sealed:true})],fires:[point('fire',250,500)],runes:[point('a',250,250),point('b',500,250),point('c',750,250)]};
 return new E.Session({sunhaven:world},{sunhaven:{cols:128,rows:128,cell:8,rowRuns:Array.from({length:128},()=>wall?[0,75,79,49]:[0,128])}});
}
function approach(s,o){Object.assign(s.player,s.nav.snap({x:o.x-50,y:o.y},a=>E.distance(a,o)>30&&E.distance(a,o)<75));}
function follow(s,target,object=null){assert(s.setDestination(target,object));for(let i=0;i<25000&&(s.route.length||s.autoInteract);i++){s.tick(.05,{run:true});assert(s.nav.walkable(s.player.x,s.player.y),'movement stays on ground');}assert.equal(s.route.length,0,'route completes');assert.equal(s.autoInteract,null);}

test('all placed objectives are reachable with solid props enabled',()=>{
 const s=real();let count=0;for(const w of Object.values(s.worlds)){s.enter(w.id,w.spawn);for(const group of ['npcs','portals','stars','fires','chests','crates','runes','dummies','enemies'])for(const o of w[group]){const route=s.nav.route(s.player,o);assert(route.length,`${w.id}: ${o.id}`);let a=s.player;for(const b of route){assert(s.nav.clearLine(a,b));a=b;}assert(E.distance(a,o)<86,`${o.id} within interaction range`);count++;}}assert.equal(count,78);
});
test('art-matched collisions block water, lava, buildings and edges, and allow bridges',()=>{
 const s=real(),probes={sunhaven:{blocked:[[1080,600],[400,200],[690,370],[640,925]],open:[[1060,420]]},moonveil:{blocked:[[920,500],[40,80]],open:[[900,305],[940,700]]},emberfall:{blocked:[[965,500],[35,915]],open:[[947,332],[962,700]]}};
 for(const [id,points]of Object.entries(probes)){s.enter(id,s.worlds[id].spawn);for(const [x,y]of points.blocked)assert(!s.nav.walkable(x*2,y*2),`${id}: blocked ${x},${y}`);for(const [x,y]of points.open)assert(s.nav.walkable(x*2,y*2),`${id}: open bridge ${x},${y}`);for(const p of [{x:-1,y:500},{x:3073,y:500},{x:500,y:-1},{x:500,y:2049}])assert(!s.nav.walkable(p.x,p.y));}
});
test('movement and dash cannot tunnel through walls or map edges',()=>{
 const s=arena(true);s.enemies=[];Object.assign(s.player,{x:570,y:500,dir:{x:1,y:0}});s.nav.move(s.player,600,0);assert(s.player.x<591);s.dash();for(let i=0;i<10;i++)s.tick(.05);assert(s.player.x<591);s.nav.move(s.player,-5000,-5000);assert(s.player.x>=12&&s.player.y>=12);assert(s.nav.walkable(s.player.x,s.player.y));
});
test('camera covers every viewport and coordinate transforms invert correctly',()=>{
 for(const w of Object.values(R.worlds))for(const v of [{width:320,height:900},{width:1440,height:900},{width:3840,height:2160},{width:768,height:432}])for(const f of [{x:0,y:0},{x:3072,y:2048},{x:1536,y:1024}]){const c=E.cameraView(w,v,f,.8),hx=c.width/(2*c.scale),hy=c.height/(2*c.scale);assert(c.x-hx>=-1e-6&&c.y-hy>=-1e-6);assert(c.x+hx<=w.width+1e-6&&c.y+hy<=w.height+1e-6);const p={x:250,y:490};assert(E.distance(p,E.screenToWorld(E.worldToScreen(p,c),c))<1e-8);}
});
test('sword facing, range and cooldown work; enemy rewards occur once',()=>{
 const s=arena(),e=s.enemies[0];s.player.dir={x:-1,y:0};assert(s.attack());assert.equal(e.hp,40);assert(!s.attack());s.player.attackCd=0;s.player.dir={x:1,y:0};s.attack();assert.equal(e.hp,10);s.player.attackCd=0;s.attack();assert.equal(e.hp,0);assert.equal(s.player.coins,8);s.player.attackCd=0;s.attack();assert.equal(s.player.coins,8);assert(s.defeated.has(e.uid));const other=arena();other.player.x=250;other.player.dir={x:1,y:0};other.attack();assert.equal(other.enemies[0].hp,40);
});
test('enemy attacks telegraph, damage and recover; dash grants temporary immunity',()=>{
 const s=arena(),e=s.enemies[0];s.player.invuln=0;e.x=s.player.x+40;e.y=s.player.y;s.tick(.05);assert.equal(e.phase,'windup');assert.equal(s.player.hp,100);for(let i=0;i<15;i++)s.tick(.05);assert.equal(s.player.hp,90);assert.equal(e.phase,'recover');s.hurt(10,e);assert.equal(s.player.hp,90);s.player.invuln=0;s.player.dir={x:-1,y:0};assert(s.dash());assert(!s.dash());s.hurt(80,e);assert.equal(s.player.hp,90);for(let i=0;i<6;i++)s.tick(.05);assert(s.player.dashCd>0);
});
test('runes unlock caches; loot is single-use; potions and upgrades spend correctly',()=>{
 const s=arena();s.enemies=[];const cache=s.world.chests[0];approach(s,cache);assert(!s.interact(cache));for(const r of s.world.runes){approach(s,r);assert(s.interact(r));assert(!s.interact(r));}assert.equal(s.runeCount(),3);approach(s,cache);assert(s.interact(cache));const coins=s.player.coins;assert(!s.interact(cache));assert.equal(s.player.coins,coins);
 const crate=s.world.crates[0];approach(s,crate);s.attack(crate);assert(s.destroyed.has(crate.uid));const after=s.player.coins;s.player.attackCd=0;s.attack(crate);assert.equal(s.player.coins,after);const pots=s.player.potions;assert(!s.potion());assert.equal(s.player.potions,pots);s.player.hp=70;assert(s.potion());assert.equal(s.player.hp,100);assert.equal(s.player.potions,pots-1);s.player.coins=150;for(let i=0;i<3;i++)assert(s.buy('upgrade'));assert.equal(s.player.level,3);assert(!s.buy('upgrade'));assert.equal(s.player.coins,30);assert(s.buy('potion'));assert.equal(s.player.coins,15);assert(!s.buy('unknown'));
});
test('both portal round trips arrive on safe ground without bouncing back',()=>{
 const s=real();for(const id of ['moonveil','emberfall']){const gate=s.worlds.sunhaven.portals.find(p=>p.to===id);s.enter('sunhaven',s.worlds.sunhaven.spawn);s.enemies=[];approach(s,gate);assert(s.interact(gate));assert.equal(s.worldId,id);assert(s.nav.walkable(s.player.x,s.player.y));s.enemies=[];s.tick(.05);assert.equal(s.worldId,id);const home=s.world.portals[0];approach(s,home);assert(s.interact(home));assert.equal(s.worldId,'sunhaven');assert(s.nav.walkable(s.player.x,s.player.y));}
});
test('camp checkpoints heal and respawn without losing treasure',()=>{
 const s=arena();s.enemies=[];const fire=s.world.fires[0];approach(s,fire);s.player.hp=20;s.interact(fire);assert.equal(s.player.hp,100);const cp={...s.checkpoint};s.player.coins=35;s.player.invuln=0;s.hurt(200);assert.equal(s.player.hp,100);assert.equal(s.player.coins,35);assert.equal(s.deaths,1);assert(E.distance(s.player,cp)<1);assert(s.nav.walkable(s.player.x,s.player.y));
});
test('full quest: follow paths to five stars, recover both boss relics and finish at Sol',()=>{
 const s=real();s.enemies=[];for(const star of s.world.stars)follow(s,star);assert.equal(s.collected.size,5);for(const id of ['moonveil','emberfall']){s.enter(id,s.worlds[id].spawn);const boss=s.enemies.find(e=>e.boss);s.enemies=[];follow(s,boss);s.enemies=[boss];Object.assign(s.player,s.nav.snap({x:boss.x-70,y:boss.y}));let swings=0;while(boss.hp>0&&swings++<30){s.player.attackCd=0;s.attack(boss);}assert.equal(boss.hp,0);assert(s.relics.has(id));}
 s.enter('sunhaven',s.worlds.sunhaven.spawn);s.enemies=[];const sol=s.world.npcs.find(n=>n.ending),target=s.nav.snap(sol,p=>E.distance(p,sol)>32&&E.distance(p,sol)<65);follow(s,target,sol);assert(s.won);assert(s.drain().some(e=>e.type==='win'));const restored=new E.Session(R.worlds,C,s.saveData());assert(restored.won);assert.equal(restored.relics.size,2);restored.enter('moonveil',restored.worlds.moonveil.spawn);assert(!restored.enemies.some(e=>e.boss));
});
test('legacy saves migrate and invalid positions recover to valid ground',()=>{
 const legacy={version:1,collected:['lookout','bogus'],visited:['cottage'],seconds:125,sound:true},m=new E.Session(R.worlds,C,null,legacy);assert.deepEqual([...m.collected],['lookout']);assert(m.visited.has('sunhaven:cottage'));assert.equal(m.seconds,125);assert(m.sound);
 const bad={version:2,worldId:'moonveil',x:-9000,y:Infinity,hp:-8,potions:-4,level:99,coins:-1,collected:['bogus'],relics:['bogus'],won:true,checkpoint:{worldId:'moonveil',x:NaN,y:NaN}},s=new E.Session(R.worlds,C,bad);assert(s.nav.walkable(s.player.x,s.player.y));assert.equal(s.player.hp,1);assert.equal(s.player.potions,0);assert.equal(s.player.level,3);assert.equal(s.player.coins,0);assert.equal(s.collected.size,0);assert(!s.won);s.player.invuln=0;s.hurt(100);assert(s.nav.walkable(s.player.x,s.player.y));
});

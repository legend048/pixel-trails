const test=require('node:test');
const assert=require('node:assert/strict');
const world=require('../world.js');
const {Navigator,validateSave,distance}=require('../engine.js');
const nav=new Navigator(world);

test('spawn, every star and every resident stand on walkable ground',()=>{
  for(const p of [world.spawn,world.guide,...world.stars,...world.locations])assert.ok(nav.walkable(p.x,p.y),`${p.id||'spawn'} is not walkable at ${p.x},${p.y}`);
});
test('every star and location can be reached from spawn without crossing an obstacle',()=>{
  for(const target of [...world.stars,...world.locations]){
    const route=nav.route(world.spawn,target);
    assert.ok(route.length,`No route to ${target.id}`);
    let from=world.spawn;
    for(const p of route){assert.ok(nav.clearLine(from,p),`Route crosses obstacle on way to ${target.id}`);from=p;}
    assert.ok(distance(from,target)<16,`Route ends too far from ${target.id}`);
  }
});
test('movement can follow the whole quest route and reach the lighthouse',()=>{
  const player={...world.spawn};
  for(const target of [...world.stars,...world.locations]){
    const route=nav.route(player,target);
    assert.ok(route.length,`No route from previous stop to ${target.id}`);
    for(const point of route){
      let steps=0;
      while(distance(player,point)>.01&&steps++<1200){
        const d=distance(player,point),amount=Math.min(d,105/60);
        nav.move(player,(point.x-player.x)/d*amount,(point.y-player.y)/d*amount);
      }
      assert.ok(distance(player,point)<=.01,`Movement became stuck while visiting ${target.id}`);
    }
    assert.ok(distance(player,target)<22,`${target.id} cannot be collected or visited`);
  }
});
test('water, buildings and fountain block walking while the bridge is open',()=>{
  for(const p of [{x:1070,y:310},{x:1070,y:650},{x:600,y:970},{x:400,y:200},{x:690,y:374}])assert.equal(nav.walkable(p.x,p.y),false);
  assert.equal(nav.walkable(1070,420),true);
  const p={x:951,y:513};nav.move(p,200,0);assert.ok(p.x<1000,'Player crossed the river without the bridge');
});
test('invalid, stale and partially corrupt saved games recover safely',()=>{
  assert.deepEqual(validateSave(null,world,nav).collected,[]);
  assert.equal(validateSave({version:99,x:NaN,y:NaN},world,nav).x,world.spawn.x);
  const data=validateSave({version:1,x:1070,y:650,collected:['maker','maker','unknown'],visited:['camp','camp','fake'],won:true,seconds:-10},world,nav);
  assert.deepEqual(data.collected,['maker']);assert.deepEqual(data.visited,['camp']);assert.equal(data.won,false);assert.equal(data.seconds,0);assert.equal(data.x,world.spawn.x);
});
test('complete progress persists and validates',()=>{
  const data=validateSave({version:1,...world.spawn,collected:world.stars.map(s=>s.id),visited:world.locations.map(s=>s.id),won:true,seconds:315,sound:true},world,nav);
  assert.equal(data.won,true);assert.equal(data.collected.length,5);assert.equal(data.visited.length,6);assert.equal(data.seconds,315);assert.equal(data.sound,true);
});

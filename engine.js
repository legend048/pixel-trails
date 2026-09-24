/* Pixel Trails II: deterministic world geometry, movement and combat.
   No DOM, network, audio or rendering dependencies. */
(function(root){
 'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
 const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
 class Heap{
  constructor(){this.items=[];}
  push(id,score){const a=this.items;let i=a.length;a.push({id,score});while(i){const p=(i-1)>>1;if(a[p].score<=score)break;a[i]=a[p];i=p;}a[i]={id,score};}
  pop(){const a=this.items,top=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].score<a[c].score)c++;if(a[c].score>=last.score)break;a[i]=a[c];i=c;}a[i]=last;}return top.id;}
  get length(){return this.items.length;}
 }
 class Navigator{
  constructor(world,data,radius=10){
   this.world=world;this.data=data;this.radius=radius;this.cell=8;this.cols=Math.ceil(world.width/this.cell);this.rows=Math.ceil(world.height/this.cell);this.obstacles=[];
   this.ground=new Uint8Array(data.cols*data.rows);
   data.rowRuns.forEach((row,y)=>{for(let i=0;i<row.length;i+=2)this.ground.fill(1,y*data.cols+row[i],y*data.cols+row[i]+row[i+1]);});
   this.staticMask=new Uint8Array(this.cols*this.rows);
   for(let i=0;i<this.staticMask.length;i++){const p=this.position(i);this.staticMask[i]=this.walkable(p.x,p.y)?1:0;}
   // Tiny disconnected slivers of stone can resemble ground in the artwork.
   // Keep the main body-sized component so objects never spawn on those slivers.
   const seen=new Uint8Array(this.staticMask.length);let largest=[];
   for(let start=0;start<seen.length;start++)if(this.staticMask[start]&&!seen[start]){
    const component=[start];seen[start]=1;
    for(let q=0;q<component.length;q++){const id=component[q],x=id%this.cols,y=Math.floor(id/this.cols);
     for(const [dx,dy]of dirs.slice(0,4)){const nx=x+dx,ny=y+dy,ni=ny*this.cols+nx;
      if(nx<0||ny<0||nx>=this.cols||ny>=this.rows||seen[ni]||!this.staticMask[ni])continue;
      if(!this.clearLine(this.position(id),this.position(ni)))continue;
      seen[ni]=1;component.push(ni);
     }
    }if(component.length>largest.length)largest=component;
   }
   this.staticMask.fill(0);for(const id of largest)this.staticMask[id]=1;
   this.mask=this.staticMask.slice();
  }
  groundAt(x,y){if(x<0||y<0||x>=this.world.width||y>=this.world.height)return false;const c=Math.floor(x/this.data.cell),r=Math.floor(y/this.data.cell);return this.ground[r*this.data.cols+c]===1;}
  walkable(x,y,r=this.radius){
   if(!Number.isFinite(x)||!Number.isFinite(y)||x<r+2||y<r+2||x>this.world.width-r-2||y>this.world.height-r-2)return false;
   if(!this.groundAt(x,y))return false;
   for(const [dx,dy] of dirs){const s=(dx&&dy)?Math.SQRT1_2:1;if(!this.groundAt(x+dx*r*s,y+dy*r*s))return false;}
   for(const o of this.obstacles)if(Math.hypot(x-o.x,y-o.y)<r+o.radius)return false;
   return true;
  }
  setObstacles(objects){
   this.obstacles=objects;this.mask=this.staticMask.slice();
   for(const o of objects){const range=o.radius+this.radius;const x0=clamp(Math.floor((o.x-range)/this.cell),0,this.cols-1),x1=clamp(Math.ceil((o.x+range)/this.cell),0,this.cols-1),y0=clamp(Math.floor((o.y-range)/this.cell),0,this.rows-1),y1=clamp(Math.ceil((o.y+range)/this.cell),0,this.rows-1);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=y*this.cols+x,p=this.position(i);if(distance(p,o)<range)this.mask[i]=0;}
   }
  }
  position(id){return{x:(id%this.cols+.5)*this.cell,y:(Math.floor(id/this.cols)+.5)*this.cell};}
  closest(x,y,predicate=null){let best=-1,score=Infinity;x=finite(x,this.world.spawn.x);y=finite(y,this.world.spawn.y);for(let i=0;i<this.mask.length;i++)if(this.mask[i]){const p=this.position(i),d=(p.x-x)**2+(p.y-y)**2;if(d<score&&(!predicate||predicate(p))){score=d;best=i;}}return best;}
  snap(point,predicate=null){const id=this.closest(point.x,point.y,predicate);return id<0?{...this.world.spawn}:this.position(id);}
  clearLine(a,b,r=this.radius){const d=distance(a,b),steps=Math.max(1,Math.ceil(d/3));for(let i=0;i<=steps;i++)if(!this.walkable(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps,r))return false;return true;}
  route(from,target){
   const start=this.closest(from.x,from.y),end=this.closest(target.x,target.y);if(start<0||end<0)return[];
   const goal=this.position(end);if(this.clearLine(from,goal))return[goal];
   const n=this.mask.length,g=new Float64Array(n).fill(Infinity),parent=new Int32Array(n).fill(-1),closed=new Uint8Array(n),open=new Heap();
   g[start]=0;open.push(start,0);let found=false;
   while(open.length){const id=open.pop();if(closed[id])continue;if(id===end){found=true;break;}closed[id]=1;const x=id%this.cols,y=Math.floor(id/this.cols);
    for(const [dx,dy]of dirs){const nx=x+dx,ny=y+dy,ni=ny*this.cols+nx;if(nx<0||ny<0||nx>=this.cols||ny>=this.rows||!this.mask[ni]||closed[ni])continue;
     if(dx&&dy&&(!this.mask[y*this.cols+nx]||!this.mask[ny*this.cols+x]))continue;
     if(!this.clearLine(this.position(id),this.position(ni)))continue;
     const cost=g[id]+(dx&&dy?Math.SQRT2:1);if(cost<g[ni]){g[ni]=cost;parent[ni]=id;open.push(ni,cost+distance(this.position(ni),goal)/this.cell);}
    }
   }
   if(!found)return[];
   const points=[];for(let i=end;i!==start;i=parent[i]){if(i<0)return[];points.unshift(this.position(i));}
   // Include the start centre when an arbitrary off-grid player position cannot
   // see the first grid waypoint; never jump diagonally across a corner.
   if(points.length&&!this.clearLine(from,points[0]))points.unshift(this.position(start));
   const smooth=[];let anchor=from,index=0;
   while(index<points.length){let far=index;while(far+1<points.length&&this.clearLine(anchor,points[far+1]))far++;if(!this.clearLine(anchor,points[far]))return[];smooth.push(points[far]);anchor=points[far];index=far+1;}
   return smooth;
  }
  move(body,dx,dy){
   if(!Number.isFinite(dx)||!Number.isFinite(dy))return 0;
   const before={x:body.x,y:body.y},steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/3));
   for(let i=0;i<steps;i++){const sx=dx/steps,sy=dy/steps;if(this.walkable(body.x+sx,body.y+sy)){body.x+=sx;body.y+=sy;}else{if(this.walkable(body.x+sx,body.y))body.x+=sx;if(this.walkable(body.x,body.y+sy))body.y+=sy;}}
   return distance(before,body);
  }
 }
 function cameraView(world,viewport,focus,requestedScale=.9){
  const width=Math.max(1,viewport.width),height=Math.max(1,viewport.height),scale=Math.max(requestedScale,width/world.width,height/world.height);
  const hx=width/(2*scale),hy=height/(2*scale);
  return{x:clamp(finite(focus.x,world.width/2),hx,world.width-hx),y:clamp(finite(focus.y,world.height/2),hy,world.height-hy),scale,width,height};
 }
 function screenToWorld(point,camera){return{x:(point.x-camera.width/2)/camera.scale+camera.x,y:(point.y-camera.height/2)/camera.scale+camera.y};}
 function worldToScreen(point,camera){return{x:(point.x-camera.x)*camera.scale+camera.width/2,y:(point.y-camera.y)*camera.scale+camera.height/2};}
 const groups=['npcs','portals','stars','fires','chests','crates','runes','dummies','enemies'];
 function prepareWorlds(rawWorlds,collision){
  const worlds={};
  for(const original of Object.values(rawWorlds)){
   const w=JSON.parse(JSON.stringify(original)),nav=new Navigator(w,collision[w.id]);w.nav=nav;w.spawn=nav.snap(w.spawn);
   const placed=[];
   for(const group of groups)for(const p of w[group]){p.kind=group;p.authoredX=p.x;p.authoredY=p.y;
    const solid=group==='chests'||group==='crates';
    const position=nav.snap(p,candidate=>(!solid||(nav.walkable(candidate.x,candidate.y,56)&&nav.walkable(candidate.x,candidate.y,28)))&&placed.every(other=>distance(other,candidate)>(solid?64:30)));p.x=position.x;p.y=position.y;placed.push(p);
   }
   worlds[w.id]=w;
  }
  return worlds;
 }
 const ENEMY_TYPES={
  slime:{hp:40,damage:10,speed:62,range:52,windup:.7,recover:1.1,coins:8,color:'#a9d773'},
  'crystal-slime':{hp:65,damage:13,speed:70,range:56,windup:.65,recover:1.05,coins:10,color:'#9bdbe3'},
  'ember-slime':{hp:75,damage:16,speed:74,range:57,windup:.65,recover:1.05,coins:12,color:'#efa06f'},
  wisp:{hp:55,damage:14,speed:92,range:63,windup:.8,recover:1.15,coins:12,color:'#bea5f1'},
  'ember-wisp':{hp:70,damage:18,speed:95,range:65,windup:.8,recover:1.2,coins:14,color:'#ffd180'},
  guardian:{hp:300,damage:24,speed:55,range:145,windup:1.15,recover:1.4,coins:60,color:'#a3d99c'},
  warden:{hp:380,damage:29,speed:60,range:165,windup:1.15,recover:1.45,coins:80,color:'#f3aa73'}
 };
 class Session{
  constructor(rawWorlds,collision,saved=null,legacy=null){
   this.worlds=prepareWorlds(rawWorlds,collision);this.events=[];this.route=[];this.autoInteract=null;this.autoEnemy=null;this.time=0;this.seconds=0;
   this.collected=new Set();this.visited=new Set();this.relics=new Set();this.opened=new Set();this.destroyed=new Set();this.runes=new Set();this.defeated=new Set();this.won=false;this.sound=false;this.deaths=0;
   this.player={...this.worlds.sunhaven.spawn,hp:100,maxHp:100,potions:3,coins:0,level:0,dir:{x:0,y:1},moving:false,stride:0,attackCd:0,attackTime:0,dashCd:0,dashTime:0,invuln:0};
   this.worldId='sunhaven';this.checkpoint={worldId:'sunhaven',...this.worlds.sunhaven.spawn};
   this.restore(saved,legacy);this.enter(this.worldId,{x:this.player.x,y:this.player.y},false);this.events=[];
  }
  get world(){return this.worlds[this.worldId];}get nav(){return this.world.nav;}
  emit(type,data={}){this.events.push({type,...data});}drain(){return this.events.splice(0);}
  refreshBlocks(){this.nav.setObstacles([...this.world.chests.map(p=>({...p,radius:13})),...this.world.crates.filter(p=>!this.destroyed.has(p.uid)).map(p=>({...p,radius:12}))]);}
  enter(id,position,checkpoint=true){
   this.worldId=id;this.refreshBlocks();Object.assign(this.player,this.nav.walkable(position.x,position.y)?position:this.nav.snap(position));
   this.route=[];this.autoInteract=null;this.autoEnemy=null;this.player.invuln=2;this.player.dashTime=0;this.player.moving=false;
   this.enemies=this.world.enemies.filter(p=>!this.defeated.has(p.uid)).map(p=>({...p,...ENEMY_TYPES[p.type],maxHp:ENEMY_TYPES[p.type].hp,home:{x:p.x,y:p.y},phase:'idle',timer:0,path:[],pathTimer:0,flash:0}));
   if(checkpoint)this.checkpoint={worldId:id,x:this.player.x,y:this.player.y};this.emit('travel',{worldId:id,name:this.world.name});
  }
  setDestination(point,object=null){this.route=this.nav.route(this.player,point);this.autoInteract=object?.uid||null;this.autoEnemy=null;if(!this.route.length){this.emit('toast',{text:'That spot is blocked. Choose an open path.'});return false;}return true;}
  nearest(){let best=null,limit=82;for(const g of ['npcs','portals','fires','chests','runes','dummies'])for(const p of this.world[g]){const d=distance(this.player,p);if(d<limit){best=p;limit=d;}}return best;}
  interact(object=this.nearest()){
   if(!object||distance(this.player,object)>86)return false;
   this.route=[];this.autoInteract=null;
   if(object.kind==='portals'){
    const target=this.worlds[object.to],back=target.portals.find(p=>p.id===object.arrival);const spawn=target.nav.snap({x:back.x+68,y:back.y+44},p=>distance(p,back)>55);
    this.enter(target.id,spawn,true);return true;
   }
   if(object.kind==='fires'){this.player.hp=this.player.maxHp;this.checkpoint={worldId:this.worldId,...this.nav.snap({x:object.x+35,y:object.y+25})};this.emit('camp',{x:object.x,y:object.y,text:'Fully healed. Checkpoint set.'});return true;}
   if(object.kind==='npcs'){
    this.visited.add(object.uid);
    if(object.ending&&this.collected.size===5&&this.relics.size===2){this.won=true;this.emit('win');}
    else this.emit('dialogue',{npc:object});return true;
   }
   if(object.kind==='chests'){
    if(this.opened.has(object.uid)){this.emit('toast',{text:'This chest has already been opened.'});return false;}
    if(object.sealed&&this.runeCount()<3){this.emit('toast',{text:'Activate all three rune stones in this world to open this cache.'});return false;}
    this.opened.add(object.uid);this.player.coins+=object.coins;this.player.potions=Math.min(99,this.player.potions+object.potions);this.emit('loot',{x:object.x,y:object.y,text:`Chest opened: +${object.coins} coins, +${object.potions} potions`});return true;
   }
   if(object.kind==='runes'){
    if(this.runes.has(object.uid)){this.emit('toast',{text:'This rune is already glowing.'});return false;}
    this.runes.add(object.uid);this.emit('rune',{x:object.x,y:object.y,text:this.runeCount()===3?'All three runes are active. The sealed cache is open!':`Rune activated · ${this.runeCount()} / 3`});return true;
   }
   if(object.kind==='dummies'){this.emit('toast',{text:'Face the dummy and press Space or right-click to practise. No health lost here.'});return true;}
   return false;
  }
  runeCount(id=this.worldId){return this.worlds[id].runes.filter(r=>this.runes.has(r.uid)).length;}
  attack(aim=null){
   const p=this.player;if(p.attackCd>0||p.dashTime>0)return false;
   if(aim){const d=distance(p,aim);if(d>0)p.dir={x:(aim.x-p.x)/d,y:(aim.y-p.y)/d};}
   p.attackCd=.36;p.attackTime=.23;this.emit('swing',{x:p.x,y:p.y});const damage=30+p.level*10;
   const hits=target=>{const d=distance(p,target),dot=d?((target.x-p.x)*p.dir.x+(target.y-p.y)*p.dir.y)/d:1;const end=target.kind==='crates'&&d>16?{x:target.x-(target.x-p.x)/d*16,y:target.y-(target.y-p.y)/d*16}:target;return d<94+(target.boss?23:0)&&dot>-.05&&this.nav.clearLine(p,end,0);};
   for(const enemy of this.enemies)if(enemy.hp>0&&hits(enemy)){
    enemy.hp=Math.max(0,enemy.hp-damage);enemy.flash=.16;this.emit('hit',{x:enemy.x,y:enemy.y,amount:damage,color:'#fff1ab'});
    if(enemy.hp===0){this.defeated.add(enemy.uid);p.coins+=enemy.coins;this.emit('defeat',{x:enemy.x,y:enemy.y,text:`+${enemy.coins} coins`,boss:enemy.boss});if(enemy.relic){this.relics.add(enemy.relic);this.emit('relic',{x:enemy.x,y:enemy.y,text:`${enemy.name} defeated. Guardian relic recovered!`});}}
   }
   for(const crate of this.world.crates)if(!this.destroyed.has(crate.uid)&&hits(crate)){this.destroyed.add(crate.uid);p.coins+=6;this.emit('break',{x:crate.x,y:crate.y,text:'+6 coins'});this.refreshBlocks();}
   for(const dummy of this.world.dummies)if(hits(dummy))this.emit('hit',{x:dummy.x,y:dummy.y,amount:damage,color:'#fff1ab'});
   return true;
  }
  dash(){const p=this.player;if(p.dashCd>0||p.dashTime>0)return false;p.dashCd=1.5;p.dashTime=.24;p.invuln=Math.max(p.invuln,.28);this.route=[];this.autoInteract=null;this.emit('dash');return true;}
  potion(){const p=this.player;if(!p.potions){this.emit('toast',{text:'No potions left. Rest at a campfire or visit Dex.'});return false;}if(p.hp>=p.maxHp){this.emit('toast',{text:'Your health is already full.'});return false;}p.potions--;p.hp=Math.min(p.maxHp,p.hp+50);this.emit('heal',{x:p.x,y:p.y,text:'+50 health'});return true;}
  buy(item){const p=this.player;if(!['potion','upgrade'].includes(item))return false;const cost=item==='potion'?15:40;
   if(item==='upgrade'&&p.level>=3){this.emit('toast',{text:'Your sword is fully upgraded.'});return false;}if(p.coins<cost){this.emit('toast',{text:`You need ${cost} coins.`});return false;}
   if(item==='potion'&&p.potions>=99)return false;p.coins-=cost;if(item==='potion')p.potions++;else p.level++;this.emit('purchase',{text:item==='potion'?'Potion added to your pack.':`Sword upgraded · ${30+p.level*10} damage`});return true;
  }
  hurt(damage,source){const p=this.player;if(p.invuln>0)return false;p.hp=Math.max(0,p.hp-damage);p.invuln=.85;this.emit('hurt',{x:p.x,y:p.y,amount:damage});
   if(p.hp===0){this.deaths++;p.hp=p.maxHp;this.enter(this.checkpoint.worldId,this.checkpoint,false);this.emit('respawn',{text:'Back at your checkpoint. Your treasure and discoveries are safe.'});return true;}
   if(source){const d=distance(p,source)||1;this.nav.move(p,(p.x-source.x)/d*18,(p.y-source.y)/d*18);}return false;
  }
  tick(dt,input={}){
   dt=clamp(finite(dt),0,.05);this.time+=dt;this.seconds+=dt;const p=this.player;
   for(const k of ['attackCd','attackTime','dashCd','invuln'])p[k]=Math.max(0,p[k]-dt);
   let dx=finite(input.x),dy=finite(input.y),manual=!!(dx||dy),amount=(input.run?215:145)*dt;
   if(manual){this.route=[];this.autoInteract=null;this.autoEnemy=null;}
   if(p.dashTime>0){p.dashTime=Math.max(0,p.dashTime-dt);dx=p.dir.x;dy=p.dir.y;amount=490*dt;}
   else if(!manual&&this.route.length){const next=this.route[0],d=distance(p,next);if(d<.01){p.x=next.x;p.y=next.y;this.route.shift();}else{dx=(next.x-p.x)/d;dy=(next.y-p.y)/d;amount=Math.min(amount,d);}}
   const length=Math.hypot(dx,dy);let moved=0;
   if(length){dx/=length;dy/=length;if(p.dashTime<=0)p.dir={x:dx,y:dy};moved=this.nav.move(p,dx*amount,dy*amount);if(!manual&&moved<.001){this.route=[];this.autoInteract=null;}}
   p.moving=moved>.01;if(p.moving)p.stride+=moved*.17;
   if(input.attack)this.attack();
   for(const star of this.world.stars)if(!this.collected.has(star.id)&&distance(p,star)<30){this.collected.add(star.id);this.emit('star',{x:star.x,y:star.y,text:`${star.name} found · ${this.collected.size} / 5`});}
   if(this.autoInteract){const o=groups.flatMap(g=>this.world[g]).find(o=>o.uid===this.autoInteract);if(o&&distance(p,o)<76){this.autoInteract=null;this.interact(o);return;}}
   for(const e of this.enemies){
    if(e.hp<=0)continue;e.flash=Math.max(0,e.flash-dt);e.pathTimer-=dt;const d=distance(e,p);
    if(e.phase==='windup'){e.timer-=dt;if(e.timer<=0){e.phase='recover';e.timer=e.recover;this.emit('enemy-strike',{x:e.x,y:e.y,radius:e.range,boss:e.boss});if(distance(e,p)<e.range+10&&this.nav.clearLine(e,p,0)){if(this.hurt(e.damage,e))return;}}continue;}
    if(e.phase==='recover'){e.timer-=dt;if(e.timer<=0)e.phase='idle';continue;}
    if(d>650||distance(e,e.home)>650){if(distance(e,e.home)>12){if(e.pathTimer<=0){e.path=this.nav.route(e,e.home);e.pathTimer=1.4;}this.moveEnemy(e,dt);}continue;}
    if(d<(e.boss?205:70)&&this.nav.clearLine(e,p,0)){e.phase='windup';e.timer=e.windup;continue;}
    if(d<530){
     if(this.nav.clearLine(e,p)){const step=e.speed*dt;this.nav.move(e,(p.x-e.x)/(d||1)*step,(p.y-e.y)/(d||1)*step);}
     else {if(e.pathTimer<=0){e.path=this.nav.route(e,p);e.pathTimer=.9;}this.moveEnemy(e,dt);}
    }
   }
  }
  moveEnemy(e,dt){if(!e.path.length)return;const next=e.path[0],d=distance(e,next);if(d<.01){e.x=next.x;e.y=next.y;e.path.shift();return;}const amount=Math.min(d,e.speed*dt);this.nav.move(e,(next.x-e.x)/d*amount,(next.y-e.y)/d*amount);}
  saveData(){const p=this.player;return{version:2,worldId:this.worldId,x:p.x,y:p.y,hp:p.hp,potions:p.potions,coins:p.coins,level:p.level,collected:[...this.collected],visited:[...this.visited],relics:[...this.relics],opened:[...this.opened],destroyed:[...this.destroyed],runes:[...this.runes],defeated:[...this.defeated],checkpoint:{...this.checkpoint},won:this.won,sound:this.sound,seconds:this.seconds,deaths:this.deaths};}
  restore(saved,legacy){
   const all=Object.values(this.worlds),valid=group=>new Set(all.flatMap(w=>w[group].map(o=>o.uid))),take=(values,allowed)=>new Set(Array.isArray(values)?values.filter(x=>allowed.has(x)):[]);
   const starIds=new Set(this.worlds.sunhaven.stars.map(o=>o.id));
   if(!saved||saved.version!==2){if(legacy?.version===1){this.collected=take(legacy.collected,starIds);this.visited=take(Array.isArray(legacy.visited)?legacy.visited.map(x=>'sunhaven:'+x):[],valid('npcs'));this.sound=legacy.sound===true;this.seconds=clamp(finite(legacy.seconds),0,360000);}return;}
   this.worldId=this.worlds[saved.worldId]?saved.worldId:'sunhaven';const nav=this.worlds[this.worldId].nav;
   Object.assign(this.player,nav.walkable(saved.x,saved.y)?{x:saved.x,y:saved.y}:this.worlds[this.worldId].spawn);
   this.player.hp=clamp(finite(saved.hp,100),1,100);this.player.potions=clamp(Math.floor(finite(saved.potions,3)),0,99);this.player.coins=clamp(Math.floor(finite(saved.coins)),0,999999);this.player.level=clamp(Math.floor(finite(saved.level)),0,3);
   this.collected=take(saved.collected,starIds);this.visited=take(saved.visited,valid('npcs'));this.opened=take(saved.opened,valid('chests'));this.destroyed=take(saved.destroyed,valid('crates'));this.runes=take(saved.runes,valid('runes'));this.defeated=take(saved.defeated,valid('enemies'));
   this.relics=take(saved.relics,new Set(['moonveil','emberfall']));for(const w of all)for(const e of w.enemies)if(e.relic&&this.relics.has(e.relic))this.defeated.add(e.uid);
   this.won=saved.won===true&&this.collected.size===5&&this.relics.size===2;this.sound=saved.sound===true;this.seconds=clamp(finite(saved.seconds),0,360000);this.deaths=clamp(Math.floor(finite(saved.deaths)),0,9999);
   const cp=saved.checkpoint;if(cp&&this.worlds[cp.worldId]){const n=this.worlds[cp.worldId].nav;this.checkpoint={worldId:cp.worldId,...(n.walkable(cp.x,cp.y)?{x:cp.x,y:cp.y}:this.worlds[cp.worldId].spawn)};}
  }
 }
 const api={Navigator,Session,prepareWorlds,cameraView,screenToWorld,worldToScreen,ENEMY_TYPES,clamp,distance};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PixelEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);

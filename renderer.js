/* Canvas renderer. Artwork, geometry, and pointer targets share world coordinates. */
(function(root){
 'use strict';
 const E=root.PixelEngine,TAU=Math.PI*2;
 const palettes={
 player:['#263d36','#dc7951','#f4ac73','#f8cb98','#353838','#bd7755','#517f77','#d9a04c','#293e53'],
 green:['#273d36','#6b9050','#a2b978','#f0c897','#383938','#b07c52','#739150','#c3a264','#334f3a'],
 rose:['#403a3c','#aa6262','#d49c86','#edc5a7','#3a333d','#b57860','#aa6c70','#ead49a','#424b5b'],
 blue:['#283a43','#527493','#8ab1bf','#edc7a0','#33373c','#b57955','#577f9c','#eccd8b','#334858'],
 purple:['#3a344d','#8974a4','#b7a1c4','#edc9ad','#39353f','#bd8a75','#9984b1','#e5dbae','#444157'],
 orange:['#463a34','#b67843','#e6ad63','#e5b58b','#333533','#a77852','#aa784b','#a9b27a','#46513c'],
 teal:['#2c3f38','#5b9185','#9fc6a8','#edc6a4','#363b35','#b27c57','#658f79','#e1c786','#345554'],
 gold:['#453e33','#c28c4f','#ead198','#e5b68d','#36352f','#b78364','#c59a63','#8b9c71','#4b574c']};
 const front=['....000000....','...01111110...','..0111111110..','..0222222220..','...03333330...','...03433430...','...03353330...','....333333....','...06666660...','..0666776660..','.330667766033.','.330666666033.','....888888....','....88..88....','....88..88....','...000..000...'];
 const back=['....000000....','...01111110...','..0111111110..','..0222222220..','...05555550...','...05555550...','...05555550...','....333333....','...06666660...','..0667777660..','.330677776033.','.330677776033.','....888888....','....88..88....','....88..88....','...000..000...'];
 const side=['....000000....','...01111110...','...011111110..','...0222222220.','....0533330...','....0533430...','....05333330..','.....333330...','....066660....','...07766660...','...07763330...','...07763330...','.....88880....','.....88.88....','....88..88....','...000..000...'];
 function rect(c,x,y,w,h,r=5){c.beginPath();c.roundRect(x,y,w,h,r);}
 function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();}
 function character(c,p,x,y,scale=3,time=0){
  const direction=p.dir||{x:0,y:1},horizontal=Math.abs(direction.x)>Math.abs(direction.y),grid=horizontal?side:direction.y<0?back:front,pal=palettes[p.palette||'player'];
  c.save();ellipse(c,x,y+2,scale*5.3,scale*2,'#132e294b');c.translate(Math.round(x),Math.round(y));if(horizontal&&direction.x<0)c.scale(-1,1);
  const bob=p.moving?Math.round(Math.sin(p.stride)*1):0;
  for(let row=0;row<grid.length;row++)for(let col=0;col<grid[row].length;col++){const k=grid[row][col];if(k==='.')continue;const leg=row>12&&p.moving?(col<7?Math.sin(p.stride):Math.sin(p.stride+Math.PI))*1.3:0;c.fillStyle=pal[+k];c.fillRect((col-7)*scale,(row-16)*scale+bob+leg,scale,scale);}
  c.restore();
 }
 class Renderer{
  constructor(canvas,session,images,reduced=false){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.session=session;this.images=images;this.reduced=reduced;this.particles=[];this.rings=[];this.debug=false;this.camera=null;this.resize();}
  resize(){const box=this.canvas.getBoundingClientRect();this.width=box.width;this.height=box.height;this.dpr=Math.min(root.devicePixelRatio||1,2);this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);this.ctx.imageSmoothingEnabled=false;this.updateCamera(1,true);}
  updateCamera(dt,snap=false){const s=this.session,world=s.world,target=E.cameraView(world,{width:this.width,height:this.height},{x:s.player.x,y:s.player.y-48},this.width<681?.9:Math.min(1,Math.max(.78,this.width/1500)));
   if(!this.camera||snap||this.reduced)this.camera=target;else{const a=1-Math.exp(-dt*7);this.camera=E.cameraView(world,{width:this.width,height:this.height},{x:this.camera.x+(target.x-this.camera.x)*a,y:this.camera.y+(target.y-this.camera.y)*a},target.scale);}}
  point(clientX,clientY){const b=this.canvas.getBoundingClientRect();return E.screenToWorld({x:(clientX-b.left)/b.width*this.width,y:(clientY-b.top)/b.height*this.height},this.camera);}
  visible(p,margin=110){const a=E.worldToScreen(p,this.camera);return a.x>-margin&&a.y>-margin&&a.x<this.width+margin&&a.y<this.height+margin;}
  effect(e){
   if(e.type==='enemy-strike'){this.rings.push({...e,life:.32,max:.32,color:'#f78671'});return;}
   if(!Number.isFinite(e.x)||!Number.isFinite(e.y))return;
   if(['hit','hurt'].includes(e.type))this.particles.push({x:e.x,y:e.y-52,vx:0,vy:-45,life:.7,max:.7,text:String(e.amount),color:e.type==='hurt'?'#ff9279':e.color});
   if(['star','loot','relic','break','defeat','heal','camp','rune'].includes(e.type)){
    if(e.type==='heal')this.particles.push({x:e.x,y:e.y-60,vx:0,vy:-35,life:1.2,max:1.2,text:'+50',color:'#c9ffb0'});
    if(!this.reduced)for(let i=0;i<22;i++){const angle=Math.random()*TAU,speed=35+Math.random()*85;this.particles.push({x:e.x,y:e.y-15,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-30,life:.7+Math.random()*.5,max:1.2,color:['#fff3b1','#cfeea0','#9cdde1'][i%3],size:3+Math.random()*3});}
   }
  }
  tick(dt){for(const p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(!p.text)p.vy+=40*dt;}this.particles=this.particles.filter(p=>p.life>0);for(const r of this.rings)r.life-=dt;this.rings=this.rings.filter(r=>r.life>0);this.updateCamera(dt);}
  label(p,text,color='#fffce9',offset=65){const c=this.ctx;c.save();c.font='bold 14px Trebuchet MS, sans-serif';c.textAlign='center';const width=c.measureText(text).width+18;c.fillStyle='#19372eda';rect(c,p.x-width/2,p.y-offset-16,width,24,6);c.fill();c.fillStyle=color;c.fillText(text,p.x,p.y-offset+1);c.restore();}
  star(p,time){const c=this.ctx,y=p.y-19+(this.reduced?0:Math.sin(time*3+p.x)*4);ellipse(c,p.x,p.y,13,5,'#806a3a38');const glow=c.createRadialGradient(p.x,y,2,p.x,y,32);glow.addColorStop(0,'#ffe8968a');glow.addColorStop(1,'#ffe89600');c.fillStyle=glow;c.fillRect(p.x-32,y-32,64,64);c.fillStyle='#fff1a4';c.strokeStyle='#bd9140';c.lineWidth=2;c.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4-Math.PI/2,r=i%2?6:16;const x=p.x+Math.cos(a)*r,yy=y+Math.sin(a)*r;i?c.lineTo(x,yy):c.moveTo(x,yy);}c.closePath();c.fill();c.stroke();}
  portal(p,time){const c=this.ctx;c.save();c.translate(p.x,p.y);ellipse(c,0,4,40,17,'#152b3a88');c.strokeStyle=p.color;c.lineWidth=3;c.beginPath();c.ellipse(0,1,39,17,0,0,TAU);c.stroke();const glow=c.createRadialGradient(0,-35,3,0,-35,61);glow.addColorStop(0,p.color+'80');glow.addColorStop(1,p.color+'00');c.fillStyle=glow;c.fillRect(-65,-98,130,130);c.fillStyle='#36414c';c.fillRect(-32,-59,10,57);c.fillRect(22,-59,10,57);c.fillRect(-23,-72,46,12);c.fillStyle='#66838b';c.fillRect(-30,-59,5,57);c.fillRect(25,-59,5,57);c.strokeStyle=p.color;c.lineWidth=5;c.beginPath();c.ellipse(0,-33,23,34,0,0,TAU);c.stroke();c.lineWidth=2;for(let i=0;i<3;i++){c.globalAlpha=.5;c.beginPath();c.ellipse(0,-33,9+i*5,17+i*5,this.reduced?0:time*.9+i,0,TAU);c.stroke();}c.restore();this.label(p,p.name,p.color,95);}
  prop(p,time){const c=this.ctx,s=this.session;c.save();c.translate(p.x,p.y);ellipse(c,0,3,20,7,'#18312944');
   if(p.kind==='crates'){c.fillStyle='#4c4031';c.fillRect(-17,-31,34,32);c.fillStyle='#aa8252';c.fillRect(-14,-28,28,25);c.fillStyle='#d0a570';c.fillRect(-14,-28,28,4);c.fillRect(-14,-8,28,4);c.fillRect(-14,-28,4,25);c.fillRect(10,-28,4,25);c.strokeStyle='#725a3d';c.lineWidth=4;c.beginPath();c.moveTo(-9,-23);c.lineTo(9,-10);c.stroke();}
   else if(p.kind==='chests'){const open=s.opened.has(p.uid);c.fillStyle='#4b4133';c.fillRect(-21,-24,42,25);c.fillStyle=p.sealed?'#74818b':'#ac7b4c';c.fillRect(-18,-23,36,21);c.fillStyle='#e9c475';c.fillRect(-18,-6,36,3);c.fillRect(-15,-23,4,23);c.fillRect(11,-23,4,23);c.fillStyle=open?'#373c33':'#cb975c';c.fillRect(-17,open?-31:-32,34,open?9:11);c.fillStyle='#f3d387';c.fillRect(-4,-18,8,9);if(p.sealed&&!open){c.fillStyle=s.runeCount()===3?'#c3ffc0':'#b4d6f1';c.font='bold 19px monospace';c.textAlign='center';c.fillText('◇',0,-38);}}
   else if(p.kind==='runes'){c.fillStyle='#475765';c.beginPath();c.moveTo(-13,0);c.lineTo(-16,-30);c.lineTo(-6,-44);c.lineTo(9,-42);c.lineTo(16,-5);c.closePath();c.fill();c.fillStyle='#84949a';c.fillRect(-10,-31,18,29);c.strokeStyle=s.runes.has(p.uid)?'#a5ffdc':'#dce8da';c.lineWidth=3;c.beginPath();c.moveTo(0,-33);c.lineTo(-5,-23);c.lineTo(5,-18);c.lineTo(0,-9);c.stroke();if(s.runes.has(p.uid))ellipse(c,0,-19,3,3,'#e5ffcf');}
   else if(p.kind==='fires'){c.strokeStyle='#4c3e2d';c.lineWidth=7;c.beginPath();c.moveTo(-18,-1);c.lineTo(16,-10);c.moveTo(-16,-10);c.lineTo(18,-1);c.stroke();const flick=this.reduced?0:Math.sin(time*11+p.x)*3;c.fillStyle='#ec8f51';c.beginPath();c.moveTo(-15,-6);c.lineTo(-8,-26+flick);c.lineTo(-3,-20);c.lineTo(3,-39-flick);c.lineTo(15,-7);c.closePath();c.fill();c.fillStyle='#ffdc83';c.beginPath();c.moveTo(-7,-6);c.lineTo(2,-25);c.lineTo(8,-6);c.fill();}
   else if(p.kind==='dummies'){c.fillStyle='#806448';c.fillRect(-4,-43,8,45);c.fillRect(-26,-35,52,7);c.fillStyle='#c9aa70';c.fillRect(-13,-43,26,24);c.fillRect(-10,-59,20,17);c.strokeStyle='#846339';c.lineWidth=2;c.beginPath();c.moveTo(-10,-38);c.lineTo(10,-24);c.moveTo(10,-38);c.lineTo(-10,-24);c.stroke();}
   c.restore();
  }
  enemy(p,time){const c=this.ctx;c.save();c.translate(p.x,p.y);const bob=this.reduced?0:Math.sin(time*4+p.x)*3,flash=p.flash>0;c.fillStyle=flash?'#fff9d6':p.color;
   if(p.boss){ellipse(c,0,5,37,13,'#1b292b66');c.fillStyle=flash?'#fff9d6':'#344e45';c.fillRect(-31,-50,62,45);c.fillRect(-25,-7,18,11);c.fillRect(7,-7,18,11);c.fillStyle=flash?'#fff9d6':p.color;c.fillRect(-25,-77+bob,50,30);c.fillRect(-20,-47+bob,40,38);c.fillRect(-42,-47+bob,16,32);c.fillRect(26,-47+bob,16,32);c.fillStyle=p.type==='warden'?'#673e34':'#477758';c.fillRect(-29,-91+bob,12,20);c.fillRect(17,-91+bob,12,20);c.fillRect(-10,-92+bob,20,13);c.fillStyle='#203c3d';c.fillRect(-15,-67+bob,10,7);c.fillRect(5,-67+bob,10,7);c.fillStyle='#fff0a5';c.fillRect(-3,-39+bob,6,15);}
   else if(p.type.includes('wisp')){ellipse(c,0,3,17,6,'#132b343d');c.fillStyle=flash?'#fff9d6':p.color;const y=-33+bob;c.fillRect(-12,y-17,24,9);c.fillRect(-19,y-8,38,24);c.fillRect(-12,y+16,24,8);c.fillRect(-6,y+24,12,5);c.fillStyle='#f2ffed';c.fillRect(-9,y-2,5,7);c.fillRect(5,y-2,5,7);}
   else{ellipse(c,0,4,22,8,'#142c354d');c.fillStyle=flash?'#fff9d6':p.color;c.fillRect(-24,-23+bob,48,19);c.fillRect(-18,-34+bob,36,12);c.fillRect(-13,-40+bob,26,7);c.fillStyle='#345346';c.fillRect(-11,-20+bob,5,6);c.fillRect(7,-20+bob,5,6);c.fillStyle='#edffe6';c.fillRect(-12,-31+bob,11,4);}
   c.restore();if(p.hp<p.maxHp&&!p.boss){c.fillStyle='#263d35';c.fillRect(p.x-23,p.y-54,46,5);c.fillStyle=p.color;c.fillRect(p.x-22,p.y-53,44*p.hp/p.maxHp,3);}
  }
  render(){const c=this.ctx,s=this.session,w=s.world,p=s.player,time=s.time,cam=this.camera;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#183b30';c.fillRect(0,0,this.width,this.height);c.save();c.translate(this.width/2,this.height/2);c.scale(cam.scale,cam.scale);c.translate(-cam.x,-cam.y);c.drawImage(this.images[w.id],0,0,w.width,w.height);
   if(this.debug){c.fillStyle='#2fffff58';for(let i=0;i<s.nav.mask.length;i++)if(s.nav.mask[i]){const a=s.nav.position(i);if(this.visible(a,0))c.fillRect(a.x-4,a.y-4,8,8);}}
   if(s.route.length){c.save();c.strokeStyle='#fff7cbaa';c.lineWidth=2;c.setLineDash([4,9]);c.lineDashOffset=this.reduced?0:-time*14;c.beginPath();c.moveTo(p.x,p.y);for(const a of s.route)c.lineTo(a.x,a.y);c.stroke();c.restore();const a=s.route.at(-1);c.strokeStyle='#fff1bd';c.lineWidth=2;c.beginPath();c.ellipse(a.x,a.y,11,6,0,0,TAU);c.stroke();}
   for(const e of s.enemies)if(e.hp>0&&e.phase==='windup'&&this.visible(e,220)){const t=1-e.timer/e.windup;c.fillStyle='#dd584830';c.strokeStyle='#ff9e85';c.lineWidth=3;c.beginPath();c.arc(e.x,e.y,e.range,0,TAU);c.fill();c.stroke();c.fillStyle='#ff9e8533';c.beginPath();c.moveTo(e.x,e.y);c.arc(e.x,e.y,e.range,-Math.PI/2,-Math.PI/2+TAU*t);c.closePath();c.fill();}
   for(const ring of this.rings){c.globalAlpha=ring.life/ring.max;c.strokeStyle=ring.color;c.lineWidth=5;c.beginPath();c.arc(ring.x,ring.y,ring.radius*(1-ring.life/ring.max*.15),0,TAU);c.stroke();}c.globalAlpha=1;
   for(const star of w.stars)if(!s.collected.has(star.id)&&this.visible(star))this.star(star,time);
   const actors=[...w.npcs,...w.portals,...w.fires,...w.chests,...w.runes,...w.dummies,...w.crates.filter(a=>!s.destroyed.has(a.uid)),...s.enemies.filter(a=>a.hp>0),{...p,kind:'player',palette:'player'}].sort((a,b)=>a.y-b.y);
   for(const a of actors){if(!this.visible(a))continue;
    if(a.kind==='npcs'){character(c,a,a.x,a.y,3,time);if(E.distance(a,p)<340)this.label(a,a.name+(s.visited.has(a.uid)?' · ✓':' · ···'));}
    else if(a.kind==='player'){c.save();if(a.invuln>0&&!this.reduced)c.globalAlpha=.62+Math.sin(time*22)*.22;if(a.dashTime>0){c.globalAlpha=.25;character(c,a,a.x-a.dir.x*28,a.y-a.dir.y*28,3,time);c.globalAlpha=.65;}character(c,a,a.x,a.y,3,time);c.restore();c.strokeStyle='#fff4bfc0';c.lineWidth=2;c.beginPath();c.ellipse(a.x,a.y+3,19,7,0,0,TAU);c.stroke();if(a.attackTime>0){const angle=Math.atan2(a.dir.y,a.dir.x),progress=1-a.attackTime/.23;c.save();c.translate(a.x,a.y-18);c.rotate(angle);c.strokeStyle='#fff6c9e8';c.lineWidth=12;c.beginPath();c.arc(0,0,57,-1.35,1.1*progress+.1);c.stroke();c.strokeStyle='#deac61';c.lineWidth=3;c.beginPath();c.arc(0,0,67,-1.35,1.1*progress+.1);c.stroke();c.restore();}}
    else if(a.kind==='portals')this.portal(a,time);else if(a.kind==='enemies')this.enemy(a,time);else this.prop(a,time);
   }
   if(s.won&&w.id==='sunhaven'){const glow=c.createRadialGradient(2576,1164,10,2576,1164,180);glow.addColorStop(0,'#fff0ae9a');glow.addColorStop(1,'#fff0ae00');c.fillStyle=glow;c.fillRect(2396,984,360,360);}
   for(const a of this.particles){c.globalAlpha=Math.min(1,a.life/a.max);c.fillStyle=a.color;if(a.text){c.font='bold 22px monospace';c.textAlign='center';c.strokeStyle='#283c33';c.lineWidth=3;c.strokeText(a.text,a.x,a.y);c.fillText(a.text,a.x,a.y);}else c.fillRect(a.x,a.y,a.size,a.size);}c.globalAlpha=1;c.restore();
   if(this.debug){c.fillStyle='#17372f';c.fillRect(this.width/2-180,this.height-38,360,24);c.fillStyle='#edffe1';c.font='12px monospace';c.textAlign='center';c.fillText(`F3 · collision grid · ${Math.round(p.x)}, ${Math.round(p.y)}`,this.width/2,this.height-22);}
  }
  overview(c,width,height,id=this.session.worldId,labels=false){const s=this.session,w=s.worlds[id],sx=width/w.width,sy=height/w.height;c.clearRect(0,0,width,height);c.drawImage(this.images[id],0,0,width,height);const dot=(o,color,r)=>{c.fillStyle=color;c.strokeStyle='#213f36';c.lineWidth=labels?2:1;c.beginPath();c.arc(o.x*sx,o.y*sy,r,0,TAU);c.fill();c.stroke();};
   for(const o of w.npcs)dot(o,'#f4ffe0',labels?6:2);
   for(const o of w.fires)dot(o,'#f4b777',labels?5:1.5);
   for(const o of w.runes)dot(o,s.runes.has(o.uid)?'#a5ffd1':'#c4c6de',labels?4:1.5);
   for(const o of w.stars)if(!s.collected.has(o.id))dot(o,'#ffe27f',labels?6:2.5);
   for(const o of w.portals){dot(o,o.color,labels?9:3);if(labels){c.font='bold 17px Trebuchet MS, sans-serif';c.textAlign='center';const x=o.x*sx,y=o.y*sy;const tw=c.measureText(o.name).width+14;c.fillStyle='#183b30dc';rect(c,x-tw/2,y-35,tw,24,4);c.fill();c.fillStyle='#fffbe6';c.fillText(o.name,x,y-18);}}
   for(const o of w.enemies)if(o.boss&&!s.defeated.has(o.uid)){dot(o,'#eb8677',labels?10:3);if(labels){c.fillStyle='#fff';c.font='bold 16px sans-serif';c.textAlign='center';c.fillText('GUARDIAN',o.x*sx,o.y*sy-19);}}
   if(id===s.worldId){if(!labels){const cam=this.camera;c.strokeStyle='#ffffdf85';c.lineWidth=1;c.strokeRect((cam.x-cam.width/cam.scale/2)*sx,(cam.y-cam.height/cam.scale/2)*sy,cam.width/cam.scale*sx,cam.height/cam.scale*sy);}dot(s.player,'#fff7c7',labels?9:4);c.strokeStyle='#a56234';c.lineWidth=2;c.beginPath();c.arc(s.player.x*sx,s.player.y*sy,labels?11:5,0,TAU);c.stroke();}
  }
 }
 Renderer.character=character;root.PixelRenderer=Renderer;
})(window);

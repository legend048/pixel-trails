/* Small, dependency-free movement and navigation engine.
   Kept independent of rendering so collisions, saves and routes can be tested. */
(function (root) {
  'use strict';
  const clamp = (n,a,b) => Math.min(b,Math.max(a,n));
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  function segmentDistance(x,y,a,b) {
    const dx=b[0]-a[0],dy=b[1]-a[1];
    const t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1),0,1);
    return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);
  }
  function inPolygon(x,y,polygon) {
    let inside=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
      const a=polygon[i],b=polygon[j];
      if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
    }
    return inside;
  }
  class Navigator {
    constructor(world) {
      this.world=world; this.cell=world.grid;
      this.cols=Math.ceil(world.width/this.cell);this.rows=Math.ceil(world.height/this.cell);
      this.mask=new Uint8Array(this.cols*this.rows);
      for(let gy=0;gy<this.rows;gy++) for(let gx=0;gx<this.cols;gx++) {
        const p=this.position(gx+gy*this.cols);
        this.mask[gx+gy*this.cols]=this.walkable(p.x,p.y)?1:0;
      }
    }
    walkable(x,y) {
      const w=this.world;
      if(x<40||x>w.width-40||y<40||y>890) return false;
      for(const o of w.obstacles) {
        if(o.type==='circle'&&Math.hypot(x-o.x,y-o.y)<o.r+4) return false;
        if(o.type==='rect'&&x>o.x-4&&x<o.x+o.w+4&&y>o.y-4&&y<o.y+o.h+4) return false;
      }
      for(const p of w.plazas) if(inPolygon(x,y,p)) return true;
      for(const path of w.paths) for(let i=1;i<path.points.length;i++) {
        if(segmentDistance(x,y,path.points[i-1],path.points[i])<=path.width/2-4) return true;
      }
      return false;
    }
    position(id) {return {x:(id%this.cols+.5)*this.cell,y:(Math.floor(id/this.cols)+.5)*this.cell};}
    closest(x,y) {
      let best=-1,score=Infinity;
      for(let i=0;i<this.mask.length;i++) if(this.mask[i]) {
        const p=this.position(i),d=(x-p.x)**2+(y-p.y)**2;
        if(d<score){best=i;score=d;}
      }
      return best;
    }
    clearLine(a,b) {
      const length=distance(a,b),steps=Math.max(1,Math.ceil(length/.5));
      for(let i=0;i<=steps;i++) if(!this.walkable(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps)) return false;
      return true;
    }
    route(from,to) {
      const start=this.closest(from.x,from.y),end=this.closest(to.x,to.y);
      if(start<0||end<0) return [];
      if(start===end) return [this.position(end)];
      const n=this.mask.length,g=new Float64Array(n).fill(Infinity),parent=new Int32Array(n).fill(-1),closed=new Uint8Array(n);
      const goal=this.position(end),open=[start];g[start]=0;
      const heuristic=id=>distance(this.position(id),goal)/this.cell;
      const dirs=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
      let found=false;
      while(open.length) {
        let bi=0;
        for(let i=1;i<open.length;i++) if(g[open[i]]+heuristic(open[i])<g[open[bi]]+heuristic(open[bi])) bi=i;
        const id=open.splice(bi,1)[0];
        if(closed[id]) continue;
        if(id===end){found=true;break;}
        closed[id]=1;
        const cx=id%this.cols,cy=Math.floor(id/this.cols);
        for(const [dx,dy] of dirs) {
          const nx=cx+dx,ny=cy+dy,next=nx+ny*this.cols;
          if(nx<0||ny<0||nx>=this.cols||ny>=this.rows||!this.mask[next]||closed[next]) continue;
          // Do not cut diagonally through corners or narrow obstacles.
          if(dx&&dy&&(!this.mask[cx+dx+cy*this.cols]||!this.mask[cx+(cy+dy)*this.cols])) continue;
          if(!this.clearLine(this.position(id),this.position(next))) continue;
          const score=g[id]+(dx&&dy?Math.SQRT2:1);
          if(score<g[next]) {g[next]=score;parent[next]=id;open.push(next);}
        }
      }
      if(!found) return [];
      const points=[];
      for(let id=end;id!==start;id=parent[id]) {if(id<0)return [];points.unshift(this.position(id));}
      // String-pull the grid route while preserving true walkability.
      const smooth=[];let anchor=from,index=0;
      while(index<points.length) {
        let far=index;
        while(far+1<points.length&&this.clearLine(anchor,points[far+1])) far++;
        smooth.push(points[far]);anchor=points[far];index=far+1;
      }
      return smooth;
    }
    move(player,dx,dy) {
      // Substeps stop tunnelling, including when a background tab resumes.
      const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/3));
      const before={x:player.x,y:player.y};
      for(let i=0;i<steps;i++) {
        const sx=dx/steps,sy=dy/steps;
        // Prefer the requested vector. Axis-only sliding can stick at a
        // concave corner even when the diagonal route itself is clear.
        if(this.walkable(player.x+sx,player.y+sy)) {player.x+=sx;player.y+=sy;}
        else {
          if(this.walkable(player.x+sx,player.y))player.x+=sx;
          if(this.walkable(player.x,player.y+sy))player.y+=sy;
        }
      }
      return distance(before,player);
    }
  }
  function validateSave(value,world,navigator) {
    const base={x:world.spawn.x,y:world.spawn.y,collected:[],visited:[],won:false,seconds:0,sound:false};
    if(!value||value.version!==1) return base;
    if(Number.isFinite(value.x)&&Number.isFinite(value.y)&&navigator.walkable(value.x,value.y)){base.x=value.x;base.y=value.y;}
    base.collected=Array.isArray(value.collected)?[...new Set(value.collected.filter(id=>world.stars.some(s=>s.id===id)))]:[];
    base.visited=Array.isArray(value.visited)?[...new Set(value.visited.filter(id=>world.locations.some(s=>s.id===id)))]:[];
    base.won=value.won===true&&base.collected.length===world.stars.length;
    base.seconds=Number.isFinite(value.seconds)?clamp(value.seconds,0,360000):0;
    base.sound=value.sound===true;
    return base;
  }
  const api={Navigator,validateSave,clamp,distance,inPolygon};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PixelEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);

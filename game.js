/* Pixel Trails — rendering, input, dialogue and the lighthouse quest.
   Vanilla JavaScript + Canvas 2D. No network calls or external dependencies. */
(function () {
  'use strict';
  const W=window.PIXEL_WORLD, E=window.PixelEngine;
  const $=id=>document.getElementById(id);
  const canvas=$('world'), ctx=canvas.getContext('2d',{alpha:false});
  const mini=$('minimap'), mctx=mini.getContext('2d');
  const dialog=$('dialog'), content=$('dialog-content');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!ctx||!mctx){$('loading-note').textContent='Canvas is unavailable. Please try a current browser.';return;}
  const nav=new E.Navigator(W);
  let saved=null,storageAvailable=true;
  try {saved=JSON.parse(localStorage.getItem(W.storageKey)||'null');}catch {storageAvailable=false;}
  const state=E.validateSave(saved,W,nav);
  const player={x:state.x,y:state.y,dir:'down',stride:0,moving:false,palette:'player'};
  let collected=new Set(state.collected),visited=new Set(state.visited),won=state.won;
  let seconds=state.seconds,sound=state.sound,audioCtx=null,stepTimer=0;
  let loaded=false,last=0,time=0,saveClock=0,miniClock=0,frameId=0;
  let cw=window.innerWidth,ch=window.innerHeight,scale=1;
  let camera={x:player.x,y:player.y};
  let keys=new Set(),touchKeys=new Set(),touchRun=false,route=[],destination=null,autoTalk=null;
  let nearest=null,lastNearest='',lastZone='',lastWalkToast=0,toastTimer=0,welcomeClosed=!!saved;
  let previousFocus=null,dialogueIndex=0,dialoguePerson=null,particles=[],confettiUntil=0;
  const map=new Image();

  const palette={
    player:['#263d36','#dc7951','#f4ac73','#f8cb98','#353838','#bd7755','#517f77','#d9a04c','#293e53'],
    green:['#273d36','#6b9050','#a2b978','#f0c897','#383938','#b07c52','#739150','#c3a264','#334f3a'],
    rose:['#403a3c','#aa6262','#d49c86','#edc5a7','#3a333d','#b57860','#aa6c70','#ead49a','#424b5b'],
    blue:['#283a43','#527493','#8ab1bf','#edc7a0','#33373c','#b57955','#577f9c','#eccd8b','#334858'],
    purple:['#3a344d','#8974a4','#b7a1c4','#edc9ad','#39353f','#bd8a75','#9984b1','#e5dbae','#444157'],
    orange:['#463a34','#b67843','#e6ad63','#e5b58b','#333533','#a77852','#aa784b','#a9b27a','#46513c'],
    teal:['#2c3f38','#5b9185','#9fc6a8','#edc6a4','#363b35','#b27c57','#658f79','#e1c786','#345554'],
    gold:['#453e33','#c28c4f','#ead198','#e5b68d','#36352f','#b78364','#c59a63','#8b9c71','#4b574c']
  };
  const front=[
    '....000000....','...01111110...','..0111111110..','..0222222220..',
    '...03333330...','...03433430...','...03353330...','....333333....',
    '...06666660...','..0666776660..','.330667766033.','.330666666033.',
    '....888888....','....88..88....','....88..88....','...000..000...'
  ];
  const back=[
    '....000000....','...01111110...','..0111111110..','..0222222220..',
    '...05555550...','...05555550...','...05555550...','....333333....',
    '...06666660...','..0667777660..','.330677776033.','.330677776033.',
    '....888888....','....88..88....','....88..88....','...000..000...'
  ];
  const side=[
    '....000000....','...01111110...','...011111110..','...0222222220.',
    '....0533330...','....0533430...','....05333330..','.....333330...',
    '....066660....','...07766660...','...07763330...','...07763330...',
    '.....88880....','.....88.88....','....88..88....','...000..000...'
  ];
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function resize() {
    cw=window.innerWidth;ch=window.innerHeight;
    const dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(cw*dpr);canvas.height=Math.round(ch*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;
    // Keep the character readable on a phone, and show more world on a desktop.
    scale=cw<681?1.5:Math.max(1.08,Math.min(1.52,cw/1100));
    updateCamera(1,true);
  }
  function cameraTarget() {
    const halfX=cw/(2*scale),halfY=ch/(2*scale);
    return {x:halfX>=W.width/2?W.width/2:E.clamp(player.x,halfX,W.width-halfX),
      y:halfY>=W.height/2?W.height/2:E.clamp(player.y-30,halfY,W.height-halfY)};
  }
  function updateCamera(dt,snap=false) {
    const target=cameraTarget(),a=snap||reduced?1:1-Math.exp(-dt*7);
    camera.x+=(target.x-camera.x)*a;camera.y+=(target.y-camera.y)*a;
  }
  function worldAt(clientX,clientY) {const box=canvas.getBoundingClientRect();return{x:(clientX-box.left-cw/2)/scale+camera.x,y:(clientY-box.top-ch/2)/scale+camera.y};}
  function screenAt(x,y) {return{x:(x-camera.x)*scale+cw/2,y:(y-camera.y)*scale+ch/2};}
  function visible(x,y,margin=90){const p=screenAt(x,y);return p.x>-margin&&p.y>-margin&&p.x<cw+margin&&p.y<ch+margin;}
  function save() {
    if(!storageAvailable)return;
    try {localStorage.setItem(W.storageKey,JSON.stringify({version:1,x:player.x,y:player.y,collected:[...collected],visited:[...visited],won,seconds,sound}));}
    catch {storageAvailable=false;}
  }
  function announce(message){$('live-status').textContent=message;}
  function toast(message) {
    clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;
    announce(message);toastTimer=setTimeout(()=>{$('toast').hidden=true;},3500);
  }
  function dismissWelcome(){welcomeClosed=true;$('welcome').hidden=true;}
  function soundIcon() {
    $('sound-button').setAttribute('aria-pressed',String(sound));
    $('sound-button').setAttribute('aria-label',sound?'Turn sound off':'Turn sound on');
    $('sound-button').title=sound?'Sound on':'Sound off';
    $('sound-icon').innerHTML=sound?'<path d="M11 4 6 8H3v8h3l5 4zM16 8c3 2 3 6 0 8M19 4c6 4 6 12 0 16"/>':'<path d="M11 4 6 8H3v8h3l5 4zM16 9l6 6M22 9l-6 6"/>';
  }
  async function unlockAudio() {
    if(!sound)return;
    try {const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;if(!audioCtx)audioCtx=new Audio();if(audioCtx.state==='suspended')await audioCtx.resume();}catch {sound=false;soundIcon();}
  }
  function note(freq,duration=.12,delay=0,volume=.035,type='sine') {
    if(!sound||!audioCtx||audioCtx.state!=='running')return;
    const at=audioCtx.currentTime+delay,osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
    osc.type=type;osc.frequency.setValueAtTime(freq,at);
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    osc.connect(gain);gain.connect(audioCtx.destination);osc.start(at);osc.stop(at+duration+.03);
    osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  function chime(){[523.25,659.25,783.99,1046.5].forEach((f,i)=>note(f,.26,i*.085,.04,'triangle'));}
  function burst(x,y,count=20,colors=['#ffe38b','#fffde7','#cce790']) {
    if(reduced)return;
    for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,v=22+Math.random()*66;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-20,life:.6+Math.random()*.7,max:1.3,color:colors[i%colors.length],size:2+Math.random()*3});}
  }
  function updateHud() {
    const n=collected.size;
    $('star-count').textContent=n+' / '+W.stars.length;
    [...$('stars').children].forEach((s,i)=>{s.classList.toggle('found',i<n);s.textContent=i<n?'✦':'✧';});
    $('progress-fill').style.width=(n/W.stars.length*100)+'%';
    document.querySelector('.progress-track').setAttribute('aria-valuenow',String(n));
    $('visited-count').textContent=visited.size+'/'+W.locations.length;
    if(won){$('quest-heading').textContent='The light lives on.';$('quest-copy').textContent='Quest complete. Keep wandering.';}
    else if(n===W.stars.length){$('quest-heading').textContent='The coast is waiting.';$('quest-copy').textContent='Bring the stars to Sol at the lighthouse.';}
    else {$('quest-heading').textContent='Bring back the light.';$('quest-copy').textContent='Five lost stars. One little island.';}
  }
  function checkCollectibles() {
    for(const star of W.stars) if(!collected.has(star.id)&&E.distance(player,star)<22) {
      collected.add(star.id);burst(star.x,star.y-10,26);chime();updateHud();save();
      toast(collected.size===W.stars.length?'All five stars! Bring them to Sol at the lighthouse.':'✦ '+star.name+' found · '+collected.size+' of '+W.stars.length);
    }
  }
  function updateNearest() {
    let candidate=null,best=62;
    for(const npc of [W.guide,...W.locations]){const d=E.distance(player,npc);if(d<best){candidate=npc;best=d;}}
    nearest=candidate;
    const key=candidate?.id||'';
    if(key!==lastNearest){lastNearest=key;$('interact-wrap').hidden=!candidate;
      if(candidate){$('interact-label').textContent=candidate.id==='lighthouse'&&collected.size===W.stars.length&&!won?'Restore the lighthouse':'Talk to '+candidate.resident;announce('Nearby: '+candidate.resident+'. Press E to talk.');}}
    let zone='Sunhaven Square';
    if(player.x>1170) zone=player.y<360?'Starwatch Hill':player.y>580?'Lighthouse Point':'Across the River';
    else if(player.x>971)zone='Willow Bridge';
    else if(player.y>785)zone='The Quiet Coast';
    else if(player.y>570)zone=player.x<480?'The Campsite':'The Library Path';
    else if(player.y<315)zone=player.x<540?'The Old Trail':'The Workshop';
    if(zone!==lastZone){lastZone=zone;$('location-name').textContent=zone;}
  }
  function walkTo(target,npc=null) {
    if(!loaded)return;
    const path=nav.route(player,target);
    if(!path.length){toast('That spot is out of reach. Try a sandy path.');return;}
    route=path;destination=path[path.length-1];autoTalk=npc;dismissWelcome();
    if(E.distance(destination,target)>55)toast('Following the nearest path.');
    canvas.focus({preventScroll:true});
  }
  function clearInput(){keys.clear();touchKeys.clear();player.moving=false;document.querySelectorAll('.dpad button').forEach(b=>b.classList.remove('pressed'));}
  function openDialog(eyebrow,html,isMap=false) {
    clearInput();previousFocus=document.activeElement;
    $('dialog-eyebrow').textContent=eyebrow;content.innerHTML=html;dialog.classList.toggle('map-dialog',isMap);
    if(!dialog.open)dialog.showModal();
    dialog.scrollTop=0;
    content.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',closeDialog));
  }
  function closeDialog(){dialog.close();clearInput();dialoguePerson=null;previousFocus?.focus?.({preventScroll:true});}
  function portrait(person) {
    const p=$('portrait');if(!p)return;
    const c=p.getContext('2d');c.imageSmoothingEnabled=false;
    drawCharacter(c,{...person,dir:'down',moving:false,stride:0},34,57,3);
  }
  function talk(person) {
    if(!person||!loaded)return;
    route=[];destination=null;autoTalk=null;dismissWelcome();
    if(person.id==='lighthouse'&&collected.size===W.stars.length&&!won){win();return;}
    if(person.id!=='guide'){visited.add(person.id);updateHud();save();}
    dialoguePerson=person;dialogueIndex=0;drawDialogue();note(440,.09,0,.02,'triangle');
  }
  function drawDialogue() {
    const p=dialoguePerson;if(!p)return;
    const lines=(p.id==='lighthouse'&&won)?['Look at that light. You did it! The coast is glowing again.','There’s no rush to leave. The paths, the people, the sea — they’re all still here. Enjoy the rest of your adventure.']:p.lines;
    const end=dialogueIndex===lines.length-1;
    openDialog(p.name==='Pip'?'SUNHAVEN WELCOMING COMMITTEE':p.name,
      '<canvas id="portrait" class="portrait" width="68" height="68" aria-hidden="true"></canvas><div class="dialog-character">'+escapeHtml(p.role)+'</div><h2 id="dialog-title">'+escapeHtml(p.resident)+'</h2><div class="dialog-copy"><p>'+escapeHtml(lines[dialogueIndex])+'</p></div><div class="dialog-actions"><button id="dialogue-next" class="primary-button">'+(end?'Back to exploring':'Keep talking <span aria-hidden="true">→</span>')+'</button>'+(end&&p.link?'<a class="secondary-button" href="'+escapeHtml(p.link.url)+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(p.link.label)+' ↗</a>':'')+'</div><p class="subtle">'+(dialogueIndex+1)+' / '+lines.length+' · Esc to close</p>');
    portrait(p);
    $('dialogue-next').addEventListener('click',()=>{if(end)closeDialog();else{dialogueIndex++;drawDialogue();}});
    $('dialogue-next').focus();
  }
  function openMap() {
    if(!loaded)return;
    openDialog('EVERY PATH LEADS SOMEWHERE','<h2 id="dialog-title">A little world, all yours.</h2><canvas id="full-map" width="1536" height="1024" aria-label="Island map. Click a destination to walk there. Use the journal for keyboard-accessible destination buttons."></canvas><div class="map-legend"><span><i style="background:#f1c45a"></i>You</span><span><i style="background:#f8ffdb;border:1px solid #85926c"></i>People to meet</span><span><i style="background:#e9bd4a"></i>Nearby stars</span></div><p class="map-note">Click a path to walk there. The game pauses while you look around. For keyboard navigation, choose a destination in your journal.</p><div class="dialog-actions"><button id="map-journal" class="secondary-button">Open journal</button><button class="primary-button" data-close>Back to the island</button></div>',true);
    const full=$('full-map');drawOverview(full.getContext('2d'),full.width,full.height,true);
    full.addEventListener('click',event=>{const b=full.getBoundingClientRect(),p={x:(event.clientX-b.left)/b.width*W.width,y:(event.clientY-b.top)/b.height*W.height};closeDialog();walkTo(p);});
    $('map-journal').addEventListener('click',openJournal);
  }
  function openJournal() {
    if(!loaded)return;
    const rows=W.locations.map((p,i)=>'<div class="journal-entry '+(visited.has(p.id)?'visited':'')+'"><span class="journal-number">'+(visited.has(p.id)?'✓':String(i+1).padStart(2,'0'))+'</span><div class="journal-info"><h3>'+escapeHtml(p.name)+'</h3><p>'+escapeHtml(visited.has(p.id)?p.journal:p.subtitle)+'</p></div><button data-go="'+p.id+'" aria-label="Walk to '+escapeHtml(p.name)+'">Visit ↗</button></div>').join('');
    const next=W.stars.find(s=>!collected.has(s.id));
    openDialog('THE EXPLORER’S JOURNAL','<h2 id="dialog-title">Little places. Good stories.</h2><p class="dialog-copy">'+visited.size+' of '+W.locations.length+' places discovered · '+collected.size+' of '+W.stars.length+' stars collected</p><div class="journal-list">'+rows+'</div><div class="help-note">'+(next?'<strong>A clue for your next star</strong><br>'+escapeHtml(next.hint):won?'The lighthouse is shining. Your story here isn’t over — keep exploring.':'All five stars are yours. Visit Sol at the lighthouse to finish the quest.')+'</div><div class="dialog-actions"><button class="primary-button" data-close>Keep exploring</button></div>');
    content.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{const p=W.locations.find(x=>x.id===b.dataset.go);closeDialog();walkTo({x:p.x+22,y:p.y+16},p);}));
  }
  function openHelp() {
    openDialog('MAKE YOURSELF AT HOME','<h2 id="dialog-title">A few small pointers.</h2><p class="dialog-copy">Find five star fragments, then talk to Sol at the lighthouse. Walk over a glowing star to collect it.</p><div class="help-list"><div class="help-row"><span>Move around</span><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrows</span></div><div class="help-row"><span>Pick a destination</span><span>Click or tap the world</span></div><div class="help-row"><span>Run a little faster</span><kbd>Shift</kbd></div><div class="help-row"><span>Talk to someone</span><kbd>E</kbd></div><div class="help-row"><span>Open the map</span><kbd>M</kbd></div><div class="help-row"><span>Read your journal</span><kbd>J</kbd></div><div class="help-row"><span>Pause / close a panel</span><kbd>Esc</kbd></div></div><div class="help-note">On a phone, use the direction pad or tap a destination. Tap the talk prompt near a character. Your progress saves on this device when browser storage is available.</div><div class="dialog-actions"><button class="primary-button" data-close>Let’s wander <span aria-hidden="true">→</span></button></div>');
  }
  function openPause() {
    if(!loaded)return;
    openDialog('TAKE A BREATHER','<h2 id="dialog-title">The island can wait.</h2><p class="dialog-copy">Your adventure is paused.</p><div class="pause-options"><button class="primary-button" data-close>Back to the island</button><button id="pause-help" class="secondary-button">How to play</button><button id="pause-restart" class="danger-button">Start a new adventure</button></div><p class="subtle">'+(storageAvailable?'Progress is saved in this browser, on this device.':'Browser storage is unavailable. This adventure will last until you close the page.')+'</p>');
    $('pause-help').addEventListener('click',openHelp);$('pause-restart').addEventListener('click',confirmRestart);save();
  }
  function confirmRestart() {
    openDialog('A FRESH CHAPTER','<h2 id="dialog-title">Start from the beginning?</h2><p class="dialog-copy">This resets your collected stars, discoveries and lighthouse progress on this device.</p><div class="dialog-actions"><button id="restart-confirm" class="primary-button">Start a new adventure</button><button class="secondary-button" data-close>Keep my adventure</button></div>');
    $('restart-confirm').addEventListener('click',()=>{
      collected.clear();visited.clear();won=false;seconds=0;player.x=W.spawn.x;player.y=W.spawn.y;player.dir='down';route=[];destination=null;autoTalk=null;particles=[];confettiUntil=0;
      closeDialog();dismissWelcome();updateCamera(1,true);updateHud();lastNearest='';updateNearest();save();toast('A fresh little adventure. Welcome back.');
    });
  }
  function duration(s){const m=Math.floor(s/60),sec=Math.floor(s%60);return m+':'+String(sec).padStart(2,'0');}
  function win() {
    won=true;visited.add('lighthouse');route=[];destination=null;autoTalk=null;updateHud();save();
    confettiUntil=time+12;burst(1287,580,65,['#ffe38b','#fffaf0','#bbdda0','#e8a782']);
    [523.25,659.25,783.99,1046.5,1318.5].forEach((f,i)=>note(f,.55,i*.13,.045,'triangle'));
    openDialog('QUEST COMPLETE','<div class="win-icon" aria-hidden="true">✦</div><h2 id="dialog-title">You made the world<br>a little brighter.</h2><p class="dialog-copy">Five tiny stars. One big difference. The Sunhaven lighthouse shines again — thanks to you.</p><div class="stats"><div class="stat"><strong>5 / 5</strong><span>Stars found</span></div><div class="stat"><strong>'+visited.size+' / 6</strong><span>Places discovered</span></div><div class="stat"><strong>'+duration(seconds)+'</strong><span>Time exploring</span></div></div><div class="dialog-actions"><button class="primary-button" data-close>Stay a little longer</button><button id="win-journal" class="secondary-button">My journal</button></div>');
    $('win-journal').addEventListener('click',openJournal);announce('Quest complete! You restored the lighthouse.');
  }
  function roundRect(c,x,y,w,h,r) {
    c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();
  }
  function drawCharacter(c,person,x,y,s=2) {
    const colors=palette[person.palette]||palette.green;
    const pixels=person.dir==='up'?back:(person.dir==='left'||person.dir==='right'?side:front);
    const bob=person.moving&&!reduced?Math.sin(person.stride*2)*.65:0;
    c.save();c.translate(Math.round(x),Math.round(y));
    c.fillStyle='#183c353e';c.beginPath();c.ellipse(0,1,10*s/2,3*s/2,0,0,Math.PI*2);c.fill();
    if(person.dir==='left')c.scale(-1,1);
    c.translate(-7*s,-16*s+bob);
    for(let row=0;row<pixels.length;row++) for(let col=0;col<pixels[row].length;col++) {
      const value=pixels[row][col];if(value==='.')continue;
      const leg=row>=13&&person.moving&&!reduced?Math.round(Math.sin(person.stride)*(col<7?1:-1)):0;
      c.fillStyle=colors[Number(value)];c.fillRect(col*s,(row+leg)*s,s,s);
    }
    c.restore();
  }
  function drawStar(c,x,y,size,t,alpha=1) {
    c.save();c.globalAlpha=alpha;
    const bob=reduced?0:Math.sin(t*2.5)*3;
    c.fillStyle='#55481b26';c.beginPath();c.ellipse(x,y+8,size*.8,3,0,0,Math.PI*2);c.fill();
    const glow=c.createRadialGradient(x,y+bob,0,x,y+bob,size*2.6);glow.addColorStop(0,'#fff8c489');glow.addColorStop(1,'#ffdd7a00');
    c.fillStyle=glow;c.fillRect(x-size*3,y-size*3,6*size,6*size);
    c.translate(x,y+bob);c.fillStyle='#916e29';
    c.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4-Math.PI/2,r=i%2?size*.35:size;const px=Math.cos(a)*r,py=Math.sin(a)*r;if(i)c.lineTo(px,py);else c.moveTo(px,py);}c.closePath();c.lineWidth=3;c.strokeStyle='#ab8235';c.stroke();c.fillStyle='#ffe697';c.fill();
    c.fillStyle='#fffbdc';c.fillRect(-2,-size*.7,3,size*.65);c.restore();
  }
  function drawMarker(npc) {
    const near=E.distance(player,npc)<65;
    const y=npc.y-50+(reduced?0:Math.sin(time*2+npc.x)*1.5);
    ctx.save();ctx.fillStyle=near?'#fffbe1':'#fffef1e8';ctx.strokeStyle=near?'#b3c47f':'#47694670';ctx.lineWidth=1;
    roundRect(ctx,npc.x-10,y-13,20,17,5);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(npc.x-3,y+3);ctx.lineTo(npc.x,y+7);ctx.lineTo(npc.x+3,y+3);ctx.fill();
    ctx.fillStyle='#4a6242';ctx.font='bold 11px monospace';ctx.textAlign='center';ctx.fillText(visited.has(npc.id)?'✓':'···',npc.x,y-1);ctx.restore();
  }
  function drawLabel(p) {
    if(!visible(p.labelX,p.labelY))return;
    ctx.save();ctx.font='600 10px Trebuchet MS, sans-serif';ctx.textAlign='center';
    const text=p.name.replace(/^The /,''),width=ctx.measureText(text).width+21;
    ctx.fillStyle='#fffef2eb';roundRect(ctx,p.labelX-width/2,p.labelY-21,width,21,5);ctx.fill();
    ctx.fillStyle='#31503a';ctx.fillText(text,p.labelX,p.labelY-7);ctx.restore();
  }
  function drawAmbient() {
    if(reduced)return;
    // Subtle sparkles animate the pre-rendered fountain and river.
    for(let i=0;i<14;i++) {
      const x=1020+((i*39+Math.sin(time*.7+i)*9)%104),y=170+(i*53+time*10)%650;
      if(y>383&&y<465)continue;
      ctx.globalAlpha=(Math.sin(time*2+i)*.5+.5)*.36;ctx.fillStyle='#e6fcf3';ctx.fillRect(x,y,5,1.5);
    }
    ctx.globalAlpha=1;
    for(let i=0;i<5;i++){const a=time*.8+i*Math.PI*.4,x=690+Math.cos(a)*15,y=358+Math.sin(a)*8;ctx.fillStyle='#e3fdff80';ctx.fillRect(x,y,2,2);}
    // Warm fire embers and slow drifting petals make the world feel inhabited.
    for(let i=0;i<5;i++){const rise=(time*15+i*11)%48;ctx.globalAlpha=1-rise/48;ctx.fillStyle='#ffd780';ctx.fillRect(350+Math.sin(time+i)*7,662-rise,2,2);}
    ctx.globalAlpha=1;
    for(let i=0;i<12;i++){const x=170+((i*173+time*(3+i%3))%1200),y=180+(i*67+Math.sin(time*.4+i)*12)%560;ctx.globalAlpha=.55;ctx.fillStyle=i%3?'#faf3b4':'#fff4e1';ctx.fillRect(x,y,2,2);}
    ctx.globalAlpha=1;
  }
  function drawBeacon() {
    if(!won)return;
    const glow=ctx.createRadialGradient(1288,582,8,1288,582,95);
    glow.addColorStop(0,'#fff6bca0');glow.addColorStop(1,'#ffe9a000');ctx.fillStyle=glow;ctx.fillRect(1185,480,210,210);
    ctx.save();ctx.translate(1288,582);ctx.rotate(reduced?-.7:time*.25);
    const beam=ctx.createLinearGradient(0,0,300,0);beam.addColorStop(0,'#fff6bf77');beam.addColorStop(1,'#fff6bf00');
    ctx.fillStyle=beam;ctx.beginPath();ctx.moveTo(0,-4);ctx.lineTo(320,-60);ctx.lineTo(320,60);ctx.lineTo(0,4);ctx.fill();ctx.restore();
  }
  function drawPath() {
    if(!destination||!route.length)return;
    ctx.save();ctx.lineWidth=2;ctx.strokeStyle='#fff9c5a0';ctx.setLineDash([3,8]);ctx.lineDashOffset=reduced?0:-time*12;
    ctx.beginPath();ctx.moveTo(player.x,player.y);for(const p of route)ctx.lineTo(p.x,p.y);ctx.stroke();ctx.setLineDash([]);
    const r=8+(reduced?0:Math.sin(time*4)*2);ctx.strokeStyle='#fff5b5';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(destination.x,destination.y,r,r*.55,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  function drawOverview(c,width,height,labels=false) {
    c.save();c.clearRect(0,0,width,height);c.drawImage(map,0,0,width,height);
    const sx=width/W.width,sy=height/W.height;
    for(const p of W.locations){c.fillStyle=visited.has(p.id)?'#dded9d':'#fffde8';c.strokeStyle='#456045';c.lineWidth=labels?3:1;c.beginPath();c.arc(p.x*sx,p.y*sy,labels?10:2.5,0,Math.PI*2);c.fill();c.stroke();
      if(labels){c.font='bold 18px Trebuchet MS, sans-serif';c.textAlign='center';const name=p.name.replace(/^The /,''),tw=c.measureText(name).width+22;c.fillStyle='#fffcefee';roundRect(c,p.labelX*sx-tw/2,p.labelY*sy-28,tw,28,6);c.fill();c.fillStyle='#29442f';c.fillText(name,p.labelX*sx,p.labelY*sy-8);}}
    for(const s of W.stars) if(!collected.has(s.id)&&E.distance(player,s)<230){c.fillStyle='#ffe391';c.strokeStyle='#a07b2d';c.lineWidth=labels?2:1;c.beginPath();const x=s.x*sx,y=s.y*sy,r=labels?9:2.5;c.moveTo(x,y-r);c.lineTo(x+r,y);c.lineTo(x,y+r);c.lineTo(x-r,y);c.closePath();c.fill();c.stroke();}
    const x=player.x*sx,y=player.y*sy,r=labels?11:4;
    c.fillStyle='#f9d171';c.strokeStyle='#fffdee';c.lineWidth=labels?4:2;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.stroke();
    if(labels){c.font='bold 17px Trebuchet MS, sans-serif';c.textAlign='center';c.fillStyle='#163f32';c.fillText('YOU',x,y-19);}c.restore();
  }
  function render() {
    ctx.fillStyle='#246c68';ctx.fillRect(0,0,cw,ch);
    ctx.save();ctx.translate(cw/2,ch/2);ctx.scale(scale,scale);ctx.translate(-camera.x,-camera.y);
    ctx.drawImage(map,0,0,W.width,W.height);drawAmbient();drawPath();drawBeacon();
    for(const s of W.stars)if(!collected.has(s.id)&&visible(s.x,s.y))drawStar(ctx,s.x,s.y-12,10,time+s.x);
    const actors=[{...W.guide,dir:'down',moving:false,stride:0},...W.locations.map(p=>({...p,dir:'down',moving:false,stride:0})),player].sort((a,b)=>a.y-b.y);
    for(const a of actors)if(visible(a.x,a.y)){drawCharacter(ctx,a,a.x,a.y,2);if(a!==player)drawMarker(a);}
    // A small ring makes the player's feet easy to locate in the detailed map.
    ctx.strokeStyle='#fffad29e';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(player.x,player.y+2,12,5,0,0,Math.PI*2);ctx.stroke();
    for(const p of W.locations)drawLabel(p);
    for(const p of particles){ctx.globalAlpha=Math.max(0,Math.min(1,p.life/p.max));ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);}
    ctx.globalAlpha=1;ctx.restore();
  }
  function update(dt) {
    seconds+=dt;saveClock+=dt;stepTimer+=dt;
    let dx=(keys.has('d')||keys.has('arrowright')||touchKeys.has('right')?1:0)-(keys.has('a')||keys.has('arrowleft')||touchKeys.has('left')?1:0);
    let dy=(keys.has('s')||keys.has('arrowdown')||touchKeys.has('down')?1:0)-(keys.has('w')||keys.has('arrowup')||touchKeys.has('up')?1:0);
    const manual=dx!==0||dy!==0,speed=(keys.has('shift')||touchRun)?170:105;
    if(manual){route=[];destination=null;autoTalk=null;dismissWelcome();}
    else if(route.length){const next=route[0],d=E.distance(player,next);if(d<.01){player.x=next.x;player.y=next.y;route.shift();if(!route.length)destination=null;}else {dx=(next.x-player.x)/d;dy=(next.y-player.y)/d;}}
    const length=Math.hypot(dx,dy);let moved=0;
    if(length){dx/=length;dy/=length;let amount=speed*dt;if(!manual&&route.length)amount=Math.min(amount,E.distance(player,route[0]));moved=nav.move(player,dx*amount,dy*amount);
      if(Math.abs(dx)>Math.abs(dy))player.dir=dx>0?'right':'left';else player.dir=dy>0?'down':'up';
      if(moved<.1&&route.length){route=[];destination=null;autoTalk=null;}
      if(moved<.1&&manual&&time-lastWalkToast>10){lastWalkToast=time;toast('Follow the sandy paths — or click a destination.');}
    }
    player.moving=moved>.05;if(player.moving){player.stride+=moved*.22;if(stepTimer>.25){stepTimer=0;note(110+Math.random()*25,.04,0,.005,'triangle');}}
    checkCollectibles();updateNearest();
    if(autoTalk&&E.distance(player,autoTalk)<49){const person=autoTalk;autoTalk=null;talk(person);}
    updateCamera(dt);
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=24*dt;p.life-=dt;}particles=particles.filter(p=>p.life>0);
    if(time<confettiUntil&&Math.random()<dt*8)burst(1260+Math.random()*90,550+Math.random()*100,3);
    if(saveClock>3){saveClock=0;save();}
  }
  function frame(now) {
    const dt=Math.min((now-last)/1000||0,.04);last=now;
    if(!document.hidden){time+=dt;if(!dialog.open)update(dt);render();miniClock+=dt;if(miniClock>.12){miniClock=0;drawOverview(mctx,mini.width,mini.height);}}
    frameId=requestAnimationFrame(frame);
  }

  window.addEventListener('resize',resize);
  window.addEventListener('blur',()=>{clearInput();save();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();save();}last=performance.now();});
  window.addEventListener('pagehide',()=>{save();cancelAnimationFrame(frameId);});
  window.addEventListener('pageshow',event=>{if(event.persisted&&loaded){last=performance.now();frameId=requestAnimationFrame(frame);}});
  document.addEventListener('keydown',event=>{
    const k=event.key.toLowerCase();
    if(event.altKey||event.ctrlKey||event.metaKey||!loaded)return;
    if(dialog.open)return;
    if(k==='tab'||k==='enter'||(k===' '&&event.target.closest('button,a,input')))return;
    if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d',' ','escape','m','j','e','shift','?'].includes(k))event.preventDefault();
    unlockAudio();
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(k))keys.add(k);
    if(event.repeat)return;
    if(k==='e')talk(nearest);else if(k==='m')openMap();else if(k==='j')openJournal();else if(k==='escape'||k===' ')openPause();else if(k==='?')openHelp();
  });
  document.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
  let pointerStart=null;
  canvas.addEventListener('pointerdown',event=>{pointerStart={x:event.clientX,y:event.clientY,id:event.pointerId};unlockAudio();});
  canvas.addEventListener('pointercancel',()=>{pointerStart=null;});
  canvas.addEventListener('pointerup',event=>{
    if(!pointerStart||pointerStart.id!==event.pointerId||Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>15){pointerStart=null;return;}
    pointerStart=null;if(dialog.open||!loaded)return;
    const p=worldAt(event.clientX,event.clientY),npc=[W.guide,...W.locations].find(a=>E.distance({x:a.x,y:a.y-18},p)<29);
    if(npc&&E.distance(player,npc)<62)talk(npc);else walkTo(npc?{x:npc.x+20,y:npc.y+16}:p,npc);
  });
  document.querySelectorAll('[data-direction]').forEach(button=>{
    const release=()=>{touchKeys.delete(button.dataset.direction);button.classList.remove('pressed');};
    button.addEventListener('pointerdown',event=>{event.preventDefault();if(dialog.open)return;button.setPointerCapture(event.pointerId);touchKeys.add(button.dataset.direction);button.classList.add('pressed');unlockAudio();});
    button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
    // Keyboard activation of the touch controls produces one short step.
    button.addEventListener('click',event=>{if(event.detail===0&&!dialog.open){nav.move(player,...({up:[0,-12],down:[0,12],left:[-12,0],right:[12,0]}[button.dataset.direction]));}});
  });
  $('touch-run').addEventListener('click',()=>{touchRun=!touchRun;$('touch-run').setAttribute('aria-pressed',String(touchRun));});
  $('map-button').addEventListener('click',openMap);$('minimap-button').addEventListener('click',openMap);
  $('journal-button').addEventListener('click',openJournal);$('help-button').addEventListener('click',openHelp);
  $('interact-button').addEventListener('click',()=>talk(nearest));$('dismiss-welcome').addEventListener('click',dismissWelcome);
  $('close-dialog').addEventListener('click',closeDialog);
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog();});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)closeDialog();}});
  $('sound-button').addEventListener('click',async()=>{sound=!sound;soundIcon();await unlockAudio();if(sound){if(audioCtx){note(659,.15);toast('Sound on. Tiny footsteps, tiny melodies.');}else{sound=false;soundIcon();toast('Sound is unavailable in this browser.');}}save();});
  map.onload=()=>{loaded=true;resize();updateHud();soundIcon();updateNearest();$('loading').hidden=true;$('welcome').hidden=welcomeClosed;drawOverview(mctx,mini.width,mini.height);last=performance.now();frameId=requestAnimationFrame(frame);};
  map.onerror=()=>{$('loading-note').textContent='The island image could not load. Keep the assets folder beside index.html and try again.';const retry=document.createElement('button');retry.textContent='Try again';retry.onclick=()=>location.reload();$('loading').append(retry);};
  map.src=W.mapImage;
})();

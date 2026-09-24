/* Coordinates in this authoring file are image pixels. makeRealm() scales
   them into the larger 3072 x 2048 game world exactly once. */
(function(root){
  'use strict';
  const SCALE=2;
  const point=(id,x,y,extra={})=>({id,x,y,...extra});
  const worlds={
    sunhaven:{id:'sunhaven',name:'Sunhaven Island',subtitle:'A familiar shore. A much bigger adventure.',image:'assets/island.png',accent:'#dbea9e',theme:'forest',spawn:{x:645,y:472},
      npcs:[
        point('guide',583,470,{name:'Pip',palette:'green',role:'Your island guide',lines:['The island has grown, and two ancient portals have awakened. Moonveil lies beyond the blue gate. Emberfall waits beyond the red one.','Five island stars and the two guardian relics can restore our lighthouse. Explore in any order — every portal has a way home.','Space or right-click swings your sword. Q dashes through danger. E talks, opens chests, rests, and enters portals. H uses a potion.']}),
        point('cottage',399,286,{name:'Ada',palette:'rose',role:'The storyteller',lines:['The old stone steps in the northwest hide a star. Another shines below the observatory.','If the creatures catch you, you will return to the last campfire you rested at. Your discoveries and treasure stay with you.']}),
        point('workshop',818,277,{name:'Dex',palette:'blue',role:'Blacksmith & potion seller',shop:true,lines:['Coins make fine supplies. Break crates, open chests, and defeat creatures to earn them.','A potion costs 15 coins. A stronger blade costs 40 coins per upgrade. You can upgrade your sword three times.']}),
        point('observatory',1301,291,{name:'Nova',palette:'purple',role:'Watcher of the portals',lines:['Blue light leads to Moonveil, red light to Emberfall. The creatures beyond those gates are tougher than the island slimes.','A guardian guards a relic in each world. Watch the red warning ring, then dash away before it strikes.']}),
        point('camp',411,680,{name:'Rowan',palette:'orange',role:'The explorer',lines:['Rest at a campfire to heal and set your checkpoint. The nearest fire is marked on your map.','Three rune stones in each world unlock that world’s sealed cache. Try interacting with all of them.']}),
        point('library',674,755,{name:'Bea',palette:'teal',role:'Keeper of clues',lines:['Your journal tracks stars, relics and rune stones. A clue there always points toward an unfinished objective.','The star beside my library rests along the eastern curve of the path. Another waits on the way down to the beach.']}),
        point('lighthouse',1324,737,{name:'Sol',palette:'gold',role:'Keeper of the coast',ending:true,lines:['Bring me the five island stars and both guardian relics. Together they can restore the beacon and steady the portals.']})
      ],
      portals:[point('to-moonveil',215,161,{name:'Moonveil gate',to:'moonveil',arrival:'home',color:'#89e6ff'}),point('to-emberfall',1288,809,{name:'Emberfall gate',to:'emberfall',arrival:'home',color:'#ffac73'})],
      stars:[point('lookout',215,88,{name:'The Wanderer'}),point('maker',748,285,{name:'The Maker'}),point('dreamer',1281,327,{name:'The Dreamer'}),point('story',881,662,{name:'The Storyteller'}),point('kindness',346,782,{name:'The Kind One'})],
      fires:[point('square-fire',622,476,{name:'Square checkpoint'}),point('camp-fire',316,698,{name:'Rowan’s camp'}),point('coast-fire',1304,781,{name:'Coastal checkpoint'})],
      chests:[point('cottage-chest',472,311,{coins:18,potions:1}),point('coast-chest',178,822,{coins:22,potions:1}),point('library-chest',775,748,{coins:20,potions:1}),point('sun-cache',708,474,{coins:45,potions:2,sealed:true})],
      crates:[point('sun-crate-1',437,396),point('sun-crate-2',554,423),point('sun-crate-3',740,515),point('sun-crate-4',862,539),point('sun-crate-5',1224,456),point('sun-crate-6',1364,707)],
      runes:[point('sun-rune-1',264,296),point('sun-rune-2',846,480),point('sun-rune-3',1217,723)],
      dummies:[point('training',755,452,{name:'Training dummy'})],
      enemies:[point('sun-slime-1',443,831,{type:'slime'}),point('sun-slime-2',549,544,{type:'slime'}),point('sun-slime-3',850,519,{type:'slime'}),point('sun-slime-4',1235,443,{type:'slime'}),point('sun-slime-5',1334,749,{type:'slime'})]
    },
    moonveil:{id:'moonveil',name:'Moonveil Forest',subtitle:'Crystals, old magic, and something stirring.',image:'assets/moonveil.png',accent:'#97e7f5',theme:'crystal',spawn:{x:264,y:844},
      npcs:[point('lyra',420,700,{name:'Lyra',palette:'purple',role:'Forest ranger',lines:['The Thorn Guardian waits in the northeastern clearing. Its wide shockwave is dangerous, but the red ring gives you time to move.','Activate three rune stones to open the sealed cache. Rest at the campfire before taking on the guardian.']})],
      portals:[point('home',200,841,{name:'Return to Sunhaven',to:'sunhaven',arrival:'to-moonveil',color:'#89e6ff'})],stars:[],
      fires:[point('moon-fire',446,726,{name:'Moonveil camp'}),point('moon-rest',675,491,{name:'Crystal crossing'})],
      chests:[point('moon-chest-1',320,202,{coins:25,potions:1}),point('moon-chest-2',1310,786,{coins:30,potions:2}),point('moon-cache',618,489,{coins:50,potions:2,sealed:true})],
      crates:[point('moon-crate-1',405,619),point('moon-crate-2',610,515),point('moon-crate-3',752,602),point('moon-crate-4',1120,440),point('moon-crate-5',1154,726)],
      runes:[point('moon-rune-1',293,172),point('moon-rune-2',626,543),point('moon-rune-3',1271,822)],dummies:[],
      enemies:[point('moon-slime-1',465,600,{type:'crystal-slime'}),point('moon-slime-2',614,530,{type:'crystal-slime'}),point('moon-wisp-1',756,443,{type:'wisp'}),point('moon-wisp-2',1080,739,{type:'wisp'}),point('moon-slime-3',1141,403,{type:'crystal-slime'}),point('thorn-guardian',1208,273,{type:'guardian',boss:true,relic:'moonveil',name:'Thorn Guardian'})]
    },
    emberfall:{id:'emberfall',name:'Emberfall Ruins',subtitle:'Stay on the stone. Watch the warning rings.',image:'assets/emberfall.png',accent:'#ffc08a',theme:'ember',spawn:{x:304,y:800},
      npcs:[point('orrin',478,459,{name:'Orrin',palette:'orange',role:'Keeper of the ruins',lines:['The Ember Warden waits in the northeastern arena. Its attacks hit hard. Dash out of the red ring and strike during its recovery.','Lava is blocked ground. Use the bridges, and remember that your return portal is always open.']})],
      portals:[point('home',269,804,{name:'Return to Sunhaven',to:'sunhaven',arrival:'to-emberfall',color:'#ffac73'})],stars:[],
      fires:[point('ember-fire',516,482,{name:'Ashen refuge'}),point('ember-rest',780,521,{name:'The old courtyard'})],
      chests:[point('ember-chest-1',465,165,{coins:25,potions:1}),point('ember-chest-2',1234,744,{coins:30,potions:2}),point('ember-cache',711,504,{coins:50,potions:2,sealed:true})],
      crates:[point('ember-crate-1',433,663),point('ember-crate-2',597,534),point('ember-crate-3',773,628),point('ember-crate-4',1096,406),point('ember-crate-5',1190,710)],
      runes:[point('ember-rune-1',479,228),point('ember-rune-2',781,600),point('ember-rune-3',1294,721)],dummies:[],
      enemies:[point('ember-slime-1',470,628,{type:'ember-slime'}),point('ember-slime-2',648,548,{type:'ember-slime'}),point('ember-wisp-1',792,454,{type:'ember-wisp'}),point('ember-wisp-2',1129,742,{type:'ember-wisp'}),point('ember-slime-3',1133,401,{type:'ember-slime'}),point('ember-warden',1170,288,{type:'warden',boss:true,relic:'emberfall',name:'Ember Warden'})]
    }
  };
  for(const world of Object.values(worlds)){
    world.width=3072;world.height=2048;world.artWidth=1536;world.artHeight=1024;world.scale=SCALE;
    world.spawn={x:world.spawn.x*SCALE,y:world.spawn.y*SCALE};
    for(const group of ['npcs','portals','stars','fires','chests','crates','runes','dummies','enemies'])for(const p of world[group]){p.x*=SCALE;p.y*=SCALE;p.uid=world.id+':'+p.id;}
  }
  const api={worlds,scale:SCALE,starIds:worlds.sunhaven.stars.map(s=>s.id)};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PixelRealms=api;
})(typeof globalThis!=='undefined'?globalThis:this);

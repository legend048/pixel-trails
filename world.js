/* Edit this file to change the island, dialogue, quest and portfolio content.
   Positions are in original map pixels (1536 × 1024). Nothing is fetched remotely. */
(function (root) {
  'use strict';
  const world = {
    width: 1536, height: 1024, grid: 10, spawn: {x: 638, y: 475},
    title: 'Prakhar’s World', mapImage: 'assets/island.png',
    storageKey: 'pixel-trails-save-v1',
    // A walkable corridor is a connected polyline with a width in map pixels.
    paths: [
      {width: 64, points: [[255,289],[319,302],[397,294],[415,350],[414,395],[541,417],[588,447],[682,477],[810,421],[964,417],[1076,420],[1182,420],[1244,371],[1298,302],[1304,254]]},
      {width: 52, points: [[256,300],[252,236],[222,194],[210,163],[215,98],[215,65]]},
      {width: 50, points: [[408,311],[451,314],[490,310],[513,287]]},
      {width: 53, points: [[535,416],[603,367],[628,298],[651,235],[657,177],[705,151]]},
      {width: 54, points: [[641,286],[737,288],[803,298],[826,267],[830,229]]},
      {width: 48, points: [[809,301],[854,321],[878,349],[897,395]]},
      {width: 54, points: [[609,471],[588,522],[507,558],[479,612],[466,663],[416,687],[364,720],[297,712],[260,672]]},
      {width: 48, points: [[298,712],[316,753],[344,774],[357,812],[438,832],[517,838],[640,830],[674,772],[674,716]]},
      {width: 53, points: [[702,479],[713,519],[814,539],[876,576],[887,631],[877,677],[826,707],[765,750],[674,774]]},
      {width: 48, points: [[814,430],[846,477],[884,493],[939,513]]},
      {width: 44, points: [[1180,420],[1237,454],[1309,438],[1365,439],[1403,477],[1384,541],[1417,596],[1420,655],[1370,712],[1327,730],[1289,739],[1287,694]]},
      {width: 53, points: [[1240,457],[1198,498],[1185,553],[1199,613],[1208,681],[1229,724],[1290,751],[1290,813],[1290,877]]},
      {width: 46, points: [[1299,306],[1355,300],[1392,319],[1405,356]]},
      {width: 38, points: [[349,779],[278,806],[198,819],[103,831]]},
      {width: 37, points: [[1423,655],[1442,735],[1423,790],[1377,826],[1290,825]]}
    ],
    plazas: [
      [[578,330],[770,333],[797,380],[837,420],[803,479],[745,529],[600,513],[542,457],[554,386]],
      [[268,632],[317,598],[396,615],[443,660],[423,706],[369,736],[296,728],[258,690]],
      [[1229,399],[1300,384],[1348,432],[1291,480],[1230,485]],
      [[613,798],[745,779],[783,819],[749,851],[645,858],[548,852]]
    ],
    obstacles: [
      {type:'circle', x:690,y:374,r:65},
      {type:'circle', x:350,y:670,r:28},
      {type:'rect', x:331,y:121,w:144,h:146},
      {type:'rect', x:719,y:99,w:143,h:124},
      {type:'rect', x:591,y:595,w:169,h:112},
      {type:'rect', x:1246,y:68,w:121,h:165},
      {type:'rect', x:1252,y:542,w:66,h:148}
    ],
    locations: [
      {id:'cottage', name:'The Cottage', subtitle:'A place to begin', x:398,y:286, labelX:400,labelY:124, color:'#d98768', resident:'Ada', role:'The island’s storyteller', palette:'rose',
        lines:['Every good adventure begins with a small step. You’ve already taken yours.', 'The lighthouse has gone quiet. Five star fragments scattered around the island can wake it again. One drifted toward the old stone steps in the northwest.', 'This little world is yours to explore. Follow the sandy paths, take the long way round, and see what you find.'],
        journal:'Ada remembers a star near the old stone steps.'},
      {id:'workshop', name:'The Workshop', subtitle:'Ideas become things', x:821,y:275, labelX:810,labelY:95, color:'#709fcb', resident:'Dex', role:'Maker of curious things', palette:'blue',
        lines:['Welcome to the workshop. Around here, even the smallest idea gets a chance to become something.', 'I saw a star fragment just west of my front door. They make a lovely sound when you pick them up.', 'Want to see what’s being built beyond the island? The button below opens Prakhar’s GitHub profile.'],
        link:{label:'Visit Prakhar’s GitHub',url:'https://github.com/legend048'},
        journal:'Dex spotted a star beside the workshop path.'},
      {id:'observatory', name:'The Observatory', subtitle:'Keep looking up', x:1300,y:288, labelX:1305,labelY:73, color:'#a894c4', resident:'Nova', role:'Keeper of the night sky', palette:'purple',
        lines:['Funny thing about stars: you don’t always have to look up to find them.', 'There’s a fragment on the path below these steps. Cross the wooden bridge from the square and head north.', 'When you find all five, visit Sol at the lighthouse. The whole coast is waiting for that light.'],
        journal:'Nova says to look along the observatory approach.'},
      {id:'camp', name:'The Campsite', subtitle:'Stories by the fire', x:412,y:677, labelX:340,labelY:602, color:'#d6a35c', resident:'Rowan', role:'The happily unhurried explorer', palette:'orange',
        lines:['You made it! Come warm your pixel-sized toes. There’s no timer to beat and no wrong turn worth worrying about.', 'The coast is my favourite part of the island. I saw something sparkling along the path just south of this campsite.', 'A tip for the road: hold Shift to run. Or click a spot on the map and let the paths take you there.'],
        journal:'Rowan saw a sparkle on the path toward the beach.'},
      {id:'library', name:'The Library', subtitle:'A world between the pages', x:675,y:753, labelX:674,labelY:593, color:'#67a291', resident:'Bea', role:'Collector of stories and stray stars', palette:'teal',
        lines:['Shh. The books are daydreaming.', 'The old lighthouse journal says five fragments will rekindle its beacon. I’m fairly sure one landed on the curving path east of the library.', 'Your own journal remembers everyone you meet. Press J whenever you’d like to revisit a clue.'],
        journal:'Bea’s clue points to the curving path east of the library.'},
      {id:'lighthouse', name:'The Lighthouse', subtitle:'A little light goes a long way', x:1322,y:739, labelX:1289,labelY:542, color:'#cf816d', resident:'Sol', role:'Keeper of the coast', palette:'gold',
        lines:['Hello there, traveller. The beacon’s been waiting for someone like you.', 'Bring me all five star fragments and we’ll put a little light back into this world. The islanders can help you find them.'],
        journal:'Bring every star to Sol to restore the lighthouse.'}
    ],
    guide:{id:'guide',name:'Pip',resident:'Pip',role:'Your very small tour guide',x:582,y:472,palette:'green',lines:['Oh, hello! Welcome to Sunhaven. I’m Pip, unofficial chief of welcoming people.', 'Our lighthouse lost its light. Find five golden star fragments, then bring them to Sol across the river. Walk over a star to collect it.', 'Use WASD or the arrow keys to move, E to talk, and M to see the island. You can also click or tap anywhere along a path. Ready? Let’s wander.']},
    stars:[
      {id:'lookout',x:215,y:120,name:'The Wanderer',hint:'Near the old stone steps in the northwest.'},
      {id:'maker',x:747,y:286,name:'The Maker',hint:'Along the path west of the workshop’s door.'},
      {id:'dreamer',x:1280,y:325,name:'The Dreamer',hint:'At the foot of the observatory path.'},
      {id:'story',x:881,y:663,name:'The Storyteller',hint:'On the curving path east of the library.'},
      {id:'kindness',x:346,y:782,name:'The Kind One',hint:'On the path from the campsite to the coast.'}
    ]
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = world;
  else root.PIXEL_WORLD = world;
})(typeof globalThis !== 'undefined' ? globalThis : this);
